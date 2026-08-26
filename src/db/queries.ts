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
  auditLogs
} from './schema.ts';
import { eq, or, and, sql, desc } from 'drizzle-orm';
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
export function toPrivateUserDTO(u: typeof users.$inferSelect): PrivateUserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: (u.role as UserRole) || 'user',
    phone: u.phone || '',
    city: u.city || 'Сургут',
    avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    experienceLevel: u.experienceLevel || 'Любитель водных походов',
    registeredAt: u.registeredAt || new Date().toISOString().slice(0, 10),
    favoriteRouteIds: (u.favoriteRouteIds as string[]) || [],
    favoriteRivers: (u.favoriteRivers as string[]) || [],
    vesselsOwned: (u.vesselsOwned as any[]) || [],
    gearInventory: (u.gearInventory as string[]) || [],
    badges: (u.badges as string[]) || [],
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
export function toPublicUserDTO(u: typeof users.$inferSelect): PublicUserDTO {
  const isPublicContact = u.showContactsPublicly === true;
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    city: u.city || 'Сургут',
    experienceLevel: u.experienceLevel || 'Любитель водных походов',
    badges: (u.badges as string[]) || [],
    bio: u.bio || '',
    callsign: u.callsign || '',
    fstrRank: u.fstrRank || '',
    favoriteRivers: (u.favoriteRivers as string[]) || [],
    vesselsOwned: (u.vesselsOwned as any[]) || [],
    isReadyForExpeditions: u.isReadyForExpeditions !== false,
    registeredAt: u.registeredAt || '2026-01-01',
    telegram: isPublicContact ? (u.telegram || '') : undefined,
    phone: isPublicContact ? (u.phone || '') : undefined
  };
}

// 1. Find user by email (internal use for login verification)
export async function findUserByEmail(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const list = await db.select().from(users).where(eq(users.email, cleanEmail));
    return list[0] || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw new Error('Database lookup failed.');
  }
}

// 2. Find user by ID (internal use)
export async function findUserById(id: string) {
  try {
    const list = await db.select().from(users).where(eq(users.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('Error finding user by id:', error);
    throw new Error('Database lookup failed.');
  }
}

// 3. Get Public Users list with optional pagination
export async function getPublicUsers(options?: PaginationOptions): Promise<PublicUserDTO[] | PaginatedResult<PublicUserDTO>> {
  try {
    const list = await db.select().from(users).orderBy(desc(users.updatedAt));
    const dtos = list.map(toPublicUserDTO);

    if (options && (options.page || options.limit)) {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const total = dtos.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const start = (page - 1) * limit;
      const items = dtos.slice(start, start + limit);

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    return dtos;
  } catch (error) {
    console.error('Error fetching public users from DB:', error);
    throw new Error('Database query failed for public users.');
  }
}

// 4. Get Admin Users list with optional pagination
export async function getAllUsersForAdmin(options?: PaginationOptions): Promise<PrivateUserDTO[] | PaginatedResult<PrivateUserDTO>> {
  try {
    const list = await db.select().from(users).orderBy(desc(users.updatedAt));
    const dtos = list.map(toPrivateUserDTO);

    if (options && (options.page || options.limit)) {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const total = dtos.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const start = (page - 1) * limit;
      const items = dtos.slice(start, start + limit);

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    return dtos;
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

// 9. Delete user from DB with transaction
export async function deleteUserFromDb(userId: string) {
  return await db.transaction(async (tx) => {
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    await tx.delete(revokedTokens).where(eq(revokedTokens.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
    return { success: true };
  });
}

// 10. Companion Trips DB helpers
export async function findTripById(id: string) {
  try {
    const list = await db.select().from(companionTrips).where(eq(companionTrips.id, id));
    if (list.length === 0) return null;
    return list[0].data as any;
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
    const list = await db.select().from(companionTrips).orderBy(desc(companionTrips.updatedAt));
    let trips = list.map(t => t.data as any);

    // If filtering for non-admin, separate public trips and user's private trips
    if (filterOptions && !filterOptions.isAdmin) {
      trips = trips.filter(t => {
        const isPrivate = t.isPrivate === true || t.isPersonal === true || t.visibility === 'private' || t.status === 'draft';
        if (!isPrivate) return true;
        // Private trips are only visible to the organizer/owner
        if (filterOptions.userId && (t.ownerId === filterOptions.userId || t.organizer?.userId === filterOptions.userId)) {
          return true;
        }
        return false;
      });
    }

    if (pagination && (pagination.page || pagination.limit)) {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const total = trips.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const start = (page - 1) * limit;
      const items = trips.slice(start, start + limit);

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    return trips;
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
  try {
    await db.delete(companionTrips).where(eq(companionTrips.id, tripId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting trip from DB:', error);
    throw new Error('Database delete failed for trip.');
  }
}

// 11. Custom Routes DB helpers
export async function getAllCustomRoutesFromDb(
  filterOptions?: { userId?: string; isAdmin?: boolean },
  pagination?: PaginationOptions
): Promise<any[] | PaginatedResult<any>> {
  try {
    const list = await db.select().from(customRoutes).orderBy(desc(customRoutes.updatedAt));
    let routes = list.map(r => r.data as any);

    if (filterOptions && !filterOptions.isAdmin) {
      routes = routes.filter(r => {
        if (!r.isPersonal && r.isPublic !== false) return true;
        if (filterOptions.userId && r.authorId === filterOptions.userId) return true;
        return false;
      });
    }

    if (pagination && (pagination.page || pagination.limit)) {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const total = routes.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const start = (page - 1) * limit;
      const items = routes.slice(start, start + limit);

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    return routes;
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
    const visibility = route.isPersonal ? 'private' : 'public';

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
      const visibility = route.isPersonal ? 'private' : 'public';

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

// 13. Articles DB helpers
export async function getAllArticlesFromDb(pagination?: PaginationOptions): Promise<any[] | PaginatedResult<any>> {
  try {
    const list = await db.select().from(articles).orderBy(desc(articles.updatedAt));
    const articlesList = list.map(a => a.data);

    if (pagination && (pagination.page || pagination.limit)) {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const total = articlesList.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const start = (page - 1) * limit;
      const items = articlesList.slice(start, start + limit);

      return {
        items,
        pagination: { total, page, limit, totalPages }
      };
    }

    return articlesList;
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
    await tx.delete(companionTrips);
    await tx.delete(customRoutes);
    await tx.delete(travelNotes);
    await tx.delete(refreshTokens);
    await tx.delete(revokedTokens);
    return { success: true, timestamp: Date.now() };
  });
}
