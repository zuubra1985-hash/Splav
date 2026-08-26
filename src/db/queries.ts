import { db } from './index.ts';
import { users, companionTrips, customRoutes, travelNotes, articles, faqTable } from './schema.ts';
import { eq, or } from 'drizzle-orm';
import { AppUser, UserRole, PublicUserDTO, PrivateUserDTO } from '../types/index.ts';

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
    showContactsPublicly: u.showContactsPublicly !== false
  };
}

// Helper to sanitize to PublicUserDTO
export function toPublicUserDTO(u: typeof users.$inferSelect): PublicUserDTO {
  const isPublicContact = u.showContactsPublicly !== false;
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

// 3. Get Public Users list (for community members directory)
export async function getPublicUsers(): Promise<PublicUserDTO[]> {
  try {
    const list = await db.select().from(users);
    return list.map(toPublicUserDTO);
  } catch (error) {
    console.error('Error fetching public users from DB:', error);
    throw new Error('Database query failed for public users.');
  }
}

// 4. Get Admin Users list (for admin panel)
export async function getAllUsersForAdmin(): Promise<PrivateUserDTO[]> {
  try {
    const list = await db.select().from(users);
    return list.map(toPrivateUserDTO);
  } catch (error) {
    console.error('Error fetching admin users from DB:', error);
    throw new Error('Database query failed for admin users.');
  }
}

// 5. Create new registered user
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
  try {
    const cleanEmail = data.email.trim().toLowerCase();
    const assignedRole: UserRole = cleanEmail === 'zuubra1985@gmail.com' ? 'superadmin' : (data.role || 'user');

    const inserted = await db.insert(users).values({
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
      showContactsPublicly: true,
      updatedAt: new Date()
    }).returning();

    return toPrivateUserDTO(inserted[0]);
  } catch (error) {
    console.error('Error creating registered user in DB:', error);
    throw new Error('Database insert failed for user.');
  }
}

// 6. Update user profile (user modifying their own profile)
export async function updateUserProfile(id: string, updates: Partial<AppUser>): Promise<PrivateUserDTO> {
  try {
    const existing = await findUserById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    // Role and password cannot be modified through this helper
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

// 9. Delete user from DB
export async function deleteUserFromDb(userId: string) {
  try {
    await db.delete(users).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting user from DB:', error);
    throw new Error('Database delete failed for user.');
  }
}

// 10. Companion Trips DB helpers
export async function getAllTripsFromDb() {
  try {
    const list = await db.select().from(companionTrips);
    return list.map(t => t.data);
  } catch (error) {
    console.error('Error fetching trips from DB:', error);
    throw new Error('Database query failed for trips.');
  }
}

export async function saveTripInDb(trip: any, ownerId?: string) {
  try {
    if (!trip || !trip.id) throw new Error('Invalid trip payload');
    const existing = await db.select().from(companionTrips).where(eq(companionTrips.id, trip.id));
    const finalOwnerId = ownerId || trip.organizer?.userId || (existing[0]?.ownerId) || '';

    if (existing.length > 0) {
      await db.update(companionTrips).set({
        ownerId: finalOwnerId,
        data: trip,
        updatedAt: new Date()
      }).where(eq(companionTrips.id, trip.id));
    } else {
      await db.insert(companionTrips).values({
        id: trip.id,
        ownerId: finalOwnerId,
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

export async function saveTripsInDb(tripsList: any[]) {
  try {
    for (const trip of tripsList) {
      if (!trip || !trip.id) continue;
      await saveTripInDb(trip);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving trips in DB:', error);
    throw new Error('Database save failed for trips.');
  }
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
export async function getAllCustomRoutesFromDb(filterOptions?: { userId?: string; isAdmin?: boolean }) {
  try {
    const list = await db.select().from(customRoutes);
    const routes = list.map(r => r.data as any);

    // If filterOptions provided, ensure private personal routes only visible to their author/admin
    if (filterOptions && !filterOptions.isAdmin) {
      return routes.filter(r => {
        if (!r.isPersonal && r.isPublic !== false) return true;
        if (filterOptions.userId && (r.authorId === filterOptions.userId || r.authorEmail === filterOptions.userId)) return true;
        return false;
      });
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
    const finalOwnerId = ownerId || route.authorId || (existing[0]?.ownerId) || '';
    const visibility = route.isPersonal ? 'private' : 'public';

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

export async function saveCustomRoutesInDb(routesList: any[]) {
  try {
    for (const route of routesList) {
      if (!route || !route.id) continue;
      await saveCustomRouteInDb(route);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving custom routes in DB:', error);
    throw new Error('Database save failed for custom routes.');
  }
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
export async function getAllArticlesFromDb() {
  try {
    const list = await db.select().from(articles);
    return list.map(a => a.data);
  } catch (error) {
    console.error('Error fetching articles from DB:', error);
    throw new Error('Database query failed for articles.');
  }
}

export async function saveArticlesInDb(articlesList: any[]) {
  try {
    for (const art of articlesList) {
      if (!art || !art.id) continue;
      const existing = await db.select().from(articles).where(eq(articles.id, art.id));
      if (existing.length > 0) {
        await db.update(articles).set({
          data: art,
          updatedAt: new Date()
        }).where(eq(articles.id, art.id));
      } else {
        await db.insert(articles).values({
          id: art.id,
          data: art,
          updatedAt: new Date()
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving articles in DB:', error);
    throw new Error('Database save failed for articles.');
  }
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

// 15. SuperAdmin Database Reset
export async function resetDatabaseCleanStart() {
  try {
    await db.delete(companionTrips);
    await db.delete(customRoutes);
    await db.delete(travelNotes);
    return { success: true, timestamp: Date.now() };
  } catch (error) {
    console.error('Error resetting database:', error);
    throw new Error('Database reset failed.');
  }
}
