/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MapModule } from './components/MapModule';
import { RouteDetailModal } from './components/RouteDetailModal';
import { WeatherHydroModule } from './components/WeatherHydroModule';
import { MchsModule } from './components/MchsModule';
import { CompanionsModule } from './components/CompanionsModule';
import { ArticlesModule } from './components/ArticlesModule';
import { CalculatorModule } from './components/CalculatorModule';
import { UserCabinetModule } from './components/UserCabinetModule';
import { AuthModal } from './components/AuthModal';
import { RiverPassportEditorModal } from './components/RiverPassportEditorModal';

import { RIVERS_DATA } from './data/riversData';
import { HYDRO_STATIONS_DATA } from './data/hydroData';
import { WEATHER_POINTS_DATA } from './data/weatherData';
import { COMPANION_TRIPS_DATA } from './data/tripsData';
import { SAFETY_GUIDES_DATA } from './data/safetyGuideData';
import { ARTICLES_DATA } from './data/articlesData';

import { RiverRoute, Region, CompanionTrip, HydroStation, ArticleReport, AppUser, UserRole } from './types';
import { TripsSyncService, RoutesSyncService, UsersSyncService, ArticlesSyncService, HydroSyncService } from './firebase';

const INITIAL_USERS: AppUser[] = [
  {
    id: 'user-superadmin-zuubra',
    email: 'zuubra1985@gmail.com',
    name: 'Администратор (zuubra1985)',
    phone: '+7 (922) 000-00-86',
    role: 'superadmin',
    city: 'Ханты-Мансийск / Сургут',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    experienceLevel: 'Эксперт / Инструктор-проводник',
    registeredAt: '2026-01-01',
    favoriteRouteIds: ['sob-polar-ural', 'sosva-nyaksimvol-berezovo']
  },
  {
    id: 'user-superadmin-novichek',
    email: 'novichek2@narod.ru',
    name: 'Главный Администратор (Дмитрий)',
    phone: '+7 (922) 000-00-86',
    role: 'superadmin',
    city: 'Ханты-Мансийск / Сургут',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    experienceLevel: 'Эксперт / Инструктор-проводник',
    registeredAt: '2026-01-01',
    favoriteRouteIds: ['sob-polar-ural', 'sosva-nyaksimvol-berezovo']
  },
  {
    id: 'user-2',
    email: 'alex.taiga@mail.ru',
    name: 'Алексей Медведев',
    phone: '+7 (912) 456-78-90',
    role: 'admin',
    city: 'Сургут',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    experienceLevel: 'Опытный (5+ сплавов)',
    registeredAt: '2026-03-15',
    favoriteRouteIds: ['tromyogan-surgut', 'agan-nizhnevartovsk']
  },
  {
    id: 'user-3',
    email: 'elena.polar@yandex.ru',
    name: 'Елена Белова',
    phone: '+7 (932) 888-12-34',
    role: 'user',
    city: 'Салехард',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    experienceLevel: 'Средний (2-4 сплава)',
    registeredAt: '2026-05-20',
    favoriteRouteIds: ['shchuchya-yamal-canyon']
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'routes' | 'weather_hydro' | 'companions' | 'mchs_safety' | 'articles' | 'calculator' | 'cabinet'>('routes');
  const [selectedRegion, setSelectedRegion] = useState<Region>('ALL');

  // Registered Users & Current Auth State (Guest by default on new visits)
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_users');
      return stored ? JSON.parse(stored) : INITIAL_USERS;
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
      return stored ? JSON.parse(stored) : RIVERS_DATA;
    } catch {
      return RIVERS_DATA;
    }
  });

  const [hydroStations, setHydroStations] = useState<HydroStation[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_custom_hydro');
      return stored ? JSON.parse(stored) : HYDRO_STATIONS_DATA;
    } catch {
      return HYDRO_STATIONS_DATA;
    }
  });

  const [articles, setArticles] = useState<ArticleReport[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_custom_articles');
      return stored ? JSON.parse(stored) : ARTICLES_DATA;
    } catch {
      return ARTICLES_DATA;
    }
  });

  const [trips, setTrips] = useState<CompanionTrip[]>(() => {
    try {
      const stored = localStorage.getItem('splav86_custom_trips_v5');
      return stored ? JSON.parse(stored) : COMPANION_TRIPS_DATA;
    } catch {
      return COMPANION_TRIPS_DATA;
    }
  });

  // Real-time Cloud Synchronization via Firebase Firestore
  useEffect(() => {
    let isBootstrappingTrips = false;
    let isBootstrappingUsers = false;
    let isBootstrappingRoutes = false;
    let isBootstrappingArticles = false;
    let isBootstrappingHydro = false;

    // 1. Subscribe to Trips (Real-time expeditions)
    const unsubTrips = TripsSyncService.subscribeToTrips((cloudTrips) => {
      if (!cloudTrips || cloudTrips.length === 0) {
        if (!isBootstrappingTrips) {
          isBootstrappingTrips = true;
          const seedMap = new Map<string, CompanionTrip>();
          COMPANION_TRIPS_DATA.forEach((t) => seedMap.set(t.id, t));
          try {
            const local = localStorage.getItem('splav86_custom_trips_v5');
            if (local) {
              const parsed: CompanionTrip[] = JSON.parse(local);
              parsed.forEach((t) => seedMap.set(t.id, t));
            }
          } catch (e) {
            console.error(e);
          }
          const allToSeed = Array.from(seedMap.values());
          allToSeed.forEach((t) => {
            TripsSyncService.saveTrip(t).catch(console.error);
          });
          setTrips(allToSeed);
        }
      } else {
        // Cloud has trips: Check if local storage has any un-synced user trips and push them to cloud
        try {
          const local = localStorage.getItem('splav86_custom_trips_v5');
          if (local) {
            const parsed: CompanionTrip[] = JSON.parse(local);
            const cloudIds = new Set(cloudTrips.map((t) => t.id));
            parsed.forEach((localTrip) => {
              if (!cloudIds.has(localTrip.id)) {
                TripsSyncService.saveTrip(localTrip).catch(console.error);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }

        setTrips(cloudTrips);
        try {
          localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(cloudTrips));
        } catch (e) {
          console.error(e);
        }
      }
    });

    // 2. Subscribe to Routes (River passports and catalog)
    const unsubRoutes = RoutesSyncService.subscribeToRoutes((cloudRoutes) => {
      if (!cloudRoutes || cloudRoutes.length === 0) {
        if (!isBootstrappingRoutes) {
          isBootstrappingRoutes = true;
          const seedMap = new Map<string, RiverRoute>();
          RIVERS_DATA.forEach((r) => seedMap.set(r.id, r));
          try {
            const local = localStorage.getItem('splav86_custom_routes_v5');
            if (local) {
              const parsed: RiverRoute[] = JSON.parse(local);
              parsed.forEach((r) => seedMap.set(r.id, r));
            }
          } catch (e) {
            console.error(e);
          }
          const allToSeed = Array.from(seedMap.values());
          allToSeed.forEach((r) => {
            RoutesSyncService.saveRoute(r).catch(console.error);
          });
          setRoutes(allToSeed);
        }
      } else {
        try {
          const local = localStorage.getItem('splav86_custom_routes_v5');
          if (local) {
            const parsed: RiverRoute[] = JSON.parse(local);
            const cloudIds = new Set(cloudRoutes.map((r) => r.id));
            parsed.forEach((localRoute) => {
              if (!cloudIds.has(localRoute.id)) {
                RoutesSyncService.saveRoute(localRoute).catch(console.error);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }

        setRoutes(cloudRoutes);
        try {
          localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(cloudRoutes));
        } catch (e) {
          console.error(e);
        }
      }
    });

    // 3. Subscribe to Users (Tourists, Organizers, Admins)
    const unsubUsers = UsersSyncService.subscribeToUsers((cloudUsers) => {
      if (!cloudUsers || cloudUsers.length === 0) {
        if (!isBootstrappingUsers) {
          isBootstrappingUsers = true;
          const seedMap = new Map<string, AppUser>();
          INITIAL_USERS.forEach((u) => seedMap.set(u.id, u));
          try {
            const local = localStorage.getItem('splav86_users');
            if (local) {
              const parsed: AppUser[] = JSON.parse(local);
              parsed.forEach((u) => seedMap.set(u.id, u));
            }
          } catch (e) {
            console.error(e);
          }
          const allToSeed = Array.from(seedMap.values());
          allToSeed.forEach((u) => {
            UsersSyncService.saveUser(u).catch(console.error);
          });
          setRegisteredUsers(allToSeed);
        }
      } else {
        try {
          const local = localStorage.getItem('splav86_users');
          if (local) {
            const parsed: AppUser[] = JSON.parse(local);
            const cloudIds = new Set(cloudUsers.map((u) => u.id));
            parsed.forEach((localUser) => {
              if (!cloudIds.has(localUser.id)) {
                UsersSyncService.saveUser(localUser).catch(console.error);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }

        setRegisteredUsers(cloudUsers);
        try {
          localStorage.setItem('splav86_users', JSON.stringify(cloudUsers));
        } catch (e) {
          console.error(e);
        }
      }
    });

    // 4. Subscribe to Articles & Reports
    const unsubArticles = ArticlesSyncService.subscribeToArticles((cloudArticles) => {
      if (!cloudArticles || cloudArticles.length === 0) {
        if (!isBootstrappingArticles) {
          isBootstrappingArticles = true;
          const seedMap = new Map<string, ArticleReport>();
          ARTICLES_DATA.forEach((a) => seedMap.set(a.id, a));
          try {
            const local = localStorage.getItem('splav86_custom_articles');
            if (local) {
              const parsed: ArticleReport[] = JSON.parse(local);
              parsed.forEach((a) => seedMap.set(a.id, a));
            }
          } catch (e) {
            console.error(e);
          }
          const allToSeed = Array.from(seedMap.values());
          allToSeed.forEach((a) => {
            ArticlesSyncService.saveArticle(a).catch(console.error);
          });
          setArticles(allToSeed);
        }
      } else {
        // Sync local storage and built-in articles with cloud
        try {
          const cloudIds = new Set(cloudArticles.map((a) => a.id));
          
          // 1. Check if any catalog/built-in article is missing in cloud
          ARTICLES_DATA.forEach((defArt) => {
            if (!cloudIds.has(defArt.id)) {
              ArticlesSyncService.saveArticle(defArt).catch(console.error);
            }
          });

          // 2. Check if local storage has any un-synced user articles
          const local = localStorage.getItem('splav86_custom_articles');
          if (local) {
            const parsed: ArticleReport[] = JSON.parse(local);
            parsed.forEach((localArt) => {
              if (!cloudIds.has(localArt.id)) {
                ArticlesSyncService.saveArticle(localArt).catch(console.error);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }

        setArticles(cloudArticles);
        try {
          localStorage.setItem('splav86_custom_articles', JSON.stringify(cloudArticles));
        } catch (e) {
          console.error(e);
        }
      }
    });

    // 5. Subscribe to Hydro Stations
    const unsubHydro = HydroSyncService.subscribeToHydro((cloudHydro) => {
      if (!cloudHydro || cloudHydro.length === 0) {
        if (!isBootstrappingHydro) {
          isBootstrappingHydro = true;
          const seedMap = new Map<string, HydroStation>();
          HYDRO_STATIONS_DATA.forEach((h) => seedMap.set(h.id, h));
          try {
            const local = localStorage.getItem('splav86_custom_hydro');
            if (local) {
              const parsed: HydroStation[] = JSON.parse(local);
              parsed.forEach((h) => seedMap.set(h.id, h));
            }
          } catch (e) {
            console.error(e);
          }
          const allToSeed = Array.from(seedMap.values());
          allToSeed.forEach((h) => {
            HydroSyncService.saveHydroStation(h).catch(console.error);
          });
          setHydroStations(allToSeed);
        }
      } else {
        setHydroStations(cloudHydro);
        try {
          localStorage.setItem('splav86_custom_hydro', JSON.stringify(cloudHydro));
        } catch (e) {
          console.error(e);
        }
      }
    });

    return () => {
      unsubTrips();
      unsubRoutes();
      unsubUsers();
      unsubArticles();
      unsubHydro();
    };
  }, []);

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
      localStorage.setItem('splav86_custom_hydro', JSON.stringify(hydroStations));
    } catch (e) {
      console.error(e);
    }
  }, [hydroStations]);

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

  const handleRegisterUser = (newUser: AppUser) => {
    setRegisteredUsers((prev) => [newUser, ...prev]);
    UsersSyncService.saveUser(newUser).catch((err) => {
      console.warn('Failed to sync new user to Firestore:', err);
    });
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    setRegisteredUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          const userWithRole = { ...u, role: newRole };
          UsersSyncService.saveUser(userWithRole).catch((err) => {
            console.warn('Failed to sync user role to Firestore:', err);
          });
          return userWithRole;
        }
        return u;
      });
      return updated;
    });
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, role: newRole } : null);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
    UsersSyncService.removeUser(userId).catch((err) => {
      console.warn('Failed to remove user from Firestore:', err);
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateCurrentUser = (updatedUser: AppUser) => {
    setCurrentUser(updatedUser);
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    UsersSyncService.saveUser(updatedUser).catch((err) => {
      console.warn('Failed to sync current user update to Firestore:', err);
    });
    try {
      localStorage.setItem('splav86_current_user', JSON.stringify(updatedUser));
      const allUsers = registeredUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      localStorage.setItem('splav86_registered_users', JSON.stringify(allUsers));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem('splav86_custom_routes');
    localStorage.removeItem('splav86_custom_hydro');
    localStorage.removeItem('splav86_custom_articles');
    localStorage.removeItem('splav86_custom_trips');
    setRoutes(RIVERS_DATA);
    setHydroStations(HYDRO_STATIONS_DATA);
    setArticles(ARTICLES_DATA);
    setTrips(COMPANION_TRIPS_DATA);
  };

  // Selected route state
  const [selectedRoute, setSelectedRoute] = useState<RiverRoute | null>(null);
  const [detailModalRoute, setDetailModalRoute] = useState<RiverRoute | null>(null);
  const [mchsInitialRoute, setMchsInitialRoute] = useState<RiverRoute | null>(null);
  const [isPassportEditorOpen, setIsPassportEditorOpen] = useState<boolean>(false);
  const [passportEditorRoute, setPassportEditorRoute] = useState<RiverRoute | null>(null);
  const [cabinetInitialTab, setCabinetInitialTab] = useState<'profile' | 'routes' | 'hydro' | 'articles' | 'users' | 'backup'>('profile');
  const [cabinetInitialArticle, setCabinetInitialArticle] = useState<ArticleReport | null>(null);

  // Superadmin & Admin status
  const isSuperAdmin = currentUser?.email.toLowerCase() === 'zuubra1985@gmail.com' || 
                       currentUser?.email.toLowerCase() === 'novichek2@narod.ru' || 
                       currentUser?.role === 'superadmin';
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin';

  const handleOpenArticleEditor = (article?: ArticleReport) => {
    if (!isAdmin) return;
    setCabinetInitialTab('articles');
    if (article) {
      setCabinetInitialArticle(article);
    } else {
      setCabinetInitialArticle({
        id: `art-${Date.now()}`,
        title: '',
        subtitle: '',
        riverName: '',
        region: 'ХМАО',
        author: currentUser?.name || 'Главный Администратор',
        authorRank: 'Главный Администратор',
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        readTimeMin: 5,
        coverImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80',
        summary: '',
        fullContent: [''],
        tags: ['локация', 'хмао', 'каякинг'],
        stats: {
          distanceKm: 80,
          days: 3,
          vessel: 'Байдарки',
          bestMonth: 'Июль'
        },
        gallery: []
      });
    }
    setActiveTab('cabinet');
  };

  const handleSavePassport = (savedRoute: RiverRoute) => {
    if (!isAdmin) return;
    setRoutes((prev) => {
      const exists = prev.some((r) => r.id === savedRoute.id);
      const updated = exists ? prev.map((r) => (r.id === savedRoute.id ? savedRoute : r)) : [savedRoute, ...prev];
      try {
        localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Sync to Firestore Cloud DB
    RoutesSyncService.saveRoute(savedRoute).catch((err) => {
      console.warn('Failed to sync route to Firestore:', err);
    });

    if (selectedRoute?.id === savedRoute.id) {
      setSelectedRoute(savedRoute);
    }
    if (detailModalRoute?.id === savedRoute.id) {
      setDetailModalRoute(savedRoute);
    }
  };

  const handleSelectForMchs = (route: RiverRoute) => {
    setMchsInitialRoute(route);
    setActiveTab('mchs_safety');
  };

  const handleCreateNewTrip = (newTrip: CompanionTrip) => {
    setTrips((prev) => [newTrip, ...prev]);
    TripsSyncService.saveTrip(newTrip).catch((err) => {
      console.warn('Failed to sync new trip to Firestore:', err);
    });
  };

  const handleUpdateTrip = (updatedTrip: CompanionTrip) => {
    setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
    TripsSyncService.saveTrip(updatedTrip).catch((err) => {
      console.warn('Failed to sync updated trip to Firestore:', err);
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
        name: trip.gpxTrack.name || `Маршрут похода: ${trip.title}`,
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

  // Filter routes by region
  const regionFilteredRoutes = routes.filter((r) => {
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
      />

      {/* Main View Area */}
      <main className="flex-1 pb-20 xl:pb-8">
        
        {/* 1. ROUTES & LEAFLET MAP */}
        {activeTab === 'routes' && (
          <MapModule
            routes={regionFilteredRoutes}
            selectedRoute={selectedRoute}
            currentUser={currentUser}
            onSelectRoute={setSelectedRoute}
            onOpenRouteDetails={(r) => setDetailModalRoute(r)}
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
              setSelectedRoute(newRoute);
            } : undefined}
          />
        )}

        {/* 2. WEATHER & HYDROLOGY */}
        {activeTab === 'weather_hydro' && (
          <WeatherHydroModule
            weatherPoints={WEATHER_POINTS_DATA}
            hydroStations={hydroStations}
            selectedRegion={selectedRegion}
          />
        )}

        {/* 3. COMPANIONS & TRIPS */}
        {activeTab === 'companions' && (
          <CompanionsModule
            trips={trips}
            selectedRegion={selectedRegion}
            currentUser={currentUser}
            routes={routes}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onCreateTrip={handleCreateNewTrip}
            onUpdateTrip={handleUpdateTrip}
            onViewOnMainMap={handleViewTripOnMainMap}
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
            }}
          />
        )}

        {/* 4. MCHS & WILDERNESS SAFETY */}
        {activeTab === 'mchs_safety' && (
          <MchsModule
            routes={routes}
            safetyGuides={SAFETY_GUIDES_DATA}
            initialRoute={mchsInitialRoute}
          />
        )}

        {/* 5. ARTICLES & RIVER PILOT GUIDES */}
        {activeTab === 'articles' && (
          <ArticlesModule
            articles={articles}
            selectedRegion={selectedRegion}
            currentUser={currentUser}
            onOpenArticleEditor={handleOpenArticleEditor}
          />
        )}

        {/* 6. EXPEDITION CALCULATOR & GEAR CHECKLIST */}
        {activeTab === 'calculator' && (
          <CalculatorModule />
        )}

        {/* 7. PERSONAL ACCOUNT & SUPER ADMIN CABINET */}
        {activeTab === 'cabinet' && (
          <UserCabinetModule
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUpdateCurrentUser={handleUpdateCurrentUser}
            registeredUsers={registeredUsers}
            onUpdateUserRole={handleUpdateUserRole}
            onDeleteUser={handleDeleteUser}
            routes={routes}
            setRoutes={setRoutes}
            hydroStations={hydroStations}
            setHydroStations={setHydroStations}
            articles={articles}
            setArticles={setArticles}
            trips={trips}
            setTrips={setTrips}
            onResetToDefaults={handleResetToDefaults}
            onSelectRoute={(r) => {
              setSelectedRoute(r);
              setActiveTab('routes');
            }}
            onOpenRouteDetails={(r) => setDetailModalRoute(r)}
            onOpenPassportEditor={isAdmin ? (r) => {
              setPassportEditorRoute(r || null);
              setIsPassportEditorOpen(true);
            } : undefined}
            initialCabinetTab={cabinetInitialTab}
            initialEditingArticle={cabinetInitialArticle}
          />
        )}

      </main>

      {/* Route Detail Modal */}
      {detailModalRoute && (
        <RouteDetailModal
          route={detailModalRoute}
          currentUser={currentUser}
          onClose={() => setDetailModalRoute(null)}
          onSelectForMchs={handleSelectForMchs}
          onEditRoute={isAdmin ? (r) => {
            setPassportEditorRoute(r);
            setIsPassportEditorOpen(true);
          } : undefined}
        />
      )}

      {/* River Passport Full Editor Modal (Admin only) */}
      {isPassportEditorOpen && isAdmin && (
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
        onLoginSuccess={(user) => setCurrentUser(user)}
        registeredUsers={registeredUsers}
        onRegisterUser={handleRegisterUser}
      />

    </div>
  );
}
