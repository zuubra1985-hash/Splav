import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  AppUser, 
  RiverRoute, 
  CompanionTrip, 
  TripApplication, 
  VesselType 
} from '../types';
import { 
  User, 
  LogOut, 
  Edit3, 
  Save, 
  Compass, 
  Heart, 
  Users, 
  Download, 
  Upload, 
  MapPin, 
  CheckCircle2, 
  ChevronRight, 
  Camera, 
  Trash2, 
  FileText, 
  Radio, 
  ShieldCheck, 
  Settings,
  Plus,
  Globe,
  Lock,
  Share2,
  Copy,
  Check,
  Map as MapIcon,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseGpxFile, generateGpxString } from '../utils/gpxParser';
import { compressAvatarFile } from '../utils/imageCompressor';
import { MyTripsStore } from '../services/myTripsStore';
import { CloudSqlDbService } from '../services/cloudSqlDb';

interface UserCabinetModuleProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onUpdateCurrentUser: (user: AppUser) => void;
  routes: RiverRoute[];
  trips: CompanionTrip[];
  onOpenMyTrip?: () => void;
  onOpenRouteDetails?: (route: RiverRoute) => void;
  onToggleFavorite?: (routeId: string) => void;
  onAddCustomRoute?: (route: RiverRoute) => void;
  onUpdateRoute?: (route: RiverRoute) => void;
  onDeleteRoute?: (routeId: string) => void;
  onOpenPassportEditor?: (route?: RiverRoute) => void;
  onSelectRouteOnMap?: (route: RiverRoute) => void;
  onUpdateTrip?: (trip: CompanionTrip) => void;
  initialTab?: 'profile' | 'trips' | 'routes' | 'applications' | 'favorites' | 'gpx' | 'settings';
}

export const UserCabinetModule: React.FC<UserCabinetModuleProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  onUpdateCurrentUser,
  routes,
  trips,
  onOpenMyTrip,
  onOpenRouteDetails,
  onToggleFavorite,
  onAddCustomRoute,
  onUpdateRoute,
  onDeleteRoute,
  onOpenPassportEditor,
  onSelectRouteOnMap,
  onUpdateTrip,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'trips' | 'routes' | 'applications' | 'favorites' | 'gpx' | 'settings'>(initialTab);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [telegram, setTelegram] = useState<string>(currentUser?.telegram || '');
  const [experience, setExperience] = useState<string>(currentUser?.experience || 'Любитель (1-3 сезона)');
  const [radioCallsign, setRadioCallsign] = useState<string>(currentUser?.radioCallsign || '');
  const [ownedVessels, setOwnedVessels] = useState<VesselType[]>(currentUser?.ownedVessels || ['kayak']);
  const [emergencyContactName, setEmergencyContactName] = useState<string>(currentUser?.emergencyContact?.name || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(currentUser?.emergencyContact?.phone || '');

  // UI state
  const [copiedRouteId, setCopiedRouteId] = useState<string | null>(null);
  const [routesFilter, setRoutesFilter] = useState<'all' | 'public' | 'private'>('all');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  // Sync profile editing fields when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setTelegram(currentUser.telegram || '');
      setExperience(currentUser.experience || currentUser.experienceLevel || 'Любитель (1-3 сезона)');
      setRadioCallsign(currentUser.radioCallsign || currentUser.callsign || '');
      setOwnedVessels(currentUser.ownedVessels || currentUser.vesselsOwned || ['kayak']);
      setEmergencyContactName(currentUser.emergencyContact?.name || '');
      setEmergencyContactPhone(currentUser.emergencyContact?.phone || '');
    }
  }, [currentUser]);

  // Favorite routes
  const favoriteRoutes = useMemo(() => {
    if (!currentUser || !currentUser.favoriteRouteIds) return [];
    return routes.filter((r) => currentUser.favoriteRouteIds?.includes(r.id));
  }, [routes, currentUser]);
  
  // Authored routes by current user (by authorId, email, or personal authored flag)
  const authoredRoutes = useMemo(() => {
    if (!currentUser) return [];
    return routes.filter((r) => {
      if (r.authorId && r.authorId === currentUser.id) return true;
      if (r.authorEmail && currentUser.email && r.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (r.isPersonal && r.authorName && currentUser.name && r.authorName.toLowerCase() === currentUser.name.toLowerCase()) return true;
      return false;
    });
  }, [routes, currentUser]);

  // Filtered authored routes
  const filteredAuthoredRoutes = useMemo(() => {
    if (routesFilter === 'public') return authoredRoutes.filter(r => r.isPublic);
    if (routesFilter === 'private') return authoredRoutes.filter(r => !r.isPublic);
    return authoredRoutes;
  }, [authoredRoutes, routesFilter]);

  // User's Trips from CompanionTrip & MyTrips
  const myCompanionTrips = useMemo(() => {
    if (!currentUser) return [];
    return trips.filter((t) => t.organizer.userId === currentUser.id || t.participants.some(p => p.userId === currentUser.id));
  }, [trips, currentUser]);

  const myPlannerTrips = useMemo(() => {
    if (!currentUser) return [];
    return MyTripsStore.getMyTrips(currentUser.id);
  }, [currentUser]);

  // User's Trip applications (sent by this user)
  const sentApplications = useMemo(() => {
    if (!currentUser) return [];
    return trips.flatMap(t => 
      (t.applications || []).filter(a => a.userId === currentUser.id).map(a => ({ 
        ...a, 
        tripId: t.id,
        tripTitle: t.title, 
        riverName: t.riverName,
        organizerName: t.organizer.name,
        organizerPhone: t.organizer.phone,
        startDate: t.startDate
      }))
    );
  }, [trips, currentUser]);

  // Incoming applications to trips organized by current user
  const incomingApplications = useMemo(() => {
    if (!currentUser) return [];
    return trips
      .filter(t => t.organizer.userId === currentUser.id)
      .flatMap(t => 
        (t.applications || []).map(a => ({
          ...a,
          tripId: t.id,
          tripTitle: t.title,
          riverName: t.riverName,
          trip: t
        }))
      );
  }, [trips, currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#E8F1E7] text-[#2D5A27] mx-auto flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#1A1F1A]">Личный кабинет туриста</h2>
        <p className="text-xs text-[#6B665F]">
          Войдите или зарегистрируйтесь, чтобы сохранять личные маршруты, делиться ими со всеми туристами, вести подготовку сплавов и находить попутчиков.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarFile(file);
      const updated = { ...currentUser, avatar: compressed };
      onUpdateCurrentUser(updated);
    } catch (err) {
      console.warn('Avatar compression failed', err);
    }
  };

  // Save profile edits
  const handleSaveProfile = () => {
    const updated: AppUser = {
      ...currentUser,
      name,
      phone,
      telegram,
      experience,
      radioCallsign,
      ownedVessels,
      emergencyContact: emergencyContactName ? {
        name: emergencyContactName,
        phone: emergencyContactPhone
      } : undefined
    };
    onUpdateCurrentUser(updated);
    setIsEditingProfile(false);
  };

  // Handle GPX track import
  const handleGpxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddCustomRoute) return;
    try {
      const text = await file.text();
      const parsed = parseGpxFile(text, file.name);
      const newRoute: RiverRoute = {
        id: `user-route-${Date.now()}`,
        name: parsed.name || `Сплав: ${file.name.replace('.gpx', '')}`,
        riverName: parsed.name || 'Пользовательская река',
        region: 'ХМАО',
        fstrCategory: 'I к.с.',
        intlClass: 'Class I',
        lengthKm: Math.round(parsed.totalDistanceKm || 25),
        durationDays: Math.max(1, Math.round((parsed.totalDistanceKm || 25) / 25)),
        recommendedVessels: ['kayak', 'sup'],
        startPoint: parsed.startPoint || {
          name: 'Точка старта (стапель)',
          lat: parsed.coordinates[0]?.[0] || 61.0,
          lng: parsed.coordinates[0]?.[1] || 69.0
        },
        endPoint: parsed.endPoint || {
          name: 'Точка финиша (антистапель)',
          lat: parsed.coordinates[parsed.coordinates.length - 1]?.[0] || 61.3,
          lng: parsed.coordinates[parsed.coordinates.length - 1]?.[1] || 69.4
        },
        coordinates: parsed.coordinates.length > 0 ? parsed.coordinates : [
          [61.0, 69.0],
          [61.15, 69.2],
          [61.3, 69.4]
        ],
        elevationGainM: parsed.elevationGainM || 20,
        avgFlowSpeedKmh: 3.5,
        seasonMonths: 'Июнь — Сентябрь',
        description: 'Маршрут загружен из пользовательского GPX трека. Доступен для редактирования паспорта и публикации в общее сообщество.',
        shortDesc: `GPX трек протяженностью ${Math.round(parsed.totalDistanceKm || 25)} км с путевыми точками.`,
        highlights: ['Загруженный GPX трек', 'Навигационная нитка'],
        warnings: ['Перед выходом на воду обязательно сверьте гидрологическую обстановку'],
        mchsRegistrationRequired: true,
        kmnsPermitNeeded: false,
        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        pois: parsed.waypoints || [],
        elevationProfile: parsed.elevationPoints.map((p) => ({
          distanceKm: p.distKm,
          elevationM: p.elev
        })),
        gpxFileName: file.name,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        isPersonal: true,
        isPublic: false // Personal draft by default
      };
      
      onAddCustomRoute(newRoute);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setActiveTab('routes');
      alert(`GPX трек "${newRoute.name}" (${newRoute.lengthKm} км) успешно добавлен в раздел «Мои маршруты»!`);
    } catch (err: any) {
      alert(err?.message || 'Ошибка разбора GPX файла. Проверьте формат XML.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Toggle route public sharing status
  const handleToggleRoutePublic = (route: RiverRoute) => {
    if (!onUpdateRoute) return;
    const nextPublicState = !route.isPublic;
    const updated: RiverRoute = {
      ...route,
      isPublic: nextPublicState,
      isPersonal: true, // Keep as authored/personal
      authorId: route.authorId || currentUser.id,
      authorName: route.authorName || currentUser.name,
      authorEmail: route.authorEmail || currentUser.email
    };

    onUpdateRoute(updated);

    if (nextPublicState) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      alert(`🎉 Маршрут "${route.name}" успешно опубликован!\n\nТеперь он виден всем пользователям в общем «Списке маршрутов» и на карте.`);
    } else {
      alert(`🔒 Маршрут "${route.name}" снят с публикации.\n\nТеперь он сохранен как личный черновик и виден только вам в кабинете.`);
    }
  };

  // Download GPX file
  const handleDownloadGpx = (route: RiverRoute) => {
    const gpxContent = generateGpxString(route);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = route.gpxFileName || `${route.name.toLowerCase().replace(/\s+/g, '_')}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy shareable link
  const handleCopyRouteLink = (routeId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#route=${routeId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedRouteId(routeId);
      setTimeout(() => setCopiedRouteId(null), 2500);
    });
  };

  // Handle application decision (accept/decline)
  const handleApplicationDecision = async (trip: CompanionTrip, appId: string, status: 'accepted' | 'declined') => {
    if (!onUpdateTrip) return;
    
    // Sync with backend Cloud SQL API
    try {
      await CloudSqlDbService.updateTripApplicationStatus(trip.id, appId, status);
    } catch (e) {
      console.warn('Could not sync status with backend API:', e);
    }

    const updatedApps = (trip.applications || []).map(a => a.id === appId ? { ...a, status } : a);
    const applicant = trip.applications?.find(a => a.id === appId);
    
    let updatedParticipants = trip.participants;
    if (status === 'accepted' && applicant) {
      const applicantUserId = applicant.userId || applicant.applicantUserId;
      const alreadyIn = applicantUserId ? trip.participants.some(p => p.userId === applicantUserId) : false;
      if (!alreadyIn) {
        updatedParticipants = [
          ...trip.participants,
          {
            userId: applicantUserId,
            name: applicant.applicantName,
            role: 'Матрос / Гребец',
            vessel: (applicant.vesselType || 'kayak') as VesselType,
            avatar: applicant.applicantAvatar || '',
            phone: applicant.applicantPhone
          }
        ];
      }
    }

    const updatedTrip: CompanionTrip = {
      ...trip,
      applications: updatedApps,
      participants: updatedParticipants,
      bookedSeats: status === 'accepted' ? Math.min(trip.totalSeats, trip.bookedSeats + 1) : trip.bookedSeats
    };

    onUpdateTrip(updatedTrip);
    alert(status === 'accepted' ? 'Участник успешно принят в экипаж!' : 'Заявка отклонена.');
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 text-[#2D332D]">
      
      {/* Hidden file input for GPX */}
      <input
        type="file"
        ref={gpxInputRef}
        onChange={handleGpxImport}
        accept=".gpx"
        className="hidden"
      />

      {/* Profile Card Header */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start gap-1.5 shrink-0">
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#2D5A27] shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center text-2xl font-black">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-[10px] font-bold text-[#2D5A27] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Фото</span>
                </button>
                {currentUser.avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCurrentUser({ ...currentUser, avatar: '' });
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:underline ml-1 cursor-pointer"
                  >
                    × Сброс
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">{currentUser.name}</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                  {currentUser.role === 'admin' ? 'Администратор' : 'Водный турист'}
                </span>
              </div>
              <p className="text-xs text-[#6B665F] mt-0.5">{currentUser.email}</p>
              {currentUser.radioCallsign && (
                <div className="text-[11px] font-mono text-[#2D5A27] font-bold mt-1">
                  Радиопозывной: {currentUser.radioCallsign}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingProfile ? 'Отмена' : 'Редактировать'}</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-[#E54B4B] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 border-t border-[#EEEBE6] pt-3">
          {[
            { id: 'profile', label: 'Мой профиль', icon: User },
            { id: 'routes', label: 'Мои маршруты', count: authoredRoutes.length, icon: MapPin },
            { id: 'trips', label: 'Мои сплавы', count: myPlannerTrips.length + myCompanionTrips.length, icon: Compass },
            { id: 'applications', label: 'Заявки', count: sentApplications.length + incomingApplications.length, icon: Users },
            { id: 'favorites', label: 'Избранное', count: favoriteRoutes.length, icon: Heart },
            { id: 'gpx', label: 'Мои GPX треки', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-between sm:justify-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-2xs'
                    : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E5E0D8] text-[#2D332D]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. PROFILE DETAILS / EDITING */}
      {activeTab === 'profile' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-5">
          {isEditingProfile ? (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider">Редактирование профиля</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Имя и фамилия</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Телефон</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Telegram (@username)</label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Радиопозывной (LPD / VHF)</label>
                  <input
                    type="text"
                    value={radioCallsign}
                    onChange={(e) => setRadioCallsign(e.target.value)}
                    placeholder="Север-1, Югра-22..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#EEEBE6]">
                <h3 className="text-xs font-bold text-[#2D5A27] uppercase mb-2">Экстренное контактное лицо</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="ФИО дежурного на Большой земле"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="Телефон дежурного (+7...)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                  <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Опыт сплавов</div>
                  <div className="text-xs font-bold text-[#1A1F1A] mt-1">{currentUser.experience || 'Любитель (1-3 сезона)'}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                  <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Плавсредства</div>
                  <div className="text-xs font-bold text-[#1A1F1A] mt-1">
                    {currentUser.ownedVessels && currentUser.ownedVessels.length > 0 ? currentUser.ownedVessels.join(', ') : 'Байдарка, SUP'}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                  <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Экстренный контакт</div>
                  <div className="text-xs font-bold text-[#1A1F1A] mt-1 truncate">
                    {currentUser.emergencyContact?.name || 'Не указан'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MY ROUTES (МОИ МАРШРУТЫ И ПУБЛИКАЦИЯ) */}
      {activeTab === 'routes' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Header Bar with Main Actions */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-black text-[#1A1F1A]">Мои загруженные маршруты</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27]">
                    {authoredRoutes.length}
                  </span>
                </div>
                <p className="text-xs text-[#6B665F] mt-1">
                  Управляйте вашими треками: храните их как личные черновики либо публикуйте в общий каталог для всех туристов сообщества.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => gpxInputRef.current?.click()}
                  className="px-3.5 py-2 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Загрузить GPX трек</span>
                </button>

                {onOpenPassportEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      const newDraft: RiverRoute = {
                        id: `user-route-${Date.now()}`,
                        name: '',
                        riverName: '',
                        riverBasin: 'Бассейн реки Обь',
                        region: 'ХМАО',
                        fstrCategory: 'I к.с.',
                        intlClass: 'Class I',
                        lengthKm: 40,
                        durationDays: 3,
                        recommendedVessels: ['kayak', 'sup'],
                        startPoint: { name: 'Стапель', lat: 61.0, lng: 69.0 },
                        endPoint: { name: 'Антистапель', lat: 61.3, lng: 69.4 },
                        coordinates: [
                          [61.0, 69.0],
                          [61.15, 69.2],
                          [61.3, 69.4]
                        ],
                        elevationGainM: 20,
                        avgFlowSpeedKmh: 3.5,
                        seasonMonths: 'Июнь — Сентябрь',
                        description: '',
                        shortDesc: '',
                        highlights: ['Чистая северная вода'],
                        warnings: ['Соблюдайте правила безопасности на воде'],
                        mchsRegistrationRequired: true,
                        kmnsPermitNeeded: false,
                        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                        pois: [],
                        elevationProfile: [],
                        gpxFileName: 'route.gpx',
                        authorId: currentUser.id,
                        authorName: currentUser.name,
                        authorEmail: currentUser.email,
                        isPersonal: true,
                        isPublic: false
                      };
                      onOpenPassportEditor(newDraft);
                    }}
                    className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать паспорт маршрута</span>
                  </button>
                )}
              </div>
            </div>

            {/* Explanatory Guide Box on Sharing */}
            <div className="p-4 bg-[#F4F8F3] rounded-2xl border border-[#CDE0CC] text-xs text-[#2D332D] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D5A27]">
                <Globe className="w-4 h-4 shrink-0" />
                <span>Как делиться своими маршрутами со всеми пользователями:</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-[#4A443E]">
                <li className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#2D5A27] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Загрузите свой GPX файл с навигатора или создайте паспорт реки вручную.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#2D5A27] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Нажмите кнопку <strong>«Поделиться со всеми»</strong> — маршрут мгновенно появится в общем <strong>Списке маршрутов</strong> и на интерактивной карте.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#2D5A27] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Вы всегда можете снять маршрут с публикации или внести в него исправления.</span>
                </li>
              </ul>
            </div>

            {/* Filter pills if user has multiple routes */}
            {authoredRoutes.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#EEEBE6]">
                <span className="text-[11px] font-bold text-[#8B7E6D] mr-1">Фильтр:</span>
                {[
                  { id: 'all', label: `Все (${authoredRoutes.length})` },
                  { id: 'public', label: `Опубликованные (${authoredRoutes.filter(r => r.isPublic).length})` },
                  { id: 'private', label: `Личные черновики (${authoredRoutes.filter(r => !r.isPublic).length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRoutesFilter(f.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      routesFilter === f.id
                        ? 'bg-[#2D5A27] text-white'
                        : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Route Cards List */}
          {authoredRoutes.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E5E0D8] text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-[#E8F1E7] text-[#2D5A27] mx-auto flex items-center justify-center">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-black text-[#1A1F1A]">У вас пока нет добавленных маршрутов</h3>
                <p className="text-xs text-[#6B665F]">
                  Загрузите ваш первый GPX трек со сплава или оформите паспорт реки, чтобы сохранить маршрут в профиле и при желании открыть его для всего сообщества.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => gpxInputRef.current?.click()}
                  className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Загрузить первый GPX трек</span>
                </button>
              </div>
            </div>
          ) : filteredAuthoredRoutes.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-[#E5E0D8] text-center space-y-2">
              <p className="text-xs text-[#6B665F]">В выбранной категории маршрутов не найдено.</p>
              <button
                onClick={() => setRoutesFilter('all')}
                className="text-xs font-bold text-[#2D5A27] hover:underline cursor-pointer"
              >
                Показать все мои маршруты
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAuthoredRoutes.map((route) => {
                const isPub = Boolean(route.isPublic);
                return (
                  <div
                    key={route.id}
                    className="bg-white rounded-3xl border border-[#E5E0D8] overflow-hidden shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5">
                      
                      {/* Cover Photo / Preview */}
                      <div className="relative w-full md:w-56 h-40 md:h-auto rounded-2xl overflow-hidden shrink-0 border border-[#E5E0D8]">
                        <img
                          src={route.coverImage || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'}
                          alt={route.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#2D5A27] text-white shadow-xs">
                            {route.fstrCategory || 'I к.с.'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-[#1A1F1A] backdrop-blur-md">
                            {route.region}
                          </span>
                        </div>
                      </div>

                      {/* Content & Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-[#8B7E6D]">
                                Река {route.riverName || 'Без названия'}
                              </span>
                            </div>
                            <h3 className="text-base font-black text-[#1A1F1A] hover:text-[#2D5A27] transition-colors">
                              {route.name}
                            </h3>
                          </div>

                          {/* Publication Status Badge */}
                          <div className="shrink-0">
                            {isPub ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E8F1E7] border border-[#CDE0CC] text-[#2D5A27] text-xs font-black">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Опубликован для всех</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] text-xs font-black">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Личный (виден только вам)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-[#6B665F] line-clamp-2 leading-relaxed">
                          {route.shortDesc || route.description || 'Описание маршрута не заполнено.'}
                        </p>

                        {/* Quick Metrics */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#4A443E] bg-[#F9F7F4] p-3 rounded-2xl border border-[#EEEBE6]">
                          <span className="font-bold text-[#2D5A27]">📍 {route.lengthKm} км</span>
                          <span>⏱ {route.durationDays} дн.</span>
                          <span>🌊 {route.avgFlowSpeedKmh} км/ч</span>
                          <span>⛰️ {route.elevationGainM} м перепад</span>
                          <span>🚩 Точек (POI): {route.pois?.length || 0}</span>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EEEBE6]">
                          
                          {/* Main Share / Make Private Button */}
                          <div className="flex items-center gap-2">
                            {onUpdateRoute && (
                              <button
                                type="button"
                                onClick={() => handleToggleRoutePublic(route)}
                                className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isPub
                                    ? 'bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]'
                                    : 'bg-[#2D5A27] hover:bg-[#3D7136] text-white shadow-xs'
                                }`}
                              >
                                {isPub ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Снять с публикации (Сделать личным)</span>
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>Поделиться со всеми (Опубликовать в каталог)</span>
                                  </>
                                )}
                              </button>
                            )}

                            {isPub && (
                              <button
                                type="button"
                                onClick={() => handleCopyRouteLink(route.id)}
                                className="px-3 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Скопировать прямую ссылку на маршрут"
                              >
                                {copiedRouteId === route.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#2D5A27]" />
                                    <span className="text-[#2D5A27]">Ссылка скопирована!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3.5 h-3.5 text-[#8B7E6D]" />
                                    <span>Ссылка</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Secondary Route Controls */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {onSelectRouteOnMap && (
                              <button
                                type="button"
                                onClick={() => onSelectRouteOnMap(route)}
                                className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Показать на интерактивной карте"
                              >
                                <MapIcon className="w-3.5 h-3.5" />
                                <span>На карте</span>
                              </button>
                            )}

                            {onOpenRouteDetails && (
                              <button
                                type="button"
                                onClick={() => onOpenRouteDetails(route)}
                                className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                                title="Открыть паспорт реки"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Паспорт</span>
                              </button>
                            )}

                            {onOpenPassportEditor && (
                              <button
                                type="button"
                                onClick={() => onOpenPassportEditor(route)}
                                className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                                title="Редактировать паспорт и точки"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Редактировать</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDownloadGpx(route)}
                              className="p-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#6B665F] border border-[#E5E0D8] rounded-xl transition-colors cursor-pointer"
                              title="Скачать GPX файл"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteRoute && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Вы уверены, что хотите удалить маршрут "${route.name}"?`)) {
                                    onDeleteRoute(route.id);
                                  }
                                }}
                                className="p-2 bg-red-50 hover:bg-red-100 text-[#E54B4B] rounded-xl transition-colors cursor-pointer"
                                title="Удалить маршрут"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. MY TRIPS (МОИ СПЛАВЫ) */}
      {activeTab === 'trips' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#1A1F1A]">Мои активные и запланированные сплавы</h2>
          </div>

          {myPlannerTrips.length === 0 && myCompanionTrips.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6]">
              <Compass className="w-8 h-8 text-[#8B7E6D] mx-auto opacity-50" />
              <p className="text-xs text-[#6B665F]">
                У вас пока нет активных сплавов. Выберите маршрут в каталоге рек или создайте сбор экипажа.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myPlannerTrips.map((pt) => (
                <div
                  key={pt.id}
                  onClick={onOpenMyTrip}
                  className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#2D5A27] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1F1A]">{pt.routeName}</div>
                    <div className="text-[11px] text-[#6B665F]">{pt.region} • {pt.durationDays} дн. • {pt.startDate || 'Даты не указаны'}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#2D5A27]" />
                </div>
              ))}

              {myCompanionTrips.map((ct) => (
                <div
                  key={ct.id}
                  className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1F1A]">{ct.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] font-bold">
                        {ct.organizer.userId === currentUser.id ? 'Капитан экипажа' : 'Участник'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B665F] mt-0.5">
                      Река {ct.riverName} • {ct.startDate} — {ct.endDate} • Участников: {ct.participants.length} из {ct.totalSeats}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. APPLICATIONS (ЗАЯВКИ НА СПЛАВЫ) */}
      {activeTab === 'applications' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Incoming applications for organizer */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <h2 className="text-base font-black text-[#1A1F1A]">Входящие заявки в мои экипажи ({incomingApplications.length})</h2>
            {incomingApplications.length === 0 ? (
              <p className="text-xs text-[#6B665F]">Входящих заявок от других туристов пока нет.</p>
            ) : (
              <div className="space-y-3">
                {incomingApplications.map((app) => (
                  <div key={app.id} className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-[#1A1F1A]">{app.applicantName}</div>
                        <div className="text-[11px] text-[#6B665F]">Сплав: {app.tripTitle} (р. {app.riverName}) • Опыт: {app.experienceLevel}</div>
                        {app.applicantPhone && <div className="text-[11px] text-[#2D5A27] mt-0.5">Тел: {app.applicantPhone}</div>}
                      </div>

                      <div className="flex items-center gap-2">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApplicationDecision(app.trip, app.id, 'accepted')}
                              className="px-3 py-1.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#3D7136] transition-colors cursor-pointer"
                            >
                              Принять в экипаж
                            </button>
                            <button
                              onClick={() => handleApplicationDecision(app.trip, app.id, 'declined')}
                              className="px-3 py-1.5 bg-red-50 text-[#E54B4B] text-xs font-bold rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                            >
                              Отклонить
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                            app.status === 'accepted' ? 'bg-[#E8F1E7] text-[#2D5A27]' : 'bg-red-50 text-[#E54B4B]'
                          }`}>
                            {app.status === 'accepted' ? '✅ Одобрено' : '❌ Отклонено'}
                          </span>
                        )}
                      </div>
                    </div>
                    {app.notes && (
                      <p className="text-xs text-[#4A443E] bg-white p-2.5 rounded-xl border border-[#EEEBE6]">
                        «{app.notes}»
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing sent applications */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <h2 className="text-base font-black text-[#1A1F1A]">Мои отправленные заявки ({sentApplications.length})</h2>
            {sentApplications.length === 0 ? (
              <p className="text-xs text-[#6B665F]">Вы пока не отправляли заявок на участие в чужих сплавах.</p>
            ) : (
              <div className="space-y-3">
                {sentApplications.map((app) => (
                  <div key={app.id} className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#1A1F1A]">{app.tripTitle} (р. {app.riverName})</div>
                      <div className="text-[11px] text-[#6B665F]">Капитан: {app.organizerName} • Старт: {app.startDate}</div>
                    </div>
                    <div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                        app.status === 'accepted'
                          ? 'bg-[#E8F1E7] text-[#2D5A27]'
                          : app.status === 'declined'
                          ? 'bg-red-50 text-[#E54B4B]'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {app.status === 'accepted' ? '✅ Одобрена капитаном' : app.status === 'declined' ? '❌ Отклонена' : '⏳ На рассмотрении'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 5. FAVORITES (ИЗБРАННОЕ) */}
      {activeTab === 'favorites' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <h2 className="text-base font-black text-[#1A1F1A]">Избранные маршруты ({favoriteRoutes.length})</h2>
          {favoriteRoutes.length === 0 ? (
            <p className="text-xs text-[#6B665F]">В избранном пока нет маршрутов. Нажмите на сердечко в паспорте реки, чтобы добавить.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {favoriteRoutes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onOpenRouteDetails && onOpenRouteDetails(r)}
                  className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#2D5A27] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1F1A]">{r.name}</div>
                    <div className="text-[11px] text-[#6B665F]">{r.region} • {r.lengthKm} км • {r.fstrCategory}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#2D5A27]" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. GPX TRACKS & NAVIGATION */}
      {activeTab === 'gpx' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">Мои GPX треки и навигация</h2>
              <p className="text-xs text-[#6B665F]">Импортируйте треки из Garmin, OsmAnd, Locus Map или смартфонов для оффлайн сплава</p>
            </div>
            <button
              onClick={() => gpxInputRef.current?.click()}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Загрузить GPX файл</span>
            </button>
          </div>

          {authoredRoutes.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] text-center text-xs text-[#6B665F]">
              У вас пока нет загруженных GPX файлов. Нажмите «Загрузить GPX файл» для импорта трека.
            </div>
          ) : (
            <div className="space-y-3">
              {authoredRoutes.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1F1A] flex items-center gap-2">
                      <span>{r.gpxFileName || `${r.name}.gpx`}</span>
                      {r.isPublic && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] font-bold">
                          🌐 Опубликован
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B665F] mt-0.5">
                      Длина: {r.lengthKm} км • Точек трека: {r.coordinates.length} • Путевых ориентиров: {r.pois?.length || 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectRouteOnMap && (
                      <button
                        onClick={() => onSelectRouteOnMap(r)}
                        className="px-3 py-1.5 bg-white hover:bg-[#E8F1E7] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>На карте</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadGpx(r)}
                      className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Скачать GPX</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] text-xs text-[#4A443E] space-y-1">
            <strong>Совет по навигации:</strong>
            <p>Все загруженные треки сохраняются в защищенном профиле и доступны для экспорта на любые навигаторы без подключения к интернету.</p>
          </div>
        </div>
      )}

    </div>
  );
};
