import { AppUser, CompanionTrip, RiverRoute, TravelNotesConfig, ArticleReport, FaqDataConfig, UserRole, PublicUserDTO, PrivateUserDTO } from '../types';
import { syncTracker } from './syncTracker';

const TOKEN_KEY = 'splav86_jwt_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Cloud SQL Database Client Service for secure cross-device synchronization
export const CloudSqlDbService = {
  // Auth API
  async login(email: string, password: string): Promise<{ token: string; user: PrivateUserDTO }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка авторизации');
    }
    setStoredToken(data.token);
    return data;
  },

  async register(params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    city?: string;
    experienceLevel?: string;
    telegram?: string;
  }): Promise<{ token: string; user: PrivateUserDTO }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка регистрации');
    }
    setStoredToken(data.token);
    return data;
  },

  async fetchCurrentUser(): Promise<PrivateUserDTO | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/users/me', {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        if (res.status === 401) {
          setStoredToken(null);
        }
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch current user profile:', e);
      return null;
    }
  },

  async updateCurrentUser(updates: Partial<AppUser>): Promise<PrivateUserDTO> {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка обновления профиля');
    }
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/users/me/password', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка смены пароля');
    }
  },

  // Users Directory
  async fetchUsers(): Promise<AppUser[]> {
    try {
      const res = await fetch('/api/db/users', {
        headers: getAuthHeaders()
      });
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

  async fetchPublicUsers(): Promise<PublicUserDTO[]> {
    try {
      const res = await fetch('/api/users/public');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('fetchPublicUsers failed:', e);
      return [];
    }
  },

  async fetchAdminUsers(): Promise<PrivateUserDTO[]> {
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('fetchAdminUsers failed:', e);
      return [];
    }
  },

  async adminChangeUserRole(userId: string, role: UserRole): Promise<void> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка изменения роли');
    }
  },

  async adminDeleteUser(userId: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка удаления пользователя');
    }
  },

  async adminResetDatabase(): Promise<{ timestamp: number }> {
    const res = await fetch('/api/admin/reset-database', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка сброса базы данных');
    }
    return data;
  },

  async saveUser(user: AppUser): Promise<void> {
    try {
      const res = await fetch('/api/db/users', {
        method: 'POST',
        headers: getAuthHeaders(),
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
        method: 'DELETE',
        headers: getAuthHeaders()
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
      const res = await fetch('/api/db/trips', {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
      const res = await fetch('/api/db/trips', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(trip)
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          message: `Поход "${trip.title}" сохранен в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveTrip failed:', e);
    }
  },

  async deleteTrip(tripId: string): Promise<void> {
    try {
      await fetch(`/api/db/trips/${encodeURIComponent(tripId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
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
      const res = await fetch('/api/db/routes', {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
      const res = await fetch('/api/db/routes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(route)
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          message: `Маршрут "${route.name}" сохранен в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveRoute failed:', e);
    }
  },

  async deleteRoute(routeId: string): Promise<void> {
    try {
      await fetch(`/api/db/routes/${encodeURIComponent(routeId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
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
      const res = await fetch('/api/db/articles', {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
        method: 'DELETE',
        headers: getAuthHeaders()
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
      const res = await fetch('/api/db/travel-notes', {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
      const res = await fetch('/api/db/faq', {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
