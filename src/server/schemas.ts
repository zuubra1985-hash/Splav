import { z } from 'zod';

export const vesselEnum = z.enum(['sup', 'kayak', 'catamaran', 'motorboat', 'raft', 'packraft']);
export const userRoleEnum = z.enum(['user', 'organizer', 'moderator', 'admin', 'superadmin']);

// Reusable coordinate validators
export const latitudeSchema = z.number().min(-90, 'Широта должна быть в диапазоне от -90 до 90').max(90, 'Широта должна быть в диапазоне от -90 до 90');
export const longitudeSchema = z.number().min(-180, 'Долгота должна быть в диапазоне от -180 до 180').max(180, 'Долгота должна быть в диапазоне от -180 до 180');
export const coordinatePointSchema = z.tuple([latitudeSchema, longitudeSchema]);

export const geoPointSchema = z.object({
  name: z.string().max(200).default(''),
  lat: latitudeSchema,
  lng: longitudeSchema
});

// 1. User Schemas
export const registerUserSchema = z.object({
  email: z.string().email('Некорректный формат email').max(254, 'Email не должен превышать 254 символов'),
  password: z.string().min(12, 'Пароль должен содержать не менее 12 символов').max(128, 'Пароль не должен превышать 128 символов'),
  name: z.string().min(2, 'Имя должно содержать не менее 2 символов').max(100, 'Имя не должно превышать 100 символов'),
  phone: z.string().max(50).optional().default(''),
  city: z.string().max(100).optional().default('Сургут'),
  experienceLevel: z.string().max(100).optional().default('Любитель водных походов'),
  telegram: z.string().max(100).optional().default('')
});

export const loginUserSchema = z.object({
  email: z.string().min(1, 'Email обязателен для входа').max(254),
  password: z.string().min(1, 'Пароль обязателен для входа').max(128)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен').max(2000)
});

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  avatar: z.string().max(2000000).optional(),
  experienceLevel: z.string().max(100).optional(),
  favoriteRouteIds: z.array(z.string().max(100)).max(500).optional(),
  favoriteRivers: z.array(z.string().max(100)).max(100).optional(),
  vesselsOwned: z.array(vesselEnum).max(20).optional(),
  gearInventory: z.array(z.string().max(200)).max(200).optional(),
  badges: z.array(z.string().max(100)).max(100).optional(),
  bio: z.string().max(2000).optional(),
  callsign: z.string().max(100).optional(),
  fstrRank: z.string().max(100).optional(),
  telegram: z.string().max(100).optional(),
  vk: z.string().max(200).optional(),
  isReadyForExpeditions: z.boolean().optional(),
  showContactsPublicly: z.boolean().optional()
});

export const legacyUserSaveSchema = z.object({
  id: z.string().min(1, 'ID пользователя обязателен').max(100),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  avatar: z.string().max(1000).optional(),
  experienceLevel: z.string().max(100).optional(),
  favoriteRouteIds: z.array(z.string().max(100)).max(500).optional(),
  favoriteRivers: z.array(z.string().max(100)).max(100).optional(),
  vesselsOwned: z.array(vesselEnum).max(20).optional(),
  gearInventory: z.array(z.string().max(200)).max(200).optional(),
  badges: z.array(z.string().max(100)).max(100).optional(),
  bio: z.string().max(2000).optional(),
  callsign: z.string().max(100).optional(),
  fstrRank: z.string().max(100).optional(),
  telegram: z.string().max(100).optional(),
  vk: z.string().max(200).optional(),
  isReadyForExpeditions: z.boolean().optional(),
  showContactsPublicly: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

// 2. Trip Schemas
export const tripOrganizerSchema = z.object({
  userId: z.string().max(100).optional(),
  name: z.string().max(100).default('Организатор'),
  avatar: z.string().max(1000).default(''),
  experienceYears: z.number().nonnegative().max(100).default(0),
  completedTrips: z.number().nonnegative().max(10000).default(0),
  fstrRank: z.string().max(100).default(''),
  phone: z.string().max(50).default(''),
  telegram: z.string().max(100).default('')
});

export const tripParticipantSchema = z.object({
  userId: z.string().max(100).optional(),
  name: z.string().max(100),
  role: z.string().max(100).default('Матрос'),
  vessel: vesselEnum.default('kayak'),
  avatar: z.string().max(1000).default(''),
  phone: z.string().max(50).optional()
});

export const tripApplicationSchema = z.object({
  id: z.string().max(100),
  tripId: z.string().max(100),
  userId: z.string().max(100).optional(),
  applicantName: z.string().max(100),
  applicantPhone: z.string().max(50),
  applicantEmail: z.string().max(254).optional(),
  applicantAvatar: z.string().max(1000).optional(),
  experienceLevel: z.string().max(100).default('Любитель'),
  vesselType: vesselEnum.optional(),
  hasOwnGear: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['pending', 'accepted', 'declined']).default('pending'),
  appliedAt: z.string().max(50).default(() => new Date().toISOString()),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const tripChatMessageSchema = z.object({
  id: z.string().max(100),
  tripId: z.string().max(100),
  userId: z.string().max(100).optional(),
  authorName: z.string().max(100).default('Участник'),
  authorAvatar: z.string().max(1000).optional().default(''),
  role: z.enum(['organizer', 'participant', 'guest']).default('participant'),
  text: z.string().max(2000),
  timestamp: z.string().max(50).default(() => new Date().toISOString()),
  createdAt: z.number().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

// 3. Route & POI Schemas
export const routePoiSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  type: z.enum(['rapid', 'camp', 'portage', 'hydro_post', 'cabin', 'slipway', 'sos_point', 'indigenous', 'danger']),
  lat: latitudeSchema,
  lng: longitudeSchema,
  description: z.string().max(2000).default(''),
  safetyTips: z.string().max(2000).optional(),
  photo: z.string().max(1000).optional(),
  kmMark: z.number().max(10000).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const gpxTrackSchema = z.object({
  name: z.string().max(200).default('GPX Track'),
  lengthKm: z.number().nonnegative().max(100000).default(0),
  coordinates: z.array(coordinatePointSchema).max(50000).default([]),
  startPoint: geoPointSchema.default({ name: '', lat: 61.25, lng: 73.4 }),
  endPoint: geoPointSchema.default({ name: '', lat: 61.25, lng: 73.4 }),
  elevationGainM: z.number().max(10000).optional(),
  waypoints: z.array(routePoiSchema).max(500).optional()
});

export const companionTripSchema = z.object({
  id: z.string().min(1, 'ID сплава обязателен').max(100),
  title: z.string().min(1, 'Название сплава обязательно').max(300),
  riverName: z.string().max(200).default('Не указана'),
  routeId: z.string().max(100).optional(),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).default('ХМАО'),
  startDate: z.string().max(50).default(''),
  endDate: z.string().max(50).default(''),
  durationDays: z.number().nonnegative().max(365).default(1),
  vessels: z.array(vesselEnum).max(20).default([]),
  fstrCategory: z.string().max(50).default('н/к'),
  totalSeats: z.number().int().nonnegative().max(1000).default(4),
  bookedSeats: z.number().int().nonnegative().max(1000).default(1),
  organizer: tripOrganizerSchema.default({
    name: 'Организатор',
    avatar: '',
    experienceYears: 0,
    completedTrips: 0,
    fstrRank: '',
    phone: '',
    telegram: ''
  }),
  description: z.string().max(20000).default(''),
  requiredExperience: z.string().max(100).default('Любитель'),
  gearProvided: z.array(z.string().max(200)).max(100).default([]),
  requiredPersonalGear: z.array(z.string().max(200)).max(100).default([]),
  estimatedCostPerPersonRub: z.number().nonnegative().max(10000000).default(0),
  status: z.enum(['recruiting', 'confirmed', 'completed']).default('recruiting'),
  participants: z.array(tripParticipantSchema).max(100).default([]),
  applications: z.array(tripApplicationSchema).max(200).optional().default([]),
  chatMessages: z.array(tripChatMessageSchema).max(1000).optional().default([]),
  groupChatLink: z.string().max(500).optional(),
  commentsCount: z.number().int().nonnegative().max(10000).default(0),
  gpxTrack: gpxTrackSchema.optional(),
  gpxFileName: z.string().max(255).optional(),
  isArchived: z.boolean().optional(),
  archivedAt: z.string().max(50).optional(),
  isPrivate: z.boolean().optional(),
  isPersonal: z.boolean().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  ownerId: z.string().max(100).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const tripsBatchSchema = z.object({
  trips: z.array(companionTripSchema).max(100)
});

export const riverRouteSchema = z.object({
  id: z.string().min(1, 'ID маршрута обязателен').max(100),
  name: z.string().min(1, 'Название маршрута обязательно').max(300),
  riverName: z.string().max(200).default(''),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).default('ХМАО'),
  riverBasin: z.string().max(200).optional(),
  fstrCategory: z.string().max(50).default('I к.с.'),
  intlClass: z.string().max(50).default('Class I'),
  lengthKm: z.number().nonnegative().max(100000).default(0),
  durationDays: z.number().nonnegative().max(365).default(1),
  recommendedVessels: z.array(vesselEnum).max(20).default([]),
  startPoint: geoPointSchema.default({ name: '', lat: 61.25, lng: 73.4 }),
  endPoint: geoPointSchema.default({ name: '', lat: 61.25, lng: 73.4 }),
  coordinates: z.array(coordinatePointSchema).max(50000).default([]),
  elevationGainM: z.number().max(10000).default(0),
  avgFlowSpeedKmh: z.number().max(200).default(3),
  seasonMonths: z.string().max(100).default('Июнь — Сентябрь'),
  description: z.string().max(20000).default(''),
  shortDesc: z.string().max(1000).default(''),
  highlights: z.array(z.string().max(500)).max(100).default([]),
  warnings: z.array(z.string().max(500)).max(100).default([]),
  mchsRegistrationRequired: z.boolean().default(false),
  kmnsPermitNeeded: z.boolean().default(false),
  coverImage: z.string().default(''),
  pois: z.array(routePoiSchema).max(500).default([]),
  elevationProfile: z.array(z.object({
    distanceKm: z.number().max(100000),
    elevationM: z.number().max(10000),
    pointName: z.string().max(200).optional()
  })).max(2000).default([]),
  gpxFileName: z.string().max(255).default(''),
  logisticsTransfer: z.object({
    accessIn: z.string().max(1000).default(''),
    accessOut: z.string().max(1000).default(''),
    transportContacts: z.string().max(1000).optional()
  }).optional(),
  recommendedGear: z.array(z.string().max(200)).max(100).optional(),
  authorId: z.string().max(100).optional(),
  authorName: z.string().max(100).optional(),
  authorEmail: z.string().max(254).optional(),
  isPersonal: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  lastPassportRevision: z.string().max(50).optional(),
  photos: z.array(z.string()).max(100).optional(),
  wikipediaUrl: z.string().max(1000).optional(),
  wikipediaExtract: z.string().max(5000).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const routesBatchSchema = z.object({
  routes: z.array(riverRouteSchema).max(100)
});

// 4. Articles Schema
export const articleSchema = z.object({
  id: z.string().min(1, 'ID статьи обязателен').max(100),
  title: z.string().min(1, 'Заголовок статьи обязателен').max(300),
  subtitle: z.string().max(500).default(''),
  author: z.string().max(100).default(''),
  authorRank: z.string().max(100).default(''),
  riverName: z.string().max(200).default(''),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).default('ХМАО'),
  date: z.string().max(50).default(() => new Date().toISOString().slice(0, 10)),
  readTimeMinutes: z.number().int().positive().max(600).default(5),
  coverImage: z.string().max(1000).default(''),
  content: z.string().max(50000).default(''),
  tags: z.array(z.string().max(100)).max(50).default([]),
  authorId: z.string().max(100).optional(),
  authorAvatar: z.string().max(1000).optional(),
  isPublished: z.boolean().default(true),
  likesCount: z.number().int().nonnegative().max(1000000).default(0),
  viewsCount: z.number().int().nonnegative().max(10000000).default(0),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const articlesBatchSchema = z.object({
  articles: z.array(articleSchema).max(100)
});

// 5. FAQ Config Schema (Strict P2)
export const faqEmergencyContactSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  phone: z.string().max(50),
  description: z.string().max(1000).default(''),
  badge: z.string().max(100).optional(),
  isCritical: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const faqRadioFrequencySchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  frequency: z.string().max(100),
  description: z.string().max(1000).default(''),
  tag: z.string().max(100).default(''),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const faqVisualSignalSchema = z.object({
  id: z.string().max(100),
  code: z.string().max(50),
  meaning: z.string().max(500),
  description: z.string().max(1000).default(''),
  color: z.enum(['red', 'green', 'gray', 'amber']).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const safetyGuideSchema = z.object({
  id: z.string().max(100),
  category: z.enum(['bear', 'hypothermia', 'rapids', 'insects', 'firstaid', 'indigenous', 'satellite']),
  title: z.string().max(300),
  tag: z.string().max(100).default(''),
  readTimeMin: z.number().max(120).default(3),
  importance: z.enum(['Критически важно', 'Высокая важность', 'Рекомендация']).default('Рекомендация'),
  shortSummary: z.string().max(1000).default(''),
  rules: z.array(z.string().max(1000)).max(100).default([]),
  doList: z.array(z.string().max(1000)).max(100).default([]),
  dontList: z.array(z.string().max(1000)).max(100).default([]),
  emergencyContacts: z.array(z.object({
    name: z.string().max(200),
    phone: z.string().max(50),
    note: z.string().max(500).default('')
  })).max(50).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const faqQuestionItemSchema = z.object({
  id: z.string().max(100),
  question: z.string().max(500),
  answer: z.string().max(10000),
  category: z.enum(['general', 'permits_gims', 'satellite_sos', 'wildlife', 'routes_logistics']).default('general'),
  isPopular: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const faqConfigSchema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().max(300).optional(),
  subtitle: z.string().max(500).optional(),
  warningTitle: z.string().max(300).optional(),
  warningText: z.string().max(2000).optional(),
  sosTemplateText: z.string().max(2000).optional(),
  cheatSheetContent: z.string().max(10000).optional(),
  emergencyContacts: z.array(faqEmergencyContactSchema).max(100).optional().default([]),
  radioFrequencies: z.array(faqRadioFrequencySchema).max(100).optional().default([]),
  visualSignals: z.array(faqVisualSignalSchema).max(100).optional().default([]),
  safetyGuides: z.array(safetyGuideSchema).max(100).optional().default([]),
  faqQuestions: z.array(faqQuestionItemSchema).max(500).optional().default([]),
  updatedAt: z.string().max(50).optional(),
  updatedBy: z.string().max(100).optional(),
  isDeleted: z.boolean().optional()
});

// 6. Travel Notes Schema (Strict P2)
export const travelNoteSchema = z.object({
  id: z.string().max(100),
  userId: z.string().max(100).optional(),
  authorName: z.string().max(100).optional(),
  authorAvatar: z.string().optional(),
  title: z.string().max(300),
  riverName: z.string().max(200).optional(),
  locationName: z.string().max(200).optional(),
  region: z.enum(['ХМАО', 'ЯНАО', 'ALL']).optional(),
  date: z.string().max(50).optional(),
  category: z.enum(['future_idea', 'gear_lessons', 'secret_camp', 'fishing_spots', 'safety_warning', 'trip_impressions', 'expedition_report', 'river_log']).default('trip_impressions'),
  season: z.enum(['spring_highwater', 'summer_warm', 'summer_polar', 'autumn_cold']).optional(),
  vesselType: vesselEnum.optional(),
  durationDays: z.number().nonnegative().max(365).optional(),
  distanceKm: z.number().nonnegative().max(100000).optional(),
  waterLevel: z.enum(['high', 'normal', 'low']).optional(),
  riverDifficulty: z.string().max(50).optional(),
  riverRating: z.number().min(1).max(5).optional(),
  content: z.string().max(50000).default(''),
  practicalTips: z.string().max(10000).optional(),
  tags: z.array(z.string().max(100)).max(50).optional().default([]),
  photos: z.array(z.string()).max(50).optional().default([]),
  likesCount: z.number().int().nonnegative().max(1000000).optional().default(0),
  likedByUserIds: z.array(z.string().max(100)).max(1000).optional().default([]),
  isPinned: z.boolean().optional(),
  isPublic: z.boolean().default(true),
  createdAt: z.string().max(50).default(() => new Date().toISOString()),
  updatedAt: z.string().max(50).optional(),
  isDeleted: z.boolean().optional()
});

export const checklistItemSchema = z.object({
  id: z.string().max(100),
  text: z.string().max(500),
  category: z.enum(['life_safety', 'camp_bivouac', 'kitchen_fire', 'repair_vessel', 'firstaid_hygiene', 'wildlife_bear', 'hydro_clothes', 'custom']),
  isChecked: z.boolean().default(false),
  isCustom: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  quantity: z.string().max(50).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const logbookTripSchema = z.object({
  id: z.string().max(100),
  userId: z.string().max(100).optional(),
  tripId: z.string().max(100).optional(),
  riverName: z.string().max(200),
  region: z.enum(['ХМАО', 'ЯНАО']).default('ХМАО'),
  year: z.number().int().min(1900).max(2100),
  month: z.string().max(50).default('Июль'),
  durationDays: z.number().nonnegative().max(365).default(1),
  distanceKm: z.number().nonnegative().max(100000).default(0),
  vessel: vesselEnum.default('kayak'),
  role: z.string().max(100).default('Матрос / Гребец'),
  status: z.enum(['completed', 'planned', 'evacuated']).default('completed'),
  personalNotes: z.string().max(10000).default(''),
  difficultyRating: z.string().max(50).default('I к.с.'),
  riverRating: z.number().min(1).max(5).optional(),
  photos: z.array(z.string()).max(50).optional(),
  createdAt: z.string().max(50).default(() => new Date().toISOString()),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const riverReviewSchema = z.object({
  id: z.string().max(100),
  riverName: z.string().max(200),
  routeId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  userName: z.string().max(100),
  userAvatar: z.string().max(1000).optional(),
  date: z.string().max(50).default(() => new Date().toISOString()),
  ratingOverall: z.number().min(1).max(5),
  ratingScenery: z.number().min(1).max(5).default(5),
  ratingRapids: z.number().min(1).max(5).default(3),
  ratingCamps: z.number().min(1).max(5).default(4),
  ratingFishing: z.number().min(1).max(5).default(4),
  vesselUsed: vesselEnum.default('kayak'),
  comment: z.string().max(5000).default(''),
  adviceForOthers: z.string().max(5000).optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const crewReviewSchema = z.object({
  id: z.string().max(100),
  tripId: z.string().max(100).optional(),
  tripTitle: z.string().max(300).optional(),
  targetUserId: z.string().max(100),
  targetUserName: z.string().max(100),
  targetUserAvatar: z.string().max(1000).optional(),
  authorUserId: z.string().max(100),
  authorUserName: z.string().max(100),
  authorAvatar: z.string().max(1000).optional(),
  date: z.string().max(50).default(() => new Date().toISOString()),
  ratingOverall: z.number().min(1).max(5),
  ratingPaddling: z.number().min(1).max(5).default(5),
  ratingCampSkills: z.number().min(1).max(5).default(5),
  ratingTeamwork: z.number().min(1).max(5).default(5),
  ratingPunctuality: z.number().min(1).max(5).default(5),
  tags: z.array(z.string().max(100)).max(50).default([]),
  comment: z.string().max(5000).default(''),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().max(50).optional()
});

export const travelNotesConfigSchema = z.object({
  id: z.string().max(100).optional(),
  notes: z.array(travelNoteSchema).max(500).optional().default([]),
  checklist: z.array(checklistItemSchema).max(500).optional().default([]),
  logbookTrips: z.array(logbookTripSchema).max(500).optional().default([]),
  riverReviews: z.array(riverReviewSchema).max(500).optional().default([]),
  crewReviews: z.array(crewReviewSchema).max(500).optional().default([]),
  updatedAt: z.string().max(50).optional(),
  updatedBy: z.string().max(100).optional(),
  isDeleted: z.boolean().optional()
});

// 7. Telegram Application Schema (Strict P1-5)
export const telegramApplicationInputSchema = z.object({
  tripId: z.string().min(1, 'ID сплава обязателен').max(100),
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
  userId: z.string().max(100).optional(),
  name: z.string().min(1, 'Имя участника обязательно').max(100),
  role: z.string().max(100).default('Матрос'),
  vessel: z.string().max(100).default('kayak'),
  phone: z.string().max(50).optional().default(''),
  avatar: z.string().max(1000).optional().default('')
});

