import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

import {
  findUserByEmail,
  findUserById,
  getPublicUsers,
  getAllUsersForAdmin,
  createRegisteredUser,
  updateUserProfile,
  updateUserPassword,
  adminUpdateUserRole,
  deleteUserFromDb,
  findTripById,
  getAllTripsFromDb,
  saveTripInDb,
  saveTripsInDb,
  deleteTripFromDb,
  getAllCustomRoutesFromDb,
  saveCustomRouteInDb,
  saveCustomRoutesInDb,
  deleteCustomRouteFromDb,
  getTravelNotesConfigFromDb,
  saveTravelNotesConfigInDb,
  getAllArticlesFromDb,
  saveArticlesInDb,
  deleteArticleFromDb,
  getFaqConfigFromDb,
  saveFaqConfigInDb,
  resetDatabaseCleanStart,
  toPrivateUserDTO
} from './src/db/queries.ts';
import { UserRole, PrivateUserDTO } from './src/types/index.ts';
import {
  registerUserSchema,
  loginUserSchema,
  refreshTokenSchema,
  userProfileUpdateSchema,
  legacyUserSaveSchema,
  companionTripSchema,
  tripsBatchSchema,
  riverRouteSchema,
  routesBatchSchema,
  articleSchema,
  articlesBatchSchema,
  faqConfigSchema,
  travelNotesConfigSchema,
  telegramApplicationInputSchema
} from './src/server/schemas.ts';
import { logAudit } from './src/server/logger.ts';
import {
  generateTokenPair,
  rotateRefreshToken,
  revokeToken,
  isTokenRevoked,
  JwtTokenPayload,
  cleanupExpiredTokens
} from './src/server/tokens.ts';
import { escapeMarkdown } from './src/server/markdown.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing. Please define JWT_SECRET in your environment or .env file.');
}

// Periodically clean up expired tokens (every 2 hours)
setInterval(() => {
  cleanupExpiredTokens().catch(err => console.warn('Periodic token cleanup failed:', err));
}, 2 * 60 * 60 * 1000);

// Extend Express Request to include authenticated user & token info
export interface AuthenticatedRequest extends Request {
  user?: PrivateUserDTO;
  token?: string;
  requestId?: string;
}

// Helper to extract client IP safely
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// 1. Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: false, // Compatibility for AI Studio preview iframe and dynamic leaflet tiles
  crossOriginEmbedderPolicy: false
}));

// 2. Strict Production CORS setup
const allowedProductionOrigins = [
  'https://splav86.ru',
  'https://www.splav86.ru'
];

if (process.env.ALLOWED_ORIGINS) {
  const extra = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  allowedProductionOrigins.push(...extra);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / server-to-server / curl requests with no origin header
    if (!origin) return callback(null, true);

    // Explicit production origins
    if (allowedProductionOrigins.includes(origin)) {
      return callback(null, true);
    }

    // App URL from env if configured
    if (process.env.APP_URL && origin === process.env.APP_URL.replace(/\/$/, '')) {
      return callback(null, true);
    }

    // AI Studio preview and deployment containers on Google Cloud Run
    if (/^https:\/\/ais-(dev|pre)-[a-z0-9-]+\.europe-west1\.run\.app$/.test(origin) ||
        /^https:\/\/ais-(dev|pre)-[a-z0-9-]+\.run\.app$/.test(origin) ||
        /^https:\/\/[a-z0-9-]+\.europe-west1\.run\.app$/.test(origin) ||
        /^https:\/\/[a-z0-9-]+\.run\.app$/.test(origin) ||
        /^https:\/\/([a-z0-9-]+\.)?google\.com$/.test(origin) ||
        /^https:\/\/ai\.studio$/.test(origin)) {
      return callback(null, true);
    }

    // Local development origins
    if (/^http:\/\/localhost(:[0-9]+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(origin)) {
      return callback(null, true);
    }

    logAudit({
      eventType: 'SECURITY_VIOLATION',
      level: 'warn',
      message: `CORS blocked for origin: ${origin}`,
      details: { origin }
    });

    return callback(new Error('CORS policy: Access denied for this origin.'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
};

app.use(cors(corsOptions));

// 3. Request ID middleware
app.use((req: AuthenticatedRequest, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// 4. Volumetric JSON body parsing limit (5MB)
app.use(express.json({ limit: '5mb' }));

// 5. Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа/регистрации. Пожалуйста, повторите позже.' }
});

const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Превышен лимит отправки уведомлений. Пожалуйста, подождите.' }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Превышен лимит административных запросов.' }
});

// 6. Authentication Middleware with Revocation & Access-Token Verification
async function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = undefined;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = undefined;
      return next();
    }

    // Check if token has been revoked (P1-2)
    if (await isTokenRevoked(token)) {
      req.user = undefined;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtTokenPayload;

      // Ensure access token type (or legacy token without type)
      if (decoded.type && decoded.type !== 'access') {
        req.user = undefined;
        return next();
      }

      const userRecord = await findUserById(decoded.id);
      if (userRecord) {
        req.user = toPrivateUserDTO(userRecord);
        req.token = token;
      }
    } catch {
      req.user = undefined;
    }
    next();
  } catch {
    req.user = undefined;
    next();
  }
}

app.use(authenticate);

// Middleware: Require Authenticated User
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Требуется авторизация. Пожалуйста, войдите в систему.',
      code: 'UNAUTHORIZED'
    });
  }
  next();
}

// Middleware: Require Specific Role(s)
function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Требуется авторизация.',
        code: 'UNAUTHORIZED'
      });
    }

    const userRole = req.user.role;
    if (userRole === 'superadmin' || allowedRoles.includes(userRole)) {
      return next();
    }

    logAudit({
      eventType: 'SECURITY_VIOLATION',
      level: 'warn',
      requestId: req.requestId,
      userId: req.user.id,
      userRole: req.user.role,
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      status: 403,
      message: `Access denied. User role '${userRole}' does not satisfy required roles [${allowedRoles.join(', ')}]`
    });

    return res.status(403).json({
      error: 'Доступ запрещен. Недостаточно прав для выполнения операции.',
      code: 'FORBIDDEN'
    });
  };
}

// Helper to extract pagination params (P1-8)
function extractPagination(query: any) {
  const page = query.page ? parseInt(String(query.page), 10) : undefined;
  const limit = query.limit ? parseInt(String(query.limit), 10) : undefined;
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;
  if (page !== undefined || limit !== undefined) {
    return { page: isNaN(page!) ? 1 : page, limit: isNaN(limit!) ? 20 : limit, search };
  }
  return undefined;
}

// ==========================================
// 8. PUBLIC & HEALTH ENDPOINTS
// ==========================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', online: true, timestamp: Date.now() });
});

// ==========================================
// 9. AUTHENTICATION API (/api/auth)
// ==========================================

// P1-1: Register with Access & Refresh Token Pair
app.post('/api/auth/register', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = registerUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Ошибка валидации данных',
        details: parseResult.error.format()
      });
    }

    const { email, password, name, phone, city, experienceLevel, telegram } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      logAudit({
        eventType: 'AUTH_REGISTER',
        level: 'warn',
        requestId: req.requestId,
        ip: getClientIp(req),
        message: `Registration failed: user already exists (${cleanEmail})`
      });
      return res.status(409).json({
        error: `Пользователь с Email «${cleanEmail}» уже зарегистрирован. Пожалуйста, выполните вход.`,
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Hash password with bcrypt (P1-3)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const role: UserRole = 'user';

    const newUser = await createRegisteredUser({
      id: userId,
      email: cleanEmail,
      name,
      passwordHash,
      role,
      phone,
      city,
      experienceLevel,
      telegram
    });

    const tokens = await generateTokenPair(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET
    );

    logAudit({
      eventType: 'AUTH_REGISTER',
      level: 'info',
      requestId: req.requestId,
      userId: newUser.id,
      userRole: newUser.role,
      ip: getClientIp(req),
      message: `User registered successfully (${newUser.email})`
    });

    return res.status(201).json({
      token: tokens.accessToken, // Backwards compatibility for existing client
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: newUser
    });
  } catch (error: any) {
    console.error('API Register Error:', error.message);
    return res.status(500).json({ error: 'Ошибка при регистрации. Пожалуйста, попробуйте позже.' });
  }
});

// P1-1 & P1-3: Login with strict bcrypt check & token pair
app.post('/api/auth/login', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = loginUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Некорректные параметры входа'
      });
    }

    const { email, password } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();

    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      logAudit({
        eventType: 'AUTH_LOGIN_FAILED',
        level: 'warn',
        requestId: req.requestId,
        ip: getClientIp(req),
        message: `Login failed: user not found (${cleanEmail})`
      });
      return res.status(401).json({
        error: `Пользователь с Email «${cleanEmail}» не найден в единой базе. Пожалуйста, зарегистрируйтесь.`,
        code: 'USER_NOT_FOUND'
      });
    }

    // P1-3: Strict bcrypt verification ONLY. No plaintext fallback!
    let isPasswordValid = false;
    if (user.passwordHash && (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'))) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isPasswordValid) {
      logAudit({
        eventType: 'AUTH_LOGIN_FAILED',
        level: 'warn',
        requestId: req.requestId,
        userId: user.id,
        ip: getClientIp(req),
        message: `Login failed: invalid password for user ${user.email}`
      });
      return res.status(401).json({
        error: 'Неверный пароль. Пожалуйста, проверьте правильность ввода.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const privateUser = toPrivateUserDTO(user);
    const tokens = await generateTokenPair(
      { id: privateUser.id, email: privateUser.email, role: privateUser.role },
      JWT_SECRET
    );

    logAudit({
      eventType: 'AUTH_LOGIN',
      level: 'info',
      requestId: req.requestId,
      userId: privateUser.id,
      userRole: privateUser.role,
      ip: getClientIp(req),
      message: `User logged in successfully (${privateUser.email})`
    });

    return res.json({
      token: tokens.accessToken, // Backwards compatibility
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: privateUser
    });
  } catch (error: any) {
    console.error('API Login Error:', error.message);
    return res.status(500).json({ error: 'Ошибка сервера при авторизации.' });
  }
});

// P1-1: Refresh Token endpoint with rotation
app.post('/api/auth/refresh', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = refreshTokenSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Refresh token обязателен' });
    }

    const { refreshToken } = parseResult.data;
    const refreshed = await rotateRefreshToken(
      refreshToken,
      JWT_SECRET,
      async (id: string) => {
        const u = await findUserById(id);
        return u ? toPrivateUserDTO(u) : null;
      }
    );

    if (!refreshed) {
      logAudit({
        eventType: 'AUTH_REFRESH_FAILED',
        level: 'warn',
        requestId: req.requestId,
        ip: getClientIp(req),
        message: 'Token refresh failed: invalid or revoked refresh token'
      });
      return res.status(401).json({
        error: 'Сессия истекла или отозвана. Пожалуйста, выполните повторный вход.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    logAudit({
      eventType: 'AUTH_REFRESH',
      level: 'info',
      requestId: req.requestId,
      userId: refreshed.user.id,
      ip: getClientIp(req),
      message: `Token refreshed successfully for user ${refreshed.user.email}`
    });

    return res.json({
      token: refreshed.accessToken,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresIn: refreshed.expiresIn,
      user: refreshed.user
    });
  } catch (error: any) {
    console.error('API Token Refresh Error:', error.message);
    return res.status(500).json({ error: 'Ошибка обновления токена.' });
  }
});

// P1-2: Token Revocation / Logout endpoint
app.post('/api/auth/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentToken = req.token;
    const bodyRefreshToken = req.body?.refreshToken;

    if (currentToken) {
      await revokeToken(currentToken, req.user!.id, 'logout_access');
    }
    if (bodyRefreshToken && typeof bodyRefreshToken === 'string') {
      await revokeToken(bodyRefreshToken, req.user!.id, 'logout_refresh');
    }

    logAudit({
      eventType: 'AUTH_LOGOUT',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User logged out (${req.user!.email})`
    });

    return res.json({ success: true, message: 'Сеанс успешно завершен.' });
  } catch (error: any) {
    console.error('API Logout Error:', error.message);
    return res.status(500).json({ error: 'Ошибка при выходе из системы.' });
  }
});

// ==========================================
// 10. CURRENT USER PROFILE (/api/users/me)
// ==========================================

app.get('/api/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json(req.user);
});

app.patch('/api/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = userProfileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Недопустимые поля обновления',
        details: parseResult.error.format()
      });
    }

    const updatedUser = await updateUserProfile(req.user!.id, parseResult.data as any);

    logAudit({
      eventType: 'USER_PROFILE_UPDATE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User profile updated (${req.user!.email})`
    });

    return res.json(updatedUser);
  } catch (error: any) {
    console.error('API Update Profile Error:', error.message);
    return res.status(500).json({ error: 'Не удалось обновить профиль.' });
  }
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string().min(3, 'Новый пароль должен содержать не менее 3 символов')
});

// P1-3: Strict bcrypt-only password verification & token revocation
app.patch('/api/users/me/password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updatePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Ошибка данных пароля'
      });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const userRecord = await findUserById(req.user!.id);
    if (!userRecord) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    let isMatch = false;
    if (userRecord.passwordHash && (userRecord.passwordHash.startsWith('$2a$') || userRecord.passwordHash.startsWith('$2b$'))) {
      isMatch = await bcrypt.compare(currentPassword, userRecord.passwordHash);
    }

    if (!isMatch) {
      logAudit({
        eventType: 'PASSWORD_CHANGE',
        level: 'warn',
        requestId: req.requestId,
        userId: req.user!.id,
        ip: getClientIp(req),
        message: 'Password change failed: incorrect current password'
      });
      return res.status(400).json({ error: 'Текущий пароль указан неверно.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(req.user!.id, newHash);

    logAudit({
      eventType: 'PASSWORD_CHANGE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Password changed successfully for user ${req.user!.email}`
    });

    return res.json({ success: true, message: 'Пароль успешно изменен.' });
  } catch (error: any) {
    console.error('API Change Password Error:', error.message);
    return res.status(500).json({ error: 'Ошибка смены пароля.' });
  }
});

// ==========================================
// 11. PUBLIC COMMUNITY MEMBERS DIRECTORY (/api/users/public)
// ==========================================

// P1-8: Pagination support
app.get('/api/users/public', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pagination = extractPagination(req.query);
    const result = await getPublicUsers(pagination);
    return res.json(result);
  } catch (error: any) {
    console.error('API /api/users/public error:', error.message);
    return res.status(500).json({ error: 'Не удалось получить список участников.' });
  }
});

// ==========================================
// 12. ADMIN USER MANAGEMENT (/api/admin/users)
// ==========================================

app.get('/api/admin/users', adminLimiter, requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pagination = extractPagination(req.query);
    const result = await getAllUsersForAdmin(pagination);
    return res.json(result);
  } catch (error: any) {
    console.error('API /api/admin/users error:', error.message);
    return res.status(500).json({ error: 'Не удалось получить список пользователей для администратора.' });
  }
});

const roleChangeSchema = z.object({
  role: z.enum(['user', 'organizer', 'moderator', 'admin', 'superadmin'])
});

app.patch('/api/admin/users/:id/role', adminLimiter, requireRole('superadmin', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = roleChangeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    const targetRole = parseResult.data.role;
    if ((targetRole === 'superadmin' || targetRole === 'admin') && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Только Главный администратор (superadmin) может назначать роли администратора.' });
    }

    const updated = await adminUpdateUserRole(id, targetRole);

    logAudit({
      eventType: 'ROLE_CHANGE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Admin ${req.user!.email} changed role of user ${id} to ${targetRole}`,
      details: { targetUserId: id, newRole: targetRole }
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('API Change Role Error:', error.message);
    return res.status(500).json({ error: 'Ошибка обновления роли.' });
  }
});

app.delete('/api/admin/users/:id', adminLimiter, requireRole('superadmin', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Вы не можете удалить собственный аккаунт через панель администратора.' });
    }
    await deleteUserFromDb(id);

    logAudit({
      eventType: 'USER_DELETE',
      level: 'warn',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Admin ${req.user!.email} deleted user ${id}`,
      details: { deletedUserId: id }
    });

    return res.json({ success: true, message: `Пользователь ${id} удален.` });
  } catch (error: any) {
    console.error('API Delete User Error:', error.message);
    return res.status(500).json({ error: 'Ошибка удаления пользователя.' });
  }
});

app.post('/api/admin/reset-database', adminLimiter, requireRole('superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await resetDatabaseCleanStart();

    logAudit({
      eventType: 'DATABASE_RESET',
      level: 'warn',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `SuperAdmin ${req.user!.email} initiated full database reset`,
      details: { timestamp: result.timestamp }
    });

    return res.json({
      success: true,
      message: 'База данных успешно очищена (Чистый старт).',
      timestamp: result.timestamp
    });
  } catch (error: any) {
    console.error('API Reset DB Error:', error.message);
    return res.status(500).json({ error: 'Ошибка сброса базы данных.' });
  }
});

// P1-4: Strict Zod validation for legacy /api/db/users
app.get('/api/db/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pagination = extractPagination(req.query);
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      const users = await getAllUsersForAdmin(pagination);
      return res.json(users);
    }
    const publicUsers = await getPublicUsers(pagination);
    return res.json(publicUsers);
  } catch (error: any) {
    console.error('API /api/db/users error:', error.message);
    return res.status(500).json({ error: 'Не удалось получить пользователей.' });
  }
});

app.post('/api/db/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = legacyUserSaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Неверные данные пользователя',
        details: parseResult.error.format()
      });
    }

    const userPayload = parseResult.data;

    // User can only update own profile unless admin
    if (userPayload.id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Вы можете редактировать только свой профиль.' });
    }

    const saved = await updateUserProfile(userPayload.id, userPayload as any);
    return res.json(saved);
  } catch (error: any) {
    console.error('API POST /api/db/users error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить пользователя.' });
  }
});

app.delete('/api/db/users/:id', requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteUserFromDb(id);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/db/users error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить пользователя.' });
  }
});

// ==========================================
// 13. COMPANION TRIPS & EXPEDITIONS API
// ==========================================

// P1-8: Pagination support
app.get(['/api/db/trips', '/api/trips'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const pagination = extractPagination(req.query);
    const trips = await getAllTripsFromDb({
      userId: req.user?.id,
      isAdmin
    }, pagination);
    return res.json(trips);
  } catch (error: any) {
    console.error('API trips error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить походы.' });
  }
});

// P1-4 & P1-9: Strict Zod validation & batch saving
app.post(['/api/db/trips', '/api/trips'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';

    if (body.trips && Array.isArray(body.trips)) {
      const parseResult = tripsBatchSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Ошибка валидации списка походов',
          details: parseResult.error.format()
        });
      }

      const validTrips = parseResult.data.trips;
      if (!isPrivileged) {
        for (const trip of validTrips) {
          if (trip.organizer?.userId && trip.organizer.userId !== req.user!.id) {
            return res.status(403).json({ error: 'Вы можете сохранять только свои походы.' });
          }
          if (trip.organizer) {
            trip.organizer.userId = req.user!.id;
          }
          trip.ownerId = req.user!.id;
        }
      }

      await saveTripsInDb(validTrips, isPrivileged ? undefined : req.user!.id);

      logAudit({
        eventType: 'TRIP_UPDATE',
        level: 'info',
        requestId: req.requestId,
        userId: req.user!.id,
        userRole: req.user!.role,
        ip: getClientIp(req),
        message: `User saved batch of ${validTrips.length} trips`
      });

      return res.json({ success: true });
    } else if (body.id) {
      const parseResult = companionTripSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Ошибка валидации данных похода',
          details: parseResult.error.format()
        });
      }

      const validTrip = parseResult.data;
      if (!isPrivileged) {
        if (validTrip.organizer?.userId && validTrip.organizer.userId !== req.user!.id) {
          return res.status(403).json({ error: 'Вы можете сохранять только свои походы.' });
        }
        if (validTrip.organizer) {
          validTrip.organizer.userId = req.user!.id;
        }
        validTrip.ownerId = req.user!.id;
      }

      await saveTripInDb(validTrip, isPrivileged ? (validTrip.organizer?.userId || req.user!.id) : req.user!.id);

      logAudit({
        eventType: 'TRIP_CREATE',
        level: 'info',
        requestId: req.requestId,
        userId: req.user!.id,
        userRole: req.user!.role,
        ip: getClientIp(req),
        message: `User saved trip ${validTrip.id} (${validTrip.title})`
      });

      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Некорректный формат данных похода' });
  } catch (error: any) {
    console.error('API save trips error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить поход.' });
  }
});

app.delete(['/api/db/trips/:id', '/api/trips/:id'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const allTrips = (await getAllTripsFromDb()) as any[];
    const existing = allTrips.find((t: any) => t.id === id);

    if (existing && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      const isOwner = (existing.organizer?.userId && existing.organizer.userId === req.user!.id) ||
                      (existing.ownerId && existing.ownerId === req.user!.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Вы можете удалять только созданные вами походы.' });
      }
    }

    await deleteTripFromDb(id);

    logAudit({
      eventType: 'TRIP_DELETE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User deleted trip ${id}`
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('API delete trip error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить поход.' });
  }
});

// ==========================================
// 14. RIVER ROUTES & GPX TRACKS API
// ==========================================

// P1-8: Pagination support
app.get(['/api/db/routes', '/api/routes'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const pagination = extractPagination(req.query);
    const routes = await getAllCustomRoutesFromDb({
      userId: req.user?.id,
      isAdmin
    }, pagination);
    return res.json(routes);
  } catch (error: any) {
    console.error('API routes error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить маршруты.' });
  }
});

// P1-4: Strict Zod validation & batch saving
app.post(['/api/db/routes', '/api/routes'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';

    if (body.routes && Array.isArray(body.routes)) {
      const parseResult = routesBatchSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Ошибка валидации списка маршрутов',
          details: parseResult.error.format()
        });
      }

      const validRoutes = parseResult.data.routes;
      if (!isPrivileged) {
        for (const r of validRoutes) {
          if (r.authorId && r.authorId !== req.user!.id) {
            return res.status(403).json({ error: 'Вы можете сохранять только собственные маршруты.' });
          }
          r.authorId = req.user!.id;
          (r as any).ownerId = req.user!.id;
        }
      }

      await saveCustomRoutesInDb(validRoutes, isPrivileged ? undefined : req.user!.id);

      logAudit({
        eventType: 'ROUTE_UPDATE',
        level: 'info',
        requestId: req.requestId,
        userId: req.user!.id,
        userRole: req.user!.role,
        ip: getClientIp(req),
        message: `User saved batch of ${validRoutes.length} routes`
      });

      return res.json({ success: true });
    } else if (body.id) {
      const parseResult = riverRouteSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Ошибка валидации данных маршрута',
          details: parseResult.error.format()
        });
      }

      const validRoute = parseResult.data;
      if (!isPrivileged) {
        if (validRoute.authorId && validRoute.authorId !== req.user!.id) {
          return res.status(403).json({ error: 'Вы можете сохранять только собственные маршруты.' });
        }
        validRoute.authorId = req.user!.id;
        (validRoute as any).ownerId = req.user!.id;
      }

      await saveCustomRouteInDb(validRoute, isPrivileged ? (validRoute.authorId || req.user!.id) : req.user!.id);

      logAudit({
        eventType: 'ROUTE_CREATE',
        level: 'info',
        requestId: req.requestId,
        userId: req.user!.id,
        userRole: req.user!.role,
        ip: getClientIp(req),
        message: `User saved route ${validRoute.id} (${validRoute.name})`
      });

      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Некорректный формат данных маршрута' });
  } catch (error: any) {
    console.error('API save routes error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить маршрут.' });
  }
});

app.delete(['/api/db/routes/:id', '/api/routes/:id'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const allRoutes = (await getAllCustomRoutesFromDb()) as any[];
    const existing = allRoutes.find((r: any) => r.id === id);

    if (existing && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      const isOwner = (existing.authorId && existing.authorId === req.user!.id) ||
                      (existing.ownerId && existing.ownerId === req.user!.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Вы можете удалять только созданные вами маршруты.' });
      }
    }

    await deleteCustomRouteFromDb(id);

    logAudit({
      eventType: 'ROUTE_DELETE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User deleted route ${id}`
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('API delete route error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить маршрут.' });
  }
});

// ==========================================
// 15. ARTICLES & EXPEDITION REPORTS API
// ==========================================

// P1-8: Pagination support
app.get(['/api/db/articles', '/api/articles'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pagination = extractPagination(req.query);
    const articlesList = await getAllArticlesFromDb(pagination);
    return res.json(articlesList);
  } catch (error: any) {
    console.error('API articles error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить статьи.' });
  }
});

// P1-4: Strict Zod validation
app.post(['/api/db/articles', '/api/articles'], requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = articlesBatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Ошибка валидации статей',
        details: parseResult.error.format()
      });
    }

    const { articles: articlesList } = parseResult.data;
    await saveArticlesInDb(articlesList);

    logAudit({
      eventType: 'ARTICLE_MUTATE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Admin saved ${articlesList.length} articles`
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('API save articles error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить статьи.' });
  }
});

app.delete(['/api/db/articles/:id', '/api/articles/:id'], requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteArticleFromDb(id);

    logAudit({
      eventType: 'ARTICLE_DELETE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Admin deleted article ${id}`
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('API delete article error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить статью.' });
  }
});

// ==========================================
// 16. FAQ & SAFETY DIRECTORY API
// ==========================================

app.get(['/api/db/faq', '/api/faq'], async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const faqConfig = await getFaqConfigFromDb();
    return res.json(faqConfig);
  } catch (error: any) {
    console.error('API faq error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить FAQ.' });
  }
});

// P1-4: Strict Zod validation
app.post(['/api/db/faq', '/api/faq'], requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = faqConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Ошибка валидации FAQ',
        details: parseResult.error.format()
      });
    }

    await saveFaqConfigInDb(parseResult.data);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('API save FAQ error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить FAQ.' });
  }
});

// ==========================================
// 17. TRAVEL NOTES & LOGBOOK API
// ==========================================

app.get('/api/db/travel-notes', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const notesConfig = await getTravelNotesConfigFromDb();
    return res.json(notesConfig);
  } catch (error: any) {
    console.error('API travel notes error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить путевые заметки.' });
  }
});

// P1-4: Strict Zod validation
app.post('/api/db/travel-notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = travelNotesConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Ошибка валидации путевых заметок',
        details: parseResult.error.format()
      });
    }

    await saveTravelNotesConfigInDb(parseResult.data);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('API save travel notes error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить путевые заметки.' });
  }
});

// ==========================================
// 18. TELEGRAM NOTIFICATIONS API
// ==========================================

// P1-5 & P1-6: Strict tripId requirement + authenticated user identity + markdown escaping
app.post('/api/notifications/telegram-application', notificationLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = telegramApplicationInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Неверные данные заявки',
        details: parseResult.error.format()
      });
    }

    const { tripId, notes, vesselType, experienceLevel } = parseResult.data;

    // Fetch trip securely from database (P1-5)
    const trip = await findTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: `Поход с ID «${tripId}» не найден.` });
    }

    // Applicant data taken strictly from authenticated req.user (P1-5)
    const applicantName = req.user!.name;
    const applicantPhone = req.user!.phone || 'Не указан в профиле';
    const applicantEmail = req.user!.email;
    const applicantTelegram = req.user!.telegram ? `@${req.user!.telegram.replace(/^@/, '')}` : '';

    const tripTitle = trip.title || 'Без названия';
    const riverName = trip.riverName || 'Не указана';
    const organizerName = trip.organizer?.name || 'Организатор';
    const vesselLabel = vesselType ? String(vesselType).toUpperCase() : 'Каяк / Байдарка / Паккрафт';

    // P1-6: Escape all user-controlled values to prevent Telegram Markdown injection
    const safeTripTitle = escapeMarkdown(tripTitle);
    const safeRiverName = escapeMarkdown(riverName);
    const safeOrganizerName = escapeMarkdown(organizerName);
    const safeApplicantName = escapeMarkdown(applicantName);
    const safeApplicantPhone = escapeMarkdown(applicantPhone);
    const safeApplicantEmail = escapeMarkdown(applicantEmail);
    const safeApplicantTelegram = escapeMarkdown(applicantTelegram);
    const safeVesselLabel = escapeMarkdown(vesselLabel);
    const safeExperience = escapeMarkdown(experienceLevel || req.user!.experienceLevel || 'Любитель');
    const safeNotes = escapeMarkdown(notes);

    const messageText = `🌊 *Splav86: Новая заявка в экипаж!*\n\n` +
      `📍 *Поход:* ${safeTripTitle} (р. ${safeRiverName})\n` +
      `👑 *Капитан:* ${safeOrganizerName}\n\n` +
      `👤 *Участник:* ${safeApplicantName}\n` +
      `📞 *Телефон:* ${safeApplicantPhone}\n` +
      (safeApplicantEmail ? `✉️ *Email:* ${safeApplicantEmail}\n` : '') +
      (safeApplicantTelegram ? `💬 *Telegram:* ${safeApplicantTelegram}\n` : '') +
      `🛶 *Судно:* ${safeVesselLabel}\n` +
      `🏆 *Опыт:* ${safeExperience}\n` +
      (safeNotes ? `📝 *Сообщение:* "${safeNotes}"\n\n` : '\n') +
      `⚙️ _Управление заявками доступно в Личном кабинете Splav86._`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && defaultChatId) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: defaultChatId,
            text: messageText,
            parse_mode: 'Markdown'
          })
        });
      } catch (fetchErr) {
        console.warn('Failed to dispatch telegram notification:', fetchErr);
      }
    }

    logAudit({
      eventType: 'AUTH_LOGIN', // Or Notification event
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User ${req.user!.email} submitted application for trip ${tripId} (${tripTitle})`
    });

    return res.json({
      success: true,
      message: 'Заявка отправлена капитану.'
    });
  } catch (error: any) {
    console.error('Telegram notification error:', error.message);
    return res.status(500).json({ error: 'Ошибка отправки уведомления.' });
  }
});

// ==========================================
// 19. GLOBAL ERROR HANDLER
// ==========================================

app.use((err: any, req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
  const requestId = req.requestId || 'unknown';
  logAudit({
    eventType: 'SECURITY_VIOLATION',
    level: 'error',
    requestId,
    userId: req.user?.id,
    ip: getClientIp(req),
    path: req.path,
    method: req.method,
    status: err.status || 500,
    message: err.message || 'Internal Server Error',
    details: { stack: err.stack }
  });

  return res.status(err.status || 500).json({
    error: 'Внутренняя ошибка сервера. Пожалуйста, обратитесь в службу поддержки.',
    requestId
  });
});

// ==========================================
// 20. STATIC SPA & VITE MIDDLEWARE SERVING
// ==========================================

async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔒 Splav86 Secure Server listening on port ${PORT}`);
  });
}

startApp();
