import { pgTable, text, timestamp, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').default('user').notNull(),
  passwordHash: text('password_hash').default('').notNull(),
  phone: text('phone').default('').notNull(),
  city: text('city').default('Сургут').notNull(),
  avatar: text('avatar').default('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80').notNull(),
  experienceLevel: text('experience_level').default('Любитель водных походов').notNull(),
  registeredAt: text('registered_at'),
  favoriteRouteIds: jsonb('favorite_route_ids').$type<string[]>().default([]).notNull(),
  favoriteRivers: jsonb('favorite_rivers').$type<string[]>().default([]).notNull(),
  vesselsOwned: jsonb('vessels_owned').$type<string[]>().default([]).notNull(),
  gearInventory: jsonb('gear_inventory').$type<string[]>().default([]).notNull(),
  badges: jsonb('badges').$type<string[]>().default([]).notNull(),
  bio: text('bio').default('').notNull(),
  callsign: text('callsign').default('').notNull(),
  fstrRank: text('fstr_rank').default('').notNull(),
  telegram: text('telegram').default('').notNull(),
  vk: text('vk').default('').notNull(),
  isReadyForExpeditions: boolean('is_ready_for_expeditions').default(true).notNull(),
  showContactsPublicly: boolean('show_contacts_publicly').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    updatedAtIdx: index('users_updated_at_idx').on(table.updatedAt),
    roleIdx: index('users_role_idx').on(table.role)
  };
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    tokenHashIdx: uniqueIndex('refresh_tokens_hash_idx').on(table.tokenHash),
    userIdIdx: index('refresh_tokens_user_idx').on(table.userId),
    expiresAtIdx: index('refresh_tokens_expires_idx').on(table.expiresAt)
  };
});

export const revokedTokens = pgTable('revoked_tokens', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  userId: text('user_id'),
  expiresAt: timestamp('expires_at').notNull(),
  reason: text('reason').default('logout'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    tokenHashIdx: uniqueIndex('revoked_tokens_hash_idx').on(table.tokenHash),
    expiresAtIdx: index('revoked_tokens_expires_idx').on(table.expiresAt)
  };
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  level: text('level').default('info').notNull(),
  userId: text('user_id'),
  userRole: text('user_role'),
  ip: text('ip'),
  requestId: text('request_id'),
  message: text('message').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    eventTypeIdx: index('audit_logs_event_type_idx').on(table.eventType),
    userIdIdx: index('audit_logs_user_idx').on(table.userId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
  };
});

export const companionTrips = pgTable('companion_trips', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').default('').notNull(),
  visibility: text('visibility').default('public').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    ownerIdx: index('trips_owner_idx').on(table.ownerId),
    visibilityIdx: index('trips_visibility_idx').on(table.visibility),
    updatedAtIdx: index('trips_updated_at_idx').on(table.updatedAt)
  };
});

// P1: Dedicated Normalized Table for Trip Applications
export const tripApplications = pgTable('trip_applications', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  userId: text('user_id').notNull(),
  applicantName: text('applicant_name').notNull(),
  applicantPhone: text('applicant_phone').default('').notNull(),
  applicantEmail: text('applicant_email').default('').notNull(),
  applicantAvatar: text('applicant_avatar').default('').notNull(),
  experienceLevel: text('experience_level').default('Любитель').notNull(),
  vesselType: text('vessel_type').default('kayak').notNull(),
  hasOwnGear: boolean('has_own_gear').default(false).notNull(),
  notes: text('notes').default('').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'accepted' | 'declined'
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    tripIdIdx: index('trip_apps_trip_id_idx').on(table.tripId),
    userIdIdx: index('trip_apps_user_id_idx').on(table.userId),
    statusIdx: index('trip_apps_status_idx').on(table.status)
  };
});

// P1: Dedicated Normalized Table for Trip Participants
export const tripParticipants = pgTable('trip_participants', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  userId: text('user_id'),
  name: text('name').notNull(),
  role: text('role').default('Матрос').notNull(),
  vessel: text('vessel').default('kayak').notNull(),
  avatar: text('avatar').default('').notNull(),
  phone: text('phone').default('').notNull(),
  status: text('status').default('confirmed').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull()
}, (table) => {
  return {
    tripIdIdx: index('trip_parts_trip_id_idx').on(table.tripId),
    userIdIdx: index('trip_parts_user_id_idx').on(table.userId)
  };
});

export const customRoutes = pgTable('custom_routes', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').default('').notNull(),
  visibility: text('visibility').default('public').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    ownerIdx: index('routes_owner_idx').on(table.ownerId),
    visibilityIdx: index('routes_visibility_idx').on(table.visibility)
  };
});

export const travelNotes = pgTable('travel_notes', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const faqTable = pgTable('faq_data', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

