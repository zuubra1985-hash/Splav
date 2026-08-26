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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'splav86-production-secure-jwt-key-2026-ugra-yamal';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: PrivateUserDTO;
  requestId?: string;
}

// 1. Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: false, // Let Vite & inline scripts work smoothly in AI Studio preview iframe
  crossOriginEmbedderPolicy: false
}));

// 2. CORS setup
app.use(cors({
  origin: true,
  credentials: true
}));

// 3. Request ID middleware
app.use((req: AuthenticatedRequest, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// 4. Body parser with strict volumetric limit (2MB)
app.use(express.json({ limit: '5mb' }));

// 5. Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
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

// 6. JWT Token Helper Functions
function generateToken(user: { id: string; email: string; role: UserRole }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 7. Authentication & RBAC Middlewares
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

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
      const userRecord = await findUserById(decoded.id);
      if (userRecord) {
        req.user = toPrivateUserDTO(userRecord);
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

// Apply authentication parser to all routes
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
    // SuperAdmin always has access to all roles
    if (userRole === 'superadmin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: 'Доступ запрещен. Недостаточно прав для выполнения операции.',
      code: 'FORBIDDEN'
    });
  };
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

const registerSchema = z.object({
  email: z.string().email('Некорректный формат email'),
  password: z.string().min(3, 'Пароль должен содержать не менее 3 символов'),
  name: z.string().min(2, 'Имя должно содержать не менее 2 символов'),
  phone: z.string().optional(),
  city: z.string().optional(),
  experienceLevel: z.string().optional(),
  telegram: z.string().optional()
});

app.post('/api/auth/register', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
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
      return res.status(409).json({
        error: `Пользователь с Email «${cleanEmail}» уже зарегистрирован. Пожалуйста, выполните вход.`,
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const isSuperAdminEmail = cleanEmail === 'zuubra1985@gmail.com';
    const userId = isSuperAdminEmail ? 'user-superadmin-zuubra' : `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const role: UserRole = isSuperAdminEmail ? 'superadmin' : 'user';

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

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    return res.status(201).json({
      token,
      user: newUser
    });
  } catch (error: any) {
    console.error('API Register Error:', error.message);
    return res.status(500).json({ error: 'Ошибка при регистрации. Пожалуйста, попробуйте позже.' });
  }
});

const loginSchema = z.object({
  email: z.string().min(1, 'Email обязателен для входа'),
  password: z.string().min(1, 'Пароль обязателен для входа')
});

app.post('/api/auth/login', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Некорректные параметры входа'
      });
    }

    const { email, password } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();

    // Lookup user in PostgreSQL
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        error: `Пользователь с Email «${cleanEmail}» не найден в единой базе. Пожалуйста, зарегистрируйтесь.`,
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify password with bcrypt
    let isPasswordValid = false;
    if (user.passwordHash) {
      // Check bcrypt hash
      if (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      } else {
        // Legacy plain text check & auto-upgrade to bcrypt hash
        if (user.passwordHash === password) {
          isPasswordValid = true;
          const upgradedHash = await bcrypt.hash(password, 10);
          await updateUserPassword(user.id, upgradedHash);
        }
      }
    }

    // SuperAdmin fallback check for initial boot
    if (!isPasswordValid && cleanEmail === 'zuubra1985@gmail.com') {
      if (password === '110985DimA' || password === 'admin86') {
        isPasswordValid = true;
        const newHash = await bcrypt.hash(password, 10);
        await updateUserPassword(user.id, newHash);
        if (user.role !== 'superadmin') {
          await adminUpdateUserRole(user.id, 'superadmin');
          user.role = 'superadmin';
        }
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Неверный пароль. Пожалуйста, проверьте правильность ввода.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const privateUser = toPrivateUserDTO(user);
    const token = generateToken({ id: privateUser.id, email: privateUser.email, role: privateUser.role });

    return res.json({
      token,
      user: privateUser
    });
  } catch (error: any) {
    console.error('API Login Error:', error.message);
    return res.status(500).json({ error: 'Ошибка сервера при авторизации.' });
  }
});

// ==========================================
// 10. CURRENT USER PROFILE (/api/users/me)
// ==========================================

app.get('/api/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json(req.user);
});

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().optional(),
  experienceLevel: z.string().optional(),
  favoriteRouteIds: z.array(z.string()).optional(),
  favoriteRivers: z.array(z.string()).optional(),
  vesselsOwned: z.array(z.enum(['sup', 'kayak', 'catamaran', 'motorboat', 'raft', 'packraft'])).optional(),
  gearInventory: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  bio: z.string().optional(),
  callsign: z.string().optional(),
  fstrRank: z.string().optional(),
  telegram: z.string().optional(),
  vk: z.string().optional(),
  isReadyForExpeditions: z.boolean().optional(),
  showContactsPublicly: z.boolean().optional()
});

app.patch('/api/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Недопустимые поля обновления',
        details: parseResult.error.format()
      });
    }

    const updatedUser = await updateUserProfile(req.user!.id, parseResult.data as any);
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
    if (userRecord.passwordHash) {
      if (userRecord.passwordHash.startsWith('$2a$') || userRecord.passwordHash.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(currentPassword, userRecord.passwordHash);
      } else {
        isMatch = userRecord.passwordHash === currentPassword;
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Текущий пароль указан неверно.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(req.user!.id, newHash);

    return res.json({ success: true, message: 'Пароль успешно изменен.' });
  } catch (error: any) {
    console.error('API Change Password Error:', error.message);
    return res.status(500).json({ error: 'Ошибка смены пароля.' });
  }
});

// ==========================================
// 11. PUBLIC COMMUNITY MEMBERS DIRECTORY (/api/users/public)
// ==========================================

app.get('/api/users/public', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const publicUsers = await getPublicUsers();
    return res.json(publicUsers);
  } catch (error: any) {
    console.error('API /api/users/public error:', error.message);
    return res.status(500).json({ error: 'Не удалось получить список участников.' });
  }
});

// ==========================================
// 12. ADMIN USER MANAGEMENT (/api/admin/users)
// ==========================================

app.get('/api/admin/users', adminLimiter, requireRole('admin', 'superadmin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUsers = await getAllUsersForAdmin();
    return res.json(adminUsers);
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

    // Only superadmin can promote/demote to/from superadmin or admin
    const targetRole = parseResult.data.role;
    if ((targetRole === 'superadmin' || targetRole === 'admin') && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Только Главный администратор (superadmin) может назначать роли администратора.' });
    }

    const updated = await adminUpdateUserRole(id, targetRole);
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
    return res.json({ success: true, message: `Пользователь ${id} удален.` });
  } catch (error: any) {
    console.error('API Delete User Error:', error.message);
    return res.status(500).json({ error: 'Ошибка удаления пользователя.' });
  }
});

app.post('/api/admin/reset-database', adminLimiter, requireRole('superadmin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await resetDatabaseCleanStart();
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

// Legacy backward-compatibility endpoints for CloudSqlDbService (protected by requireAuth/requireRole)
app.get('/api/db/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      const users = await getAllUsersForAdmin();
      return res.json(users);
    }
    const publicUsers = await getPublicUsers();
    return res.json(publicUsers);
  } catch (error: any) {
    console.error('API /api/db/users error:', error.message);
    return res.status(500).json({ error: 'Не удалось получить пользователей.' });
  }
});

app.post('/api/db/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userPayload = req.body;
    if (!userPayload || !userPayload.id) {
      return res.status(400).json({ error: 'Неверные данные пользователя' });
    }

    // User can only update own profile unless admin
    if (userPayload.id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Вы можете редактировать только свой профиль.' });
    }

    const saved = await updateUserProfile(userPayload.id, userPayload);
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

app.get(['/api/db/trips', '/api/trips'], async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const trips = await getAllTripsFromDb();
    return res.json(trips);
  } catch (error: any) {
    console.error('API trips error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить походы.' });
  }
});

app.post(['/api/db/trips', '/api/trips'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    if (body.trips && Array.isArray(body.trips)) {
      // If user is regular user, only save trips where user is organizer/owner
      if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        for (const trip of body.trips) {
          if (trip.organizer?.userId && trip.organizer.userId !== req.user!.id) {
            return res.status(403).json({ error: 'Вы можете сохранять только свои походы.' });
          }
        }
      }
      await saveTripsInDb(body.trips);
      return res.json({ success: true });
    } else if (body.id) {
      if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        if (body.organizer?.userId && body.organizer.userId !== req.user!.id) {
          return res.status(403).json({ error: 'Вы можете сохранять только свои походы.' });
        }
      }
      await saveTripInDb(body, req.user!.id);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Invalid payload' });
  } catch (error: any) {
    console.error('API save trips error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить поход.' });
  }
});

app.delete(['/api/db/trips/:id', '/api/trips/:id'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const allTrips = await getAllTripsFromDb();
    const existing = allTrips.find((t: any) => t.id === id) as any;

    if (existing && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      if (existing.organizer?.userId && existing.organizer.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Вы можете удалять только созданные вами походы.' });
      }
    }

    await deleteTripFromDb(id);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('API delete trip error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить поход.' });
  }
});

// ==========================================
// 14. RIVER ROUTES & GPX TRACKS API
// ==========================================

app.get(['/api/db/routes', '/api/routes'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user ? (req.user.role === 'admin' || req.user.role === 'superadmin') : false;
    const routes = await getAllCustomRoutesFromDb({
      userId: req.user?.id,
      isAdmin
    });
    return res.json(routes);
  } catch (error: any) {
    console.error('API routes error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить маршруты.' });
  }
});

app.post(['/api/db/routes', '/api/routes'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    if (body.routes && Array.isArray(body.routes)) {
      if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        for (const r of body.routes) {
          if (r.authorId && r.authorId !== req.user!.id && r.authorEmail !== req.user!.email) {
            return res.status(403).json({ error: 'Вы можете сохранять только собственные маршруты.' });
          }
        }
      }
      await saveCustomRoutesInDb(body.routes);
      return res.json({ success: true });
    } else if (body.id) {
      if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        if (body.authorId && body.authorId !== req.user!.id && body.authorEmail !== req.user!.email) {
          return res.status(403).json({ error: 'Вы можете сохранять только собственные маршруты.' });
        }
      }
      await saveCustomRouteInDb(body, req.user!.id);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Invalid payload' });
  } catch (error: any) {
    console.error('API save routes error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить маршрут.' });
  }
});

app.delete(['/api/db/routes/:id', '/api/routes/:id'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const allRoutes = await getAllCustomRoutesFromDb();
    const existing = allRoutes.find((r: any) => r.id === id);

    if (existing && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      if (existing.authorId && existing.authorId !== req.user!.id && existing.authorEmail !== req.user!.email) {
        return res.status(403).json({ error: 'Вы можете удалять только созданные вами маршруты.' });
      }
    }

    await deleteCustomRouteFromDb(id);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('API delete route error:', error.message);
    return res.status(500).json({ error: 'Не удалось удалить маршрут.' });
  }
});

// ==========================================
// 15. ARTICLES & EXPEDITION REPORTS API
// ==========================================

app.get(['/api/db/articles', '/api/articles'], async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const articlesList = await getAllArticlesFromDb();
    return res.json(articlesList);
  } catch (error: any) {
    console.error('API articles error:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить статьи.' });
  }
});

app.post(['/api/db/articles', '/api/articles'], requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { articles: articlesList } = req.body;
    if (!Array.isArray(articlesList)) {
      return res.status(400).json({ error: 'articles array is required' });
    }
    await saveArticlesInDb(articlesList);
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

app.post(['/api/db/faq', '/api/faq'], requireRole('admin', 'superadmin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configData = req.body;
    await saveFaqConfigInDb(configData);
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

app.post('/api/db/travel-notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configData = req.body;
    await saveTravelNotesConfigInDb(configData);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('API save travel notes error:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить путевые заметки.' });
  }
});

// ==========================================
// 18. TELEGRAM NOTIFICATIONS API
// ==========================================

const telegramNotificationSchema = z.object({
  tripTitle: z.string().optional(),
  riverName: z.string().optional(),
  organizerName: z.string().optional(),
  applicantName: z.string().min(1, 'Имя заявителя обязательно'),
  applicantPhone: z.string().min(1, 'Телефон обязателен'),
  applicantEmail: z.string().optional(),
  experienceLevel: z.string().optional(),
  vesselType: z.string().optional(),
  notes: z.string().optional()
});

app.post('/api/notifications/telegram-application', notificationLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = telegramNotificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Неверные данные уведомления' });
    }

    const {
      tripTitle,
      riverName,
      organizerName,
      applicantName,
      applicantPhone,
      applicantEmail,
      experienceLevel,
      vesselType,
      notes
    } = parseResult.data;

    const vesselLabel = vesselType ? String(vesselType).toUpperCase() : 'Каяк / Байдарка / Паккрафт';
    const messageText = `🌊 *Splav86: Новая заявка в экипаж!*\n\n` +
      `📍 *Поход:* ${tripTitle || 'Без названия'} (р. ${riverName || ''})\n` +
      `👑 *Капитан:* ${organizerName || 'Организатор'}\n\n` +
      `👤 *Участник:* ${applicantName}\n` +
      `📞 *Телефон:* ${applicantPhone}\n` +
      (applicantEmail ? `✉️ *Email:* ${applicantEmail}\n` : '') +
      `🛶 *Судно:* ${vesselLabel}\n` +
      `🏆 *Опыт:* ${experienceLevel || 'Любитель'}\n` +
      (notes ? `💬 *Сообщение:* "${notes}"\n\n` : '\n') +
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

    return res.json({
      success: true,
      message: 'Уведомление отправлено.'
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
  console.error(`[Error] Request ID ${requestId}:`, err.message || err);

  return res.status(err.status || 500).json({
    error: 'Внутренняя ошибка сервера. Пожалуйста, обратитесь в службу поддержки.',
    requestId
  });
});

// ==========================================
// 20. STATIC SPA SERVING
// ==========================================

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🔒 Splav86 Secure Server listening on port ${PORT}`);
});
