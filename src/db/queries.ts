import crypto from 'crypto';
import { db } from './index.ts';
import {
  users,
  companionTrips,
  customRoutes,
  travelNotes,
  articles,
  faqTable,
  refreshTokens,
  revokedTokens,
  auditLogs,
  tripApplications,
  tripParticipants
} from './schema.ts';
import { eq, or, and, sql, desc, count } from 'drizzle-orm';
import { AppUser, UserRole, PublicUserDTO, PrivateUserDTO } from '../types/index.ts';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Helper to sanitize internal user object to PrivateUserDTO
export function toPrivateUserDTO(u: any): PrivateUserDTO {
  if (!u) {
    return {
      id: 'guest',
      email: '',
      name: 'Гость',
      role: 'user',
      phone: '',
      city: 'Сургут',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      experienceLevel: 'Любитель водных походов',
      registeredAt: new Date().toISOString().slice(0, 10),
      favoriteRouteIds: [],
      favoriteRivers: [],
      vesselsOwned: [],
      gearInventory: [],
      badges: [],
      bio: '',
      callsign: '',
      fstrRank: '',
      telegram: '',
      vk: '',
      isReadyForExpeditions: true,
      showContactsPublicly: false
    };
  }
  return {
    id: u.id || 'user-id',
    email: u.email || '',
    name: u.name || 'Пользователь',
    role: (u.role as UserRole) || 'user',
    phone: u.phone || '',
    city: u.city || 'Сургут',
    avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    experienceLevel: u.experienceLevel || 'Любитель водных походов',
    registeredAt: u.registeredAt || new Date().toISOString().slice(0, 10),
    favoriteRouteIds: Array.isArray(u.favoriteRouteIds) ? u.favoriteRouteIds : [],
    favoriteRivers: Array.isArray(u.favoriteRivers) ? u.favoriteRivers : [],
    vesselsOwned: Array.isArray(u.vesselsOwned) ? u.vesselsOwned : [],
    gearInventory: Array.isArray(u.gearInventory) ? u.gearInventory : [],
    badges: Array.isArray(u.badges) ? u.badges : [],
    bio: u.bio || '',
    callsign: u.callsign || '',
    fstrRank: u.fstrRank || '',
    telegram: u.telegram || '',
    vk: u.vk || '',
    isReadyForExpeditions: u.isReadyForExpeditions !== false,
    showContactsPublicly: u.showContactsPublicly === true
  };
}

// Helper to sanitize to PublicUserDTO (Default: phone and telegram are private)
export function toPublicUserDTO(u: any): PublicUserDTO {
  if (!u) {
    return {
      id: 'guest',
      name: 'Гость',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      city: 'Сургут',
      experienceLevel: 'Любитель водных походов',
      badges: [],
      bio: '',
      callsign: '',
      fstrRank: '',
      favoriteRivers: [],
      vesselsOwned: [],
      isReadyForExpeditions: true,
      registeredAt: '2026-01-01'
    };
  }
  const isPublicContact = u.showContactsPublicly === true;
  return {
    id: u.id,
    name: u.name || 'Турист',
    avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    city: u.city || 'Сургут',
    experienceLevel: u.experienceLevel || 'Любитель водных походов',
    badges: Array.isArray(u.badges) ? u.badges : [],
    bio: u.bio || '',
    callsign: u.callsign || '',
    fstrRank: u.fstrRank || '',
    favoriteRivers: Array.isArray(u.favoriteRivers) ? u.favoriteRivers : [],
    vesselsOwned: Array.isArray(u.vesselsOwned) ? u.vesselsOwned : [],
    isReadyForExpeditions: u.isReadyForExpeditions !== false,
    registeredAt: u.registeredAt || '2026-01-01',
    telegram: isPublicContact ? (u.telegram || '') : undefined,
    phone: isPublicContact ? (u.phone || '') : undefined
  };
}

// P0-5: Sanitize public trip output (strip PII like private phone, telegram, applications)
export function sanitizeTripForPublic(trip: any, viewerId?: string, isAdmin?: boolean): any {
  if (!trip) return trip;
  const isOwner = viewerId && (trip.ownerId === viewerId || trip.organizer?.userId === viewerId);
  const canSeePrivateDetails = isOwner || isAdmin;

  const sanitized = { ...trip };

  if (!canSeePrivateDetails) {
    // Strip applications completely from public view
    sanitized.applications = [];

    // Sanitize organizer PII if not publicly shared
    if (sanitized.organizer) {
      sanitized.organizer = {
        ...sanitized.organizer,
        phone: sanitized.organizer.showContactsPublicly ? sanitized.organizer.phone : '',
        telegram: sanitized.organizer.showContactsPublicly ? sanitized.organizer.telegram : ''
      };
    }

    // Sanitize participant phone numbers
    if (Array.isArray(sanitized.participants)) {
      sanitized.participants = sanitized.participants.map((p: any) => ({
        ...p,
        phone: undefined
      }));
    }
  }

  return sanitized;
}

// 1. Find user by email (internal use for login verification)
export async function findUserByEmail(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const list = await db.select().from(users).where(eq(users.email, cleanEmail));
    return list[0] || null;
  } catch (error) {
    console.warn('DB lookup note for user by email:', error);
    return null;
  }
}

// 2. Find user by ID (internal use)
export async function findUserById(id: string) {
  try {
    const list = await db.select().from(users).where(eq(users.id, id));
    return list[0] || null;
  } catch (error) {
    console.warn('DB lookup note for user by id:', error);
    return null;
  }
}

// 3. Get Public Users list with SQL-level pagination (P3)
export async function getPublicUsers(options?: PaginationOptions): Promise<PublicUserDTO[] | PaginatedResult<PublicUserDTO>> {
  try {
    if (options && (options.page || options.limit)) {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const offset = (page - 1) * limit;

      const [totalCountResult] = await db.select({ total: sql<number>`count(*)::int` }).from(users);
      const total = totalCountResult?.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const list = await db
        .select()
        .from(users)
        .orderBy(desc(users.updatedAt))
        .limit(limit)
        .offset(offset);

      return {
        items: list.map(toPublicUserDTO),
        pagination: { total, page, limit, totalPages }
      };
    }

    const list = await db.select().from(users).orderBy(desc(users.updatedAt));
    return list.map(toPublicUserDTO);
  } catch (error) {
    console.error('Error fetching public users from DB:', error);
    throw new Error('Database query failed for public users.');
  }
}

// 4. Get Admin Users list with SQL-level pagination (P3)
export async function getAllUsersForAdmin(options?: PaginationOptions): Promise<PrivateUserDTO[] | PaginatedResult<PrivateUserDTO>> {
  try {
    if (options && (options.page || options.limit)) {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const offset = (page - 1) * limit;

      const [totalCountResult] = await db.select({ total: sql<number>`count(*)::int` }).from(users);
      const total = totalCountResult?.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const list = await db
        .select()
        .from(users)
        .orderBy(desc(users.updatedAt))
        .limit(limit)
        .offset(offset);

      return {
        items: list.map(toPrivateUserDTO),
        pagination: { total, page, limit, totalPages }
      };
    }

    const list = await db.select().from(users).orderBy(desc(users.updatedAt));
    return list.map(toPrivateUserDTO);
  } catch (error) {
    console.error('Error fetching admin users from DB:', error);
    throw new Error('Database query failed for admin users.');
  }
}

// 5. Create new registered user (uses transaction)
export async function createRegisteredUser(data: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role?: UserRole;
  phone?: string;
  city?: string;
  avatar?: string;
  experienceLevel?: string;
  telegram?: string;
  registeredAt?: string;
}): Promise<PrivateUserDTO> {
  return await db.transaction(async (tx) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const assignedRole: UserRole = data.role || 'user';

    const inserted = await tx.insert(users).values({
      id: data.id,
      email: cleanEmail,
      name: data.name.trim(),
      role: assignedRole,
      passwordHash: data.passwordHash,
      phone: data.phone || '',
      city: data.city || 'Сургут',
      avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      experienceLevel: data.experienceLevel || 'Любитель водных походов',
      registeredAt: data.registeredAt || new Date().toISOString().slice(0, 10),
      favoriteRouteIds: [],
      favoriteRivers: [],
      vesselsOwned: [],
      gearInventory: [],
      badges: [],
      bio: '',
      callsign: '',
      fstrRank: '',
      telegram: data.telegram || '',
      vk: '',
      isReadyForExpeditions: true,
      showContactsPublicly: false,
      updatedAt: new Date()
    }).returning();

    return toPrivateUserDTO(inserted[0]);
  });
}

// 6. Update user profile (user modifying their own profile)
export async function updateUserProfile(id: string, updates: Partial<AppUser>): Promise<PrivateUserDTO> {
  try {
    const existing = await findUserById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.experienceLevel !== undefined) updateData.experienceLevel = updates.experienceLevel;
    if (updates.favoriteRouteIds !== undefined) updateData.favoriteRouteIds = updates.favoriteRouteIds;
    if (updates.favoriteRivers !== undefined) updateData.favoriteRivers = updates.favoriteRivers;
    if (updates.vesselsOwned !== undefined) updateData.vesselsOwned = updates.vesselsOwned;
    if (updates.gearInventory !== undefined) updateData.gearInventory = updates.gearInventory;
    if (updates.badges !== undefined) updateData.badges = updates.badges;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.callsign !== undefined) updateData.callsign = updates.callsign;
    if (updates.fstrRank !== undefined) updateData.fstrRank = updates.fstrRank;
    if (updates.telegram !== undefined) updateData.telegram = updates.telegram;
    if (updates.vk !== undefined) updateData.vk = updates.vk;
    if (updates.isReadyForExpeditions !== undefined) updateData.isReadyForExpeditions = updates.isReadyForExpeditions;
    if (updates.showContactsPublicly !== undefined) updateData.showContactsPublicly = updates.showContactsPublicly;

    const updated = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return toPrivateUserDTO(updated[0]);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Database update failed for user profile.');
  }
}

// 7. Update user password
export async function updateUserPassword(id: string, newPasswordHash: string): Promise<void> {
  try {
    await db.update(users).set({
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    }).where(eq(users.id, id));
  } catch (error) {
    console.error('Error updating user password:', error);
    throw new Error('Database update failed for password.');
  }
}

// 8. Admin update user role
export async function adminUpdateUserRole(id: string, newRole: UserRole): Promise<PrivateUserDTO> {
  try {
    const updated = await db.update(users).set({
      role: newRole,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return toPrivateUserDTO(updated[0]);
  } catch (error) {
    console.error('Error updating user role by admin:', error);
    throw new Error('Database update failed for role.');
  }
}

// 8b. Admin update full user details
export async function adminUpdateUser(id: string, updates: Partial<AppUser>): Promise<PrivateUserDTO> {
  try {
    const existing = await findUserById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.email !== undefined) updateData.email = updates.email.trim().toLowerCase();
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.experienceLevel !== undefined) updateData.experienceLevel = updates.experienceLevel;
    if (updates.callsign !== undefined) updateData.callsign = updates.callsign;
    if (updates.fstrRank !== undefined) updateData.fstrRank = updates.fstrRank;
    if (updates.telegram !== undefined) updateData.telegram = updates.telegram;
    if (updates.vk !== undefined) updateData.vk = updates.vk;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.isReadyForExpeditions !== undefined) updateData.isReadyForExpeditions = updates.isReadyForExpeditions;
    if (updates.showContactsPublicly !== undefined) updateData.showContactsPublicly = updates.showContactsPublicly;

    const updated = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return toPrivateUserDTO(updated[0]);
  } catch (error) {
    console.error('Error updating user by admin:', error);
    throw new Error('Database update failed for admin user update.');
  }
}

// 9. Delete user from DB with transaction
export async function deleteUserFromDb(userId: string) {
  return await db.transaction(async (tx) => {
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    await tx.delete(revokedTokens).where(eq(revokedTokens.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
    return { success: true };
  });
}

// 10. Companion Trips DB helpers (with SQL Pagination and PII Sanitization)
export async function findTripRecordById(id: string) {
  try {
    const list = await db.select().from(companionTrips).where(eq(companionTrips.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('Error finding trip record by id:', error);
    return null;
  }
}

export async function findTripById(id: string, viewerId?: string, isAdmin?: boolean) {
  try {
    const list = await db.select().from(companionTrips).where(eq(companionTrips.id, id));
    if (list.length === 0) return null;
    const rawTrip = list[0].data as any;
    return sanitizeTripForPublic(rawTrip, viewerId, isAdmin);
  } catch (error) {
    console.error('Error finding trip by id:', error);
    return null;
  }
}

export async function getAllTripsFromDb(
  filterOptions?: { userId?: string; isAdmin?: boolean },
  pagination?: PaginationOptions
): Promise<any[] | PaginatedResult<any>> {
  try {
    const viewerId = filterOptions?.userId;
    const isAdmin = filterOptions?.isAdmin || false;

    // SQL Where conditions
    let whereClause = undefined;
    if (!isAdmin) {
      if (viewerId) {
        whereClause = or(
          eq(companionTrips.visibility, 'public'),
          eq(companionTrips.ownerId, viewerId)
        );
      } else {
        whereClause = eq(companionTrips.visibility, 'public');
      }
    }

    if (pagination && (pagination.page || pagination.limit)) {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const offset = (page - 1) * limit;

      const totalCountQuery = db.select({ total: sql<number>`count(*)::int` }).from(companionTrips);
      const [totalResult] = whereClause
        ? await totalCountQuery.where(whereClause)
        : await totalCountQuery;

      const total = totalResult?.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const query = db
        .select()
        .from(companionTrips)
        .orderBy(desc(companionTrips.updatedAt))
        .limit(limit)
        .offset(offset);

      const list = whereClause ? await query.where(whereClause) : await query;
      const items = list.map(t => sanitizeTripForPublic(t.data, viewerId, isAdmin));

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    const query = db.select().from(companionTrips).orderBy(desc(companionTrips.updatedAt));
    const list = whereClause ? await query.where(whereClause) : await query;
    return list.map(t => sanitizeTripForPublic(t.data, viewerId, isAdmin));
  } catch (error) {
    console.error('Error fetching trips from DB:', error);
    throw new Error('Database query failed for trips.');
  }
}

export async function saveTripInDb(trip: any, ownerId?: string) {
  try {
    if (!trip || !trip.id) throw new Error('Invalid trip payload');
    const existing = await db.select().from(companionTrips).where(eq(companionTrips.id, trip.id));
    const finalOwnerId = ownerId || (existing[0]?.ownerId) || trip.organizer?.userId || '';
    const visibility = (trip.isPrivate || trip.isPersonal || trip.visibility === 'private' || trip.status === 'draft') ? 'private' : 'public';

    if (finalOwnerId) {
      if (!trip.organizer) trip.organizer = {};
      if (ownerId) {
        trip.organizer.userId = ownerId;
      }
      trip.ownerId = finalOwnerId;
    }

    if (existing.length > 0) {
      await db.update(companionTrips).set({
        ownerId: finalOwnerId,
        visibility,
        data: trip,
        updatedAt: new Date()
      }).where(eq(companionTrips.id, trip.id));
    } else {
      await db.insert(companionTrips).values({
        id: trip.id,
        ownerId: finalOwnerId,
        visibility,
        data: trip,
        updatedAt: new Date()
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving trip in DB:', error);
    throw new Error('Database save failed for trip.');
  }
}

export async function saveTripsInDb(tripsList: any[], ownerId?: string) {
  return await db.transaction(async (tx) => {
    for (const trip of tripsList) {
      if (!trip || !trip.id) continue;
      const existing = await tx.select().from(companionTrips).where(eq(companionTrips.id, trip.id));
      const finalOwnerId = ownerId || (existing[0]?.ownerId) || trip.organizer?.userId || '';
      const visibility = (trip.isPrivate || trip.isPersonal || trip.visibility === 'private' || trip.status === 'draft') ? 'private' : 'public';

      if (finalOwnerId) {
        if (!trip.organizer) trip.organizer = {};
        if (ownerId) {
          trip.organizer.userId = ownerId;
        }
        trip.ownerId = finalOwnerId;
      }

      if (existing.length > 0) {
        await tx.update(companionTrips).set({
          ownerId: finalOwnerId,
          visibility,
          data: trip,
          updatedAt: new Date()
        }).where(eq(companionTrips.id, trip.id));
      } else {
        await tx.insert(companionTrips).values({
          id: trip.id,
          ownerId: finalOwnerId,
          visibility,
          data: trip,
          updatedAt: new Date()
        });
      }
    }
    return { success: true };
  });
}

export async function deleteTripFromDb(tripId: string) {
  return await db.transaction(async (tx) => {
    await tx.delete(tripApplications).where(eq(tripApplications.tripId, tripId));
    await tx.delete(tripParticipants).where(eq(tripParticipants.tripId, tripId));
    await tx.delete(companionTrips).where(eq(companionTrips.id, tripId));
    return { success: true };
  });
}

// ============================================================
// P1: Dedicated Queries for Trip Applications & Participants
// ============================================================

export async function getTripApplicationsFromDb(tripId: string) {
  try {
    return await db
      .select()
      .from(tripApplications)
      .where(eq(tripApplications.tripId, tripId))
      .orderBy(desc(tripApplications.appliedAt));
  } catch (error) {
    console.error('Error fetching trip applications from DB:', error);
    throw new Error('Database query failed for trip applications.');
  }
}

export async function getUserApplicationsFromDb(userId: string) {
  try {
    return await db
      .select()
      .from(tripApplications)
      .where(eq(tripApplications.userId, userId))
      .orderBy(desc(tripApplications.appliedAt));
  } catch (error) {
    console.error('Error fetching user applications from DB:', error);
    throw new Error('Database query failed for user applications.');
  }
}

export async function createTripApplicationInDb(data: {
  id: string;
  tripId: string;
  userId: string;
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  applicantAvatar?: string;
  experienceLevel?: string;
  vesselType?: string;
  hasOwnGear?: boolean;
  notes?: string;
}) {
  try {
    // P0-10: Check if user already has an active pending/accepted application
    const existingApps = await db
      .select()
      .from(tripApplications)
      .where(and(eq(tripApplications.tripId, data.tripId), eq(tripApplications.userId, data.userId)));

    const activeApp = existingApps.find(a => a.status === 'pending' || a.status === 'accepted');
    if (activeApp) {
      throw new Error('Вы уже отправили активную заявку на этот поход.');
    }

    // P0-10: Verify trip capacity
    const tripRec = await db.select().from(companionTrips).where(eq(companionTrips.id, data.tripId));
    if (tripRec.length > 0) {
      const tripData = tripRec[0].data as any;
      const totalSeats = typeof tripData?.totalSeats === 'number' ? tripData.totalSeats : 10;
      const participants = await db
        .select()
        .from(tripParticipants)
        .where(eq(tripParticipants.tripId, data.tripId));
      
      if (participants.length >= totalSeats) {
        throw new Error('К сожалению, в этом походе уже нет свободных мест.');
      }
    }

    const inserted = await db.insert(tripApplications).values({
      id: data.id,
      tripId: data.tripId,
      userId: data.userId,
      applicantName: data.applicantName,
      applicantPhone: data.applicantPhone || '',
      applicantEmail: data.applicantEmail || '',
      applicantAvatar: data.applicantAvatar || '',
      experienceLevel: data.experienceLevel || 'Любитель',
      vesselType: data.vesselType || 'kayak',
      hasOwnGear: data.hasOwnGear || false,
      notes: data.notes || '',
      status: 'pending',
      appliedAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return inserted[0];
  } catch (error: any) {
    console.error('Error creating trip application in DB:', error);
    throw new Error(error.message || 'Database insert failed for trip application.');
  }
}

export async function updateTripApplicationStatusInDb(tripId: string, appId: string, status: 'accepted' | 'declined' | 'pending') {
  return await db.transaction(async (tx) => {
    // If accepting, enforce capacity limit first (P0-10)
    if (status === 'accepted') {
      const tripRec = await tx.select().from(companionTrips).where(eq(companionTrips.id, tripId));
      if (tripRec.length > 0) {
        const tripData = tripRec[0].data as any;
        const totalSeats = typeof tripData?.totalSeats === 'number' ? tripData.totalSeats : 10;
        const currentParticipants = await tx
          .select()
          .from(tripParticipants)
          .where(eq(tripParticipants.tripId, tripId));
        
        if (currentParticipants.length >= totalSeats) {
          throw new Error(`Невозможно принять заявку: все ${totalSeats} мест уже заняты.`);
        }
      }
    }

    const updated = await tx
      .update(tripApplications)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(eq(tripApplications.id, appId), eq(tripApplications.tripId, tripId)))
      .returning();

    if (updated.length === 0) {
      throw new Error('Application not found');
    }

    const application = updated[0];

    // If accepted, ensure participant is automatically registered in trip_participants table
    if (status === 'accepted') {
      const existingPart = await tx
        .select()
        .from(tripParticipants)
        .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, application.userId)));

      if (existingPart.length === 0) {
        const partId = `part-${crypto.randomUUID()}`;
        await tx.insert(tripParticipants).values({
          id: partId,
          tripId,
          userId: application.userId,
          name: application.applicantName,
          role: 'Матрос',
          vessel: application.vesselType || 'kayak',
          avatar: application.applicantAvatar || '',
          phone: application.applicantPhone || '',
          status: 'confirmed',
          joinedAt: new Date()
        });
      }
    } else if (status === 'declined') {
      // If changed to declined, remove from trip_participants if present
      await tx
        .delete(tripParticipants)
        .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, application.userId)));
    }

    // P0-11: Synchronize bookedSeats in companionTrips table with actual confirmed count
    const allConfirmed = await tx
      .select()
      .from(tripParticipants)
      .where(eq(tripParticipants.tripId, tripId));

    const tripRec = await tx.select().from(companionTrips).where(eq(companionTrips.id, tripId));
    if (tripRec.length > 0) {
      const tripData = { ...(tripRec[0].data as any) };
      tripData.bookedSeats = allConfirmed.length;
      await tx
        .update(companionTrips)
        .set({
          data: tripData,
          updatedAt: new Date()
        })
        .where(eq(companionTrips.id, tripId));
    }

    return application;
  });
}

export async function getTripParticipantsFromDb(tripId: string, canViewPii: boolean = false) {
  try {
    const list = await db
      .select()
      .from(tripParticipants)
      .where(eq(tripParticipants.tripId, tripId))
      .orderBy(desc(tripParticipants.joinedAt));

    if (!canViewPii) {
      return list.map(p => ({
        ...p,
        phone: ''
      }));
    }
    return list;
  } catch (error) {
    console.error('Error fetching trip participants from DB:', error);
    throw new Error('Database query failed for trip participants.');
  }
}

export async function addTripParticipantInDb(data: {
  id: string;
  tripId: string;
  userId?: string;
  name: string;
  role?: string;
  vessel?: string;
  avatar?: string;
  phone?: string;
}) {
  return await db.transaction(async (tx) => {
    // Capacity check
    const tripRec = await tx.select().from(companionTrips).where(eq(companionTrips.id, data.tripId));
    if (tripRec.length > 0) {
      const tripData = tripRec[0].data as any;
      const totalSeats = typeof tripData?.totalSeats === 'number' ? tripData.totalSeats : 10;
      const currentParticipants = await tx
        .select()
        .from(tripParticipants)
        .where(eq(tripParticipants.tripId, data.tripId));
      
      if (currentParticipants.length >= totalSeats) {
        throw new Error(`В походе уже достигнут лимит участников (${totalSeats}).`);
      }
    }

    const inserted = await tx.insert(tripParticipants).values({
      id: data.id,
      tripId: data.tripId,
      userId: data.userId || null,
      name: data.name,
      role: data.role || 'Матрос',
      vessel: data.vessel || 'kayak',
      avatar: data.avatar || '',
      phone: data.phone || '',
      status: 'confirmed',
      joinedAt: new Date()
    }).returning();

    // Sync bookedSeats
    const allConfirmed = await tx
      .select()
      .from(tripParticipants)
      .where(eq(tripParticipants.tripId, data.tripId));

    if (tripRec.length > 0) {
      const tripData = { ...(tripRec[0].data as any) };
      tripData.bookedSeats = allConfirmed.length;
      await tx
        .update(companionTrips)
        .set({
          data: tripData,
          updatedAt: new Date()
        })
        .where(eq(companionTrips.id, data.tripId));
    }

    return inserted[0];
  });
}

export async function removeTripParticipantFromDb(tripId: string, participantId: string) {
  return await db.transaction(async (tx) => {
    await tx
      .delete(tripParticipants)
      .where(and(eq(tripParticipants.id, participantId), eq(tripParticipants.tripId, tripId)));

    // Sync bookedSeats
    const allConfirmed = await tx
      .select()
      .from(tripParticipants)
      .where(eq(tripParticipants.tripId, tripId));

    const tripRec = await tx.select().from(companionTrips).where(eq(companionTrips.id, tripId));
    if (tripRec.length > 0) {
      const tripData = { ...(tripRec[0].data as any) };
      tripData.bookedSeats = allConfirmed.length;
      await tx
        .update(companionTrips)
        .set({
          data: tripData,
          updatedAt: new Date()
        })
        .where(eq(companionTrips.id, tripId));
    }

    return { success: true };
  });
}

// 11. Custom Routes DB helpers (with SQL-level pagination)
export async function findCustomRouteRecordById(id: string) {
  try {
    const list = await db.select().from(customRoutes).where(eq(customRoutes.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('Error finding custom route record by id:', error);
    return null;
  }
}

export async function findCustomRouteById(id: string, viewerId?: string, isAdmin?: boolean) {
  try {
    const list = await db.select().from(customRoutes).where(eq(customRoutes.id, id));
    if (list.length === 0) return null;
    const route = list[0];
    if (route.visibility === 'private' && !isAdmin && route.ownerId !== viewerId) {
      return null;
    }
    return route.data;
  } catch (error) {
    console.error('Error finding custom route by id:', error);
    return null;
  }
}

export async function getAllCustomRoutesFromDb(
  filterOptions?: { userId?: string; isAdmin?: boolean },
  pagination?: PaginationOptions
): Promise<any[] | PaginatedResult<any>> {
  try {
    const viewerId = filterOptions?.userId;
    const isAdmin = filterOptions?.isAdmin || false;

    let whereClause = undefined;
    if (!isAdmin) {
      if (viewerId) {
        whereClause = or(
          eq(customRoutes.visibility, 'public'),
          eq(customRoutes.ownerId, viewerId)
        );
      } else {
        whereClause = eq(customRoutes.visibility, 'public');
      }
    }

    if (pagination && (pagination.page || pagination.limit)) {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const offset = (page - 1) * limit;

      const totalCountQuery = db.select({ total: sql<number>`count(*)::int` }).from(customRoutes);
      const [totalResult] = whereClause
        ? await totalCountQuery.where(whereClause)
        : await totalCountQuery;

      const total = totalResult?.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const query = db
        .select()
        .from(customRoutes)
        .orderBy(desc(customRoutes.updatedAt))
        .limit(limit)
        .offset(offset);

      const list = whereClause ? await query.where(whereClause) : await query;
      const items = list.map(r => r.data as any);

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    const query = db.select().from(customRoutes).orderBy(desc(customRoutes.updatedAt));
    const list = whereClause ? await query.where(whereClause) : await query;
    return list.map(r => r.data as any);
  } catch (error) {
    console.error('Error fetching custom routes from DB:', error);
    throw new Error('Database query failed for custom routes.');
  }
}

export async function saveCustomRouteInDb(route: any, ownerId?: string) {
  try {
    if (!route || !route.id) throw new Error('Invalid route payload');
    const existing = await db.select().from(customRoutes).where(eq(customRoutes.id, route.id));
    const finalOwnerId = ownerId || (existing[0]?.ownerId) || route.authorId || '';
    const isExplicitlyPrivate = route.isPersonal && route.isPublic === false;
    const visibility = (isExplicitlyPrivate || route.visibility === 'private') ? 'private' : 'public';

    if (finalOwnerId) {
      if (ownerId) {
        route.authorId = ownerId;
      }
      route.ownerId = finalOwnerId;
    }

    if (existing.length > 0) {
      await db.update(customRoutes).set({
        ownerId: finalOwnerId,
        visibility,
        data: route,
        updatedAt: new Date()
      }).where(eq(customRoutes.id, route.id));
    } else {
      await db.insert(customRoutes).values({
        id: route.id,
        ownerId: finalOwnerId,
        visibility,
        data: route,
        updatedAt: new Date()
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving custom route in DB:', error);
    throw new Error('Database save failed for custom route.');
  }
}

export async function saveCustomRoutesInDb(routesList: any[], ownerId?: string) {
  return await db.transaction(async (tx) => {
    for (const route of routesList) {
      if (!route || !route.id) continue;
      const existing = await tx.select().from(customRoutes).where(eq(customRoutes.id, route.id));
      const finalOwnerId = ownerId || (existing[0]?.ownerId) || route.authorId || '';
      const isExplicitlyPrivate = route.isPersonal && route.isPublic === false;
      const visibility = (isExplicitlyPrivate || route.visibility === 'private') ? 'private' : 'public';

      if (finalOwnerId) {
        if (ownerId) {
          route.authorId = ownerId;
        }
        route.ownerId = finalOwnerId;
      }

      if (existing.length > 0) {
        await tx.update(customRoutes).set({
          ownerId: finalOwnerId,
          visibility,
          data: route,
          updatedAt: new Date()
        }).where(eq(customRoutes.id, route.id));
      } else {
        await tx.insert(customRoutes).values({
          id: route.id,
          ownerId: finalOwnerId,
          visibility,
          data: route,
          updatedAt: new Date()
        });
      }
    }
    return { success: true };
  });
}

export async function deleteCustomRouteFromDb(routeId: string) {
  try {
    await db.delete(customRoutes).where(eq(customRoutes.id, routeId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting custom route from DB:', error);
    throw new Error('Database delete failed for custom route.');
  }
}

// 12. Travel Notes & Reviews DB helpers
export async function getTravelNotesConfigFromDb() {
  try {
    const rec = await db.select().from(travelNotes).where(eq(travelNotes.id, 'main_config'));
    if (rec.length > 0) {
      return rec[0].data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching travel notes from DB:', error);
    throw new Error('Database query failed for travel notes.');
  }
}

export async function saveTravelNotesConfigInDb(configData: any) {
  try {
    const existing = await db.select().from(travelNotes).where(eq(travelNotes.id, 'main_config'));
    if (existing.length > 0) {
      await db.update(travelNotes).set({
        data: configData,
        updatedAt: new Date()
      }).where(eq(travelNotes.id, 'main_config'));
    } else {
      await db.insert(travelNotes).values({
        id: 'main_config',
        data: configData,
        updatedAt: new Date()
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving travel notes in DB:', error);
    throw new Error('Database save failed for travel notes.');
  }
}

// 13. Articles DB helpers (with SQL Pagination)
export async function getAllArticlesFromDb(pagination?: PaginationOptions): Promise<any[] | PaginatedResult<any>> {
  try {
    if (pagination && (pagination.page || pagination.limit)) {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const offset = (page - 1) * limit;

      const [totalResult] = await db.select({ total: sql<number>`count(*)::int` }).from(articles);
      const total = totalResult?.total || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const list = await db
        .select()
        .from(articles)
        .orderBy(desc(articles.updatedAt))
        .limit(limit)
        .offset(offset);

      return {
        items: list.map(a => a.data),
        pagination: { total, page, limit, totalPages }
      };
    }

    const list = await db.select().from(articles).orderBy(desc(articles.updatedAt));
    return list.map(a => a.data);
  } catch (error) {
    console.error('Error fetching articles from DB:', error);
    throw new Error('Database query failed for articles.');
  }
}

export async function saveArticlesInDb(articlesList: any[]) {
  return await db.transaction(async (tx) => {
    for (const art of articlesList) {
      if (!art || !art.id) continue;
      const existing = await tx.select().from(articles).where(eq(articles.id, art.id));
      if (existing.length > 0) {
        await tx.update(articles).set({
          data: art,
          updatedAt: new Date()
        }).where(eq(articles.id, art.id));
      } else {
        await tx.insert(articles).values({
          id: art.id,
          data: art,
          updatedAt: new Date()
        });
      }
    }
    return { success: true };
  });
}

export async function deleteArticleFromDb(articleId: string) {
  try {
    await db.delete(articles).where(eq(articles.id, articleId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting article from DB:', error);
    throw new Error('Database delete failed for article.');
  }
}

// 14. FAQ DB helpers
export async function getFaqConfigFromDb() {
  try {
    const rec = await db.select().from(faqTable).where(eq(faqTable.id, 'main_config'));
    if (rec.length > 0) {
      return rec[0].data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching FAQ from DB:', error);
    throw new Error('Database query failed for FAQ.');
  }
}

export async function saveFaqConfigInDb(configData: any) {
  try {
    const existing = await db.select().from(faqTable).where(eq(faqTable.id, 'main_config'));
    if (existing.length > 0) {
      await db.update(faqTable).set({
        data: configData,
        updatedAt: new Date()
      }).where(eq(faqTable.id, 'main_config'));
    } else {
      await db.insert(faqTable).values({
        id: 'main_config',
        data: configData,
        updatedAt: new Date()
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving FAQ in DB:', error);
    throw new Error('Database save failed for FAQ.');
  }
}

// 15. SuperAdmin Database Reset (Transactional)
export async function resetDatabaseCleanStart() {
  return await db.transaction(async (tx) => {
    await tx.delete(tripApplications);
    await tx.delete(tripParticipants);
    await tx.delete(companionTrips);
    await tx.delete(customRoutes);
    await tx.delete(travelNotes);
    await tx.delete(articles);
    await tx.delete(refreshTokens);
    await tx.delete(revokedTokens);
    return { success: true, timestamp: Date.now() };
  });
}
