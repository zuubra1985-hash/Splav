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

export const tripChatMessageSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  userId: z.string().optional(),
  authorName: z.string().default('Участник'),
  authorAvatar: z.string().optional().default(''),
  role: z.enum(['organizer', 'participant', 'guest']).default('participant'),
  text: z.string().max(2000),
  timestamp: z.string().default(() => new Date().toISOString()),
  createdAt: z.number().optional()
});

// 3. Route & POI Schemas
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

export const gpxTrackSchema = z.object({
  name: z.string().default('GPX Track'),
  lengthKm: z.number().nonnegative().default(0),
  coordinates: z.array(z.tuple([z.number(), z.number()])).default([]),
  startPoint: z.object({
    name: z.string().default(''),
    lat: z.number(),
    lng: z.number()
  }).default({ name: '', lat: 0, lng: 0 }),
  endPoint: z.object({
    name: z.string().default(''),
    lat: z.number(),
    lng: z.number()
  }).default({ name: '', lat: 0, lng: 0 }),
  elevationGainM: z.number().optional(),
  waypoints: z.array(routePoiSchema).optional()
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
  chatMessages: z.array(tripChatMessageSchema).optional().default([]),
  groupChatLink: z.string().optional(),
  commentsCount: z.number().int().nonnegative().default(0),
  gpxTrack: gpxTrackSchema.optional(),
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

// 5. FAQ Config Schema (Strict P2)
export const faqEmergencyContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  description: z.string().default(''),
  badge: z.string().optional(),
  isCritical: z.boolean().optional()
});

export const faqRadioFrequencySchema = z.object({
  id: z.string(),
  name: z.string(),
  frequency: z.string(),
  description: z.string().default(''),
  tag: z.string().default('')
});

export const faqVisualSignalSchema = z.object({
  id: z.string(),
  code: z.string(),
  meaning: z.string(),
  description: z.string().default(''),
  color: z.enum(['red', 'green', 'gray', 'amber']).optional()
});

export const safetyGuideSchema = z.object({
  id: z.string(),
  category: z.enum(['bear', 'hypothermia', 'rapids', 'insects', 'firstaid', 'indigenous', 'satellite']),
  title: z.string(),
  tag: z.string().default(''),
  readTimeMin: z.number().default(3),
  importance: z.enum(['Критически важно', 'Высокая важность', 'Рекомендация']).default('Рекомендация'),
  shortSummary: z.string().default(''),
  rules: z.array(z.string()).default([]),
  doList: z.array(z.string()).default([]),
  dontList: z.array(z.string()).default([]),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    note: z.string().default('')
  })).optional()
});

export const faqQuestionItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.enum(['general', 'permits_gims', 'satellite_sos', 'wildlife', 'routes_logistics']).default('general'),
  isPopular: z.boolean().optional()
});

export const faqConfigSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  warningTitle: z.string().optional(),
  warningText: z.string().optional(),
  sosTemplateText: z.string().optional(),
  cheatSheetContent: z.string().optional(),
  emergencyContacts: z.array(faqEmergencyContactSchema).optional().default([]),
  radioFrequencies: z.array(faqRadioFrequencySchema).optional().default([]),
  visualSignals: z.array(faqVisualSignalSchema).optional().default([]),
  safetyGuides: z.array(safetyGuideSchema).optional().default([]),
  faqQuestions: z.array(faqQuestionItemSchema).optional().default([]),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional()
});

// 6. Travel Notes Schema (Strict P2)
export const travelNoteSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  authorName: z.string().optional(),
  title: z.string(),
  riverName: z.string().optional(),
  category: z.enum(['future_idea', 'gear_lessons', 'secret_camp', 'fishing_spots', 'safety_warning', 'trip_impressions']).default('trip_impressions'),
  season: z.enum(['spring_highwater', 'summer_warm', 'summer_polar', 'autumn_cold']).optional(),
  content: z.string().default(''),
  tags: z.array(z.string()).optional().default([]),
  isPinned: z.boolean().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().optional()
});

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(['life_safety', 'camp_bivouac', 'kitchen_fire', 'repair_vessel', 'firstaid_hygiene', 'wildlife_bear', 'hydro_clothes', 'custom']),
  isChecked: z.boolean().default(false),
  isCustom: z.boolean().optional(),
  notes: z.string().optional(),
  quantity: z.string().optional()
});

export const logbookTripSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  tripId: z.string().optional(),
  riverName: z.string(),
  region: z.enum(['ХМАО', 'ЯНАО']).default('ХМАО'),
  year: z.number().int(),
  month: z.string().default('Июль'),
  durationDays: z.number().nonnegative().default(1),
  distanceKm: z.number().nonnegative().default(0),
  vessel: vesselEnum.default('kayak'),
  role: z.string().default('Матрос / Гребец'),
  status: z.enum(['completed', 'planned', 'evacuated']).default('completed'),
  personalNotes: z.string().default(''),
  difficultyRating: z.string().default('I к.с.'),
  riverRating: z.number().min(1).max(5).optional(),
  photos: z.array(z.string()).optional(),
  createdAt: z.string().default(() => new Date().toISOString())
});

export const riverReviewSchema = z.object({
  id: z.string(),
  riverName: z.string(),
  routeId: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  date: z.string().default(() => new Date().toISOString()),
  ratingOverall: z.number().min(1).max(5),
  ratingScenery: z.number().min(1).max(5).default(5),
  ratingRapids: z.number().min(1).max(5).default(3),
  ratingCamps: z.number().min(1).max(5).default(4),
  ratingFishing: z.number().min(1).max(5).default(4),
  vesselUsed: vesselEnum.default('kayak'),
  comment: z.string().default(''),
  adviceForOthers: z.string().optional()
});

export const crewReviewSchema = z.object({
  id: z.string(),
  tripId: z.string().optional(),
  tripTitle: z.string().optional(),
  targetUserId: z.string(),
  targetUserName: z.string(),
  targetUserAvatar: z.string().optional(),
  authorUserId: z.string(),
  authorUserName: z.string(),
  authorAvatar: z.string().optional(),
  date: z.string().default(() => new Date().toISOString()),
  ratingOverall: z.number().min(1).max(5),
  ratingPaddling: z.number().min(1).max(5).default(5),
  ratingCampSkills: z.number().min(1).max(5).default(5),
  ratingTeamwork: z.number().min(1).max(5).default(5),
  ratingPunctuality: z.number().min(1).max(5).default(5),
  tags: z.array(z.string()).default([]),
  comment: z.string().default('')
});

export const travelNotesConfigSchema = z.object({
  id: z.string().optional(),
  notes: z.array(travelNoteSchema).optional().default([]),
  checklist: z.array(checklistItemSchema).optional().default([]),
  logbookTrips: z.array(logbookTripSchema).optional().default([]),
  riverReviews: z.array(riverReviewSchema).optional().default([]),
  crewReviews: z.array(crewReviewSchema).optional().default([]),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional()
});

// 7. Telegram Application Schema (Strict P1-5)
export const telegramApplicationInputSchema = z.object({
  tripId: z.string().min(1, 'ID похода обязателен'),
  notes: z.string().max(1000, 'Длина сообщения не должна превышать 1000 символов').optional().default(''),
  vesselType: z.string().max(100).optional().default(''),
  experienceLevel: z.string().max(100).optional().default('Любитель')
});

// 8. Trip Applications & Participants Schemas (P1 Normalized Tables)
export const tripApplicationCreateSchema = z.object({
  notes: z.string().max(1000).optional().default(''),
  vesselType: z.string().max(100).optional().default('kayak'),
  experienceLevel: z.string().max(100).optional().default('Любитель'),
  hasOwnGear: z.boolean().optional().default(false)
});

export const tripApplicationStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined'])
});

export const tripParticipantCreateSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1, 'Имя участника обязательно'),
  role: z.string().default('Матрос'),
  vessel: z.string().default('kayak'),
  phone: z.string().optional().default(''),
  avatar: z.string().optional().default('')
});

