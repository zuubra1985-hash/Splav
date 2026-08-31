/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp, WifiOff, Wifi, RefreshCw, Zap } from 'lucide-react';
import { Navbar, MainNavigationTab } from './components/Navbar';
import { MapModule } from './components/MapModule';
import { RouteDetailModal } from './components/RouteDetailModal';
import { RouteSuitabilityModal } from './components/RouteSuitabilityModal';
import { CompanionsModule } from './components/CompanionsModule';
import { PreparationModule } from './components/PreparationModule';
import { KnowledgeBaseModule } from './components/KnowledgeBaseModule';
import { TravelNotesModule } from './components/TravelNotesModule';
import { UserCabinetModule } from './components/UserCabinetModule';
import { AdminPanelModule } from './components/AdminPanelModule';
import { AuthModal } from './components/AuthModal';
import { RiverPassportEditorModal } from './components/RiverPassportEditorModal';
import { MyTripsStore } from './services/myTripsStore';

import { RIVERS_DATA } from './data/riversData';
import { WEATHER_POINTS_DATA } from './data/weatherData';
import { COMPANION_TRIPS_DATA } from './data/tripsData';
import { SAFETY_GUIDES_DATA } from './data/safetyGuideData';
import { ARTICLES_DATA } from './data/articlesData';

import { RiverRoute, Region, CompanionTrip, ArticleReport, AppUser, UserRole, FaqDataConfig, TravelNotesConfig, CrewReview, TravelNote, RiverReview, Article, LogbookTrip } from './types';
import { TripsSyncService, RoutesSyncService, UsersSyncService, ArticlesSyncService, FaqSyncService, TravelNotesSyncService } from './firebase';
import { CloudSqlDbService } from './services/cloudSqlDb';
import { CentralSyncManager } from './services/centralSyncManager';
import {
  mergeRoutes,
  mergeTrips,
  mergeTravelNotesConfigs,
  mergeArticles,
  mergeUsers,
  filterActiveEntities,
  parseTimestamp
} from './utils/syncMerge';
import { INITIAL_FAQ_DATA } from './data/faqData';
import { INITIAL_TRAVEL_NOTES_CONFIG } from './data/logbookData';
import { 
  initTelegramWebApp, 
  telegramHaptic, 
  setupTelegramBackButton, 
  isTelegramWebApp 
} from './utils/telegramWebApp';
import { 
  getDeletedTripIds, 
  recordTripDeletion, 
  getDeletedArticleIds, 
  recordArticleDeletion, 
  getDeletedRouteIds, 
  recordRouteDeletion, 
  getDeletedUserKeys, 
  recordUserDeletion, 
  clearAllDeletionRegistries 
} from './utils/deletionRegistry';

const INITIAL_USERS: AppUser[] = [
  {
    id: 'user-superadmin-zuubra',
    email: 'zuubra1985@gmail.com',
    name: 'Администратор (zuubra1985)',
    phone: '',
    role: 'superadmin',
    city: 'Сургут',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    experienceLevel: 'Опытный турист',
    registeredAt: '2026-01-01',
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
    showContactsPublicly: true
  }
];

const VALID_TABS = ['routes', 'companions', 'preparation', 'notes', 'knowledge', 'mytrip', 'cabinet', 'admin'] as const;
type AppTab = typeof VALID_TABS[number];

const getInitialTab = (): AppTab => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0];
    if (VALID_TABS.includes(hash as AppTab)) {
      return hash as AppTab;
    }
    try {
      const saved = localStorage.getItem('splav86_active_tab');
      if (saved && VALID_TABS.includes(saved as AppTab)) {
        return saved as AppTab;
      }
    } catch (e) {}
  }
  return 'routes';
};

const getInitialRegion = (): Region => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('splav86_selected_region');
      if (saved === 'ALL' || saved === 'ХМАО' || saved === 'ЯНАО') {
        return saved as Region;
      }
    } catch (e) {}
  }
  return 'ALL';
};

export default function App() {
  const [activeTab, setActiveTabState] = useState<AppTab>(getInitialTab);
  const [selectedRegion, setSelectedRegionState] = useState<Region>(getInitialRegion);

  const setActiveTab = (tab: AppTab) => {
    telegramHaptic('selection');
    setActiveTabState(tab);
    try {
      localStorage.setItem('splav86_active_tab', tab);
      if (typeof window !== 'undefined') {
        if (window.location.hash.replace(/^#\/?/, '') !== tab) {
          window.history.replaceState(null, '', `#${tab}`);
        }
      }
    } catch (e) {}
  };

  const setSelectedRegion = (region: Region) => {
    setSelectedRegionState(region);
    try {
      localStorage.setItem('splav86_selected_region', region);
    } catch (e) {}
  };

  // Sync with browser URL hash / back-forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0];
      if (VALID_TABS.includes(hash as AppTab)) {
        setActiveTabState(hash as AppTab);
        try {
          localStorage.setItem('splav86_active_tab', hash);
        } catch (e) {}
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Online Connection Status (Resilient for Telegram WebApp and Mobile browsers)
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Active Network Monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      // In embedded webviews (like Telegram), offline events can be false positives; double check
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Registered Users & Current Auth State (Guest by default on new visits)
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>(() => {
    try {
      const deletedKeys = getDeletedUserKeys();
      const stored = localStorage.getItem('splav86_users');
      const list: AppUser[] = stored ? JSON.parse(stored) : INITIAL_USERS;
      const map = new Map<string, AppUser>();

      list.forEach((u) => {
        const emailKey = (u.email || '').trim().toLowerCase();
        const idKey = (u.id || '').trim().toLowerCase();
        const tgClean = (u.telegram || '').trim().toLowerCase().replace('@', '');
        const tgIdKey = u.telegramId ? String(u.telegramId).trim().toLowerCase() : '';

        if (!emailKey && !idKey) return;
        if (
          deletedKeys.has(emailKey) ||
          deletedKeys.has(idKey) ||
          (tgClean && deletedKeys.has(tgClean)) ||
          (tgIdKey && deletedKeys.has(tgIdKey))
        ) {
          return;
        }

        if (emailKey) {
          map.set(emailKey, u);
        } else {
          map.set(idKey, u);
        }
      });
      return Array.from(map.values());
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('splav86_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Dynamic persisted database states
  const [routes, setRoutes] = useState<RiverRoute[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_custom_routes_v5');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = getDeletedRouteIds();
          const filtered = parsed.filter((r) => !deleted.has(r.id));
          return mergeRoutes(RIVERS_DATA, filtered);
        }
      }
    } catch {}
    return RIVERS_DATA;
  });

  const [articles, setArticles] = useState<ArticleReport[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_custom_articles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = getDeletedArticleIds();
          const filtered = parsed.filter((a) => !deleted.has(a.id));
          return mergeArticles(ARTICLES_DATA, filtered);
        }
      }
    } catch {}
    return ARTICLES_DATA;
  });

  const [trips, setTrips] = useState<CompanionTrip[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_custom_trips_v5');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = getDeletedTripIds();
          const filtered = parsed.filter((t) => !deleted.has(t.id));
          return mergeTrips(COMPANION_TRIPS_DATA, filtered);
        }
      }
    } catch {}
    return COMPANION_TRIPS_DATA;
  });

  const [faqData, setFaqData] = useState<FaqDataConfig>(() => {
    try {
      const stored = localStorage.getItem('splav86_faq_data_v1');
      return stored ? JSON.parse(stored) : INITIAL_FAQ_DATA;
    } catch {
      return INITIAL_FAQ_DATA;
    }
  });

  const [notesConfig, setNotesConfig] = useState<TravelNotesConfig>(() => {
    try {
      const stored = localStorage.getItem('splav86_travel_notes_config_v1');
      const parsed: TravelNotesConfig = stored ? JSON.parse(stored) : { ...INITIAL_TRAVEL_NOTES_CONFIG };

      // Also merge individual isolated local storage arrays if present
      const storedCrew = localStorage.getItem('splav86_crew_reviews_v2');
      if (storedCrew) {
        try {
          const list: CrewReview[] = JSON.parse(storedCrew);
          if (Array.isArray(list) && list.length > 0) {
            const map = new Map<string, CrewReview>();
            (parsed.crewReviews || []).forEach((r) => map.set(r.id, r));
            list.forEach((r) => map.set(r.id, r));
            parsed.crewReviews = Array.from(map.values());
          }
        } catch (e) {
          console.warn(e);
        }
      }

      const storedNotes = localStorage.getItem('splav86_travel_notes_v2');
      if (storedNotes) {
        try {
          const list: TravelNote[] = JSON.parse(storedNotes);
          if (Array.isArray(list) && list.length > 0) {
            const map = new Map<string, TravelNote>();
            (parsed.notes || []).forEach((n) => map.set(n.id, n));
            list.forEach((n) => map.set(n.id, n));
            parsed.notes = Array.from(map.values());
          }
        } catch (e) {
          console.warn(e);
        }
      }

      const storedRiverReviews = localStorage.getItem('splav86_river_reviews_v2');
      if (storedRiverReviews) {
        try {
          const list: RiverReview[] = JSON.parse(storedRiverReviews);
          if (Array.isArray(list) && list.length > 0) {
            const map = new Map<string, RiverReview>();
            (parsed.riverReviews || []).forEach((r) => map.set(r.id, r));
            list.forEach((r) => map.set(r.id, r));
            parsed.riverReviews = Array.from(map.values());
          }
        } catch (e) {
          console.warn(e);
        }
      }

      return parsed;
    } catch {
      return INITIAL_TRAVEL_NOTES_CONFIG;
    }
  });

  // Track scroll position to show compact, unobtrusive "Back to Top" floating button on mobile
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      // Only active on mobile viewport (< 768px)
      if (window.innerWidth >= 768) {
        setShowScrollTop(false);
        return;
      }

      const scrollY = window.scrollY;
      const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;

      if (totalScrollable <= 300) {
        setShowScrollTop(false);
        return;
      }

      // Appears only closer to the end of scrolling (e.g. > 60% of page or scrolled > 500px)
      const threshold = Math.max(450, totalScrollable * 0.60);

      if (scrollY >= threshold) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // ----------------------------------------------------
  // Telegram Mini App (TMA) Lifecycle & Auth Choice
  // ----------------------------------------------------
  useEffect(() => {
    const tgTourist = initTelegramWebApp();
    if (tgTourist && tgTourist.id) {
      // Check if user is already logged in
      const stored = localStorage.getItem('splav86_current_user');
      if (!stored) {
        // Prompt user with authorization modal offering Telegram 1-click, Email login, or Registration
        setIsAuthModalOpen(true);
      } else {
        // If already logged in, update Telegram fields if matching
        try {
          const parsedUser: AppUser = JSON.parse(stored);
          if (parsedUser && (parsedUser.telegramId === tgTourist.id || parsedUser.id === `tg-${tgTourist.id}`)) {
            const updated: AppUser = {
              ...parsedUser,
              telegramId: tgTourist.id,
              telegram: tgTourist.username ? `@${tgTourist.username}` : parsedUser.telegram,
              avatar: tgTourist.photo_url || parsedUser.avatar
            };
            setCurrentUser(updated);
            UsersSyncService.saveUser(updated).catch(console.warn);
            CloudSqlDbService.saveUser(updated).catch(console.warn);
          }
        } catch (e) {
          console.warn('Failed to parse existing current user:', e);
        }
      }
    }
  }, []);

  // Real-time Cloud Synchronization via Firebase Firestore + Centralized SQL Sync
  useEffect(() => {
    let isBootstrappingUsers = false;

    // 1. Initial SQL fetch and Subscribe to Trips (Real-time expeditions)
    CloudSqlDbService.fetchTrips().then((sqlTrips) => {
      if (sqlTrips && sqlTrips.length > 0) {
        setTrips((prev) => filterActiveEntities(mergeTrips(prev.length > 0 ? prev : COMPANION_TRIPS_DATA, sqlTrips)));
      }
    }).catch(console.warn);

    const unsubTrips = TripsSyncService.subscribeToTrips((cloudTrips) => {
      setTrips((prev) => {
        const base = prev.length > 0 ? prev : COMPANION_TRIPS_DATA;
        const merged = mergeTrips(base, cloudTrips || []);
        const active = filterActiveEntities(merged);
        try {
          localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(active));
        } catch (e) {
          console.error(e);
        }
        return active;
      });
    });

    // 2. Initial SQL fetch and Subscribe to Routes (River passports and catalog)
    CloudSqlDbService.fetchRoutes().then((sqlRoutes) => {
      if (sqlRoutes && sqlRoutes.length > 0) {
        setRoutes((prev) => filterActiveEntities(mergeRoutes(prev.length > 0 ? prev : RIVERS_DATA, sqlRoutes)));
      }
    }).catch(console.warn);

    const unsubRoutes = RoutesSyncService.subscribeToRoutes((cloudRoutes) => {
      setRoutes((prev) => {
        const base = prev.length > 0 ? prev : RIVERS_DATA;
        const merged = mergeRoutes(base, cloudRoutes || []);
        const active = filterActiveEntities(merged);
        try {
          localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(active));
        } catch (e) {
          console.error(e);
        }
        return active;
      });
    });

    // 3. Subscribe to Users (Tourists, Organizers, Admins)
    CloudSqlDbService.fetchUsers().then((sqlUsers) => {
      if (sqlUsers && sqlUsers.length > 0) {
        setRegisteredUsers((prev) => filterActiveEntities(mergeUsers(prev.length > 0 ? prev : INITIAL_USERS, sqlUsers)));
      }
    }).catch(console.warn);

    // Initial check of /api/users/me if token exists to ensure freshest avatar & profile
    CloudSqlDbService.fetchCurrentUser().then((remoteMe) => {
      if (remoteMe) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const merged: AppUser = {
            ...prev,
            ...remoteMe,
            id: remoteMe.id || prev.id,
            role: (remoteMe.role as UserRole) || prev.role,
            avatar: remoteMe.avatar || prev.avatar,
            name: remoteMe.name || prev.name,
            updatedAt: remoteMe.registeredAt || prev.updatedAt || new Date().toISOString()
          };
          try {
            localStorage.setItem('splav86_current_user', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    }).catch(console.warn);

    const unsubUsers = UsersSyncService.subscribeToUsers((cloudUsers) => {
      if (!cloudUsers || cloudUsers.length === 0) {
        if (!isBootstrappingUsers) {
          isBootstrappingUsers = true;
          INITIAL_USERS.forEach((u) => {
            CentralSyncManager.saveUser(u).catch(console.error);
          });
          setRegisteredUsers(INITIAL_USERS);
        }
      } else {
        setRegisteredUsers((prev) => {
          const merged = mergeUsers(prev.length > 0 ? prev : INITIAL_USERS, cloudUsers);
          const active = filterActiveEntities(merged);
          try {
            localStorage.setItem('splav86_users', JSON.stringify(active));
          } catch (e) {
            console.error(e);
          }
          return active;
        });
      }
    });

    // 4. Initial SQL fetch and Subscribe to Articles & Reports
    CloudSqlDbService.fetchArticles().then((sqlArticles) => {
      if (sqlArticles && sqlArticles.length > 0) {
        setArticles((prev) => filterActiveEntities(mergeArticles(prev.length > 0 ? prev : ARTICLES_DATA, sqlArticles)));
      }
    }).catch(console.warn);

    const unsubArticles = ArticlesSyncService.subscribeToArticles((cloudArticles) => {
      setArticles((prev) => {
        const base = prev.length > 0 ? prev : ARTICLES_DATA;
        const merged = mergeArticles(base, cloudArticles || []);
        const active = filterActiveEntities(merged);
        try {
          localStorage.setItem('splav86_custom_articles', JSON.stringify(active));
        } catch (e) {
          console.error(e);
        }
        return active;
      });
    });

    // 5. Initial SQL fetch and Subscribe to FAQ Configuration
    CloudSqlDbService.fetchFaq().then((sqlFaq) => {
      if (sqlFaq) {
        setFaqData(sqlFaq);
      }
    }).catch(console.warn);

    const unsubFaq = FaqSyncService.subscribeToFaq((cloudFaq) => {
      if (cloudFaq) {
        setFaqData(cloudFaq);
        try {
          localStorage.setItem('splav86_faq_data_v1', JSON.stringify(cloudFaq));
        } catch (e) {
          console.error(e);
        }
      }
    });

    // 6. Initial SQL fetch and Subscribe to Travel Notes, Checklists & Reviews Configuration
    CloudSqlDbService.fetchTravelNotes().then((sqlNotes) => {
      if (sqlNotes) {
        setNotesConfig((prev) => mergeTravelNotesConfigs(prev, sqlNotes));
      }
    }).catch(console.warn);

    const unsubNotes = TravelNotesSyncService.subscribeToNotesConfig((cloudNotes) => {
      if (cloudNotes) {
        setNotesConfig((prev) => {
          const merged = mergeTravelNotesConfigs(prev, cloudNotes);
          try {
            localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(merged));
          } catch (e) {
            console.error(e);
          }
          return merged;
        });
      }
    });

    // Periodic and window-focus sync across all modules using CentralSyncManager and merge algorithms
    const handleSilentSync = () => {
      CloudSqlDbService.fetchTrips().then((sqlTrips) => {
        if (sqlTrips && sqlTrips.length > 0) {
          setTrips((prev) => filterActiveEntities(mergeTrips(prev, sqlTrips)));
        }
      }).catch(console.warn);

      CloudSqlDbService.fetchRoutes().then((sqlRoutes) => {
        if (sqlRoutes && sqlRoutes.length > 0) {
          setRoutes((prev) => filterActiveEntities(mergeRoutes(prev, sqlRoutes)));
        }
      }).catch(console.warn);

      CloudSqlDbService.fetchArticles().then((sqlArticles) => {
        if (sqlArticles && sqlArticles.length > 0) {
          setArticles((prev) => filterActiveEntities(mergeArticles(prev, sqlArticles)));
        }
      }).catch(console.warn);

      CloudSqlDbService.fetchUsers().then((sqlUsers) => {
        if (sqlUsers && sqlUsers.length > 0) {
          setRegisteredUsers((prev) => filterActiveEntities(mergeUsers(prev, sqlUsers)));
        }
      }).catch(console.warn);

      CloudSqlDbService.fetchTravelNotes().then((sqlNotes) => {
        if (sqlNotes) {
          setNotesConfig((prev) => mergeTravelNotesConfigs(prev, sqlNotes));
        }
      }).catch(console.warn);

      CloudSqlDbService.fetchFaq().then((sqlFaq) => {
        if (sqlFaq) {
          setFaqData(sqlFaq);
        }
      }).catch(console.warn);

      // Periodic check of /api/users/me if token exists
      CloudSqlDbService.fetchCurrentUser().then((remoteMe) => {
        if (remoteMe) {
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const isAvatarDiff = remoteMe.avatar && remoteMe.avatar !== prev.avatar;
            const isNameDiff = remoteMe.name && remoteMe.name !== prev.name;
            const isRoleDiff = remoteMe.role && remoteMe.role !== prev.role;
            if (isAvatarDiff || isNameDiff || isRoleDiff) {
              const updated: AppUser = {
                ...prev,
                ...remoteMe,
                id: remoteMe.id || prev.id,
                role: (remoteMe.role as UserRole) || prev.role,
                avatar: remoteMe.avatar || prev.avatar,
                name: remoteMe.name || prev.name,
                updatedAt: remoteMe.registeredAt || prev.updatedAt || new Date().toISOString()
              };
              try {
                localStorage.setItem('splav86_current_user', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            }
            return prev;
          });
        }
      }).catch(console.warn);
    };

    const syncInterval = setInterval(handleSilentSync, 20000);
    window.addEventListener('focus', handleSilentSync);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleSilentSync);
      unsubTrips();
      unsubRoutes();
      unsubUsers();
      unsubArticles();
      unsubFaq();
      unsubNotes();
    };
  }, []);

  // Continuous real-time bidirectional synchronization of currentUser with cloud users stream (like routes & notes)
  useEffect(() => {
    if (!currentUser) return;
    const currentEmail = (currentUser.email || '').trim().toLowerCase();
    const matchingUser = registeredUsers.find(
      (u) => u.id === currentUser.id || (currentEmail && (u.email || '').trim().toLowerCase() === currentEmail)
    );
    if (matchingUser) {
      const localTs = parseTimestamp(currentUser.updatedAt);
      const remoteTs = parseTimestamp(matchingUser.updatedAt);
      const isAvatarDifferent = Boolean(matchingUser.avatar && matchingUser.avatar !== currentUser.avatar);
      const isNameDifferent = Boolean(matchingUser.name && matchingUser.name !== currentUser.name);
      const isRoleDifferent = Boolean(matchingUser.role && matchingUser.role !== currentUser.role);

      if (remoteTs > localTs || isAvatarDifferent || isNameDifferent || isRoleDifferent) {
        const syncedUser: AppUser = {
          ...currentUser,
          ...matchingUser,
          avatar: matchingUser.avatar || currentUser.avatar,
          updatedAt: matchingUser.updatedAt || new Date().toISOString()
        };
        setCurrentUser(syncedUser);
        try {
          localStorage.setItem('splav86_current_user', JSON.stringify(syncedUser));
        } catch (e) {}
      }
    }
  }, [registeredUsers]);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('splav86_users', JSON.stringify(registeredUsers));
    } catch (e) {
      console.error(e);
    }
  }, [registeredUsers]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('splav86_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('splav86_current_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(routes));
    } catch (e) {
      console.error(e);
    }
  }, [routes]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_custom_articles', JSON.stringify(articles));
    } catch (e) {
      console.error(e);
    }
  }, [articles]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(trips));
    } catch (e) {
      console.error(e);
    }
  }, [trips]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_faq_data_v1', JSON.stringify(faqData));
    } catch (e) {
      console.error(e);
    }
  }, [faqData]);

  const handleRegisterUser = (newUser: AppUser) => {
    const userWithMeta: AppUser = {
      ...newUser,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    const normEmail = (userWithMeta.email || '').trim().toLowerCase();
    setRegisteredUsers((prev) => {
      const existsIndex = prev.findIndex(
        (u) => u.id === userWithMeta.id || (normEmail && (u.email || '').trim().toLowerCase() === normEmail)
      );
      let updated: AppUser[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...userWithMeta };
      } else {
        updated = [userWithMeta, ...prev];
      }
      try {
        localStorage.setItem('splav86_users', JSON.stringify(filterActiveEntities(updated)));
      } catch (e) {}
      return filterActiveEntities(updated);
    });

    CentralSyncManager.saveUser(userWithMeta).catch((err) => {
      console.warn('CentralSyncManager saveUser error:', err);
    });
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    setRegisteredUsers((prev) => {
      const target = prev.find((u) => u.id === userId);
      const targetEmail = target?.email?.trim().toLowerCase();

      const updated = prev.map((u) => {
        if (u.id === userId || (targetEmail && u.email?.trim().toLowerCase() === targetEmail)) {
          const userWithRole: AppUser = {
            ...u,
            role: newRole,
            isDeleted: false,
            updatedAt: new Date().toISOString()
          };
          CentralSyncManager.saveUser(userWithRole).catch((err) => {
            console.warn('CentralSyncManager saveUser role error:', err);
          });
          return userWithRole;
        }
        return u;
      });
      try {
        localStorage.setItem('splav86_users', JSON.stringify(filterActiveEntities(updated)));
      } catch (e) {
        console.warn(e);
      }
      return filterActiveEntities(updated);
    });

    if (currentUser && (currentUser.id === userId || (currentUser.email && registeredUsers.find(u => u.id === userId)?.email?.toLowerCase() === currentUser.email.toLowerCase()))) {
      const updatedCurr: AppUser = { ...currentUser, role: newRole, isDeleted: false, updatedAt: new Date().toISOString() };
      setCurrentUser(updatedCurr);
      try {
        localStorage.setItem('splav86_current_user', JSON.stringify(updatedCurr));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = registeredUsers.find((u) => u.id === userId);
    const targetEmail = targetUser?.email?.trim().toLowerCase();

    recordUserDeletion(userId, targetEmail, targetUser?.telegram, targetUser?.telegramId);

    const deletedUser: AppUser = targetUser ? {
      ...targetUser,
      isDeleted: true,
      updatedAt: new Date().toISOString()
    } : {
      id: userId,
      email: targetEmail || '',
      name: 'Удаленный пользователь',
      phone: '',
      role: 'user',
      registeredAt: new Date().toISOString(),
      favoriteRouteIds: [],
      isDeleted: true,
      updatedAt: new Date().toISOString()
    };

    const updated = registeredUsers.filter(
      (u) => u.id !== userId && (!targetEmail || (u.email || '').trim().toLowerCase() !== targetEmail)
    );
    setRegisteredUsers(updated);

    try {
      localStorage.setItem('splav86_users', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save updated users to localStorage:', e);
    }

    // Queue centralized delete
    CentralSyncManager.deleteUser(userId, deletedUser).catch(console.warn);
    if (targetUser && targetUser.id !== userId) {
      CentralSyncManager.deleteUser(targetUser.id, { ...deletedUser, id: targetUser.id }).catch(console.warn);
    }

    // If current user is the deleted user, log out
    if (currentUser && (currentUser.id === userId || (targetEmail && currentUser.email?.trim().toLowerCase() === targetEmail))) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('splav86_current_user');
    } catch (e) {}
    CloudSqlDbService.logout().catch(console.warn);
  };

  const handleUpdateCurrentUser = (updatedUser: AppUser) => {
    const userWithMeta: AppUser = {
      ...updatedUser,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    
    if (currentUser && (currentUser.id === userWithMeta.id || currentUser.email?.trim().toLowerCase() === userWithMeta.email?.trim().toLowerCase())) {
      setCurrentUser(userWithMeta);
      try {
        localStorage.setItem('splav86_current_user', JSON.stringify(userWithMeta));
      } catch (e) {}
    }

    // 1. Update in registeredUsers list (by ID and normalized Email)
    const normEmail = (userWithMeta.email || '').trim().toLowerCase();
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        const uEmail = (u.email || '').trim().toLowerCase();
        if (u.id === userWithMeta.id || (normEmail && uEmail === normEmail)) {
          return { ...u, ...userWithMeta };
        }
        return u;
      })
    );

    // 2. Cascade avatar and name changes to trips (organizer & applications)
    setTrips((prevTrips) => {
      let changed = false;
      const nextTrips = prevTrips.map((t) => {
        let tripModified = false;
        let nextOrg = t.organizer;
        const orgUserId = t.organizer.userId;

        if (orgUserId === userWithMeta.id || (userWithMeta.name && t.organizer.name === userWithMeta.name)) {
          nextOrg = {
            ...t.organizer,
            name: userWithMeta.name || t.organizer.name,
            avatar: userWithMeta.avatar || t.organizer.avatar,
            phone: userWithMeta.phone || t.organizer.phone,
            fstrRank: userWithMeta.fstrRank || t.organizer.fstrRank
          };
          tripModified = true;
        }

        // Update applications by this user
        let nextApps = t.applications;
        if (t.applications && t.applications.length > 0) {
          nextApps = t.applications.map((app) => {
            const appEmail = (app.applicantEmail || '').trim().toLowerCase();
            const appUid = app.userId || app.applicantUserId;
            if (appUid === userWithMeta.id || (normEmail && appEmail === normEmail)) {
              tripModified = true;
              return {
                ...app,
                applicantName: userWithMeta.name || app.applicantName,
                applicantAvatar: userWithMeta.avatar || app.applicantAvatar,
                applicantPhone: userWithMeta.phone || app.applicantPhone
              };
            }
            return app;
          });
        }

        if (tripModified) {
          changed = true;
          const updatedTrip: CompanionTrip = {
            ...t,
            organizer: nextOrg,
            applications: nextApps,
            isDeleted: false,
            updatedAt: new Date().toISOString()
          };
          CentralSyncManager.saveTrip(updatedTrip).catch(console.warn);
          return updatedTrip;
        }
        return t;
      });

      if (changed) {
        try {
          localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(filterActiveEntities(nextTrips)));
        } catch (e) {
          console.warn(e);
        }
      }
      return filterActiveEntities(nextTrips);
    });

    // 3. Cascade avatar and name to articles
    setArticles((prevArticles) => {
      let changed = false;
      const nextArticles = prevArticles.map((art) => {
        if (art.authorId === userWithMeta.id || art.author === userWithMeta.name) {
          changed = true;
          const updatedArt: ArticleReport = {
            ...art,
            author: userWithMeta.name || art.author,
            authorAvatar: userWithMeta.avatar || art.authorAvatar,
            isDeleted: false,
            updatedAt: new Date().toISOString()
          };
          CentralSyncManager.saveArticle(updatedArt).catch(console.warn);
          return updatedArt;
        }
        return art;
      });

      if (changed) {
        try {
          localStorage.setItem('splav86_custom_articles', JSON.stringify(filterActiveEntities(nextArticles)));
        } catch (e) {
          console.warn(e);
        }
      }
      return filterActiveEntities(nextArticles);
    });

    // 4. Save user via CentralSyncManager (Firestore Realtime + CloudSQL sync queue)
    CentralSyncManager.saveUser(userWithMeta).catch((err) => {
      console.warn('CentralSyncManager saveUser error:', err);
    });

    // 5. Direct update to CloudSQL /api/users/me if authenticated
    CloudSqlDbService.updateCurrentUser({
      name: userWithMeta.name,
      avatar: userWithMeta.avatar,
      phone: userWithMeta.phone,
      telegram: userWithMeta.telegram,
      city: userWithMeta.city,
      experienceLevel: userWithMeta.experienceLevel || userWithMeta.experience,
      bio: userWithMeta.bio,
      callsign: userWithMeta.callsign || userWithMeta.radioCallsign,
      fstrRank: userWithMeta.fstrRank
    }).catch((err) => {
      console.warn('CloudSqlDbService.updateCurrentUser silent note:', err.message);
    });

    // 6. Persist to localStorage
    try {
      localStorage.setItem('splav86_current_user', JSON.stringify(userWithMeta));
      const allUsers = registeredUsers.map((u) => {
        const uEmail = (u.email || '').trim().toLowerCase();
        if (u.id === userWithMeta.id || (normEmail && uEmail === normEmail)) {
          return { ...u, ...userWithMeta };
        }
        return u;
      });
      localStorage.setItem('splav86_users', JSON.stringify(filterActiveEntities(allUsers)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavoriteRoute = (routeId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const currentFavs = currentUser.favoriteRouteIds || [];
    const exists = currentFavs.includes(routeId);
    const nextFavs = exists
      ? currentFavs.filter((id) => id !== routeId)
      : [...currentFavs, routeId];

    const updatedUser: AppUser = {
      ...currentUser,
      favoriteRouteIds: nextFavs
    };
    handleUpdateCurrentUser(updatedUser);
  };

  const handleClearAllUserCards = () => {
    const timestamp = new Date().toISOString();
    setRegisteredUsers((prev) => {
      const cleaned = prev.map((u) => {
        const item: AppUser = {
          ...u,
          phone: '',
          vesselsOwned: [],
          gearInventory: [],
          favoriteRivers: [],
          favoriteRouteIds: [],
          badges: [],
          bio: '',
          callsign: '',
          fstrRank: '',
          telegram: '',
          vk: '',
          isReadyForExpeditions: true,
          showContactsPublicly: true,
          updatedAt: timestamp
        };
        CentralSyncManager.saveUser(item).catch(console.warn);
        return item;
      });
      localStorage.setItem('splav86_users', JSON.stringify(cleaned));
      return cleaned;
    });

    if (currentUser) {
      const updatedCurrent: AppUser = {
        ...currentUser,
        phone: '',
        vesselsOwned: [],
        gearInventory: [],
        favoriteRivers: [],
        favoriteRouteIds: [],
        badges: [],
        bio: '',
        callsign: '',
        fstrRank: '',
        telegram: '',
        vk: '',
        isReadyForExpeditions: true,
        showContactsPublicly: true,
        updatedAt: timestamp
      };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('splav86_current_user', JSON.stringify(updatedCurrent));
      CentralSyncManager.saveUser(updatedCurrent).catch(console.warn);
    }

    const cleanedNotes: TravelNotesConfig = {
      ...notesConfig,
      crewReviews: [],
      updatedAt: timestamp
    };
    setNotesConfig(cleanedNotes);
    CentralSyncManager.saveTravelNotes(cleanedNotes).catch(console.warn);
  };

  const handleResetToDefaults = async () => {
    localStorage.removeItem('splav86_custom_routes');
    localStorage.removeItem('splav86_custom_routes_v5');
    localStorage.removeItem('splav86_custom_articles');
    localStorage.removeItem('splav86_custom_trips');
    localStorage.removeItem('splav86_custom_trips_v5');
    localStorage.removeItem('splav86_faq_data_v1');
    localStorage.removeItem('splav86_travel_notes_config_v1');
    localStorage.removeItem('splav86_travel_notes_v2');
    localStorage.removeItem('splav86_river_reviews_v2');
    localStorage.removeItem('splav86_crew_reviews_v2');

    const timestamp = new Date().toISOString();

    // Wipe routes
    routes.forEach((r) => {
      recordRouteDeletion(r.id);
      CentralSyncManager.deleteRoute(r.id, { ...r, isDeleted: true, updatedAt: timestamp }).catch(console.warn);
    });
    setRoutes([]);

    // Wipe articles
    articles.forEach((a) => {
      recordArticleDeletion(a.id);
      CentralSyncManager.deleteArticle(a.id, { ...a, isDeleted: true, updatedAt: timestamp }).catch(console.warn);
    });
    setArticles([]);

    // Wipe trips
    trips.forEach((t) => {
      recordTripDeletion(t.id);
      CentralSyncManager.deleteTrip(t.id, { ...t, isDeleted: true, updatedAt: timestamp }).catch(console.warn);
    });
    setTrips([]);

    // Reset notes
    const freshNotes = { ...INITIAL_TRAVEL_NOTES_CONFIG, updatedAt: timestamp };
    setNotesConfig(freshNotes);
    CentralSyncManager.saveTravelNotes(freshNotes).catch(console.warn);

    // Reset FAQ
    setFaqData(INITIAL_FAQ_DATA);
    CentralSyncManager.saveFaq(INITIAL_FAQ_DATA).catch(console.warn);

    handleClearAllUserCards();
  };

  // Selected route & modal states
  const [selectedRoute, setSelectedRoute] = useState<RiverRoute | null>(null);
  const [detailModalRoute, setDetailModalRoute] = useState<RiverRoute | null>(null);
  const [suitabilityModalRoute, setSuitabilityModalRoute] = useState<RiverRoute | null>(null);
  const [myTripSelectedTripId, setMyTripSelectedTripId] = useState<string | null>(null);
  const [preparationInitialRoute, setPreparationInitialRoute] = useState<RiverRoute | null>(null);
  const [isPassportEditorOpen, setIsPassportEditorOpen] = useState<boolean>(false);
  const [passportEditorRoute, setPassportEditorRoute] = useState<RiverRoute | null>(null);
  const [cabinetInitialTab, setCabinetInitialTab] = useState<'profile' | 'applications' | 'routes' | 'articles' | 'trips' | 'faq' | 'users' | 'travel_notes' | 'backup' | 'sync_history'>('profile');
  const [cabinetInitialArticle, setCabinetInitialArticle] = useState<ArticleReport | null>(null);

  // Telegram Native BackButton integration
  useEffect(() => {
    const hasModal = Boolean(selectedRoute || isPassportEditorOpen || isAuthModalOpen || suitabilityModalRoute || detailModalRoute);
    if (hasModal) {
      return setupTelegramBackButton(() => {
        telegramHaptic('light');
        if (suitabilityModalRoute) setSuitabilityModalRoute(null);
        else if (detailModalRoute) setDetailModalRoute(null);
        else if (selectedRoute) setSelectedRoute(null);
        else if (isPassportEditorOpen) setIsPassportEditorOpen(false);
        else if (isAuthModalOpen) setIsAuthModalOpen(false);
      });
    } else if (activeTab !== 'routes') {
      return setupTelegramBackButton(() => {
        telegramHaptic('light');
        setActiveTab('routes');
      });
    }
  }, [selectedRoute, isPassportEditorOpen, isAuthModalOpen, suitabilityModalRoute, detailModalRoute, activeTab]);

  // Superadmin & Admin status
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin';

  const handleOpenFaqEditor = () => {
    if (!isAdmin) return;
    setActiveTab('admin');
  };

  const handleOpenArticleEditor = (article?: ArticleReport) => {
    if (!isAdmin) return;
    setActiveTab('admin');
  };

  const handleSavePassport = (savedRoute: RiverRoute) => {
    if (!isAdmin && !(currentUser && (!savedRoute.authorId || savedRoute.authorId === currentUser.id))) return;
    
    // Ensure author attribution and metadata
    const preparedRoute: RiverRoute = {
      ...savedRoute,
      authorId: savedRoute.authorId || currentUser?.id,
      authorName: savedRoute.authorName || currentUser?.name,
      authorEmail: savedRoute.authorEmail || currentUser?.email,
      isPersonal: savedRoute.isPersonal ?? true,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };

    setRoutes((prev) => {
      const exists = prev.some((r) => r.id === preparedRoute.id);
      const updated = exists ? prev.map((r) => (r.id === preparedRoute.id ? preparedRoute : r)) : [preparedRoute, ...prev];
      const active = filterActiveEntities(updated);
      try {
        localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(active));
      } catch (e) {
        console.error(e);
      }
      return active;
    });

    // Centralized Sync
    CentralSyncManager.saveRoute(preparedRoute).catch((err) => {
      console.warn('CentralSyncManager saveRoute error:', err);
    });

    if (selectedRoute?.id === preparedRoute.id) {
      setSelectedRoute(preparedRoute);
    }
    if (detailModalRoute?.id === preparedRoute.id) {
      setDetailModalRoute(preparedRoute);
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    recordRouteDeletion(routeId);
    const targetRoute = routes.find((r) => r.id === routeId);
    const softDeletedRoute: RiverRoute = targetRoute ? {
      ...targetRoute,
      isDeleted: true,
      updatedAt: new Date().toISOString()
    } : {
      id: routeId,
      name: 'Удаленный маршрут',
      riverName: '',
      region: 'ХМАО',
      lengthKm: 0,
      durationDays: 1,
      fstrCategory: 'н/к',
      intlClass: 'Class I',
      recommendedVessels: ['kayak'],
      startPoint: { name: '', lat: 0, lng: 0 },
      endPoint: { name: '', lat: 0, lng: 0 },
      coordinates: [],
      elevationGainM: 0,
      elevationProfile: [],
      gpxFileName: '',
      avgFlowSpeedKmh: 0,
      seasonMonths: '',
      shortDesc: '',
      description: '',
      highlights: [],
      warnings: [],
      mchsRegistrationRequired: false,
      kmnsPermitNeeded: false,
      coverImage: '',
      pois: [],
      isDeleted: true,
      updatedAt: new Date().toISOString()
    };

    setRoutes((prev) => {
      const updated = prev.filter((r) => r.id !== routeId);
      try {
        localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    CentralSyncManager.deleteRoute(routeId, softDeletedRoute).catch((err) => {
      console.warn('CentralSyncManager deleteRoute error:', err);
    });

    if (selectedRoute?.id === routeId) setSelectedRoute(null);
    if (detailModalRoute?.id === routeId) setDetailModalRoute(null);
  };

  const handleSelectForMchs = (route: RiverRoute) => {
    setPreparationInitialRoute(route);
    setActiveTab('preparation');
    setDetailModalRoute(null);
  };

  const handleCreateMyTripFromRoute = (route: RiverRoute) => {
    const trip = MyTripsStore.createFromRoute(route, currentUser);
    setMyTripSelectedTripId(trip.id);
    setActiveTab('mytrip');
    setDetailModalRoute(null);
    setSuitabilityModalRoute(null);
  };

  const handleFindCompanionsFromRoute = (route: RiverRoute) => {
    setActiveTab('companions');
    setDetailModalRoute(null);
    setSuitabilityModalRoute(null);
  };

  const handleCreateNewTrip = (newTrip: CompanionTrip) => {
    const tripWithMeta: CompanionTrip = {
      ...newTrip,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    setTrips((prev) => {
      const updated = [tripWithMeta, ...prev.filter(t => t.id !== tripWithMeta.id)];
      const active = filterActiveEntities(updated);
      try {
        localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(active));
      } catch (e) {
        console.error(e);
      }
      return active;
    });

    CentralSyncManager.saveTrip(tripWithMeta).catch((err) => {
      console.warn('CentralSyncManager saveTrip error:', err);
    });
  };

  const handleUpdateTrip = (updatedTrip: CompanionTrip) => {
    const tripWithMeta: CompanionTrip = {
      ...updatedTrip,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    setTrips((prev) => {
      const updated = prev.map((t) => (t.id === tripWithMeta.id ? tripWithMeta : t));
      const active = filterActiveEntities(updated);
      try {
        localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(active));
      } catch (e) {
        console.error(e);
      }
      return active;
    });

    CentralSyncManager.saveTrip(tripWithMeta).catch((err) => {
      console.warn('CentralSyncManager updateTrip error:', err);
    });
  };

  const handleDeleteTrip = (tripId: string) => {
    recordTripDeletion(tripId);
    const targetTrip = trips.find((t) => t.id === tripId);
    const softDeletedTrip: CompanionTrip = targetTrip ? {
      ...targetTrip,
      isDeleted: true,
      updatedAt: new Date().toISOString()
    } : {
      id: tripId,
      title: 'Удаленный поход',
      riverName: '',
      region: 'ХМАО',
      startDate: '',
      endDate: '',
      durationDays: 1,
      vessels: ['kayak'],
      fstrCategory: 'н/к',
      totalSeats: 1,
      bookedSeats: 0,
      requiredExperience: 'Начинающий (0-1 сплав)',
      organizer: {
        userId: '',
        name: 'Организатор',
        avatar: '',
        experienceYears: 0,
        completedTrips: 0,
        fstrRank: '',
        phone: '',
        telegram: ''
      },
      gearProvided: [],
      requiredPersonalGear: [],
      estimatedCostPerPersonRub: 0,
      participants: [],
      commentsCount: 0,
      description: '',
      status: 'completed',
      isDeleted: true,
      updatedAt: new Date().toISOString()
    };

    setTrips((prev) => {
      const updated = prev.filter((t) => t.id !== tripId);
      try {
        localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    CentralSyncManager.deleteTrip(tripId, softDeletedTrip).catch((err) => {
      console.warn('CentralSyncManager deleteTrip error:', err);
    });
  };

  const handleDeleteArticle = (articleId: string) => {
    recordArticleDeletion(articleId);
    const targetArticle = articles.find((a) => a.id === articleId);
    const softDeletedArticle: ArticleReport = targetArticle ? {
      ...targetArticle,
      isDeleted: true,
      updatedAt: new Date().toISOString()
    } : {
      id: articleId,
      title: 'Удаленная статья',
      subtitle: '',
      author: 'Автор',
      authorRank: '',
      riverName: '',
      region: 'ХМАО',
      date: '',
      readTimeMin: 1,
      coverImage: '',
      tags: [],
      summary: '',
      fullContent: [],
      stats: { distanceKm: 0, days: 0, vessel: '', bestMonth: '' },
      gallery: [],
      isDeleted: true,
      updatedAt: new Date().toISOString()
    };

    setArticles((prev) => {
      const updated = prev.filter((a) => a.id !== articleId);
      try {
        localStorage.setItem('splav86_custom_articles', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    CentralSyncManager.deleteArticle(articleId, softDeletedArticle).catch((err) => {
      console.warn('CentralSyncManager deleteArticle error:', err);
    });
  };

  const handleViewTripOnMainMap = (trip: CompanionTrip) => {
    // 1. Try to find route matching trip.routeId or matching river name with valid coordinates
    let targetRoute = routes.find(
      (r) => (trip.routeId && r.id === trip.routeId) ||
             (r.riverName.toLowerCase() === trip.riverName.toLowerCase() && r.coordinates.length > 0)
    );

    // 2. If no existing route, but trip has a GPX track, create a dynamic route in state so the map renders it and focuses on it
    if (!targetRoute && trip.gpxTrack && trip.gpxTrack.coordinates.length > 0) {
      const generatedRoute: RiverRoute = {
        id: trip.routeId || `trip-route-${trip.id}`,
        name: trip.gpxTrack.name || `Маршрут сплава: ${trip.title}`,
        riverName: trip.riverName,
        region: trip.region,
        lengthKm: trip.gpxTrack.lengthKm || 50,
        durationDays: trip.durationDays || 4,
        fstrCategory: trip.fstrCategory || 'I к.с.',
        intlClass: 'Class II',
        recommendedVessels: trip.vessels || ['kayak', 'sup'],
        startPoint: trip.gpxTrack.startPoint || {
          name: 'Старт маршрута',
          lat: trip.gpxTrack.coordinates[0][0],
          lng: trip.gpxTrack.coordinates[0][1]
        },
        endPoint: trip.gpxTrack.endPoint || {
          name: 'Финиш маршрута',
          lat: trip.gpxTrack.coordinates[trip.gpxTrack.coordinates.length - 1][0],
          lng: trip.gpxTrack.coordinates[trip.gpxTrack.coordinates.length - 1][1]
        },
        coordinates: trip.gpxTrack.coordinates,
        elevationGainM: trip.gpxTrack.elevationGainM || 20,
        elevationProfile: [],
        gpxFileName: trip.gpxFileName || `${trip.riverName}_track.gpx`,
        avgFlowSpeedKmh: 4.0,
        seasonMonths: 'Июнь - Сентябрь',
        shortDesc: trip.title,
        description: trip.description,
        highlights: [
          `Экспедиция: ${trip.title}`,
          `Даты: ${trip.startDate} — ${trip.endDate}`,
          `Капитан: ${trip.organizer.name}`
        ],
        warnings: [
          `Категория сложности: ${trip.fstrCategory}`,
          `Требуемый опыт: ${trip.requiredExperience}`
        ],
        mchsRegistrationRequired: true,
        kmnsPermitNeeded: false,
        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        pois: trip.gpxTrack.waypoints || []
      };

      setRoutes((prev) => [generatedRoute, ...prev]);
      targetRoute = generatedRoute;
    }

    if (targetRoute) {
      if (selectedRegion !== 'ALL' && selectedRegion !== targetRoute.region) {
        setSelectedRegion('ALL');
      }
      setSelectedRoute(targetRoute);
    }

    setActiveTab('routes');
  };

  // Filter routes: public catalog routes + public shared routes + user's own uploaded personal routes (or all routes for admins)
  const accessibleRoutes = useMemo(() => {
    return routes.filter((r) => {
      // If not personal, it is a base public catalog route
      if (!r.isPersonal) return true;
      // If author chose to share/publish it, it's public for everyone
      if (r.isPublic) return true;
      // If current user is the author, they can view their own private route
      if (currentUser && r.authorId && r.authorId === currentUser.id) {
        return true;
      }
      // Admins see all routes for moderation
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin')) {
        return true;
      }
      return false;
    });
  }, [routes, currentUser]);

  // Filter routes by region
  const regionFilteredRoutes = accessibleRoutes.filter((r) => {
    if (selectedRegion === 'ALL') return true;
    return r.region === selectedRegion;
  });

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#2D332D] flex flex-col font-sans selection:bg-[#2D5A27] selection:text-white">
      
      {/* Top Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isOnline={isOnline}
      />

      {/* Main View Area */}
      <main className={`flex-1 ${activeTab === 'routes' ? 'pb-0' : 'pb-16 sm:pb-6'}`}>
        
        {/* 1. ROUTES & LEAFLET MAP */}
        {activeTab === 'routes' && (
          <MapModule
            routes={regionFilteredRoutes}
            selectedRoute={selectedRoute}
            currentUser={currentUser}
            onSelectRoute={setSelectedRoute}
            onOpenRouteDetails={(r) => setDetailModalRoute(r)}
            onToggleFavorite={handleToggleFavoriteRoute}
            onOpenPassportEditor={isAdmin ? (r) => {
              setPassportEditorRoute(r || null);
              setIsPassportEditorOpen(true);
            } : undefined}
            onAddRoute={isAdmin ? (newRoute) => {
              setRoutes(prev => {
                const updated = [newRoute, ...prev];
                try {
                  localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
                } catch (e) {
                  console.error(e);
                }
                return updated;
              });
              RoutesSyncService.saveRoute(newRoute).catch((err) => {
                console.warn('Failed to sync added route to Firestore:', err);
              });
              setSelectedRoute(newRoute);
            } : undefined}
          />
        )}

        {/* 2. COMPANIONS & TRIPS */}
        {activeTab === 'companions' && (
          <CompanionsModule
            trips={trips}
            selectedRegion={selectedRegion}
            currentUser={currentUser}
            registeredUsers={registeredUsers}
            crewReviews={notesConfig.crewReviews}
            routes={routes}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onCreateTrip={handleCreateNewTrip}
            onUpdateTrip={handleUpdateTrip}
            onViewOnMainMap={handleViewTripOnMainMap}
            onOpenCabinetApplications={() => {
              setActiveTab('cabinet');
            }}
            onAddCrewReview={(newRev) => {
              const updated = [newRev, ...(notesConfig.crewReviews || [])];
              const newConfig = { ...notesConfig, crewReviews: updated };
              setNotesConfig(newConfig);
              try {
                localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
              } catch (e) {
                console.error(e);
              }
              TravelNotesSyncService.saveNotesConfig(newConfig).catch((err) => {
                console.warn('Failed to sync new review to Firestore:', err);
              });
            }}
            onDeleteCrewReview={(reviewId) => {
              const updated = (notesConfig.crewReviews || []).filter(r => r.id !== reviewId);
              const newConfig = { ...notesConfig, crewReviews: updated };
              setNotesConfig(newConfig);
              try {
                localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
              } catch (e) {
                console.error(e);
              }
              TravelNotesSyncService.saveNotesConfig(newConfig).catch((err) => {
                console.warn('Failed to sync deleted review to Firestore:', err);
              });
            }}
            onDeleteTrip={(tripId) => {
              setTrips(prev => {
                const updated = prev.filter(t => t.id !== tripId);
                try {
                  localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
                } catch (e) {
                  console.error(e);
                }
                return updated;
              });
              TripsSyncService.removeTrip(tripId).catch((err) => {
                console.warn('Failed to remove trip from Firestore:', err);
              });
              CloudSqlDbService.deleteTrip(tripId).catch((err) => {
                console.warn('Failed to remove trip from CloudSQL:', err);
              });
            }}
          />
        )}

        {/* 3. PREPARATION (CHECKLISTS, MCHS, RADIO & SAFETY) */}
        {activeTab === 'preparation' && (
          <PreparationModule
            routes={routes}
            safetyGuides={faqData.safetyGuides || SAFETY_GUIDES_DATA}
            initialRoute={preparationInitialRoute}
            faqData={faqData}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onOpenMyTrip={() => setActiveTab('notes')}
            onSelectRouteForTrip={handleCreateMyTripFromRoute}
          />
        )}

        {/* 4. KNOWLEDGE BASE (ARTICLES, WATERWAY GUIDES, TRAVEL NOTES, FAQ) */}
        {activeTab === 'knowledge' && (
          <KnowledgeBaseModule
            articles={articles as any}
            travelNotes={notesConfig.notes || []}
            routes={routes}
            trips={trips}
            faqData={faqData}
            currentUser={currentUser}
            onOpenRouteDetails={(r) => setDetailModalRoute(r)}
          />
        )}

        {/* 5. TRAVEL NOTES & EXPEDITION DIARIES */}
        {(activeTab === 'notes' || activeTab === 'mytrip') && (
          <TravelNotesModule
            routes={routes}
            currentUser={currentUser}
            registeredUsers={registeredUsers}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            isAdmin={isAdmin}
            notesConfig={notesConfig}
            setNotesConfig={setNotesConfig}
            onOpenAdminNotesManager={() => setActiveTab('admin')}
            onOpenRouteDetails={(r) => setDetailModalRoute(r)}
            onSelectRouteOnMap={(r) => {
              setSelectedRoute(r);
              setActiveTab('routes');
            }}
          />
        )}

        {/* 6. PERSONAL ACCOUNT (USER CABINET) */}
        {activeTab === 'cabinet' && (
          <UserCabinetModule
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUpdateCurrentUser={handleUpdateCurrentUser}
            routes={routes}
            trips={trips}
            onOpenMyTrip={() => setActiveTab('notes')}
            onOpenRouteDetails={(r) => setDetailModalRoute(r)}
            onToggleFavorite={handleToggleFavoriteRoute}
            onAddCustomRoute={handleSavePassport}
            onUpdateRoute={handleSavePassport}
            onDeleteRoute={handleDeleteRoute}
            onOpenPassportEditor={(r) => {
              setPassportEditorRoute(r || null);
              setIsPassportEditorOpen(true);
            }}
            onSelectRouteOnMap={(r) => {
              setSelectedRoute(r);
              setActiveTab('routes');
            }}
            onUpdateTrip={handleUpdateTrip}
          />
        )}

        {/* 7. ADMIN PANEL (DEDICATED ADMIN ONLY) */}
        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminPanelModule
              currentUser={currentUser}
              routes={routes}
              trips={trips}
              articles={articles as any}
              travelNotes={notesConfig.notes || []}
              registeredUsers={registeredUsers}
              faqData={faqData}
              notesConfig={notesConfig}
              onUpdateRoutes={setRoutes}
              onUpdateTrips={setTrips}
              onUpdateArticles={setArticles as any}
              onUpdateNotesConfig={setNotesConfig}
              onUpdateFaqData={setFaqData}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUser={handleUpdateCurrentUser}
              onDeleteUser={handleDeleteUser}
              onDeleteRoute={handleDeleteRoute}
              onDeleteTrip={handleDeleteTrip}
              onDeleteArticle={handleDeleteArticle}
              onOpenPassportEditor={(r) => {
                setPassportEditorRoute(r || null);
                setIsPassportEditorOpen(true);
              }}
              onOpenFaqEditor={handleOpenFaqEditor}
            />
          ) : (
            <div className="max-w-md mx-auto py-16 text-center text-xs text-[#6B665F]">
              Доступ ограничен. Только для администраторов системы.
            </div>
          )
        )}

        {/* Compact Footer */}
        {activeTab !== 'routes' && (
          <footer className="mt-4 py-3 border-t border-[#E5E0D8] text-center text-xs text-[#8B7E6D]">
            <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto px-4">
              <span className="font-bold text-[#1A1F1A]">SPLAV86</span>
              <span>— Водный туризм ХМАО-Югры и ЯНАО</span>
            </div>
          </footer>
        )}

      </main>

      {/* Discrete Floating "Back to Top" Button - Mobile Only */}
      <button
        onClick={scrollToTop}
        aria-label="Вернуться наверх к выбору вкладок"
        title="Наверх к меню"
        className={`sm:hidden fixed bottom-20 right-3 z-40 w-8 h-8 flex items-center justify-center bg-[#2D5A27]/85 active:bg-[#2D5A27] text-white rounded-full shadow-md backdrop-blur-xs border border-white/30 cursor-pointer transition-all duration-300 ${
          showScrollTop
            ? 'opacity-85 scale-100 pointer-events-auto'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>

      {/* Route Detail Modal */}
      {detailModalRoute && (
        <RouteDetailModal
          route={detailModalRoute}
          currentUser={currentUser}
          onClose={() => setDetailModalRoute(null)}
          onSelectForMchs={handleSelectForMchs}
          onToggleFavorite={handleToggleFavoriteRoute}
          onOpenSuitabilityModal={(r) => setSuitabilityModalRoute(r)}
          onCreateMyTrip={handleCreateMyTripFromRoute}
          onFindCompanions={handleFindCompanionsFromRoute}
          onEditRoute={
            (isAdmin || (currentUser && (!detailModalRoute.authorId || detailModalRoute.authorId === currentUser.id)))
              ? (r) => {
                  setPassportEditorRoute(r);
                  setIsPassportEditorOpen(true);
                }
              : undefined
          }
        />
      )}

      {/* Route Suitability Modal ("Подходит ли мне?") */}
      {suitabilityModalRoute && (
        <RouteSuitabilityModal
          route={suitabilityModalRoute}
          onClose={() => setSuitabilityModalRoute(null)}
          onCreateMyTrip={handleCreateMyTripFromRoute}
          onFindCompanions={handleFindCompanionsFromRoute}
        />
      )}

      {/* River Passport Full Editor Modal (Admin or Route Author or creating new route) */}
      {isPassportEditorOpen && (isAdmin || (currentUser && (!passportEditorRoute || !passportEditorRoute.authorId || passportEditorRoute.authorId === currentUser.id))) && (
        <RiverPassportEditorModal
          initialRoute={passportEditorRoute}
          onSave={handleSavePassport}
          onClose={() => {
            setIsPassportEditorOpen(false);
            setPassportEditorRoute(null);
          }}
        />
      )}

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          const userWithMeta: AppUser = {
            ...user,
            isDeleted: false,
            updatedAt: user.updatedAt || new Date().toISOString()
          };
          setCurrentUser(userWithMeta);
          try {
            localStorage.setItem('splav86_current_user', JSON.stringify(userWithMeta));
          } catch (e) {}
          handleRegisterUser(userWithMeta);
        }}
        registeredUsers={registeredUsers}
        onRegisterUser={handleRegisterUser}
      />
    </div>
  );
}
