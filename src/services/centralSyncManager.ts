import {
  RiverRoute,
  CompanionTrip,
  ArticleReport,
  AppUser,
  TravelNotesConfig,
  FaqDataConfig
} from '../types';
import {
  RoutesSyncService,
  TripsSyncService,
  ArticlesSyncService,
  UsersSyncService,
  TravelNotesSyncService,
  FaqSyncService
} from '../firebase';
import { CloudSqlDbService } from './cloudSqlDb';

export type SyncEntityType = 'route' | 'trip' | 'article' | 'user' | 'travel_notes' | 'faq';

export interface QueuedSyncTask {
  id: string;
  type: SyncEntityType;
  action: 'save' | 'delete';
  payload?: any;
  timestamp: number;
  attempts: number;
}

class CentralSyncManagerClass {
  private queue: QueuedSyncTask[] = [];
  private isProcessing = false;
  private queueKey = 'splav86_central_sync_queue_v2';
  private listeners: Array<(queueLength: number, lastSyncTime?: number) => void> = [];
  private lastSuccessfulSyncTime = Date.now();

  constructor() {
    this.loadQueue();
    // Start background queue processing loop
    if (typeof window !== 'undefined') {
      window.setInterval(() => this.processQueue(), 5000);
      window.addEventListener('online', () => this.processQueue());
    }
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(this.queueKey);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  private persistQueue() {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.warn('CentralSyncManager: Failed to persist queue to localStorage', e);
    }
  }

  public subscribe(cb: (queueLength: number, lastSyncTime?: number) => void): () => void {
    this.listeners.push(cb);
    cb(this.queue.length, this.lastSuccessfulSyncTime);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.queue.length, this.lastSuccessfulSyncTime));
  }

  /**
   * Enqueues an entity replication task for Cloud SQL.
   * Deduplicates tasks for the same entity ID.
   */
  private enqueueSqlTask(type: SyncEntityType, action: 'save' | 'delete', id: string, payload?: any) {
    // Remove existing pending tasks for the same entity id to avoid outdated writes
    this.queue = this.queue.filter((t) => !(t.type === type && t.id === id));

    this.queue.push({
      id,
      type,
      action,
      payload,
      timestamp: Date.now(),
      attempts: 0
    });

    this.persistQueue();
    // Trigger immediate async processing
    this.processQueue();
  }

  /**
   * Processes queued sync operations sequentially with retry logic.
   */
  public async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue[0];
        try {
          await this.executeSqlTask(task);
          // Successfully processed, remove from queue
          this.queue.shift();
          this.lastSuccessfulSyncTime = Date.now();
          this.persistQueue();
        } catch (err) {
          task.attempts += 1;
          console.warn(`CentralSyncManager: SQL sync task failed for ${task.type} (${task.id}), attempt ${task.attempts}:`, err);

          if (task.attempts > 5) {
            // Drop after 5 failed attempts to prevent queue lock
            this.queue.shift();
            this.persistQueue();
          } else {
            // Stop loop for now; will retry in next interval
            break;
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  private async executeSqlTask(task: QueuedSyncTask): Promise<void> {
    const { type, action, id, payload } = task;

    switch (type) {
      case 'route':
        if (action === 'save' && payload) {
          await CloudSqlDbService.saveRoute(payload);
        } else if (action === 'delete') {
          await CloudSqlDbService.deleteRoute(id);
        }
        break;

      case 'trip':
        if (action === 'save' && payload) {
          await CloudSqlDbService.saveTrip(payload);
        } else if (action === 'delete') {
          await CloudSqlDbService.deleteTrip(id);
        }
        break;

      case 'article':
        if (action === 'save' && payload) {
          await CloudSqlDbService.saveArticle(payload);
        } else if (action === 'delete') {
          await CloudSqlDbService.deleteArticle(id);
        }
        break;

      case 'user':
        if (action === 'save' && payload) {
          await CloudSqlDbService.saveUser(payload);
        } else if (action === 'delete') {
          await CloudSqlDbService.deleteUser(id);
        }
        break;

      case 'travel_notes':
        if (action === 'save' && payload) {
          await CloudSqlDbService.saveTravelNotes(payload);
        }
        break;

      case 'faq':
        if (action === 'save' && payload) {
          await CloudSqlDbService.saveFaq(payload);
        }
        break;
    }
  }

  // --- AUTHORITATIVE REPOSITORIES WITH CENTRALIZED DUAL-WRITE PIPELINE ---

  /**
   * Save Route: Instant Firestore realtime write + Centralized SQL queue.
   */
  public async saveRoute(route: RiverRoute): Promise<void> {
    const prepared: RiverRoute = {
      ...route,
      updatedAt: route.updatedAt || new Date().toISOString()
    };

    // 1. Primary Realtime transport: Firestore
    await RoutesSyncService.saveRoute(prepared);

    // 2. Centralized SQL replication channel
    this.enqueueSqlTask('route', 'save', prepared.id, prepared);
  }

  /**
   * Soft-delete or Remove Route
   */
  public async deleteRoute(routeId: string, softDeleteRoute?: RiverRoute): Promise<void> {
    if (softDeleteRoute) {
      const marked: RiverRoute = {
        ...softDeleteRoute,
        isDeleted: true,
        updatedAt: new Date().toISOString()
      };
      await RoutesSyncService.saveRoute(marked);
      this.enqueueSqlTask('route', 'save', routeId, marked);
    } else {
      await RoutesSyncService.removeRoute(routeId);
      this.enqueueSqlTask('route', 'delete', routeId);
    }
  }

  /**
   * Save Trip: Instant Firestore realtime write + Centralized SQL queue.
   */
  public async saveTrip(trip: CompanionTrip): Promise<void> {
    const prepared: CompanionTrip = {
      ...trip,
      updatedAt: trip.updatedAt || new Date().toISOString()
    };

    // 1. Primary Realtime transport: Firestore
    await TripsSyncService.saveTrip(prepared);

    // 2. Centralized SQL replication channel
    this.enqueueSqlTask('trip', 'save', prepared.id, prepared);
  }

  /**
   * Soft-delete or Remove Trip
   */
  public async deleteTrip(tripId: string, softDeleteTrip?: CompanionTrip): Promise<void> {
    if (softDeleteTrip) {
      const marked: CompanionTrip = {
        ...softDeleteTrip,
        isDeleted: true,
        updatedAt: new Date().toISOString()
      };
      await TripsSyncService.saveTrip(marked);
      this.enqueueSqlTask('trip', 'save', tripId, marked);
    } else {
      await TripsSyncService.removeTrip(tripId);
      this.enqueueSqlTask('trip', 'delete', tripId);
    }
  }

  /**
   * Save Article
   */
  public async saveArticle(article: ArticleReport): Promise<void> {
    const prepared: ArticleReport = {
      ...article,
      updatedAt: article.updatedAt || new Date().toISOString()
    };

    await ArticlesSyncService.saveArticle(prepared);
    this.enqueueSqlTask('article', 'save', prepared.id, prepared);
  }

  /**
   * Soft-delete or Remove Article
   */
  public async deleteArticle(articleId: string, softDeleteArticle?: ArticleReport): Promise<void> {
    if (softDeleteArticle) {
      const marked: ArticleReport = {
        ...softDeleteArticle,
        isDeleted: true,
        updatedAt: new Date().toISOString()
      };
      await ArticlesSyncService.saveArticle(marked);
      this.enqueueSqlTask('article', 'save', articleId, marked);
    } else {
      await ArticlesSyncService.removeArticle(articleId);
      this.enqueueSqlTask('article', 'delete', articleId);
    }
  }

  /**
   * Save User
   */
  public async saveUser(user: AppUser): Promise<void> {
    const prepared: AppUser = {
      ...user,
      updatedAt: user.updatedAt || new Date().toISOString()
    };

    await UsersSyncService.saveUser(prepared);
    this.enqueueSqlTask('user', 'save', prepared.id, prepared);
  }

  /**
   * Soft-delete or Remove User
   */
  public async deleteUser(userId: string, softDeleteUser?: AppUser): Promise<void> {
    if (softDeleteUser) {
      const marked: AppUser = {
        ...softDeleteUser,
        isDeleted: true,
        updatedAt: new Date().toISOString()
      };
      await UsersSyncService.saveUser(marked);
      this.enqueueSqlTask('user', 'save', userId, marked);
    } else {
      await UsersSyncService.removeUser(userId);
      this.enqueueSqlTask('user', 'delete', userId);
    }
  }

  /**
   * Save TravelNotesConfig
   */
  public async saveTravelNotes(config: TravelNotesConfig): Promise<void> {
    const prepared: TravelNotesConfig = {
      ...config,
      updatedAt: config.updatedAt || new Date().toISOString()
    };

    await TravelNotesSyncService.saveNotesConfig(prepared);
    this.enqueueSqlTask('travel_notes', 'save', prepared.id || 'splav86_travel_notes_main', prepared);
  }

  /**
   * Save FAQ Config
   */
  public async saveFaq(config: FaqDataConfig): Promise<void> {
    const prepared: FaqDataConfig = {
      ...config,
      updatedAt: config.updatedAt || new Date().toISOString()
    };

    await FaqSyncService.saveFaq(prepared);
    this.enqueueSqlTask('faq', 'save', prepared.id || 'splav86_faq_config_main', prepared);
  }

  // --- BATCH HELPERS FOR BULK SYNC & BACKUP RESTORATION ---

  public async saveRoutes(routes: RiverRoute[]): Promise<void> {
    for (const r of routes) {
      await this.saveRoute(r).catch(console.warn);
    }
  }

  public async saveTrips(trips: CompanionTrip[]): Promise<void> {
    for (const t of trips) {
      await this.saveTrip(t).catch(console.warn);
    }
  }

  public async saveArticles(articles: ArticleReport[]): Promise<void> {
    for (const a of articles) {
      await this.saveArticle(a).catch(console.warn);
    }
  }

  public async saveUsers(users: AppUser[]): Promise<void> {
    for (const u of users) {
      await this.saveUser(u).catch(console.warn);
    }
  }

  public async saveNotesConfig(config: TravelNotesConfig): Promise<void> {
    await this.saveTravelNotes(config);
  }

  public async saveFaqData(config: FaqDataConfig): Promise<void> {
    await this.saveFaq(config);
  }
}

export const CentralSyncManager = new CentralSyncManagerClass();
