import { db } from './index.ts';
import { users, companionTrips, customRoutes, travelNotes, articles, faqTable } from './schema.ts';
import { eq } from 'drizzle-orm';

// Users API helpers
export async function getAllUsersFromDb() {
  try {
    const list = await db.select().from(users);
    return list.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as any,
      password: u.password || '',
      phone: u.phone || '',
      city: u.city || 'Сургут',
      avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      experienceLevel: u.experienceLevel || 'Любитель водных походов',
      registeredAt: u.registeredAt || '2026-01-01',
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
    }));
  } catch (error) {
    console.error('Error fetching users from DB:', error);
    throw new Error('Database query failed for users.', { cause: error });
  }
}

export async function upsertUserInDb(userData: any) {
  try {
    const existing = await db.select().from(users).where(eq(users.id, userData.id));
    if (existing.length > 0) {
      await db.update(users).set({
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        password: userData.password !== undefined ? userData.password : existing[0].password,
        phone: userData.phone || '',
        city: userData.city || 'Сургут',
        avatar: userData.avatar,
        experienceLevel: userData.experienceLevel,
        registeredAt: userData.registeredAt,
        favoriteRouteIds: userData.favoriteRouteIds || [],
        favoriteRivers: userData.favoriteRivers || [],
        vesselsOwned: userData.vesselsOwned || [],
        gearInventory: userData.gearInventory || [],
        badges: userData.badges || [],
        bio: userData.bio || '',
        callsign: userData.callsign || '',
        fstrRank: userData.fstrRank || '',
        telegram: userData.telegram || '',
        vk: userData.vk || '',
        isReadyForExpeditions: userData.isReadyForExpeditions !== false,
        showContactsPublicly: userData.showContactsPublicly !== false,
        updatedAt: new Date()
      }).where(eq(users.id, userData.id));
    } else {
      await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        password: userData.password || '',
        phone: userData.phone || '',
        city: userData.city || 'Сургут',
        avatar: userData.avatar,
        experienceLevel: userData.experienceLevel,
        registeredAt: userData.registeredAt || new Date().toISOString().slice(0, 10),
        favoriteRouteIds: userData.favoriteRouteIds || [],
        favoriteRivers: userData.favoriteRivers || [],
        vesselsOwned: userData.vesselsOwned || [],
        gearInventory: userData.gearInventory || [],
        badges: userData.badges || [],
        bio: userData.bio || '',
        callsign: userData.callsign || '',
        fstrRank: userData.fstrRank || '',
        telegram: userData.telegram || '',
        vk: userData.vk || '',
        isReadyForExpeditions: userData.isReadyForExpeditions !== false,
        showContactsPublicly: userData.showContactsPublicly !== false,
        updatedAt: new Date()
      });
    }
    return userData;
  } catch (error) {
    console.error('Error upserting user in DB:', error);
    throw new Error('Database upsert failed for user.', { cause: error });
  }
}

export async function deleteUserFromDb(userId: string) {
  try {
    await db.delete(users).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting user from DB:', error);
    throw new Error('Database delete failed for user.', { cause: error });
  }
}

// Trips DB helpers
export async function getAllTripsFromDb() {
  try {
    const list = await db.select().from(companionTrips);
    return list.map(t => t.data);
  } catch (error) {
    console.error('Error fetching trips from DB:', error);
    throw new Error('Database query failed for trips.', { cause: error });
  }
}

export async function saveTripsInDb(tripsList: any[]) {
  try {
    for (const trip of tripsList) {
      if (!trip || !trip.id) continue;
      const existing = await db.select().from(companionTrips).where(eq(companionTrips.id, trip.id));
      if (existing.length > 0) {
        await db.update(companionTrips).set({
          data: trip,
          updatedAt: new Date()
        }).where(eq(companionTrips.id, trip.id));
      } else {
        await db.insert(companionTrips).values({
          id: trip.id,
          data: trip,
          updatedAt: new Date()
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving trips in DB:', error);
    throw new Error('Database save failed for trips.', { cause: error });
  }
}

export async function deleteTripFromDb(tripId: string) {
  try {
    await db.delete(companionTrips).where(eq(companionTrips.id, tripId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting trip from DB:', error);
    throw new Error('Database delete failed for trip.', { cause: error });
  }
}

// Custom Routes DB helpers
export async function getAllCustomRoutesFromDb() {
  try {
    const list = await db.select().from(customRoutes);
    return list.map(r => r.data);
  } catch (error) {
    console.error('Error fetching custom routes from DB:', error);
    throw new Error('Database query failed for custom routes.', { cause: error });
  }
}

export async function saveCustomRoutesInDb(routesList: any[]) {
  try {
    for (const route of routesList) {
      if (!route || !route.id) continue;
      const existing = await db.select().from(customRoutes).where(eq(customRoutes.id, route.id));
      if (existing.length > 0) {
        await db.update(customRoutes).set({
          data: route,
          updatedAt: new Date()
        }).where(eq(customRoutes.id, route.id));
      } else {
        await db.insert(customRoutes).values({
          id: route.id,
          data: route,
          updatedAt: new Date()
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving custom routes in DB:', error);
    throw new Error('Database save failed for custom routes.', { cause: error });
  }
}

export async function deleteCustomRouteFromDb(routeId: string) {
  try {
    await db.delete(customRoutes).where(eq(customRoutes.id, routeId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting custom route from DB:', error);
    throw new Error('Database delete failed for custom route.', { cause: error });
  }
}

// Travel Notes & Reviews DB helpers
export async function getTravelNotesConfigFromDb() {
  try {
    const rec = await db.select().from(travelNotes).where(eq(travelNotes.id, 'main_config'));
    if (rec.length > 0) {
      return rec[0].data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching travel notes from DB:', error);
    throw new Error('Database query failed for travel notes.', { cause: error });
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
    throw new Error('Database save failed for travel notes.', { cause: error });
  }
}

// Articles DB helpers
export async function getAllArticlesFromDb() {
  try {
    const list = await db.select().from(articles);
    return list.map(a => a.data);
  } catch (error) {
    console.error('Error fetching articles from DB:', error);
    throw new Error('Database query failed for articles.', { cause: error });
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
    throw new Error('Database save failed for articles.', { cause: error });
  }
}

export async function deleteArticleFromDb(articleId: string) {
  try {
    await db.delete(articles).where(eq(articles.id, articleId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting article from DB:', error);
    throw new Error('Database delete failed for article.', { cause: error });
  }
}

// FAQ DB helpers
export async function getFaqConfigFromDb() {
  try {
    const rec = await db.select().from(faqTable).where(eq(faqTable.id, 'main_config'));
    if (rec.length > 0) {
      return rec[0].data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching FAQ from DB:', error);
    throw new Error('Database query failed for FAQ.', { cause: error });
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
    throw new Error('Database save failed for FAQ.', { cause: error });
  }
}

