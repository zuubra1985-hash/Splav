import { pgTable, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').default('user').notNull(),
  passwordHash: text('password_hash').default(''),
  phone: text('phone').default(''),
  city: text('city').default('Сургут'),
  avatar: text('avatar').default('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'),
  experienceLevel: text('experience_level').default('Любитель водных походов'),
  registeredAt: text('registered_at'),
  favoriteRouteIds: jsonb('favorite_route_ids').$type<string[]>().default([]),
  favoriteRivers: jsonb('favorite_rivers').$type<string[]>().default([]),
  vesselsOwned: jsonb('vessels_owned').$type<string[]>().default([]),
  gearInventory: jsonb('gear_inventory').$type<string[]>().default([]),
  badges: jsonb('badges').$type<string[]>().default([]),
  bio: text('bio').default(''),
  callsign: text('callsign').default(''),
  fstrRank: text('fstr_rank').default(''),
  telegram: text('telegram').default(''),
  vk: text('vk').default(''),
  isReadyForExpeditions: boolean('is_ready_for_expeditions').default(true),
  showContactsPublicly: boolean('show_contacts_publicly').default(true),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    emailIdx: index('users_email_idx').on(table.email),
    updatedAtIdx: index('users_updated_at_idx').on(table.updatedAt),
    roleIdx: index('users_role_idx').on(table.role)
  };
});

export const companionTrips = pgTable('companion_trips', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').default(''),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    ownerIdx: index('trips_owner_idx').on(table.ownerId),
    updatedAtIdx: index('trips_updated_at_idx').on(table.updatedAt)
  };
});

export const customRoutes = pgTable('custom_routes', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').default(''),
  visibility: text('visibility').default('public'),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    ownerIdx: index('routes_owner_idx').on(table.ownerId),
    visibilityIdx: index('routes_visibility_idx').on(table.visibility)
  };
});

export const travelNotes = pgTable('travel_notes', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const faqTable = pgTable('faq_data', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

