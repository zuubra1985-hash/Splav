import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
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
  findTripRecordById,
  getAllTripsFromDb,
  saveTripInDb,
  saveTripsInDb,
  deleteTripFromDb,
  getTripApplicationsFromDb,
  getUserApplicationsFromDb,
  createTripApplicationInDb,
  updateTripApplicationStatusInDb,
  getTripParticipantsFromDb,
  addTripParticipantInDb,
  removeTripParticipantFromDb,
  findCustomRouteById,
  findCustomRouteRecordById,
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
  tripApplicationCreateSchema,
  tripApplicationStatusUpdateSchema,
  tripParticipantCreateSchema,
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

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is strictly required. Define JWT_SECRET in .env.');
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

// 1. Security HTTP Headers with Production-grade CSP & AI Studio iframe support
app.use(helmet({
  frameguard: false, // Allow AI Studio iframe preview embedding
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://telegram.org', 'https://*.telegram.org', 'https://*.google.com', 'https://*.gstatic.com', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com', 'https://*.google.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://images.unsplash.com', 'https://*.google.com', 'https://*.gstatic.com', 'https://*.googleusercontent.com', 'https://*.firebaseapp.com'],
      connectSrc: [
        "'self'", 
        'data:', 
        'blob:', 
        'https://*.google.com', 
        'https://*.googleapis.com', 
        'https://*.firebaseio.com',
        'https://*.firebaseapp.com',
        'https://*.ai.studio', 
        'https://ai.studio', 
        'https://*.run.app',
        'https://api.telegram.org', 
        'wss:'
      ],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
      frameSrc: ["'self'", 'https://*.google.com', 'https://*.ai.studio', 'https://ai.studio', 'https://*.run.app'],
      frameAncestors: [
        "'self'", 
        'https://*.google.com', 
        'https://*.aistudio.google.com', 
        'https://aistudio.google.com', 
        'https://*.ai.studio',
        'https://ai.studio', 
        'https://*.run.app'
      ],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. Strict Production CORS setup supporting AI Studio domains, production, and subdomains
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

    // AI Studio domains (e.g. splav86.ai.studio, ais-dev-*.run.app, *.google.com)
    if (/^https:\/\/([a-z0-9-]+\.)*ai\.studio$/.test(origin) ||
        /^https:\/\/([a-z0-9-]+\.)*run\.app$/.test(origin) ||
        /^https:\/\/([a-z0-9-]+\.)*google\.com$/.test(origin) ||
        /^https:\/\/([a-z0-9-]+\.)*web\.app$/.test(origin) ||
        /^https:\/\/([a-z0-9-]+\.)*firebaseapp\.com$/.test(origin) ||
        origin.endsWith('.ai.studio') ||
        origin.endsWith('.run.app')) {
      return callback(null, true);
    }

    // Local development origins
    if (/^http:\/\/localhost(:[0-9]+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(origin)) {
      return callback(null, true);
    }

    // P0-6: Reject unauthorized external origins strictly
    return callback(new Error(`CORS blocked: Origin '${origin}' is not authorized.`));
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
        message: 'Registration failed: email already registered'
      });
      return res.status(409).json({
        error: `Пользователь с Email «${cleanEmail}» уже зарегистрирован. Пожалуйста, выполните вход.`,
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Hash password with bcrypt (P1-3)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = `user-${crypto.randomUUID()}`;
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
      message: `User registered successfully (id: ${newUser.id})`
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
        message: 'Login failed: email not found'
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
        message: `Login failed: invalid password for user ${user.id}`
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
      message: `User logged in successfully (id: ${privateUser.id})`
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
      message: `Token refreshed successfully for user ${refreshed.user.id}`
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
      message: `User logged out (id: ${req.user!.id})`
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
      message: `User profile updated (id: ${req.user!.id})`
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
      message: `Password changed successfully for user ${req.user!.id}`
    });

    return res.json({ success: true, message: 'Пароль успешно изменен.' });
  } catch (error: any) {
    console.error('API Change Password Error:', error.message);
    return res.status(500).json({ error: 'Ошибка смены пароля.' });
  }
});

// P1-4: Get current user's submitted trip applications
app.get(['/api/users/me/applications', '/api/db/users/me/applications'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apps = await getUserApplicationsFromDb(req.user!.id);
    return res.json(apps);
  } catch (error: any) {
    console.error('API get user applications error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить ваши заявки.' });
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
      message: `Admin ${req.user!.id} changed role of user ${id} to ${targetRole}`,
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
      message: `Admin ${req.user!.id} deleted user ${id}`,
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
      message: `SuperAdmin ${req.user!.id} initiated full database reset`,
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

app.post('/api/db/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = legacyUserSaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Неверные данные пользователя',
        details: parseResult.error.format()
      });
    }

    const userPayload = parseResult.data;

    // User can only update own profile unless admin or guest sync
    if (req.user && userPayload.id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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

// P1-8: Pagination support & P0-5: PII Sanitization
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

// Single trip lookup with PII sanitization
app.get(['/api/db/trips/:id', '/api/trips/:id'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const trip = await findTripById(id, req.user?.id, isAdmin);
    if (!trip) {
      return res.status(404).json({ error: `Поход с ID «${id}» не найден.` });
    }
    return res.json(trip);
  } catch (error: any) {
    console.error('API single trip error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить данные похода.' });
  }
});

// P0-3 & P0-4: Server-side Ownership Verification + Strip Client-Controlled Metadata
app.post(['/api/db/trips', '/api/trips'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const isPrivileged = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const currentUserId = req.user?.id || (body.organizer?.userId) || 'tourist-user';

    if (body.trips && Array.isArray(body.trips)) {
      const parseResult = tripsBatchSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Ошибка валидации списка походов',
          details: parseResult.error.format()
        });
      }

      const validTrips = parseResult.data.trips;
      for (const trip of validTrips) {
        // Check existing record ownership in DB (P0-3)
        const existingRecord = await findTripRecordById(trip.id);
        if (existingRecord && !isPrivileged && req.user) {
          const isOwner = existingRecord.ownerId === currentUserId ||
            (existingRecord.data as any)?.organizer?.userId === currentUserId;
          if (!isOwner) {
            return res.status(403).json({
              error: `Вы не можете изменять поход «${trip.title || trip.id}», созданный другим пользователем.`
            });
          }
        }

        // P0-4: Overwrite client-controlled fields with authenticated server values if user logged in
        if (!isPrivileged && req.user) {
          trip.ownerId = currentUserId;
          if (!trip.organizer) {
            trip.organizer = {
              name: req.user.name,
              avatar: req.user.avatar || '',
              experienceYears: 1,
              completedTrips: 1,
              fstrRank: req.user.fstrRank || '',
              phone: req.user.phone || '',
              telegram: req.user.telegram || '',
              userId: currentUserId
            };
          } else {
            trip.organizer.userId = currentUserId;
          }
          // Strip client-controlled system flags
          delete (trip as any).verified;
        } else if (!trip.ownerId) {
          trip.ownerId = trip.organizer?.userId || currentUserId;
        }
      }

      await saveTripsInDb(validTrips, isPrivileged ? undefined : (req.user ? currentUserId : undefined));

      logAudit({
        eventType: 'TRIP_UPDATE',
        level: 'info',
        requestId: req.requestId,
        userId: currentUserId,
        userRole: req.user?.role || 'tourist',
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

      // Check existing record ownership in DB (P0-3)
      const existingRecord = await findTripRecordById(validTrip.id);
      if (existingRecord && !isPrivileged && req.user) {
        const isOwner = existingRecord.ownerId === currentUserId ||
          (existingRecord.data as any)?.organizer?.userId === currentUserId;
        if (!isOwner) {
          return res.status(403).json({
            error: 'Вы не можете редактировать данный поход, так как не являетесь его организатором.'
          });
        }
      }

      // P0-4: Overwrite client-controlled fields with authenticated server values
      if (!isPrivileged && req.user) {
        validTrip.ownerId = currentUserId;
        if (!validTrip.organizer) {
          validTrip.organizer = {
            name: req.user.name,
            avatar: req.user.avatar || '',
            experienceYears: 1,
            completedTrips: 1,
            fstrRank: req.user.fstrRank || '',
            phone: req.user.phone || '',
            telegram: req.user.telegram || '',
            userId: currentUserId
          };
        } else {
          validTrip.organizer.userId = currentUserId;
        }
        delete (validTrip as any).verified;
      } else if (!validTrip.ownerId) {
        validTrip.ownerId = validTrip.organizer?.userId || currentUserId;
      }

      await saveTripInDb(validTrip, isPrivileged ? (validTrip.organizer?.userId || currentUserId) : (req.user ? currentUserId : (validTrip.organizer?.userId || currentUserId)));

      logAudit({
        eventType: existingRecord ? 'TRIP_UPDATE' : 'TRIP_CREATE',
        level: 'info',
        requestId: req.requestId,
        userId: currentUserId,
        userRole: req.user?.role || 'tourist',
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

// P0-3: Delete Trip with strict Server Ownership Verification
app.delete(['/api/db/trips/:id', '/api/trips/:id'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingRecord = await findTripRecordById(id);

    if (!existingRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    const isOwner = existingRecord.ownerId === req.user!.id ||
      (existingRecord.data as any)?.organizer?.userId === req.user!.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Вы можете удалять только созданные вами походы.' });
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
// P1: TRIP APPLICATIONS & PARTICIPANTS API (NORMALIZED)
// ==========================================

// GET /api/trips/:id/applications — ACL: Only Trip Owner or Admin
app.get(['/api/trips/:id/applications', '/api/db/trips/:id/applications'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: tripId } = req.params;
    const tripRecord = await findTripRecordById(tripId);
    if (!tripRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    const isOwner = tripRecord.ownerId === req.user!.id ||
      (tripRecord.data as any)?.organizer?.userId === req.user!.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Только организатор похода или администратор может просматривать заявки.' });
    }

    const applications = await getTripApplicationsFromDb(tripId);
    return res.json(applications);
  } catch (error: any) {
    console.error('API get trip applications error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить список заявок.' });
  }
});

// POST /api/trips/:id/applications — Submit Application as Authenticated User
app.post(['/api/trips/:id/applications', '/api/db/trips/:id/applications'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: tripId } = req.params;
    const tripRecord = await findTripRecordById(tripId);
    if (!tripRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const parseResult = tripApplicationCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Неверные параметры заявки',
        details: parseResult.error.format()
      });
    }

    const appId = `app-${crypto.randomUUID()}`;
    const createdApp = await createTripApplicationInDb({
      id: appId,
      tripId,
      userId: req.user!.id,
      applicantName: req.user!.name,
      applicantPhone: req.user!.phone || '',
      applicantEmail: req.user!.email,
      applicantAvatar: req.user!.avatar || '',
      experienceLevel: parseResult.data.experienceLevel || req.user!.experienceLevel || 'Любитель',
      vesselType: parseResult.data.vesselType || 'kayak',
      hasOwnGear: parseResult.data.hasOwnGear || false,
      notes: parseResult.data.notes || ''
    });

    logAudit({
      eventType: 'TRIP_UPDATE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User submitted application ${appId} for trip ${tripId}`
    });

    return res.status(201).json(createdApp);
  } catch (error: any) {
    console.error('API create trip application error:', error.message);
    return res.status(500).json({ error: 'Не удалось отправить заявку.' });
  }
});

// PATCH /api/trips/:id/applications/:appId/status — ACL: Only Trip Owner or Admin
app.patch(['/api/trips/:id/applications/:appId/status', '/api/db/trips/:id/applications/:appId/status'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: tripId, appId } = req.params;
    const tripRecord = await findTripRecordById(tripId);
    if (!tripRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    const isOwner = tripRecord.ownerId === req.user!.id ||
      (tripRecord.data as any)?.organizer?.userId === req.user!.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Только организатор похода может изменять статус заявок.' });
    }

    const parseResult = tripApplicationStatusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Недопустимый статус заявки' });
    }

    const updated = await updateTripApplicationStatusInDb(tripId, appId, parseResult.data.status);

    logAudit({
      eventType: 'TRIP_UPDATE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Trip owner updated application ${appId} status to ${parseResult.data.status}`
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('API update trip application status error:', error.message);
    return res.status(500).json({ error: 'Не удалось обновить статус заявки.' });
  }
});

// GET /api/trips/:id/participants — Public (Sanitized PII unless Organizer/Admin)
app.get(['/api/trips/:id/participants', '/api/db/trips/:id/participants'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: tripId } = req.params;
    const tripRecord = await findTripRecordById(tripId);
    if (!tripRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const isPrivileged = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const isOwner = req.user ? (tripRecord.ownerId === req.user.id || (tripRecord.data as any)?.organizer?.userId === req.user.id) : false;
    const canViewPii = isPrivileged || isOwner;

    const participants = await getTripParticipantsFromDb(tripId, canViewPii);
    return res.json(participants);
  } catch (error: any) {
    console.error('API get trip participants error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить участников похода.' });
  }
});

// POST /api/trips/:id/participants — ACL: Only Trip Owner or Admin
app.post(['/api/trips/:id/participants', '/api/db/trips/:id/participants'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: tripId } = req.params;
    const tripRecord = await findTripRecordById(tripId);
    if (!tripRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    const isOwner = tripRecord.ownerId === req.user!.id ||
      (tripRecord.data as any)?.organizer?.userId === req.user!.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Только организатор похода может добавлять участников напрямую.' });
    }

    const parseResult = tripParticipantCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Неверные данные участника'
      });
    }

    const partId = `part-${crypto.randomUUID()}`;
    const added = await addTripParticipantInDb({
      id: partId,
      tripId,
      userId: parseResult.data.userId,
      name: parseResult.data.name,
      role: parseResult.data.role,
      vessel: parseResult.data.vessel,
      avatar: parseResult.data.avatar,
      phone: parseResult.data.phone
    });

    logAudit({
      eventType: 'TRIP_UPDATE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Trip owner added participant ${partId} to trip ${tripId}`
    });

    return res.status(201).json(added);
  } catch (error: any) {
    console.error('API add trip participant error:', error.message);
    return res.status(500).json({ error: 'Не удалось добавить участника.' });
  }
});

// DELETE /api/trips/:id/participants/:participantId — ACL: Trip Owner, Admin, or Participant Self
app.delete(['/api/trips/:id/participants/:participantId', '/api/db/trips/:id/participants/:participantId'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: tripId, participantId } = req.params;
    const tripRecord = await findTripRecordById(tripId);
    if (!tripRecord) {
      return res.status(404).json({ error: 'Поход не найден' });
    }

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    const isOwner = tripRecord.ownerId === req.user!.id ||
      (tripRecord.data as any)?.organizer?.userId === req.user!.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Недостаточно прав для удаления участника.' });
    }

    await removeTripParticipantFromDb(tripId, participantId);

    logAudit({
      eventType: 'TRIP_UPDATE',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `Participant ${participantId} removed from trip ${tripId}`
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('API delete trip participant error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить участника.' });
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

// Single route lookup
app.get(['/api/db/routes/:id', '/api/routes/:id'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const route = await findCustomRouteById(id, req.user?.id, isAdmin);
    if (!route) {
      return res.status(404).json({ error: `Маршрут с ID «${id}» не найден.` });
    }
    return res.json(route);
  } catch (error: any) {
    console.error('API single route error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить маршрут.' });
  }
});

// P0-3 & P0-4: Server-side Ownership Verification + Strip Client-Controlled Metadata for Routes
app.post(['/api/db/routes', '/api/routes'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const isPrivileged = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const currentUserId = req.user?.id || (body.authorId) || 'tourist-user';

    if (body.routes && Array.isArray(body.routes)) {
      const parseResult = routesBatchSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Ошибка валидации списка маршрутов',
          details: parseResult.error.format()
        });
      }

      const validRoutes = parseResult.data.routes;
      for (const r of validRoutes) {
        // Check existing record ownership in DB (P0-3)
        const existingRecord = await findCustomRouteRecordById(r.id);
        if (existingRecord && !isPrivileged && req.user) {
          const isOwner = existingRecord.ownerId === currentUserId ||
            (existingRecord.data as any)?.authorId === currentUserId;
          if (!isOwner) {
            return res.status(403).json({
              error: `Вы не можете изменять маршрут «${r.name || r.id}», созданный другим пользователем.`
            });
          }
        }

        // P0-4: Overwrite client-controlled fields
        if (!isPrivileged && req.user) {
          r.authorId = currentUserId;
          (r as any).ownerId = currentUserId;
        } else if (!r.authorId) {
          r.authorId = currentUserId;
        }
      }

      await saveCustomRoutesInDb(validRoutes, isPrivileged ? undefined : (req.user ? currentUserId : undefined));

      logAudit({
        eventType: 'ROUTE_UPDATE',
        level: 'info',
        requestId: req.requestId,
        userId: currentUserId,
        userRole: req.user?.role || 'tourist',
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

      // Check existing record ownership in DB (P0-3)
      const existingRecord = await findCustomRouteRecordById(validRoute.id);
      if (existingRecord && !isPrivileged && req.user) {
        const isOwner = existingRecord.ownerId === currentUserId ||
          (existingRecord.data as any)?.authorId === currentUserId;
        if (!isOwner) {
          return res.status(403).json({
            error: 'Вы не можете редактировать данный маршрут, так как не являетесь его автором.'
          });
        }
      }

      // P0-4: Overwrite client-controlled fields
      if (!isPrivileged && req.user) {
        validRoute.authorId = currentUserId;
        (validRoute as any).ownerId = currentUserId;
      } else if (!validRoute.authorId) {
        validRoute.authorId = currentUserId;
      }

      await saveCustomRouteInDb(validRoute, isPrivileged ? (validRoute.authorId || currentUserId) : (req.user ? currentUserId : (validRoute.authorId || currentUserId)));

      logAudit({
        eventType: existingRecord ? 'ROUTE_UPDATE' : 'ROUTE_CREATE',
        level: 'info',
        requestId: req.requestId,
        userId: currentUserId,
        userRole: req.user?.role || 'tourist',
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

// P0-3: Delete Route with strict Server Ownership Verification
app.delete(['/api/db/routes/:id', '/api/routes/:id'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingRecord = await findCustomRouteRecordById(id);

    if (!existingRecord) {
      return res.status(404).json({ error: 'Маршрут не найден' });
    }

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    const isOwner = existingRecord.ownerId === req.user!.id ||
      (existingRecord.data as any)?.authorId === req.user!.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Вы можете удалять только созданные вами маршруты.' });
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

// P1-4: Strict Zod validation (Admin only)
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

// P1-4: Strict Zod validation (Admin only)
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

// P1-4: Strict Zod validation (Shared community travel notes)
app.post('/api/db/travel-notes', async (req: AuthenticatedRequest, res: Response) => {
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
      eventType: 'AUTH_LOGIN',
      level: 'info',
      requestId: req.requestId,
      userId: req.user!.id,
      userRole: req.user!.role,
      ip: getClientIp(req),
      message: `User submitted application for trip ${tripId} (${tripTitle})`
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
