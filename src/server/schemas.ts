import { z } from 'zod';

export const vesselEnum = z.enum(['sup', 'kayak', 'catamaran', 'motorboat', 'raft', 'packraft']);
export const userRoleEnum = z.enum(['user', 'organizer', 'moderator', 'admin', 'superadmin']);

// 1. User Schemas
export const registerUserSchema = z.object({
  email: z.string().email('Некорректный формат email'),
  password: z.string().min(3, 'Пароль должен содержать не менее 3 символов'),
  name: z.string().min(2, 'Имя должно содержать не менее 2 символов'),
  phone: z.string().optional().default(''),
  city: z.string().optional().default('Сургут'),
  experienceLevel: z.string().optional().default('Любитель водных походов'),
  telegram: z.string().optional().default('')
});

export const loginUserSchema = z.object({
  email: z.string().min(1, 'Email обязателен для входа'),
  password: z.string().min(1, 'Пароль обязателен для входа')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен')
});

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().url().or(z.string()).optional(),
  experienceLevel: z.string().optional(),
  favoriteRouteIds: z.array(z.string()).optional(),
  favoriteRivers: z.array(z.string()).optional(),
  vesselsOwned: z.array(vesselEnum).optional(),
  gearInventory: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  bio: z.string().max(2000).optional(),
  callsign: z.string().max(100).optional(),
  fstrRank: z.string().max(100).optional(),
  telegram: z.string().max(100).optional(),
  vk: z.string().max(200).optional(),
  isReadyForExpeditions: z.boolean().optional(),
  showContactsPublicly: z.boolean().optional()
});

export const legacyUserSaveSchema = z.object({
  id: z.string().min(1, 'ID пользователя обязателен'),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().optional(),
  experienceLevel: z.string().optional(),
  favoriteRouteIds: z.array(z.string()).optional(),
  favoriteRivers: z.array(z.string()).optional(),
  vesselsOwned: z.array(vesselEnum).optional(),
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

// 2. Trip Schemas
export const tripOrganizerSchema = z.object({
  userId: z.string().optional(),
  name: z.string().default('Организатор'),
  avatar: z.string().default(''),
  experienceYears: z.number().nonnegative().default(0),
  completedTrips: z.number().nonnegative().default(0),
  fstrRank: z.string().default(''),
  phone: z.string().default(''),
  telegram: z.string().default('')
});

export const tripParticipantSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  role: z.string().default('Матрос'),
  vessel: vesselEnum.default('kayak'),
  avatar: z.string().default(''),
  phone: z.string().optional()
});

export const tripApplicationSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  userId: z.string().optional(),
  applicantName: z.string(),
  applicantPhone: z.string(),
  applicantEmail: z.string().optional(),
  applicantAvatar: z.string().optional(),
  experienceLevel: z.string().default('Любитель'),
  vesselType: vesselEnum.optional(),
  hasOwnGear: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'declined']).default('pending'),
  appliedAt: z.string().default(() => new Date().toISOString())
});

export const companionTripSchema = z.object({
  id: z.string().min(1, 'ID похода обязателен'),
  title: z.string().min(1, 'Название похода обязательно'),
  riverName: z.string().default('Не указана'),
  routeId: z.string().optional(),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).default('ХМАО'),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  durationDays: z.number().nonnegative().default(1),
  vessels: z.array(vesselEnum).default([]),
  fstrCategory: z.string().default('н/к'),
  totalSeats: z.number().int().nonnegative().default(4),
  bookedSeats: z.number().int().nonnegative().default(1),
  organizer: tripOrganizerSchema.default({
    name: 'Организатор',
    avatar: '',
    experienceYears: 0,
    completedTrips: 0,
    fstrRank: '',
    phone: '',
    telegram: ''
  }),
  description: z.string().default(''),
  requiredExperience: z.string().default('Любитель'),
  gearProvided: z.array(z.string()).default([]),
  requiredPersonalGear: z.array(z.string()).default([]),
  estimatedCostPerPersonRub: z.number().nonnegative().default(0),
  status: z.enum(['recruiting', 'confirmed', 'completed']).default('recruiting'),
  participants: z.array(tripParticipantSchema).default([]),
  applications: z.array(tripApplicationSchema).optional().default([]),
  chatMessages: z.array(z.any()).optional().default([]),
  groupChatLink: z.string().optional(),
  commentsCount: z.number().int().nonnegative().default(0),
  gpxTrack: z.any().optional(),
  gpxFileName: z.string().optional(),
  isArchived: z.boolean().optional(),
  archivedAt: z.string().optional(),
  isPrivate: z.boolean().optional(),
  isPersonal: z.boolean().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  ownerId: z.string().optional()
});

export const tripsBatchSchema = z.object({
  trips: z.array(companionTripSchema)
});

// 3. Route Schemas
export const routePoiSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['rapid', 'camp', 'portage', 'hydro_post', 'cabin', 'slipway', 'sos_point', 'indigenous', 'danger']),
  lat: z.number(),
  lng: z.number(),
  description: z.string().default(''),
  safetyTips: z.string().optional(),
  photo: z.string().optional(),
  kmMark: z.number().optional()
});

export const riverRouteSchema = z.object({
  id: z.string().min(1, 'ID маршрута обязателен'),
  name: z.string().min(1, 'Название маршрута обязательно'),
  riverName: z.string().default(''),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).default('ХМАО'),
  riverBasin: z.string().optional(),
  fstrCategory: z.string().default('I к.с.'),
  intlClass: z.string().default('Class I'),
  lengthKm: z.number().nonnegative().default(0),
  durationDays: z.number().nonnegative().default(1),
  recommendedVessels: z.array(vesselEnum).default([]),
  startPoint: z.object({
    name: z.string().default(''),
    lat: z.number(),
    lng: z.number()
  }).default({ name: '', lat: 61.25, lng: 73.4 }),
  endPoint: z.object({
    name: z.string().default(''),
    lat: z.number(),
    lng: z.number()
  }).default({ name: '', lat: 61.25, lng: 73.4 }),
  coordinates: z.array(z.tuple([z.number(), z.number()])).default([]),
  elevationGainM: z.number().default(0),
  avgFlowSpeedKmh: z.number().default(3),
  seasonMonths: z.string().default('Июнь — Сентябрь'),
  description: z.string().default(''),
  shortDesc: z.string().default(''),
  highlights: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  mchsRegistrationRequired: z.boolean().default(false),
  kmnsPermitNeeded: z.boolean().default(false),
  coverImage: z.string().default(''),
  pois: z.array(routePoiSchema).default([]),
  elevationProfile: z.array(z.object({
    distanceKm: z.number(),
    elevationM: z.number(),
    pointName: z.string().optional()
  })).default([]),
  gpxFileName: z.string().default(''),
  logisticsTransfer: z.object({
    accessIn: z.string().default(''),
    accessOut: z.string().default(''),
    transportContacts: z.string().optional()
  }).optional(),
  recommendedGear: z.array(z.string()).optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  authorEmail: z.string().optional(),
  isPersonal: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  lastPassportRevision: z.string().optional(),
  photos: z.array(z.string()).optional(),
  wikipediaUrl: z.string().optional(),
  wikipediaExtract: z.string().optional()
});

export const routesBatchSchema = z.object({
  routes: z.array(riverRouteSchema)
});

// 4. Articles Schema
export const articleSchema = z.object({
  id: z.string().min(1, 'ID статьи обязателен'),
  title: z.string().min(1, 'Заголовок статьи обязателен'),
  subtitle: z.string().default(''),
  author: z.string().default(''),
  authorRank: z.string().default(''),
  riverName: z.string().default(''),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).default('ХМАО'),
  date: z.string().default(() => new Date().toISOString().slice(0, 10)),
  readTimeMinutes: z.number().int().positive().default(5),
  coverImage: z.string().default(''),
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
  authorId: z.string().optional(),
  authorAvatar: z.string().optional(),
  isPublished: z.boolean().default(true),
  likesCount: z.number().int().nonnegative().default(0),
  viewsCount: z.number().int().nonnegative().default(0)
});

export const articlesBatchSchema = z.object({
  articles: z.array(articleSchema)
});

// 5. FAQ Config Schema
export const faqConfigSchema = z.object({
  categories: z.array(z.any()).optional(),
  items: z.array(z.any()).optional(),
  faqCategories: z.array(z.any()).optional(),
  safetyRules: z.array(z.any()).optional(),
  mchsRegions: z.array(z.any()).optional(),
  emergencyContacts: z.array(z.any()).optional()
}).passthrough();

// 6. Travel Notes Schema
export const travelNotesConfigSchema = z.object({
  notes: z.array(z.any()).optional(),
  entries: z.array(z.any()).optional(),
  categories: z.array(z.any()).optional()
}).passthrough();

// 7. Telegram Application Schema (Strict P1-5)
export const telegramApplicationInputSchema = z.object({
  tripId: z.string().min(1, 'ID похода обязателен'),
  notes: z.string().max(1000, 'Длина сообщения не должна превышать 1000 символов').optional().default(''),
  vesselType: z.string().max(100).optional().default(''),
  experienceLevel: z.string().max(100).optional().default('Любитель')
});
