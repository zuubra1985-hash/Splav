import { AppUser, CompanionTrip, RiverRoute, TravelNotesConfig, ArticleReport, FaqDataConfig } from '../types';
import { syncTracker } from './syncTracker';

// Cloud SQL Database Client Service for cross-device synchronization
export const CloudSqlDbService = {
  // Users
  async fetchUsers(): Promise<AppUser[]> {
    try {
      const res = await fetch('/api/db/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppUser[] = await res.json();
      syncTracker.recordDownload('cloudsql', {
        count: data.length,
        message: `Загружено ${data.length} пользователей из CloudSQL`
      });
      return data;
    } catch (e) {
      console.warn('CloudSQL fetchUsers failed:', e);
      return [];
    }
  },

  async saveUser(user: AppUser): Promise<void> {
    try {
      const res = await fetch('/api/db/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          message: `Пользователь "${user.name || user.email}" сохранен в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveUser failed:', e);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await fetch(`/api/db/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      syncTracker.recordUpload('cloudsql', {
        message: `Пользователь ${userId} удален из CloudSQL`
      });
    } catch (e) {
      console.warn('CloudSQL deleteUser failed:', e);
    }
  },

  // Trips
  async fetchTrips(): Promise<CompanionTrip[]> {
    try {
      const res = await fetch('/api/db/trips');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CompanionTrip[] = await res.json();
      syncTracker.recordDownload('cloudsql', {
        count: data.length,
        message: `Загружено ${data.length} походов из CloudSQL`
      });
      return data;
    } catch (e) {
      console.warn('CloudSQL fetchTrips failed:', e);
      return [];
    }
  },

  async saveTrips(trips: CompanionTrip[]): Promise<void> {
    try {
      const res = await fetch('/api/db/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trips })
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          count: trips.length,
          message: `Сохранено ${trips.length} походов в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveTrips failed:', e);
    }
  },

  async saveTrip(trip: CompanionTrip): Promise<void> {
    try {
      const existing = await this.fetchTrips();
      const idx = existing.findIndex((t) => t.id === trip.id);
      const updated = idx >= 0 ? existing.map((t) => (t.id === trip.id ? trip : t)) : [trip, ...existing];
      await this.saveTrips(updated);
    } catch (e) {
      console.warn('CloudSQL saveTrip failed:', e);
    }
  },

  async deleteTrip(tripId: string): Promise<void> {
    try {
      await fetch(`/api/db/trips/${encodeURIComponent(tripId)}`, {
        method: 'DELETE'
      });
      syncTracker.recordUpload('cloudsql', {
        message: `Поход ${tripId} удален из CloudSQL`
      });
    } catch (e) {
      console.warn('CloudSQL deleteTrip failed:', e);
    }
  },

  // Routes
  async fetchRoutes(): Promise<RiverRoute[]> {
    try {
      const res = await fetch('/api/db/routes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RiverRoute[] = await res.json();
      syncTracker.recordDownload('cloudsql', {
        count: data.length,
        message: `Загружено ${data.length} маршрутов из CloudSQL`
      });
      return data;
    } catch (e) {
      console.warn('CloudSQL fetchRoutes failed:', e);
      return [];
    }
  },

  async saveRoutes(routes: RiverRoute[]): Promise<void> {
    try {
      const res = await fetch('/api/db/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes })
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          count: routes.length,
          message: `Сохранено ${routes.length} маршрутов в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveRoutes failed:', e);
    }
  },

  async saveRoute(route: RiverRoute): Promise<void> {
    try {
      const existing = await this.fetchRoutes();
      const idx = existing.findIndex((r) => r.id === route.id);
      const updated = idx >= 0 ? existing.map((r) => (r.id === route.id ? route : r)) : [route, ...existing];
      await this.saveRoutes(updated);
    } catch (e) {
      console.warn('CloudSQL saveRoute failed:', e);
    }
  },

  async deleteRoute(routeId: string): Promise<void> {
    try {
      await fetch(`/api/db/routes/${encodeURIComponent(routeId)}`, {
        method: 'DELETE'
      });
      syncTracker.recordUpload('cloudsql', {
        message: `Маршрут ${routeId} удален из CloudSQL`
      });
    } catch (e) {
      console.warn('CloudSQL deleteRoute failed:', e);
    }
  },

  // Articles & River Pilot Guides
  async fetchArticles(): Promise<ArticleReport[]> {
    try {
      const res = await fetch('/api/db/articles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ArticleReport[] = await res.json();
      syncTracker.recordDownload('cloudsql', {
        count: data.length,
        message: `Загружено ${data.length} статей из CloudSQL`
      });
      return data;
    } catch (e) {
      console.warn('CloudSQL fetchArticles failed:', e);
      return [];
    }
  },

  async saveArticles(articles: ArticleReport[]): Promise<void> {
    try {
      const res = await fetch('/api/db/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          count: articles.length,
          message: `Сохранено ${articles.length} статей в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveArticles failed:', e);
    }
  },

  async saveArticle(article: ArticleReport): Promise<void> {
    try {
      const existing = await this.fetchArticles();
      const idx = existing.findIndex((a) => a.id === article.id);
      const updated = idx >= 0 ? existing.map((a) => (a.id === article.id ? article : a)) : [article, ...existing];
      await this.saveArticles(updated);
    } catch (e) {
      console.warn('CloudSQL saveArticle failed:', e);
    }
  },

  async deleteArticle(articleId: string): Promise<void> {
    try {
      await fetch(`/api/db/articles/${encodeURIComponent(articleId)}`, {
        method: 'DELETE'
      });
      syncTracker.recordUpload('cloudsql', {
        message: `Статья ${articleId} удалена из CloudSQL`
      });
    } catch (e) {
      console.warn('CloudSQL deleteArticle failed:', e);
    }
  },

  // Travel Notes & Reviews
  async fetchTravelNotes(): Promise<TravelNotesConfig | null> {
    try {
      const res = await fetch('/api/db/travel-notes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TravelNotesConfig = await res.json();
      syncTracker.recordDownload('cloudsql', {
        message: 'Загружены путевые заметки из CloudSQL'
      });
      return data;
    } catch (e) {
      console.warn('CloudSQL fetchTravelNotes failed:', e);
      return null;
    }
  },

  async saveTravelNotes(notesConfig: TravelNotesConfig): Promise<void> {
    try {
      const res = await fetch('/api/db/travel-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notesConfig)
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          message: 'Путевые заметки сохранены в CloudSQL'
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveTravelNotes failed:', e);
    }
  },

  // FAQ & Safety Handbook
  async fetchFaq(): Promise<FaqDataConfig | null> {
    try {
      const res = await fetch('/api/db/faq');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FaqDataConfig = await res.json();
      syncTracker.recordDownload('cloudsql', {
        message: 'Загружен справочник FAQ из CloudSQL'
      });
      return data;
    } catch (e) {
      console.warn('CloudSQL fetchFaq failed:', e);
      return null;
    }
  },

  async saveFaq(faqConfig: FaqDataConfig): Promise<void> {
    try {
      const res = await fetch('/api/db/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faqConfig)
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          message: 'Справочник FAQ сохранен в CloudSQL'
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveFaq failed:', e);
    }
  }
};

