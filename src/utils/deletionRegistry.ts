/**
 * Central registry for tracking permanently deleted items (Trips, Articles, Routes, Users).
 * Prevents deleted mock or user items from being automatically re-seeded or resurrected.
 */

const TRIPS_DELETED_KEY = 'splav86_deleted_trips_v1';
const ARTICLES_DELETED_KEY = 'splav86_deleted_articles_v1';
const ROUTES_DELETED_KEY = 'splav86_deleted_routes_v1';
const USERS_DELETED_KEY = 'splav86_deleted_users_v1';

// --- TRIPS DELETION TRACKING ---
export const getDeletedTripIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(TRIPS_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((x: string) => String(x).trim()) : []);
  } catch {
    return new Set();
  }
};

export const recordTripDeletion = (tripId: string) => {
  if (!tripId) return;
  try {
    const deleted = getDeletedTripIds();
    deleted.add(String(tripId).trim());
    localStorage.setItem(TRIPS_DELETED_KEY, JSON.stringify(Array.from(deleted)));
    // Mark as initialized so empty trips are respected
    localStorage.setItem('splav86_trips_seeded_v1', 'true');
  } catch (e) {
    console.error('Failed to record trip deletion:', e);
  }
};

// --- ARTICLES DELETION TRACKING ---
export const getDeletedArticleIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(ARTICLES_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((x: string) => String(x).trim()) : []);
  } catch {
    return new Set();
  }
};

export const recordArticleDeletion = (articleId: string) => {
  if (!articleId) return;
  try {
    const deleted = getDeletedArticleIds();
    deleted.add(String(articleId).trim());
    localStorage.setItem(ARTICLES_DELETED_KEY, JSON.stringify(Array.from(deleted)));
    // Mark as initialized so empty articles are respected
    localStorage.setItem('splav86_articles_seeded_v1', 'true');
  } catch (e) {
    console.error('Failed to record article deletion:', e);
  }
};

// --- ROUTES DELETION TRACKING ---
export const getDeletedRouteIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(ROUTES_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((x: string) => String(x).trim()) : []);
  } catch {
    return new Set();
  }
};

export const recordRouteDeletion = (routeId: string) => {
  if (!routeId) return;
  try {
    const deleted = getDeletedRouteIds();
    deleted.add(String(routeId).trim());
    localStorage.setItem(ROUTES_DELETED_KEY, JSON.stringify(Array.from(deleted)));
    localStorage.setItem('splav86_routes_seeded_v1', 'true');
  } catch (e) {
    console.error('Failed to record route deletion:', e);
  }
};

// --- USERS DELETION TRACKING ---
export const getDeletedUserKeys = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(USERS_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((x: string) => (x || '').trim().toLowerCase()) : []);
  } catch {
    return new Set();
  }
};

export const recordUserDeletion = (userId: string, email?: string) => {
  try {
    const deleted = getDeletedUserKeys();
    if (userId) deleted.add(userId.trim().toLowerCase());
    if (email) deleted.add(email.trim().toLowerCase());
    localStorage.setItem(USERS_DELETED_KEY, JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.error('Failed to record user deletion:', e);
  }
};

export const clearAllDeletionRegistries = () => {
  try {
    localStorage.removeItem(TRIPS_DELETED_KEY);
    localStorage.removeItem(ARTICLES_DELETED_KEY);
    localStorage.removeItem(ROUTES_DELETED_KEY);
    localStorage.removeItem(USERS_DELETED_KEY);
    localStorage.removeItem('splav86_trips_seeded_v1');
    localStorage.removeItem('splav86_articles_seeded_v1');
    localStorage.removeItem('splav86_routes_seeded_v1');
  } catch (e) {
    console.error('Failed to clear deletion registries:', e);
  }
};
