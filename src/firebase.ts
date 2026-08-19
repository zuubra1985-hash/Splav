import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CompanionTrip, RiverRoute, AppUser, ArticleReport, HydroStation, TripChatMessage, TripChatPresence } from './types';

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Error handling helper per Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    },
    operationType,
    path
  };
  console.warn('Firestore Operation:', JSON.stringify(errInfo));
}

/**
 * Recursively converts nested arrays (e.g. [[lat, lng], ...]) into array of objects [{ lat, lng }]
 * and strips undefined fields so Firestore setDoc never throws:
 * "Function setDoc() called with invalid data. Nested arrays are not supported"
 */
export function cleanForFirestore<T>(obj: T): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    // If this array contains arrays (nested arrays), convert each inner array to an object
    return obj.map((item) => {
      if (Array.isArray(item)) {
        // Coordinate pair [lat, lng] -> { lat, lng }
        if (item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
          return { lat: item[0], lng: item[1] };
        }
        // Generic nested array -> object with indexed keys
        const innerObj: Record<string, any> = {};
        item.forEach((val, idx) => {
          innerObj[`idx_${idx}`] = cleanForFirestore(val);
        });
        return innerObj;
      }
      return cleanForFirestore(item);
    });
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result;
}

/**
 * Restores data loaded from Firestore back into application types
 * (e.g. converting [{ lat, lng }] back to [[lat, lng]])
 */
export function restoreFromFirestore<T>(obj: any): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        if ('lat' in item && 'lng' in item && typeof item.lat === 'number' && typeof item.lng === 'number') {
          return [item.lat, item.lng];
        }
      }
      return restoreFromFirestore(item);
    }) as any;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'coordinates' && Array.isArray(value)) {
      result[key] = value.map((pt: any) => {
        if (Array.isArray(pt)) return pt;
        if (pt && typeof pt === 'object' && 'lat' in pt && 'lng' in pt) {
          return [pt.lat, pt.lng];
        }
        return pt;
      });
    } else {
      result[key] = restoreFromFirestore(value);
    }
  }
  return result as T;
}

// 3. Test Connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore connected successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using cached/local state.');
    }
  }
}

// Run connection test on load
testConnection();

// 4. Firestore Trips Sync Service (Expeditions, Companion search)
export const TripsSyncService = {
  subscribeToTrips(
    onUpdate: (trips: CompanionTrip[]) => void, 
    onError?: (err: unknown) => void
  ) {
    const tripsCol = collection(db, 'trips');
    return onSnapshot(
      tripsCol,
      (snapshot) => {
        const remoteTrips: CompanionTrip[] = [];
        snapshot.forEach((docSnap) => {
          remoteTrips.push(restoreFromFirestore<CompanionTrip>(docSnap.data()));
        });
        onUpdate(remoteTrips);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'trips');
        if (onError) onError(error);
      }
    );
  },

  async saveTrip(trip: CompanionTrip): Promise<void> {
    try {
      const cleaned = cleanForFirestore(trip);
      const tripDoc = doc(db, 'trips', trip.id);
      await setDoc(tripDoc, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trips/${trip.id}`);
      throw error;
    }
  },

  async removeTrip(tripId: string): Promise<void> {
    try {
      const tripDoc = doc(db, 'trips', tripId);
      await deleteDoc(tripDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}`);
      throw error;
    }
  }
};

// 5. Firestore Routes Sync Service (River Passports & Custom GPX Routes)
export const RoutesSyncService = {
  subscribeToRoutes(
    onUpdate: (routes: RiverRoute[]) => void,
    onError?: (err: unknown) => void
  ) {
    const routesCol = collection(db, 'routes');
    return onSnapshot(
      routesCol,
      (snapshot) => {
        const remoteRoutes: RiverRoute[] = [];
        snapshot.forEach((docSnap) => {
          remoteRoutes.push(restoreFromFirestore<RiverRoute>(docSnap.data()));
        });
        onUpdate(remoteRoutes);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'routes');
        if (onError) onError(error);
      }
    );
  },

  async saveRoute(route: RiverRoute): Promise<void> {
    try {
      const cleaned = cleanForFirestore(route);
      const routeDoc = doc(db, 'routes', route.id);
      await setDoc(routeDoc, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `routes/${route.id}`);
      throw error;
    }
  },

  async removeRoute(routeId: string): Promise<void> {
    try {
      const routeDoc = doc(db, 'routes', routeId);
      await deleteDoc(routeDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `routes/${routeId}`);
      throw error;
    }
  }
};

// 6. Firestore Users Sync Service (Tourists, Organizers, Admins)
export const UsersSyncService = {
  subscribeToUsers(
    onUpdate: (users: AppUser[]) => void,
    onError?: (err: unknown) => void
  ) {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const remoteUsers: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          remoteUsers.push(restoreFromFirestore<AppUser>(docSnap.data()));
        });
        onUpdate(remoteUsers);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
        if (onError) onError(error);
      }
    );
  },

  async saveUser(user: AppUser): Promise<void> {
    try {
      const cleaned = cleanForFirestore(user);
      const userDoc = doc(db, 'users', user.id);
      await setDoc(userDoc, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
      throw error;
    }
  },

  async removeUser(userId: string): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      await deleteDoc(userDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      throw error;
    }
  }
};

// 7. Firestore Articles & Expedition Reports Sync Service
export const ArticlesSyncService = {
  subscribeToArticles(
    onUpdate: (articles: ArticleReport[]) => void,
    onError?: (err: unknown) => void
  ) {
    const articlesCol = collection(db, 'articles');
    return onSnapshot(
      articlesCol,
      (snapshot) => {
        const remoteArticles: ArticleReport[] = [];
        snapshot.forEach((docSnap) => {
          remoteArticles.push(restoreFromFirestore<ArticleReport>(docSnap.data()));
        });
        onUpdate(remoteArticles);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'articles');
        if (onError) onError(error);
      }
    );
  },

  async saveArticle(article: ArticleReport): Promise<void> {
    try {
      const cleaned = cleanForFirestore(article);
      const artDoc = doc(db, 'articles', article.id);
      await setDoc(artDoc, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `articles/${article.id}`);
      throw error;
    }
  },

  async removeArticle(articleId: string): Promise<void> {
    try {
      const artDoc = doc(db, 'articles', articleId);
      await deleteDoc(artDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `articles/${articleId}`);
      throw error;
    }
  }
};

// 8. Firestore Hydro Stations Sync Service
export const HydroSyncService = {
  subscribeToHydro(
    onUpdate: (stations: HydroStation[]) => void,
    onError?: (err: unknown) => void
  ) {
    const hydroCol = collection(db, 'hydro');
    return onSnapshot(
      hydroCol,
      (snapshot) => {
        const remoteStations: HydroStation[] = [];
        snapshot.forEach((docSnap) => {
          remoteStations.push(restoreFromFirestore<HydroStation>(docSnap.data()));
        });
        onUpdate(remoteStations);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'hydro');
        if (onError) onError(error);
      }
    );
  },

  async saveHydroStation(station: HydroStation): Promise<void> {
    try {
      const cleaned = cleanForFirestore(station);
      const hydroDoc = doc(db, 'hydro', station.id);
      await setDoc(hydroDoc, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `hydro/${station.id}`);
      throw error;
    }
  },

  async removeHydroStation(stationId: string): Promise<void> {
    try {
      const hydroDoc = doc(db, 'hydro', stationId);
      await deleteDoc(hydroDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `hydro/${stationId}`);
      throw error;
    }
  }
};

// 9. Real-time Instant Trip Chat & Live Presence Sync Service
export const TripChatSyncService = {
  // Subscribe to live messages of a specific trip in real time
  subscribeToTripMessages(
    tripId: string,
    onUpdate: (messages: TripChatMessage[]) => void,
    onError?: (err: unknown) => void
  ) {
    const messagesCol = collection(db, 'trips', tripId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: TripChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push(docSnap.data() as TripChatMessage);
        });
        onUpdate(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `trips/${tripId}/messages`);
        if (onError) onError(error);
      }
    );
  },

  // Send an instant live message
  async sendMessage(tripId: string, message: TripChatMessage): Promise<void> {
    try {
      const msgId = message.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload: TripChatMessage = {
        ...message,
        id: msgId,
        tripId,
        createdAt: message.createdAt || Date.now()
      };
      const cleaned = cleanForFirestore(payload);
      const msgDoc = doc(db, 'trips', tripId, 'messages', msgId);
      await setDoc(msgDoc, cleaned);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/messages`);
      throw error;
    }
  },

  // Delete message
  async removeMessage(tripId: string, messageId: string): Promise<void> {
    try {
      const msgDoc = doc(db, 'trips', tripId, 'messages', messageId);
      await deleteDoc(msgDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/messages/${messageId}`);
      throw error;
    }
  },

  // Subscribe to who is currently in this chat and online
  subscribeToTripPresence(
    tripId: string,
    onUpdate: (presenceList: TripChatPresence[]) => void,
    onError?: (err: unknown) => void
  ) {
    const presenceCol = collection(db, 'trips', tripId, 'presence');
    return onSnapshot(
      presenceCol,
      (snapshot) => {
        const now = Date.now();
        const activePresence: TripChatPresence[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TripChatPresence;
          // Online if ping within 25 seconds and isOnline true
          if (data && data.isOnline && (now - (data.lastPing || 0) < 25000)) {
            activePresence.push(data);
          }
        });
        onUpdate(activePresence);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `trips/${tripId}/presence`);
        if (onError) onError(error);
      }
    );
  },

  // Heartbeat ping & typing status
  async updatePresence(
    tripId: string,
    presence: Partial<TripChatPresence> & { userId: string }
  ): Promise<void> {
    try {
      const presenceDoc = doc(db, 'trips', tripId, 'presence', presence.userId);
      const payload: TripChatPresence = {
        userId: presence.userId,
        name: presence.name || 'Участник',
        avatar: presence.avatar || '',
        role: presence.role || 'guest',
        isOnline: presence.isOnline !== undefined ? presence.isOnline : true,
        isTyping: presence.isTyping !== undefined ? presence.isTyping : false,
        lastPing: Date.now()
      };
      const cleaned = cleanForFirestore(payload);
      await setDoc(presenceDoc, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}/presence/${presence.userId}`);
    }
  },

  // Mark left/offline
  async leavePresence(tripId: string, userId: string): Promise<void> {
    try {
      const presenceDoc = doc(db, 'trips', tripId, 'presence', userId);
      await setDoc(presenceDoc, { isOnline: false, isTyping: false, lastPing: Date.now() }, { merge: true });
    } catch (error) {
      // quiet cleanup
    }
  }
};
