export type Region = 'ALL' | 'ХМАО' | 'ЯНАО';

export type VesselType = 'sup' | 'kayak' | 'catamaran' | 'motorboat' | 'raft' | 'packraft';

export type UserRole = 'user' | 'organizer' | 'moderator' | 'admin' | 'superadmin';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  city?: string;
  experienceLevel?: string;
  experience?: string;
  registeredAt: string;
  favoriteRouteIds: string[];
  callsign?: string; // Позывной / Никнейм на воде
  radioCallsign?: string;
  bio?: string; // О себе и стиле сплавов
  fstrRank?: string; // Разряд, звание, сертификат (например: "Инструктор-проводник", "КМС", "II разряд")
  favoriteRivers?: string[]; // Любимые реки (Собь, Тромъёган, Аган, Казым и др.)
  vesselsOwned?: VesselType[]; // Личный флот (катамаран, байдарка, пакрафт, сап, моторка)
  ownedVessels?: VesselType[];
  gearInventory?: string[]; // Снаряжение (спутниковый трекер, палатка 4-сезонная, бензопила, рация, костровое)
  badges?: string[]; // Бейджи и знаки отличия сплавщика
  telegram?: string; // @username в Telegram
  telegramId?: number | string; // Уникальный числовой Telegram ID пользователя
  vk?: string; // Ссылка или id VK
  isReadyForExpeditions?: boolean; // Статус "Готов к экспедициям / Ищу команду"
  showContactsPublicly?: boolean; // Показывать ли телефон всем авторизованным туристам
  isDeleted?: boolean;
  updatedAt?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation?: string;
  };
}

export interface PublicUserDTO {
  id: string;
  name: string;
  avatar?: string;
  city?: string;
  experienceLevel?: string;
  badges?: string[];
  bio?: string;
  callsign?: string;
  fstrRank?: string;
  favoriteRivers?: string[];
  vesselsOwned?: VesselType[];
  isReadyForExpeditions?: boolean;
  registeredAt?: string;
  telegram?: string;
  phone?: string;
}

export interface PrivateUserDTO extends Omit<AppUser, 'password'> {
  // Never contains password or passwordHash
}

export interface AuthResponseDTO {
  token: string;
  user: PrivateUserDTO;
}

export interface RouteCoordinate {
  lat: number;
  lng: number;
  elev?: number;
  label?: string;
}

export interface RoutePOI {
  id: string;
  name: string;
  type: 'rapid' | 'camp' | 'portage' | 'hydro_post' | 'cabin' | 'slipway' | 'sos_point' | 'indigenous' | 'danger';
  lat: number;
  lng: number;
  description: string;
  safetyTips?: string;
  photo?: string;
  kmMark?: number;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface RiverRoute {
  id: string;
  name: string;
  riverName: string;
  region: 'ХМАО' | 'ЯНАО';
  riverBasin?: string; // e.g. "Бассейн р. Северная Сосьва / Обь"
  fstrCategory: string; // e.g. "I к.с.", "II к.с.", "III к.с."
  intlClass: string; // e.g. "Class I", "Class II", "Class III"
  lengthKm: number;
  durationDays: number;
  recommendedVessels: VesselType[];
  startPoint: { name: string; lat: number; lng: number };
  endPoint: { name: string; lat: number; lng: number };
  coordinates: [number, number][];
  elevationGainM: number;
  avgFlowSpeedKmh: number;
  seasonMonths: string;
  description: string;
  shortDesc: string;
  highlights: string[];
  warnings: string[];
  mchsRegistrationRequired: boolean;
  kmnsPermitNeeded: boolean;
  coverImage: string;
  pois: RoutePOI[];
  elevationProfile: { distanceKm: number; elevationM: number; pointName?: string }[];
  gpxFileName: string;
  logisticsTransfer?: {
    accessIn: string; // Заброска к старту
    accessOut: string; // Выброска с финиша
    transportContacts?: string; // Телефоны местных перевозчиков / вездеходов
  };
  recommendedGear?: string[];
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  isPersonal?: boolean;
  isPublic?: boolean;
  lastPassportRevision?: string;
  photos?: string[];
  wikipediaUrl?: string;
  wikipediaExtract?: string;
  isDeleted?: boolean;
  updatedAt?: string;
  // Quality Control & Verification
  verificationStatus?: 'verified' | 'incomplete' | 'needs_review';
  lastVerifiedAt?: string;
  nextVerificationDate?: string;
  logisticsVerifiedAt?: string;
  safetyVerifiedAt?: string;
  dataSource?: string;
  versionHistory?: {
    version: number;
    date: string;
    changeNote: string;
    authorName: string;
  }[];
}

export interface WeatherPoint {
  id: string;
  locationName: string;
  region: 'ХМАО' | 'ЯНАО';
  lat: number;
  lng: number;
  tempC: number;
  feelsLikeC: number;
  windSpeedMs: number;
  windGustMs: number;
  windDirectionDeg: number;
  windDirectionText: string;
  pressureMmHg: number;
  humidityPercent: number;
  precipitationMm: number;
  condition: string;
  icon?: string;
  uvIndex?: number;
  waterTempC: number;
  polarDayInfo: {
    isPolarDay: boolean;
    isPolarNight: boolean;
    isWhiteNights: boolean;
    sunrise: string;
    sunset: string;
    daylightHours: string;
    nightHours: string;
    paddlingWindow: string;
  };
  forecast5Days: {
    day: string;
    date: string;
    tempDay: number;
    tempNight: number;
    condition: string;
    windSpeedMs: number;
    precipProb: number;
  }[];
}

export interface TripApplication {
  id: string;
  tripId: string;
  userId?: string;
  applicantUserId?: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  applicantAvatar?: string;
  experienceLevel: string;
  vesselType?: VesselType;
  hasOwnGear?: boolean;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined';
  appliedAt: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface TripChatMessage {
  id: string;
  tripId: string;
  userId?: string;
  authorName: string;
  authorAvatar?: string;
  role: 'organizer' | 'participant' | 'guest';
  text: string;
  timestamp: string;
  createdAt?: number;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface TripChatPresence {
  userId: string;
  name: string;
  avatar?: string;
  role: 'organizer' | 'participant' | 'guest';
  isOnline: boolean;
  isTyping: boolean;
  lastPing: number;
}

export interface CompanionTrip {
  id: string;
  title: string;
  riverName: string;
  routeId?: string;
  region: 'ХМАО' | 'ЯНАО';
  startDate: string;
  endDate: string;
  durationDays: number;
  vessels: VesselType[];
  fstrCategory: string;
  totalSeats: number;
  bookedSeats: number;
  organizer: {
    userId?: string;
    name: string;
    avatar: string;
    experienceYears: number;
    completedTrips: number;
    fstrRank: string; // e.g. "КМС по водному туризму", "Инструктор-проводник"
    phone: string;
    telegram: string;
  };
  description: string;
  requiredExperience: 'Начинающий (0-1 сплав)' | 'Средний (2-4 сплава)' | 'Опытный (5+ сплавов, пороги)' | 'Экспедиционный (автоном)';
  gearProvided: string[];
  requiredPersonalGear: string[];
  estimatedCostPerPersonRub: number;
  status: 'recruiting' | 'confirmed' | 'completed';
  participants: { userId?: string; name: string; role: string; vessel: VesselType; avatar: string; phone?: string }[];
  applications?: TripApplication[];
  chatMessages?: TripChatMessage[];
  groupChatLink?: string;
  commentsCount: number;
  gpxTrack?: {
    name: string;
    lengthKm: number;
    coordinates: [number, number][];
    startPoint: { name: string; lat: number; lng: number };
    endPoint: { name: string; lat: number; lng: number };
    elevationGainM?: number;
    waypoints?: RoutePOI[];
  };
  gpxFileName?: string;
  isArchived?: boolean;
  archivedAt?: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface MchsFormState {
  leaderFullName: string;
  leaderPhone: string;
  leaderEmail: string;
  leaderPassport: string;
  deputyFullName: string;
  deputyPhone: string;
  participantsCount: number;
  participantsList: string;
  riverName: string;
  region: 'ХМАО' | 'ЯНАО';
  startLocation: string;
  endLocation: string;
  startDate: string;
  endDate: string;
  vesselTypes: string;
  satellitePhone: string;
  satelliteMessenger: string; // Iridium RockSTAR / Garmin inReach
  radioFrequencyMhz: string;
  beaconImei: string;
  checkInPoints: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}

export interface SafetyGuide {
  id: string;
  category: 'bear' | 'hypothermia' | 'rapids' | 'insects' | 'firstaid' | 'indigenous' | 'satellite';
  title: string;
  tag: string;
  readTimeMin: number;
  importance: 'Критически важно' | 'Высокая важность' | 'Рекомендация';
  shortSummary: string;
  rules: string[];
  doList: string[];
  dontList: string[];
  emergencyContacts?: { name: string; phone: string; note: string }[];
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface ArticleReport {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorRank: string;
  authorId?: string;
  authorAvatar?: string;
  riverName: string;
  region: 'ХМАО' | 'ЯНАО';
  date: string;
  readTimeMin: number;
  readTimeMinutes?: number;
  coverImage: string;
  tags: string[];
  summary: string;
  content?: string;
  fullContent: string[];
  stats: { distanceKm: number; days: number; vessel: string; bestMonth: string };
  gallery: { url: string; caption: string }[];
  isDeleted?: boolean;
  updatedAt?: string;
}

export type Article = ArticleReport;

export interface TravelNote {
  id: string;
  userId?: string;
  authorName?: string;
  authorAvatar?: string;
  title: string;
  riverName?: string;
  locationName?: string;
  region?: Region;
  date?: string;
  category: 'future_idea' | 'gear_lessons' | 'secret_camp' | 'fishing_spots' | 'safety_warning' | 'trip_impressions' | 'expedition_report' | 'river_log';
  season?: 'spring_highwater' | 'summer_warm' | 'summer_polar' | 'autumn_cold';
  vesselType?: VesselType;
  durationDays?: number;
  distanceKm?: number;
  waterLevel?: 'high' | 'normal' | 'low';
  riverDifficulty?: string;
  riverRating?: number; // 1 to 5 stars
  content: string;
  practicalTips?: string; // Полезные советы последователям
  tags?: string[];
  photos?: string[];
  likesCount?: number;
  likedByUserIds?: string[];
  isPinned?: boolean;
  isPublic: boolean; // true = "Опубликовано для всех", false = "Только для меня (личный дневник)"
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface LogbookTrip {
  id: string;
  userId?: string;
  tripId?: string;
  riverName: string;
  region: 'ХМАО' | 'ЯНАО';
  year: number;
  month: string;
  durationDays: number;
  distanceKm: number;
  vessel: VesselType;
  role: 'Капитан / Организатор' | 'Матрос / Гребец' | 'Штурман' | 'Костровой / Завпит' | 'Фотограф / Летописец';
  status: 'completed' | 'planned' | 'evacuated';
  personalNotes: string;
  difficultyRating: string; // "I к.с.", "II к.с.", etc.
  riverRating?: number; // 1 to 5 stars
  photos?: string[];
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface RiverReview {
  id: string;
  riverName: string;
  routeId?: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  date: string;
  ratingOverall: number; // 1 to 5
  ratingScenery: number; // 1 to 5
  ratingRapids: number; // 1 to 5
  ratingCamps: number; // 1 to 5
  ratingFishing: number; // 1 to 5
  vesselUsed: VesselType;
  comment: string;
  adviceForOthers?: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface CrewReview {
  id: string;
  tripId?: string;
  tripTitle?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
  authorUserId: string;
  authorUserName: string;
  authorAvatar?: string;
  date: string;
  ratingOverall: number; // 1 to 5
  ratingPaddling: number; // 1 to 5
  ratingCampSkills: number; // 1 to 5
  ratingTeamwork: number; // 1 to 5
  ratingPunctuality: number; // 1 to 5
  tags: string[]; // e.g. "💪 Мощный гребец", "🔥 Мастер костра", "🍲 Шеф-повар", "🧭 Отличный штурман", "🎸 Душа компании"
  comment: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  category: 'life_safety' | 'camp_bivouac' | 'kitchen_fire' | 'repair_vessel' | 'firstaid_hygiene' | 'wildlife_bear' | 'hydro_clothes' | 'custom';
  isChecked: boolean;
  isCustom?: boolean;
  notes?: string;
  quantity?: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface FaqEmergencyContact {
  id: string;
  name: string;
  phone: string;
  description: string;
  badge?: string;
  isCritical?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface FaqRadioFrequency {
  id: string;
  name: string;
  frequency: string;
  description: string;
  tag: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface FaqVisualSignal {
  id: string;
  code: string;
  meaning: string;
  description: string;
  color?: 'red' | 'green' | 'gray' | 'amber';
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface FaqQuestionItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'permits_gims' | 'satellite_sos' | 'wildlife' | 'routes_logistics';
  isPopular?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface TravelNotesConfig {
  id: string;
  notes: TravelNote[];
  checklist: ChecklistItem[];
  logbookTrips: LogbookTrip[];
  riverReviews: RiverReview[];
  crewReviews: CrewReview[];
  updatedAt?: string;
  updatedBy?: string;
  isDeleted?: boolean;
}

export interface FaqDataConfig {
  id: string;
  title: string;
  subtitle: string;
  warningTitle: string;
  warningText: string;
  sosTemplateText: string;
  cheatSheetContent: string;
  emergencyContacts: FaqEmergencyContact[];
  radioFrequencies: FaqRadioFrequency[];
  visualSignals: FaqVisualSignal[];
  safetyGuides: SafetyGuide[];
  faqQuestions: FaqQuestionItem[];
  updatedAt?: string;
  updatedBy?: string;
  isDeleted?: boolean;
}

export interface SectionSyncInfo {
  id: 'routes' | 'trips' | 'travel_notes' | 'articles' | 'faq' | 'users' | 'cloudsql';
  title: string;
  description: string;
  category: 'cloud' | 'database';
  collectionOrTable: string;
  lastUploadedAt: string | null; // ISO string of last successful send to server
  lastDownloadedAt: string | null; // ISO string of last successful fetch/subscription from server
  status: 'synced' | 'syncing' | 'error' | 'idle';
  itemCount: number;
  lastError?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string; // ISO string
  sectionId: 'routes' | 'trips' | 'travel_notes' | 'articles' | 'faq' | 'users' | 'cloudsql' | 'all';
  sectionTitle: string;
  direction: 'upload' | 'download' | 'error' | 'info';
  message: string;
  count?: number;
}

export interface MyTripChecklistSection {
  id: string;
  title: string;
  items: {
    id: string;
    text: string;
    completed: boolean;
    required?: boolean;
    note?: string;
  }[];
}

export interface MyTripCheckpoint {
  id: string;
  name: string;
  date: string;
  time?: string;
  lat?: number;
  lng?: number;
  passed: boolean;
  notes?: string;
}

export interface MyTripEmergencyContact {
  name: string;
  phone: string;
  relation?: string;
  satelliteMessenger?: string;
  notes?: string;
}

export interface MyTrip {
  id: string;
  userId: string;
  routeId: string;
  routeName: string;
  riverName: string;
  region: 'ХМАО' | 'ЯНАО';
  fstrCategory: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  vessels: VesselType[];
  participants: {
    id: string;
    name: string;
    role: string;
    phone?: string;
    isConfirmed: boolean;
  }[];
  checklistSections: MyTripChecklistSection[];
  checkpoints: MyTripCheckpoint[];
  emergencyContact?: MyTripEmergencyContact;
  mchsRegistered: boolean;
  mchsRegistrationNumber?: string;
  satelliteEquipment?: string;
  radioFrequency?: string;
  gpxFileName?: string;
  notes?: string;
  status: 'planning' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface RouteSuitabilityQuery {
  experience: 'none' | 'basic' | 'experienced';
  vessel: VesselType;
  autonomyDays: '1-2' | '3-5' | '5+';
  readinessForHarshConditions: 'low' | 'medium' | 'high';
}

export interface RouteSuitabilityResult {
  isSuitable: boolean;
  score: number; // 0 to 100
  title: string;
  reasons: {
    type: 'success' | 'warning' | 'error';
    text: string;
  }[];
  recommendations: string[];
}

export type KnowledgeMaterialType = 'article' | 'report' | 'pilot_guide' | 'travel_note' | 'safety' | 'faq';

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'route' | 'trip' | 'article' | 'report' | 'note' | 'settlement';
  categoryBadge: string;
  linkTab: 'routes' | 'companions' | 'knowledge' | 'preparation';
  meta?: any;
}


