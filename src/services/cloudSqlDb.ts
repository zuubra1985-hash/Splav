import { AppUser, CompanionTrip, RiverRoute, TravelNotesConfig, ArticleReport, FaqDataConfig, UserRole, PublicUserDTO, PrivateUserDTO, TripApplication } from '../types';
import { syncTracker } from './syncTracker';

const TOKEN_KEY = 'splav86_jwt_token';
const REFRESH_TOKEN_KEY = 'splav86_refresh_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: { accessToken?: string | null; refreshToken?: string | null }) {
  try {
    if (tokens.accessToken) {
      localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    } else if (tokens.accessToken === null) {
      localStorage.removeItem(TOKEN_KEY);
    }

    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } else if (tokens.refreshToken === null) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {}
}

export function setStoredToken(token: string | null) {
  setStoredTokens({ accessToken: token });
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

// Auto-refreshing authenticated fetch wrapper
async function authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  // If 401 Unauthorized and we have a refresh token, attempt transparent refresh
  if (res.status === 401) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setStoredTokens({
            accessToken: refreshData.accessToken || refreshData.token,
            refreshToken: refreshData.refreshToken
          });

          // Retry the original request with the new access token
          headers.set('Authorization', `Bearer ${refreshData.accessToken || refreshData.token}`);
          res = await fetch(url, { ...init, headers });
        } else {
          // Refresh token invalid or expired: clear local session
          setStoredTokens({ accessToken: null, refreshToken: null });
        }
      } catch {
        setStoredTokens({ accessToken: null, refreshToken: null });
      }
    } else {
      setStoredTokens({ accessToken: null, refreshToken: null });
    }
  }

  return res;
}

// Cloud SQL Database Client Service for secure cross-device synchronization
export const CloudSqlDbService = {
  // Auth API
  async login(email: string, password: string): Promise<{ token: string; accessToken: string; refreshToken: string; user: PrivateUserDTO }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка авторизации');
    }
    setStoredTokens({
      accessToken: data.accessToken || data.token,
      refreshToken: data.refreshToken
    });
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
  }): Promise<{ token: string; accessToken: string; refreshToken: string; user: PrivateUserDTO }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка регистрации');
    }
    setStoredTokens({
      accessToken: data.accessToken || data.token,
      refreshToken: data.refreshToken
    });
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = getStoredRefreshToken();
    try {
      await authenticatedFetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    } catch {}
    setStoredTokens({ accessToken: null, refreshToken: null });
  },

  async fetchCurrentUser(): Promise<PrivateUserDTO | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await authenticatedFetch('/api/users/me');
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch current user profile:', e);
      return null;
    }
  },

  async updateCurrentUser(updates: Partial<AppUser>): Promise<PrivateUserDTO> {
    const res = await authenticatedFetch('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка обновления профиля');
    }
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await authenticatedFetch('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка смены пароля');
    }
  },

  // Telegram Application API (Strict P1-5)
  async sendTelegramApplication(params: {
    tripId: string;
    notes?: string;
    vesselType?: string;
    experienceLevel?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await authenticatedFetch('/api/notifications/telegram-application', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка отправки заявки');
    }
    return data;
  },

  // Users Directory
  async fetchUsers(): Promise<AppUser[]> {
    try {
      const res = await authenticatedFetch('/api/db/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppUser[] = await res.json();
      syncTracker.recordDownload('cloudsql', {
        count: Array.isArray(data) ? data.length : 0,
        message: `Загружено пользователей из CloudSQL`
      });
      return Array.isArray(data) ? data : (data as any).items || [];
    } catch (e) {
      console.warn('CloudSQL fetchUsers failed:', e);
      return [];
    }
  },

  async fetchPublicUsers(page?: number, limit?: number): Promise<PublicUserDTO[]> {
    try {
      const query = page ? `?page=${page}&limit=${limit || 20}` : '';
      const res = await fetch(`/api/users/public${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.items || [];
    } catch (e) {
      console.warn('fetchPublicUsers failed:', e);
      return [];
    }
  },

  async fetchAdminUsers(page?: number, limit?: number): Promise<PrivateUserDTO[]> {
    try {
      const query = page ? `?page=${page}&limit=${limit || 20}` : '';
      const res = await authenticatedFetch(`/api/admin/users${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.items || [];
    } catch (e) {
      console.warn('fetchAdminUsers failed:', e);
      return [];
    }
  },

  async adminChangeUserRole(userId: string, role: UserRole): Promise<void> {
    const res = await authenticatedFetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка изменения роли');
    }
  },

  async adminDeleteUser(userId: string): Promise<void> {
    const res = await authenticatedFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка удаления пользователя');
    }
  },

  async adminResetDatabase(): Promise<{ timestamp: number }> {
    const res = await authenticatedFetch('/api/admin/reset-database', {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка сброса базы данных');
    }
    return data;
  },

  async saveUser(user: AppUser): Promise<void> {
    try {
      const res = await authenticatedFetch('/api/db/users', {
        method: 'POST',
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
      await authenticatedFetch(`/api/db/users/${encodeURIComponent(userId)}`, {
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
  async fetchTrips(page?: number, limit?: number): Promise<CompanionTrip[]> {
    try {
      const query = page ? `?page=${page}&limit=${limit || 20}` : '';
      const res = await authenticatedFetch(`/api/db/trips${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: CompanionTrip[] = Array.isArray(data) ? data : data.items || [];
      syncTracker.recordDownload('cloudsql', {
        count: items.length,
        message: `Загружено ${items.length} сплавов из CloudSQL`
      });
      return items;
    } catch (e) {
      console.warn('CloudSQL fetchTrips failed:', e);
      return [];
    }
  },

  async saveTrips(trips: CompanionTrip[]): Promise<void> {
    try {
      const res = await authenticatedFetch('/api/db/trips', {
        method: 'POST',
        body: JSON.stringify({ trips })
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          count: trips.length,
          message: `Сохранено ${trips.length} сплавов в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveTrips failed:', e);
    }
  },

  async saveTrip(trip: CompanionTrip): Promise<void> {
    try {
      const res = await authenticatedFetch('/api/db/trips', {
        method: 'POST',
        body: JSON.stringify(trip)
      });
      if (res.ok) {
        syncTracker.recordUpload('cloudsql', {
          message: `Сплав "${trip.title}" сохранен в CloudSQL`
        });
      }
    } catch (e) {
      console.warn('CloudSQL saveTrip failed:', e);
    }
  },

  async deleteTrip(tripId: string): Promise<void> {
    try {
      await authenticatedFetch(`/api/db/trips/${encodeURIComponent(tripId)}`, {
        method: 'DELETE'
      });
      syncTracker.recordUpload('cloudsql', {
        message: `Сплав ${tripId} удален из CloudSQL`
      });
    } catch (e) {
      console.warn('CloudSQL deleteTrip failed:', e);
    }
  },

  // Trip Applications & Participants API
  async fetchTripApplications(tripId: string): Promise<TripApplication[]> {
    try {
      const res = await authenticatedFetch(`/api/trips/${encodeURIComponent(tripId)}/applications`);
      if (!res.ok) {
        if (res.status === 403) return [];
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn(`CloudSQL fetchTripApplications for trip ${tripId} failed:`, e);
      return [];
    }
  },

  async createTripApplication(
    tripId: string,
    payload: { experienceLevel?: string; vesselType?: string; hasOwnGear?: boolean; notes?: string }
  ): Promise<TripApplication> {
    const res = await authenticatedFetch(`/api/trips/${encodeURIComponent(tripId)}/applications`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    syncTracker.recordUpload('cloudsql', {
      message: `Отправлена заявка на участие в походе ${tripId}`
    });
    return data;
  },

  async updateTripApplicationStatus(
    tripId: string,
    appId: string,
    status: 'accepted' | 'declined' | 'pending'
  ): Promise<TripApplication> {
    const res = await authenticatedFetch(
      `/api/trips/${encodeURIComponent(tripId)}/applications/${encodeURIComponent(appId)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    syncTracker.recordUpload('cloudsql', {
      message: `Статус заявки ${appId} изменен на ${status}`
    });
    return data;
  },

  async fetchTripParticipants(tripId: string): Promise<any[]> {
    try {
      const res = await authenticatedFetch(`/api/trips/${encodeURIComponent(tripId)}/participants`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn(`CloudSQL fetchTripParticipants for trip ${tripId} failed:`, e);
      return [];
    }
  },

  async fetchMyApplications(): Promise<TripApplication[]> {
    try {
      const res = await authenticatedFetch('/api/users/me/applications');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('CloudSQL fetchMyApplications failed:', e);
      return [];
    }
  },

  // Routes
  async fetchRoutes(page?: number, limit?: number): Promise<RiverRoute[]> {
    try {
      const query = page ? `?page=${page}&limit=${limit || 20}` : '';
      const res = await authenticatedFetch(`/api/db/routes${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: RiverRoute[] = Array.isArray(data) ? data : data.items || [];
      syncTracker.recordDownload('cloudsql', {
        count: items.length,
        message: `Загружено ${items.length} маршрутов из CloudSQL`
      });
      return items;
    } catch (e) {
      console.warn('CloudSQL fetchRoutes failed:', e);
      return [];
    }
  },

  async saveRoutes(routes: RiverRoute[]): Promise<void> {
    try {
      const res = await authenticatedFetch('/api/db/routes', {
        method: 'POST',
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
      const res = await authenticatedFetch('/api/db/routes', {
        method: 'POST',
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
      await authenticatedFetch(`/api/db/routes/${encodeURIComponent(routeId)}`, {
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
  async fetchArticles(page?: number, limit?: number): Promise<ArticleReport[]> {
    try {
      const query = page ? `?page=${page}&limit=${limit || 20}` : '';
      const res = await authenticatedFetch(`/api/db/articles${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: ArticleReport[] = Array.isArray(data) ? data : data.items || [];
      syncTracker.recordDownload('cloudsql', {
        count: items.length,
        message: `Загружено ${items.length} статей из CloudSQL`
      });
      return items;
    } catch (e) {
      console.warn('CloudSQL fetchArticles failed:', e);
      return [];
    }
  },

  async saveArticles(articles: ArticleReport[]): Promise<void> {
    try {
      const res = await authenticatedFetch('/api/db/articles', {
        method: 'POST',
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
      await authenticatedFetch(`/api/db/articles/${encodeURIComponent(articleId)}`, {
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
      const res = await authenticatedFetch('/api/db/travel-notes');
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
      const res = await authenticatedFetch('/api/db/travel-notes', {
        method: 'POST',
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
      const res = await authenticatedFetch('/api/db/faq');
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
      const res = await authenticatedFetch('/api/db/faq', {
        method: 'POST',
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
