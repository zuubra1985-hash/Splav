export type Region = 'ALL' | 'ХМАО' | 'ЯНАО';

export type VesselType = 'sup' | 'kayak' | 'catamaran' | 'motorboat' | 'raft';

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  city?: string;
  experienceLevel?: string;
  registeredAt: string;
  favoriteRouteIds: string[];
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
  authorName?: string;
  authorEmail?: string;
  lastPassportRevision?: string;
  photos?: string[];
}

export interface HydroStation {
  id: string;
  name: string;
  river: string;
  region: 'ХМАО' | 'ЯНАО';
  lat: number;
  lng: number;
  currentLevelCm: number;
  change24hCm: number;
  dangerLevelCm: number;
  floodLevelCm: number;
  normalLevelCm: number;
  waterTempC: number;
  iceCondition: string;
  lastUpdated: string;
  historicalTrend: { date: string; level: number }[];
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
}

export interface ArticleReport {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorRank: string;
  riverName: string;
  region: 'ХМАО' | 'ЯНАО';
  date: string;
  readTimeMin: number;
  coverImage: string;
  tags: string[];
  summary: string;
  fullContent: string[];
  stats: { distanceKm: number; days: number; vessel: string; bestMonth: string };
  gallery: { url: string; caption: string }[];
}
