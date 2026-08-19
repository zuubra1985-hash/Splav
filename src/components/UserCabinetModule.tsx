import React, { useState, useRef } from 'react';
import { AppUser, UserRole, RiverRoute, HydroStation, ArticleReport, CompanionTrip, TripApplication } from '../types';
import { parseGpxFile } from '../utils/gpxParser';
import { ArticlesSyncService, TripsSyncService, RoutesSyncService, HydroSyncService, UsersSyncService } from '../firebase';
import { 
  ShieldCheck, 
  User, 
  Crown, 
  Users, 
  Compass, 
  Droplets, 
  BookOpen, 
  FileJson, 
  LogOut, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  MapPin, 
  Heart,
  ChevronRight,
  Shield,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  Award,
  FileDown,
  Navigation2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UserCabinetModuleProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onUpdateCurrentUser: (user: AppUser) => void;
  registeredUsers: AppUser[];
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onDeleteUser: (userId: string) => void;
  routes: RiverRoute[];
  setRoutes: React.Dispatch<React.SetStateAction<RiverRoute[]>>;
  hydroStations: HydroStation[];
  setHydroStations: React.Dispatch<React.SetStateAction<HydroStation[]>>;
  articles: ArticleReport[];
  setArticles: React.Dispatch<React.SetStateAction<ArticleReport[]>>;
  trips: CompanionTrip[];
  setTrips: React.Dispatch<React.SetStateAction<CompanionTrip[]>>;
  onResetToDefaults: () => void;
  onSelectRoute: (route: RiverRoute) => void;
  onOpenRouteDetails: (route: RiverRoute) => void;
  onOpenPassportEditor?: (route?: RiverRoute) => void;
  initialCabinetTab?: 'profile' | 'routes' | 'hydro' | 'articles' | 'trips' | 'users' | 'backup';
  initialEditingArticle?: ArticleReport | null;
}

export const UserCabinetModule: React.FC<UserCabinetModuleProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  onUpdateCurrentUser,
  registeredUsers,
  onUpdateUserRole,
  onDeleteUser,
  routes,
  setRoutes,
  hydroStations,
  setHydroStations,
  articles,
  setArticles,
  trips,
  setTrips,
  onResetToDefaults,
  onSelectRoute,
  onOpenRouteDetails,
  onOpenPassportEditor,
  initialCabinetTab,
  initialEditingArticle
}) => {
  const isSuperAdmin = currentUser?.email.toLowerCase() === 'zuubra1985@gmail.com' || currentUser?.email.toLowerCase() === 'novichek2@narod.ru' || currentUser?.role === 'superadmin';
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin';

  const [activeCabinetTab, setActiveCabinetTab] = useState<'profile' | 'routes' | 'hydro' | 'articles' | 'trips' | 'users' | 'backup'>(
    isAdmin ? (initialCabinetTab || 'profile') : 'profile'
  );

  // Strictly ensure regular users never see or access admin management tabs
  React.useEffect(() => {
    if (!isAdmin && activeCabinetTab !== 'profile') {
      setActiveCabinetTab('profile');
    }
  }, [isAdmin, activeCabinetTab]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cabinetGpxFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    city: currentUser?.city || 'Югра',
    experienceLevel: currentUser?.experienceLevel || 'Любитель (1-2 к.с.)',
    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
  });

  const AVATAR_PRESETS = [
    { url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', label: 'Каякер' },
    { url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80', label: 'Сапбордист' },
    { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', label: 'Проводник' },
    { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', label: 'Исследователь' },
    { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', label: 'Шкипер' },
    { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', label: 'Навигатор' }
  ];

  const handleOpenEditProfile = () => {
    if (!currentUser) return;
    setProfileForm({
      name: currentUser.name,
      phone: currentUser.phone,
      email: currentUser.email,
      city: currentUser.city || 'Югра',
      experienceLevel: currentUser.experienceLevel || 'Любитель (1-2 к.с.)',
      avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    });
    setIsEditingProfile(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Пожалуйста, выберите файл изображения (JPG, PNG, WEBP)', 'error');
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          const width = img.width;
          const height = img.height;

          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setProfileForm((prev) => ({ ...prev, avatar: dataUrl }));
            showNotification('Фотография успешно загружена с устройства!');
          }
        } catch (err) {
          console.error(err);
          showNotification('Ошибка обработки фото', 'error');
        } finally {
          setIsProcessingImage(false);
        }
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        showNotification('Не удалось прочитать изображение', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileForm.name.trim()) {
      showNotification('Укажите ваше имя или никнейм', 'error');
      return;
    }

    const updated: AppUser = {
      ...currentUser,
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim(),
      city: profileForm.city.trim(),
      experienceLevel: profileForm.experienceLevel,
      avatar: profileForm.avatar.trim()
    };

    onUpdateCurrentUser(updated);
    setIsEditingProfile(false);
    showNotification('Ваш профиль успешно обновлен!');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  // Edit / Create States
  const [editingRoute, setEditingRoute] = useState<RiverRoute | null>(null);
  const [isNewRoute, setIsNewRoute] = useState<boolean>(false);

  const [editingHydro, setEditingHydro] = useState<HydroStation | null>(null);
  const [isNewHydro, setIsNewHydro] = useState<boolean>(false);

  const [editingArticle, setEditingArticle] = useState<ArticleReport | null>(initialEditingArticle || null);
  const [isNewArticle, setIsNewArticle] = useState<boolean>(false);
  const articleCoverInputRef = useRef<HTMLInputElement>(null);
  const articleGalleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingArticlePhoto, setIsProcessingArticlePhoto] = useState<boolean>(false);

  // Compress & convert device image to high-res optimized Data URL
  const compressAndLoadArticleImage = (file: File, maxWidth = 1400, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Неверный формат изображения'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let w = img.width;
            let h = img.height;
            if (w > maxWidth) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
              resolve(e.target?.result as string);
            }
          } catch {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Ошибка загрузки фото'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  };

  const handleArticleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingArticlePhoto(true);
    try {
      const dataUrl = await compressAndLoadArticleImage(file, 1600, 0.88);
      setEditingArticle((prev) => (prev ? { ...prev, coverImage: dataUrl } : null));
      showNotification('Главная обложка статьи успешно загружена с устройства!');
    } catch (err) {
      console.error(err);
      showNotification('Не удалось загрузить изображение с устройства', 'error');
    } finally {
      setIsProcessingArticlePhoto(false);
      if (articleCoverInputRef.current) articleCoverInputRef.current.value = '';
    }
  };

  const handleArticleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setIsProcessingArticlePhoto(true);
    try {
      const loaded: { url: string; caption: string }[] = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await compressAndLoadArticleImage(file, 1400, 0.85);
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          loaded.push({ url: dataUrl, caption: cleanName });
        }
      }
      setEditingArticle((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          gallery: [...(prev.gallery || []), ...loaded]
        };
      });
      showNotification(`Загружено ${loaded.length} фото в фотоотчет статьи!`);
    } catch (err) {
      console.error(err);
      showNotification('Ошибка загрузки фотографий', 'error');
    } finally {
      setIsProcessingArticlePhoto(false);
      if (articleGalleryInputRef.current) articleGalleryInputRef.current.value = '';
    }
  };

  // Expedition Edit & Application Management States
  const [editingTrip, setEditingTrip] = useState<CompanionTrip | null>(null);
  const [managingTripApps, setManagingTripApps] = useState<CompanionTrip | null>(null);

  const handleOpenEditTrip = (trip: CompanionTrip) => {
    setEditingTrip({ ...trip });
  };

  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    setTrips((prev) => prev.map((t) => (t.id === editingTrip.id ? editingTrip : t)));
    TripsSyncService.saveTrip(editingTrip).catch((err) => {
      console.warn('Failed to sync trip to Firestore:', err);
    });
    showNotification(`Экспедиция "${editingTrip.title}" успешно обновлена!`);
    setEditingTrip(null);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleDeleteTrip = (tripId: string, title: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить экспедицию "${title}"?`)) {
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      TripsSyncService.removeTrip(tripId).catch((err) => {
        console.warn('Failed to remove trip from Firestore:', err);
      });
      showNotification(`Экспедиция "${title}" удалена.`, 'error');
    }
  };

  const handleCabinetGpxUpload = (file: File) => {
    if (!file.name.match(/\.(gpx|kml|xml)$/i)) {
      showNotification('Поддерживаются только файлы .gpx, .kml или .xml', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('Файл пуст');

        const parsed = parseGpxFile(text, file.name);

        const newRoute: RiverRoute = {
          id: `custom-gpx-${Date.now()}`,
          name: parsed.name,
          riverName: parsed.name,
          region: (parsed.coordinates[0]?.[0] || 62) > 65.5 ? 'ЯНАО' : 'ХМАО',
          fstrCategory: 'I к.с.',
          intlClass: 'Class I',
          lengthKm: parsed.totalDistanceKm,
          durationDays: Math.max(1, Math.ceil(parsed.totalDistanceKm / 25)),
          recommendedVessels: ['sup', 'kayak', 'catamaran'],
          startPoint: parsed.startPoint,
          endPoint: parsed.endPoint,
          coordinates: parsed.coordinates,
          elevationGainM: parsed.elevationGainM || 50,
          avgFlowSpeedKmh: 3.5,
          seasonMonths: 'Июнь — Сентябрь',
          description: parsed.description,
          shortDesc: `Импортированный GPX трек (${parsed.totalDistanceKm} км, перепад ${parsed.elevationGainM} м).`,
          highlights: ['Импортировано из GPS навигатора', 'Фактический пройденный трек'],
          warnings: ['Проверьте уровень воды и гидрологическую обстановку'],
          mchsRegistrationRequired: true,
          kmnsPermitNeeded: false,
          coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          elevationProfile: parsed.elevationPoints.map((ep) => ({
            distanceKm: ep.distKm,
            elevationM: ep.elev
          })),
          gpxFileName: `${parsed.name.toLowerCase().replace(/\s+/g, '_')}_splav86.gpx`,
          pois: parsed.waypoints.length > 0 ? parsed.waypoints : [
            {
              id: `poi-st-${Date.now()}`,
              name: 'Точка старта',
              type: 'slipway',
              lat: parsed.startPoint.lat,
              lng: parsed.startPoint.lng,
              description: 'Удобное место для сборки и спуска судов на воду'
            },
            {
              id: `poi-fn-${Date.now()}`,
              name: 'Точка финиша',
              type: 'slipway',
              lat: parsed.endPoint.lat,
              lng: parsed.endPoint.lng,
              description: 'Место антистапеля и подъезда транспорта'
            }
          ]
        };

        setRoutes((prev) => {
          const updated = [newRoute, ...prev];
          try {
            localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
          } catch (err) {
            console.error(err);
          }
          return updated;
        });

        // Add to user's favorites as well
        if (currentUser) {
          const favs = currentUser.favoriteRouteIds || [];
          if (!favs.includes(newRoute.id)) {
            const updatedUser = { ...currentUser, favoriteRouteIds: [...favs, newRoute.id] };
            onUpdateCurrentUser(updatedUser);
          }
        }

        showNotification(`GPX трек "${parsed.name}" (${parsed.totalDistanceKm} км) успешно импортирован!`);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (err: any) {
        showNotification(err.message || 'Ошибка чтения GPX файла.', 'error');
      }
    };
    reader.onerror = () => {
      showNotification('Не удалось прочитать файл.', 'error');
    };
    reader.readAsText(file);
  };

  const handleWithdrawApplication = (tripId: string) => {
    if (!currentUser) return;
    if (window.confirm('Отозвать вашу заявку на участие в этом походе?')) {
      const targetTrip = trips.find((t) => t.id === tripId);
      if (targetTrip) {
        const updatedTrip: CompanionTrip = {
          ...targetTrip,
          applications: (targetTrip.applications || []).filter(
            (a) => a.userId !== currentUser.id && a.applicantName.toLowerCase() !== currentUser.name.toLowerCase()
          )
        };
        setTrips((prev) => prev.map((t) => (t.id === tripId ? updatedTrip : t)));
        TripsSyncService.saveTrip(updatedTrip).catch((err) => {
          console.warn('Failed to sync trip application withdrawal to Firestore:', err);
        });
      }
      showNotification('Заявка успешно отозвана.');
    }
  };

  const handleCabinetAcceptApp = (trip: CompanionTrip, app: TripApplication) => {
    const updatedApps = (trip.applications || []).map(a => 
      a.id === app.id ? { ...a, status: 'accepted' as const } : a
    );
    const newParticipant = {
      userId: app.userId,
      name: app.applicantName,
      role: 'Участник экипажа',
      vessel: app.vesselType || 'kayak',
      avatar: app.applicantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: app.applicantPhone
    };
    const updatedTrip: CompanionTrip = {
      ...trip,
      bookedSeats: Math.min(trip.totalSeats, trip.bookedSeats + 1),
      participants: [...trip.participants, newParticipant],
      applications: updatedApps
    };
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? updatedTrip : t)));
    setManagingTripApps(updatedTrip);
    TripsSyncService.saveTrip(updatedTrip).catch((err) => {
      console.warn('Failed to sync accepted participant to Firestore:', err);
    });
    showNotification(`${app.applicantName} принят(а) в состав экипажа!`);
  };

  const handleCabinetDeclineApp = (trip: CompanionTrip, appId: string) => {
    const updatedApps = (trip.applications || []).map(a => 
      a.id === appId ? { ...a, status: 'declined' as const } : a
    );
    const updatedTrip: CompanionTrip = {
      ...trip,
      applications: updatedApps
    };
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? updatedTrip : t)));
    setManagingTripApps(updatedTrip);
    TripsSyncService.saveTrip(updatedTrip).catch((err) => {
      console.warn('Failed to sync declined application to Firestore:', err);
    });
    showNotification('Заявка отклонена.', 'error');
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[#E8F1E7] text-[#2D5A27] mx-auto flex items-center justify-center shadow-md">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[#1A1F1A]">Личный кабинет Splav86</h1>
          <p className="text-sm text-[#6B665F] max-w-md mx-auto">
            Для доступа к сохраненным маршрутам, заявкам в МЧС, управлению экипажами или администрированию сайта, пожалуйста, войдите в аккаунт.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-sm rounded-2xl shadow-lg transition-all"
        >
          Войти или Зарегистрироваться
        </button>
      </div>
    );
  }

  // Favorite routes
  const favoriteRoutes = routes.filter((r) => currentUser.favoriteRouteIds?.includes(r.id));

  // --- Handlers for Routes ---
  const handleOpenNewRoute = () => {
    if (onOpenPassportEditor) {
      onOpenPassportEditor();
      return;
    }
    const template: RiverRoute = {
      id: `route-${Date.now()}`,
      name: 'Новый маршрут по реке',
      riverName: 'Новая река',
      region: 'ХМАО',
      fstrCategory: 'I к.с.',
      intlClass: 'Class I',
      lengthKm: 75,
      durationDays: 3,
      recommendedVessels: ['kayak', 'sup'],
      startPoint: { name: 'Точка стапеля', lat: 61.25, lng: 73.40 },
      endPoint: { name: 'Точка антистапеля', lat: 61.40, lng: 73.60 },
      coordinates: [
        [61.25, 73.40],
        [61.32, 73.50],
        [61.40, 73.60]
      ],
      elevationGainM: 15,
      avgFlowSpeedKmh: 4.0,
      seasonMonths: 'Июнь — Сентябрь',
      shortDesc: 'Краткое описание маршрута для карточки.',
      description: 'Подробное описание маршрута, лоция русла, условия заброски и стоянок.',
      highlights: ['Чистая вода', 'Удобный стапель'],
      warnings: ['Возможен встречный ветер'],
      mchsRegistrationRequired: true,
      kmnsPermitNeeded: false,
      coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
      pois: [
        {
          id: `poi-1`,
          name: 'Стоянка у мыса',
          type: 'camp',
          lat: 61.32,
          lng: 73.50,
          description: 'Хороший песчаный берег, сухой плавник для костра.',
          kmMark: 25
        }
      ],
      elevationProfile: [
        { distanceKm: 0, elevationM: 65, pointName: 'Старт' },
        { distanceKm: 35, elevationM: 55, pointName: 'Мыс' },
        { distanceKm: 75, elevationM: 50, pointName: 'Финиш' }
      ],
      gpxFileName: 'route_custom.gpx'
    };
    setEditingRoute(template);
    setIsNewRoute(true);
  };

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;

    if (isNewRoute) {
      setRoutes((prev) => [editingRoute, ...prev]);
      showNotification(`Маршрут "${editingRoute.name}" добавлен в базу сайта!`);
    } else {
      setRoutes((prev) => prev.map((r) => (r.id === editingRoute.id ? editingRoute : r)));
      showNotification(`Маршрут "${editingRoute.name}" сохранен!`);
    }
    RoutesSyncService.saveRoute(editingRoute).catch((err) => {
      console.warn('Failed to sync route to Firestore:', err);
    });
    setEditingRoute(null);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleDeleteRoute = (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить маршрут "${name}" с сайта?`)) {
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      RoutesSyncService.removeRoute(id).catch((err) => {
        console.warn('Failed to remove route from Firestore:', err);
      });
      showNotification(`Маршрут "${name}" удален.`, 'error');
    }
  };

  // --- Handlers for Hydro Stations ---
  const handleOpenNewHydro = () => {
    const template: HydroStation = {
      id: `hydro-${Date.now()}`,
      name: 'Гидропост р. Новая',
      river: 'Новая',
      region: 'ХМАО',
      lat: 61.0,
      lng: 69.0,
      currentLevelCm: 250,
      change24hCm: 5,
      dangerLevelCm: 500,
      floodLevelCm: 380,
      normalLevelCm: 200,
      waterTempC: 14,
      iceCondition: 'Чистая вода, навигация открыта',
      lastUpdated: 'Сегодня в 08:00',
      historicalTrend: [
        { date: '15.08', level: 245 },
        { date: '16.08', level: 248 },
        { date: '17.08', level: 250 }
      ]
    };
    setEditingHydro(template);
    setIsNewHydro(true);
  };

  const handleSaveHydro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHydro) return;

    if (isNewHydro) {
      setHydroStations((prev) => [editingHydro, ...prev]);
      showNotification(`Гидропост "${editingHydro.name}" добавлен!`);
    } else {
      setHydroStations((prev) => prev.map((h) => (h.id === editingHydro.id ? editingHydro : h)));
      showNotification(`Данные гидропоста "${editingHydro.name}" обновлены!`);
    }
    HydroSyncService.saveHydroStation(editingHydro).catch((err) => {
      console.warn('Failed to sync hydro station to Firestore:', err);
    });
    setEditingHydro(null);
  };

  const handleDeleteHydro = (id: string, name: string) => {
    if (window.confirm(`Удалить гидропост "${name}"?`)) {
      setHydroStations((prev) => prev.filter((h) => h.id !== id));
      HydroSyncService.removeHydroStation(id).catch((err) => {
        console.warn('Failed to remove hydro station from Firestore:', err);
      });
      showNotification(`Гидропост "${name}" удален.`, 'error');
    }
  };

  // --- Handlers for Articles ---
  const handleOpenNewArticle = () => {
    const template: ArticleReport = {
      id: `art-${Date.now()}`,
      title: 'Новая лоция реки',
      subtitle: 'Практическое руководство по сплаву',
      riverName: 'Северная река',
      region: 'ХМАО',
      author: currentUser.name,
      authorRank: isSuperAdmin ? 'Главный Администратор' : 'Эксперт',
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
      readTimeMin: 5,
      coverImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80',
      summary: 'Краткая аннотация статьи и отчета об экспедиции.',
      fullContent: [
        'Вводная часть отчета с описанием особенностей сплава.',
        'Техническая часть: пороги, стоянки и логистика заброски.'
      ],
      tags: ['лоция', 'хмао', 'каякинг'],
      stats: {
        distanceKm: 90,
        days: 4,
        vessel: 'Байдарки',
        bestMonth: 'Июль'
      },
      gallery: [
        {
          url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
          caption: 'Стоянка на высоком берегу реки'
        }
      ]
    };
    setEditingArticle(template);
    setIsNewArticle(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    if (isNewArticle) {
      setArticles((prev) => [editingArticle, ...prev]);
      showNotification(`Статья "${editingArticle.title}" опубликована!`);
    } else {
      setArticles((prev) => prev.map((a) => (a.id === editingArticle.id ? editingArticle : a)));
      showNotification(`Статья "${editingArticle.title}" сохранена!`);
    }

    try {
      await ArticlesSyncService.saveArticle(editingArticle);
    } catch (err) {
      console.error('Firestore save article error:', err);
    }

    setEditingArticle(null);
    confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (window.confirm(`Удалить статью "${title}"?`)) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showNotification(`Статья "${title}" удалена.`, 'error');
      try {
        await ArticlesSyncService.removeArticle(id);
      } catch (err) {
        console.error('Firestore remove article error:', err);
      }
    }
  };

  // --- Handlers for Database Backup ---
  const handleExportFullDatabase = () => {
    const fullDb = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      routes,
      hydroStations,
      articles,
      trips,
      registeredUsers
    };

    const blob = new Blob([JSON.stringify(fullDb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('База данных успешно сохранена в JSON!');
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.routes && Array.isArray(parsed.routes)) setRoutes(parsed.routes);
        if (parsed.hydroStations && Array.isArray(parsed.hydroStations)) setHydroStations(parsed.hydroStations);
        if (parsed.articles && Array.isArray(parsed.articles)) setArticles(parsed.articles);
        if (parsed.trips && Array.isArray(parsed.trips)) setTrips(parsed.trips);

        showNotification('База данных успешно восстановлена!');
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch (err) {
        showNotification('Ошибка чтения JSON файла бэкапа.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* User Header Profile Card */}
      <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
            alt={currentUser.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E8F1E7]"
          />

          <div>
            <h1 className="text-lg sm:text-xl font-black text-[#1A1F1A]">{currentUser.name}</h1>
            <div className="text-xs text-[#6B665F] mt-1 flex items-center gap-3 flex-wrap">
              <span>✉️ {currentUser.email}</span>
              <span>📞 {currentUser.phone}</span>
              <span>📍 {currentUser.city || 'Югра'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleOpenEditProfile}
            className="px-3.5 py-2 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Редактировать профиль</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 bg-[#F9F7F4] hover:bg-[#FDE8E8] text-[#6B665F] hover:text-[#E54B4B] font-bold text-xs rounded-xl border border-[#E5E0D8] transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>

      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#E5E0D8] shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveCabinetTab('profile')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
            activeCabinetTab === 'profile'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-[#6B665F] hover:text-[#2D5A27]'
          }`}
        >
          <User className="w-4 h-4" />
          Мой профиль
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveCabinetTab('routes')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeCabinetTab === 'routes'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              <Compass className="w-4 h-4" />
              Управление реками ({routes.length})
            </button>

            <button
              onClick={() => setActiveCabinetTab('hydro')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeCabinetTab === 'hydro'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              <Droplets className="w-4 h-4" />
              Гидропосты ({hydroStations.length})
            </button>

            <button
              onClick={() => setActiveCabinetTab('articles')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeCabinetTab === 'articles'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Статьи и отчеты ({articles.length})
            </button>

            <button
              onClick={() => setActiveCabinetTab('trips')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeCabinetTab === 'trips'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              <Users className="w-4 h-4" />
              Все походы ({trips.length})
            </button>

            {/* Only Super Admin can manage Admins */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveCabinetTab('users')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCabinetTab === 'users'
                    ? 'bg-[#E54B4B] text-white shadow-sm'
                    : 'text-[#E54B4B] hover:bg-[#FDE8E8]'
                }`}
              >
                <Crown className="w-4 h-4" />
                Администраторы и пользователи
              </button>
            )}

            <button
              onClick={() => setActiveCabinetTab('backup')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeCabinetTab === 'backup'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              <FileJson className="w-4 h-4" />
              Бэкап базы
            </button>
          </>
        )}
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
          notification.type === 'success'
            ? 'bg-[#E8F1E7] border-[#CDE0CC] text-[#2D5A27]'
            : 'bg-[#FDE8E8] border-[#F8B4B4] text-[#E54B4B]'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. USER PROFILE & SAVED ROUTES */}
      {activeCabinetTab === 'profile' && (
        <div className="space-y-6">
          
          {/* User's Expeditions & Applications */}
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2D5A27]" />
                Мои экспедиции и заявки в экипаж
              </h2>
              <span className="text-xs text-[#8B7E6D] font-bold">
                Раздел «Попутчики»
              </span>
            </div>

            {(() => {
              const myOrganizedTrips = trips.filter(t => 
                (t.organizer.userId && t.organizer.userId === currentUser.id) ||
                t.organizer.name.toLowerCase().includes(currentUser.name.toLowerCase())
              );
              
              const myParticipantTrips = trips.filter(t => 
                !myOrganizedTrips.some(org => org.id === t.id) &&
                t.participants.some(p => (p.userId && p.userId === currentUser.id) || p.name.toLowerCase().includes(currentUser.name.toLowerCase()))
              );

              const myAppliedTrips = trips.filter(t => 
                !myOrganizedTrips.some(org => org.id === t.id) &&
                !myParticipantTrips.some(part => part.id === t.id) &&
                (t.applications || []).some(a => (a.userId && a.userId === currentUser.id) || (a.applicantName && a.applicantName.toLowerCase() === currentUser.name.toLowerCase()))
              );

              const totalUserTrips = myOrganizedTrips.length + myParticipantTrips.length + myAppliedTrips.length;

              if (totalUserTrips === 0) {
                return (
                  <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] text-xs text-[#6B665F] text-center space-y-1">
                    <p>Вы пока не подавали заявок в экспедиции и не создавали свои походы.</p>
                    <p className="text-[11px] text-[#8B7E6D]">Перейдите во вкладку «Попутчики», чтобы найти команду или создать сборную группу!</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Organized by user */}
                  {myOrganizedTrips.map(trip => {
                    const pendingCount = (trip.applications || []).filter(a => a.status === 'pending').length;
                    return (
                      <div key={trip.id} className="bg-[#F9F7F4] border-2 border-[#2D5A27]/30 rounded-2xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#2D5A27] text-white text-[10px] font-bold flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Вы капитан
                          </span>
                          <span className="text-[11px] text-[#2D5A27] font-bold">
                            р. {trip.riverName}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1A1F1A] line-clamp-1">{trip.title}</h4>
                          <div className="text-[11px] text-[#6B665F] space-y-0.5 mt-1">
                            <p>📅 {trip.startDate} — {trip.endDate}</p>
                            <p>👥 Экипаж: {trip.bookedSeats} из {trip.totalSeats} мест • {trip.fstrCategory}</p>
                          </div>
                        </div>

                        {/* Action Buttons for Captain */}
                        <div className="pt-2.5 border-t border-[#E5E0D8] flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTrip(trip)}
                              className="px-2.5 py-1.5 bg-white hover:bg-[#EAE7E2] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1 shadow-2xs"
                              title="Редактировать параметры похода"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Редактировать</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setManagingTripApps(trip)}
                              className={`px-2.5 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-2xs ${
                                pendingCount > 0
                                  ? 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] border border-[#FDE68A]'
                                  : 'bg-white hover:bg-[#EAE7E2] text-[#4A443E] border border-[#E5E0D8]'
                              }`}
                              title="Управление заявками кандидатов"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Заявки ({pendingCount})</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTrip(trip.id, trip.title)}
                            className="p-1.5 text-[#8B7E6D] hover:text-[#E54B4B] hover:bg-[#FDE8E8] rounded-xl transition-all"
                            title="Удалить поход"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Confirmed participant */}
                  {myParticipantTrips.map(trip => (
                    <div key={trip.id} className="bg-[#E8F1E7]/50 border border-[#CDE0CC] rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#2D5A27] text-white text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          В основном экипаже
                        </span>
                        <span className="text-[10px] text-[#8B7E6D] font-bold">
                          р. {trip.riverName}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1F1A] line-clamp-1">{trip.title}</h4>
                        <div className="text-[11px] text-[#6B665F] space-y-0.5 mt-1">
                          <p>📅 {trip.startDate} — {trip.endDate}</p>
                          <p>Капитан: {trip.organizer.name}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#CDE0CC] text-[11px] text-[#2D5A27] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Вы полноправный участник похода</span>
                      </div>
                    </div>
                  ))}

                  {/* Applied trips (pending / declined) */}
                  {myAppliedTrips.map(trip => {
                    const myApp = (trip.applications || []).find(a => (a.userId && a.userId === currentUser.id) || (a.applicantName && a.applicantName.toLowerCase() === currentUser.name.toLowerCase()));
                    const isPending = myApp?.status === 'pending';
                    return (
                      <div key={trip.id} className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isPending ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]' : 'bg-[#FDE8E8] text-[#E54B4B]'
                          }`}>
                            {isPending ? 'Заявка на рассмотрении' : 'Заявка отклонена'}
                          </span>
                          <span className="text-[10px] text-[#8B7E6D] font-bold">
                            р. {trip.riverName}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#1A1F1A] line-clamp-1">{trip.title}</h4>
                          <div className="text-[11px] text-[#6B665F] space-y-0.5 mt-1">
                            <p>📅 {trip.startDate} — {trip.endDate}</p>
                            <p>Капитан: {trip.organizer.name}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[#8B7E6D]">
                            {isPending ? '⏳ На рассмотрении' : 'Отклонено'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleWithdrawApplication(trip.id)}
                            className="text-[11px] text-[#E54B4B] hover:underline font-bold"
                          >
                            Отозвать заявку
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E54B4B]" />
                Избранные реки и запланированные сплавы ({favoriteRoutes.length})
              </h2>

              <button
                type="button"
                onClick={() => cabinetGpxFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Загрузить свой GPX трек</span>
              </button>
            </div>

            {favoriteRoutes.length === 0 ? (
              <p className="text-xs text-[#6B665F]">
                У вас пока нет сохраненных рек. Выберите маршруты в разделе «Карта и реки» или импортируйте свой GPX трек с навигатора.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-[#F9F7F4] border border-[#EEEBE6] rounded-[24px] p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                          {route.region} • ФСТР {route.fstrCategory}
                        </span>
                        <span className="text-xs font-bold text-[#2D5A27]">{route.lengthKm} км</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#1A1F1A] mt-1">{route.name}</h3>
                      <p className="text-xs text-[#6B665F] line-clamp-2 mt-1">{route.shortDesc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D8] text-xs">
                      <span className="text-[#8B7E6D]">⏱ {route.durationDays} дн. сплава</span>
                      <button
                        onClick={() => {
                          onSelectRoute(route);
                          onOpenRouteDetails(route);
                        }}
                        className="px-3 py-1 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-lg"
                      >
                        Лоция
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-[#1A1F1A]">Квалификация сплавщика</h3>
              <p className="text-xs text-[#6B665F]">Опыт: {currentUser.experienceLevel || 'Средний (2-4 сплава)'}</p>
              <p className="text-xs text-[#6B665F]">Статус регистрации: Зарегистрирован {currentUser.registeredAt}</p>
            </div>

            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-[#1A1F1A]">Безопасность и МЧС</h3>
              <p className="text-xs text-[#6B665F]">Контактный телефон для экстренной связи: {currentUser.phone}</p>
              <p className="text-xs text-[#2D5A27] font-semibold">✓ Готовность к подаче уведомлений МЧС онлайн</p>
            </div>
          </div>

        </div>
      )}

      {/* 2. SUPER ADMIN: USER & ADMIN ROLES MANAGEMENT */}
      {activeCabinetTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#E54B4B]" />
                Управление администраторами и пользователями ({registeredUsers.length})
              </h2>
              <p className="text-xs text-[#6B665F] mt-1">
                Главные администраторы (<span className="font-mono font-bold text-[#E54B4B]">zuubra1985@gmail.com</span> / <span className="font-mono font-bold text-[#E54B4B]">novichek2@narod.ru</span>) имеют полный доступ к назначению и управлению правами.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E0D8] rounded-[28px] overflow-hidden shadow-sm">
            <div className="divide-y divide-[#E5E0D8]">
              {registeredUsers.map((user) => {
                const isThisSuper = user.email.toLowerCase() === 'zuubra1985@gmail.com' || user.email.toLowerCase() === 'novichek2@narod.ru' || user.role === 'superadmin';

                return (
                  <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9F7F4]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E8F1E7] text-[#2D5A27] flex items-center justify-center font-bold text-sm">
                        {user.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-[#1A1F1A]">{user.name}</strong>
                          {isThisSuper && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FDE8E8] text-[#E54B4B] border border-[#F8B4B4]">
                              Главный админ
                            </span>
                          )}
                          {!isThisSuper && user.role === 'admin' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                              Администратор
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B665F]">{user.email} • {user.phone} • {user.city}</p>
                      </div>
                    </div>

                    {!isThisSuper && (
                      <div className="flex items-center gap-2">
                        {user.role === 'admin' ? (
                          <button
                            onClick={() => {
                              onUpdateUserRole(user.id, 'user');
                              showNotification(`Пользователь ${user.name} переведен в статус обычного туриста.`);
                            }}
                            className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#FDE8E8] text-[#E54B4B] font-bold text-xs rounded-xl border border-[#E5E0D8] flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Снять права админа
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onUpdateUserRole(user.id, 'admin');
                              showNotification(`Пользователю ${user.name} назначены права администратора!`);
                            }}
                            className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Назначить админом
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Удалить аккаунт ${user.name}?`)) {
                              onDeleteUser(user.id);
                              showNotification(`Аккаунт ${user.name} удален.`);
                            }
                          }}
                          className="p-1.5 text-[#8B7E6D] hover:text-[#E54B4B] rounded-lg"
                          title="Удалить аккаунт"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ROUTES ADMIN */}
      {activeCabinetTab === 'routes' && isAdmin && (
        <div className="space-y-4">
          {/* Hidden GPX input for cabinet */}
          <input
            type="file"
            ref={cabinetGpxFileInputRef}
            accept=".gpx,.kml,.xml"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleCabinetGpxUpload(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#1A1F1A]">Каталог водных маршрутов ({routes.length})</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cabinetGpxFileInputRef.current?.click()}
                className="px-3.5 py-2 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Импорт GPX</span>
              </button>

              <button
                onClick={handleOpenNewRoute}
                className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить маршрут</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] overflow-hidden p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="relative h-32 w-full rounded-xl overflow-hidden mb-2 bg-[#F9F7F4]">
                    <img src={route.coverImage} alt={route.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                        {route.region}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2D5A27] text-white">
                        {route.fstrCategory}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1F1A] line-clamp-1">{route.name}</h3>
                  <p className="text-xs text-[#6B665F] line-clamp-2 mt-1">{route.shortDesc}</p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">{route.lengthKm} км • {route.durationDays} дн.</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (onOpenPassportEditor) {
                          onOpenPassportEditor(route);
                        } else {
                          setEditingRoute(JSON.parse(JSON.stringify(route)));
                          setIsNewRoute(false);
                        }
                      }}
                      className="p-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] rounded-lg border border-[#E5E0D8]"
                      title="Редактировать паспорт реки"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoute(route.id, route.name)}
                      className="p-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-lg border border-[#F8B4B4]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HYDRO ADMIN */}
      {activeCabinetTab === 'hydro' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1F1A]">Гидропосты ({hydroStations.length})</h2>
            <button
              onClick={handleOpenNewHydro}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Добавить гидропост
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hydroStations.map((station) => (
              <div
                key={station.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                      {station.region} • {station.river}
                    </span>
                    <span className="text-xs font-black text-[#2B4C7E]">{station.currentLevelCm} см</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1F1A]">{station.name}</h3>
                  <p className="text-xs text-[#6B665F] mt-1">Норма: {station.normalLevelCm} см | Пойма: {station.floodLevelCm} см</p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">Темп: +{station.waterTempC}°C</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingHydro(JSON.parse(JSON.stringify(station)));
                        setIsNewHydro(false);
                      }}
                      className="p-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] rounded-lg border border-[#E5E0D8]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteHydro(station.id, station.name)}
                      className="p-1.5 bg-[#FDE8E8] text-[#E54B4B] rounded-lg border border-[#F8B4B4]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ARTICLES ADMIN */}
      {activeCabinetTab === 'articles' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1F1A]">Лоции и статьи ({articles.length})</h2>
            <button
              onClick={handleOpenNewArticle}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Написать лоцию
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => (
              <div
                key={art.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-[#1A1F1A] line-clamp-1">{art.title}</h3>
                  <p className="text-xs text-[#6B665F] line-clamp-2 mt-1">{art.summary}</p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">{art.author}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingArticle(JSON.parse(JSON.stringify(art)));
                        setIsNewArticle(false);
                      }}
                      className="p-1.5 bg-[#F9F7F4] text-[#2D332D] rounded-lg border border-[#E5E0D8]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(art.id, art.title)}
                      className="p-1.5 bg-[#FDE8E8] text-[#E54B4B] rounded-lg border border-[#F8B4B4]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TRIPS & EXPEDITIONS ADMIN */}
      {activeCabinetTab === 'trips' && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2D5A27]" />
                Все походы и экспедиции ({trips.length})
              </h2>
              <p className="text-xs text-[#6B665F] mt-1">
                Список всех походов, созданных пользователями и капитанами сообщества.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                      {t.region} • р. {t.riverName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'recruiting' ? 'bg-[#E8F1E7] text-[#2D5A27]' :
                      t.status === 'full' ? 'bg-[#FEF3C7] text-[#B45309]' :
                      'bg-[#FDE8E8] text-[#E54B4B]'
                    }`}>
                      {t.status === 'recruiting' ? 'Идет набор' : t.status === 'full' ? 'Набор закрыт' : 'Завершен'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#1A1F1A] line-clamp-1">{t.title}</h3>
                  <p className="text-xs text-[#6B665F] line-clamp-2 mt-1">{t.description}</p>
                  
                  <div className="mt-2.5 pt-2 border-t border-[#F2EFE9] flex items-center justify-between text-[11px] text-[#6B665F]">
                    <span>Капитан: <strong>{t.organizer.name}</strong></span>
                    <span>Занято: <strong>{t.bookedSeats}/{t.totalSeats}</strong></span>
                  </div>
                  <div className="text-[10px] text-[#8B7E6D] mt-0.5">
                    📅 {t.startDate} — {t.endDate} ({t.durationDays} дн.)
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D] font-mono text-[11px]">
                    Заявок: {t.applications?.length || 0}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManagingTripApps(t)}
                      className="px-2.5 py-1 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] font-bold rounded-lg text-xs transition-all"
                      title="Заявки участников"
                    >
                      Заявки ({t.applications?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTrip(JSON.parse(JSON.stringify(t)));
                      }}
                      className="p-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] rounded-lg border border-[#E5E0D8]"
                      title="Редактировать поход"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(t.id, t.title)}
                      className="p-1.5 bg-[#FDE8E8] text-[#E54B4B] rounded-lg border border-[#F8B4B4]"
                      title="Удалить поход"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. BACKUP & JSON RESTORE */}
      {activeCabinetTab === 'backup' && isAdmin && (
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1A1F1A]">Резервное копирование и экспорт базы</h2>
            <p className="text-xs text-[#6B665F] mt-1">
              Скачивайте резервную копию со всеми маршрутами, гидропостами и пользователями, или восстанавливайте базу.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] space-y-3 flex flex-col justify-between">
              <div>
                <Download className="w-6 h-6 text-[#2D5A27] mb-2" />
                <h3 className="text-sm font-bold text-[#1A1F1A]">Экспорт в JSON</h3>
                <p className="text-xs text-[#6B665F] mt-1">
                  Скачать текущую базу данных ({routes.length} рек, {hydroStations.length} постов).
                </p>
              </div>
              <button
                onClick={handleExportFullDatabase}
                className="w-full py-2.5 bg-[#2D5A27] text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Скачать JSON бэкап
              </button>
            </div>

            <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] space-y-3 flex flex-col justify-between">
              <div>
                <Upload className="w-6 h-6 text-[#2B4C7E] mb-2" />
                <h3 className="text-sm font-bold text-[#1A1F1A]">Импорт из JSON</h3>
                <p className="text-xs text-[#6B665F] mt-1">Загрузить сохраненный файл базы данных.</p>
              </div>
              <label className="w-full py-2.5 bg-[#2B4C7E] text-white font-bold text-xs rounded-xl shadow-sm text-center cursor-pointer block">
                Выбрать файл
                <input type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
              </label>
            </div>

            <div className="bg-[#FDF2F2] p-5 rounded-2xl border border-[#F8B4B4] space-y-3 flex flex-col justify-between">
              <div>
                <RefreshCw className="w-6 h-6 text-[#E54B4B] mb-2" />
                <h3 className="text-sm font-bold text-[#E54B4B]">Сброс к исходным данным</h3>
                <p className="text-xs text-[#7F1D1D] mt-1">Восстановить заводскую базу рек Югры и Ямала.</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Сбросить все данные к исходным?')) {
                    onResetToDefaults();
                    showNotification('База сброшена к исходным данным.');
                  }
                }}
                className="w-full py-2.5 bg-[#E54B4B] text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EDIT / CREATE ROUTE MODAL */}
      {/* ---------------------------------------------------- */}
      {editingRoute && (
        <div className="fixed inset-0 z-[2900] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <h3 className="text-base font-bold text-[#1A1F1A]">
                {isNewRoute ? 'Добавление нового водного маршрута' : `Редактирование: ${editingRoute.name}`}
              </h3>
              <button onClick={() => setEditingRoute(null)} className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Название маршрута</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.name}
                    onChange={(e) => setEditingRoute({ ...editingRoute, name: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Река</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.riverName}
                    onChange={(e) => setEditingRoute({ ...editingRoute, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Регион</label>
                  <select
                    value={editingRoute.region}
                    onChange={(e) => setEditingRoute({ ...editingRoute, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  >
                    <option value="ХМАО">ХМАО-Югра</option>
                    <option value="ЯНАО">ЯНАО (Ямал)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Категория ФСТР</label>
                  <input
                    type="text"
                    value={editingRoute.fstrCategory}
                    onChange={(e) => setEditingRoute({ ...editingRoute, fstrCategory: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Длина (км)</label>
                  <input
                    type="number"
                    value={editingRoute.lengthKm}
                    onChange={(e) => setEditingRoute({ ...editingRoute, lengthKm: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">URL обложки фотографии</label>
                <input
                  type="text"
                  value={editingRoute.coverImage}
                  onChange={(e) => setEditingRoute({ ...editingRoute, coverImage: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Краткое описание</label>
                <textarea
                  rows={2}
                  value={editingRoute.shortDesc}
                  onChange={(e) => setEditingRoute({ ...editingRoute, shortDesc: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Лоция и стоянки</label>
                <textarea
                  rows={4}
                  value={editingRoute.description}
                  onChange={(e) => setEditingRoute({ ...editingRoute, description: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EDIT / CREATE HYDRO MODAL */}
      {/* ---------------------------------------------------- */}
      {editingHydro && (
        <div className="fixed inset-0 z-[2900] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <h3 className="text-base font-bold text-[#1A1F1A]">
                {isNewHydro ? 'Новый гидропост' : `Редактирование: ${editingHydro.name}`}
              </h3>
              <button onClick={() => setEditingHydro(null)} className="text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHydro} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Название поста</label>
                <input
                  type="text"
                  required
                  value={editingHydro.name}
                  onChange={(e) => setEditingHydro({ ...editingHydro, name: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Река</label>
                  <input
                    type="text"
                    required
                    value={editingHydro.river}
                    onChange={(e) => setEditingHydro({ ...editingHydro, river: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Регион</label>
                  <select
                    value={editingHydro.region}
                    onChange={(e) => setEditingHydro({ ...editingHydro, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  >
                    <option value="ХМАО">ХМАО</option>
                    <option value="ЯНАО">ЯНАО</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Уровень (см)</label>
                  <input
                    type="number"
                    value={editingHydro.currentLevelCm}
                    onChange={(e) => setEditingHydro({ ...editingHydro, currentLevelCm: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Изм. 24ч (см)</label>
                  <input
                    type="number"
                    value={editingHydro.change24hCm}
                    onChange={(e) => setEditingHydro({ ...editingHydro, change24hCm: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Темп. воды °C</label>
                  <input
                    type="number"
                    value={editingHydro.waterTempC}
                    onChange={(e) => setEditingHydro({ ...editingHydro, waterTempC: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHydro(null)}
                  className="px-4 py-2 bg-[#F9F7F4] text-[#2D332D] rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button type="submit" className="px-5 py-2 bg-[#2D5A27] text-white font-bold rounded-xl">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EDIT / CREATE ARTICLE & EXPEDITION REPORT MODAL */}
      {/* ---------------------------------------------------- */}
      {editingArticle && (
        <div className="fixed inset-0 z-[2900] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl my-auto text-[#2D332D]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#1A1F1A]">
                    {isNewArticle ? 'Новая статья / Отчет об экспедиции' : `Редактирование: ${editingArticle.title}`}
                  </h3>
                  <p className="text-xs text-[#6B665F]">
                    Полное управление текстом, параметрами маршрута и загрузка фотоотчета с устройства
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingArticle(null)} 
                className="p-1.5 rounded-xl text-[#8B7E6D] hover:text-[#1A1F1A] hover:bg-[#F9F7F4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden File Inputs for Device Photo Upload */}
            <input
              type="file"
              ref={articleCoverInputRef}
              onChange={handleArticleCoverFileChange}
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
            />
            <input
              type="file"
              ref={articleGalleryInputRef}
              onChange={handleArticleGalleryFilesChange}
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
            />

            <form onSubmit={handleSaveArticle} className="space-y-6 text-xs">
              
              {/* SECTION 1: COVER PHOTO */}
              <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E5E0D8] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1A1F1A] flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#2D5A27]" />
                    Главная обложка статьи
                  </label>
                  {isProcessingArticlePhoto && (
                    <span className="text-[11px] font-bold text-[#2D5A27] animate-pulse">
                      Обработка фото...
                    </span>
                  )}
                </div>

                {editingArticle.coverImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D8] h-48 sm:h-56 bg-black/5 group">
                    <img
                      src={editingArticle.coverImage}
                      alt="Обложка"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-3">
                      <span className="text-[11px] font-medium text-white/90 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        Текущая обложка
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => articleCoverInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white hover:bg-[#F9F7F4] text-[#1A1F1A] font-bold rounded-xl shadow-md text-xs flex items-center gap-1 transition-all"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#2D5A27]" />
                          Заменить
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingArticle({ ...editingArticle, coverImage: '' })}
                          className="p-1.5 bg-[#FDE8E8] text-[#E54B4B] hover:bg-white rounded-xl shadow-md transition-all"
                          title="Удалить фото"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => articleCoverInputRef.current?.click()}
                    className="border-2 border-dashed border-[#D9D1C5] hover:border-[#2D5A27] rounded-2xl p-6 text-center cursor-pointer bg-white transition-all group"
                  >
                    <UploadCloud className="w-8 h-8 text-[#8B7E6D] group-hover:text-[#2D5A27] mx-auto mb-2 transition-colors" />
                    <p className="text-xs font-bold text-[#1A1F1A]">
                      Нажмите, чтобы загрузить обложку с компьютера или смартфона
                    </p>
                    <p className="text-[11px] text-[#8B7E6D] mt-0.5">
                      Поддерживаются JPG, PNG, WebP (автоматическая оптимизация)
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#8B7E6D] shrink-0">Или прямая ссылка:</span>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={editingArticle.coverImage}
                    onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2D332D]"
                  />
                </div>
              </div>

              {/* SECTION 2: BASIC INFO */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D]">
                  1. Основные сведения
                </h4>

                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">
                    Заголовок статьи / название отчета <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingArticle.title}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    placeholder="Например: От ст. Полярный Урал до Харпа: лоция и личный опыт сплава"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">
                    Подзаголовок / тезис
                  </label>
                  <input
                    type="text"
                    value={editingArticle.subtitle}
                    onChange={(e) => setEditingArticle({ ...editingArticle, subtitle: e.target.value })}
                    placeholder="Например: Река Собь идеальна как первый горный сплав Арктики"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Река / маршрут</label>
                    <input
                      type="text"
                      required
                      value={editingArticle.riverName}
                      onChange={(e) => setEditingArticle({ ...editingArticle, riverName: e.target.value })}
                      placeholder="Собь / Северная Сосьва"
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Регион</label>
                    <select
                      value={editingArticle.region}
                      onChange={(e) => setEditingArticle({ ...editingArticle, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                    >
                      <option value="ХМАО">ХМАО — Югра</option>
                      <option value="ЯНАО">ЯНАО — Ямал</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Автор</label>
                    <input
                      type="text"
                      required
                      value={editingArticle.author}
                      onChange={(e) => setEditingArticle({ ...editingArticle, author: e.target.value })}
                      placeholder="Имя Фамилия"
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Звание / регалии</label>
                    <input
                      type="text"
                      value={editingArticle.authorRank}
                      onChange={(e) => setEditingArticle({ ...editingArticle, authorRank: e.target.value })}
                      placeholder="Инструктор / Турист"
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Дата публикации</label>
                    <input
                      type="text"
                      value={editingArticle.date}
                      onChange={(e) => setEditingArticle({ ...editingArticle, date: e.target.value })}
                      placeholder="19 августа 2026"
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Чтение (мин.)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={editingArticle.readTimeMin}
                      onChange={(e) => setEditingArticle({ ...editingArticle, readTimeMin: Number(e.target.value) || 5 })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ROUTE STATS */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D8] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D]">
                  2. Характеристики похода из отчета
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Дистанция (км)</label>
                    <input
                      type="number"
                      value={editingArticle.stats?.distanceKm || 90}
                      onChange={(e) => setEditingArticle({
                        ...editingArticle,
                        stats: {
                          ...(editingArticle.stats || { days: 4, vessel: 'Байдарка', bestMonth: 'Июль' }),
                          distanceKm: Number(e.target.value) || 0
                        }
                      })}
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Дней сплава</label>
                    <input
                      type="number"
                      value={editingArticle.stats?.days || 4}
                      onChange={(e) => setEditingArticle({
                        ...editingArticle,
                        stats: {
                          ...(editingArticle.stats || { distanceKm: 90, vessel: 'Байдарка', bestMonth: 'Июль' }),
                          days: Number(e.target.value) || 1
                        }
                      })}
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Суда</label>
                    <input
                      type="text"
                      value={editingArticle.stats?.vessel || 'Байдарки, SUP'}
                      onChange={(e) => setEditingArticle({
                        ...editingArticle,
                        stats: {
                          ...(editingArticle.stats || { distanceKm: 90, days: 4, bestMonth: 'Июль' }),
                          vessel: e.target.value
                        }
                      })}
                      placeholder="Байдарки / SUP / Катамаран"
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2D332D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-medium mb-1">Лучший сезон</label>
                    <input
                      type="text"
                      value={editingArticle.stats?.bestMonth || 'Июль — Август'}
                      onChange={(e) => setEditingArticle({
                        ...editingArticle,
                        stats: {
                          ...(editingArticle.stats || { distanceKm: 90, days: 4, vessel: 'Байдарка' }),
                          bestMonth: e.target.value
                        }
                      })}
                      placeholder="Июль — Август"
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2D332D]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: TAGS */}
              <div className="space-y-2">
                <label className="block text-[#4A443E] font-medium">
                  Теги статьи (через запятую или кликом)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Собь', 'Полярный Урал', 'Байдарка', 'SUP', 'Катамаран', 'Северная Сосьва', 'ХМАО', 'ЯНАО', 'Отчет', 'Лоция', 'Снаряжение', 'Тайга'].map((tag) => {
                    const active = (editingArticle.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = editingArticle.tags || [];
                          if (active) {
                            setEditingArticle({ ...editingArticle, tags: currentTags.filter(t => t !== tag) });
                          } else {
                            setEditingArticle({ ...editingArticle, tags: [...currentTags, tag] });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          active
                            ? 'bg-[#2D5A27] text-white shadow-2xs'
                            : 'bg-[#F9F7F4] text-[#6B665F] border border-[#E5E0D8] hover:border-[#2D5A27]'
                        }`}
                      >
                        #{tag} {active ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={(editingArticle.tags || []).join(', ')}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    tags: e.target.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean)
                  })}
                  placeholder="Собь, Полярный Урал, Байдарка, SUP"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                />
              </div>

              {/* SECTION 5: SUMMARY */}
              <div className="space-y-1">
                <label className="block text-[#4A443E] font-medium">
                  Краткое описание (анонс в списке статей)
                </label>
                <textarea
                  rows={2}
                  value={editingArticle.summary}
                  onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                  placeholder="Короткий анонс для превью-карточки..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2D332D]"
                />
              </div>

              {/* SECTION 6: FULL CONTENT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[#4A443E] font-medium">
                    Полный текст статьи и лоции (каждый абзац через пустую строку)
                  </label>
                  <span className="text-[11px] text-[#8B7E6D]">
                    Абзацев: {(editingArticle.fullContent || []).length}
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={(editingArticle.fullContent || []).join('\n\n')}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    fullContent: e.target.value.split('\n\n').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Логистика и старт: ...&#10;&#10;Особенности прохождения порогов: ...&#10;&#10;Стоянки и рыбалка: ..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#2D332D] leading-relaxed font-sans"
                />
              </div>

              {/* SECTION 7: PHOTO GALLERY & REPORTS */}
              <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E5E0D8] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#1A1F1A] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#2D5A27]" />
                      Фотоотчет экспедиции ({editingArticle.gallery?.length || 0} фото)
                    </label>
                    <p className="text-[11px] text-[#8B7E6D]">
                      Загружайте яркие фотографии реки, порогов, стоянок и природы с устройства
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => articleGalleryInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Загрузить с устройства
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt('Введите URL адрес фотографии:');
                        if (url) {
                          setEditingArticle({
                            ...editingArticle,
                            gallery: [...(editingArticle.gallery || []), { url, caption: 'Фото экспедиции' }]
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-[#E5E0D8] hover:bg-[#F9F7F4] text-[#1A1F1A] font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      По ссылке
                    </button>
                  </div>
                </div>

                {/* Gallery Items Grid */}
                {editingArticle.gallery && editingArticle.gallery.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {editingArticle.gallery.map((item, index) => (
                      <div 
                        key={index}
                        className="bg-white border border-[#E5E0D8] rounded-xl overflow-hidden p-2 space-y-2 shadow-2xs group relative"
                      >
                        <div className="relative h-28 rounded-lg overflow-hidden bg-black/5">
                          <img
                            src={item.url}
                            alt={item.caption || 'Фото'}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedGallery = [...(editingArticle.gallery || [])];
                              updatedGallery.splice(index, 1);
                              setEditingArticle({ ...editingArticle, gallery: updatedGallery });
                            }}
                            className="absolute top-1.5 right-1.5 p-1 bg-[#FDE8E8] text-[#E54B4B] rounded-lg shadow-sm hover:bg-white transition-all"
                            title="Удалить фото"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => {
                            const updatedGallery = [...(editingArticle.gallery || [])];
                            updatedGallery[index] = { ...updatedGallery[index], caption: e.target.value };
                            setEditingArticle({ ...editingArticle, gallery: updatedGallery });
                          }}
                          placeholder="Подпись к фото..."
                          className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-lg px-2 py-1 text-[11px] text-[#2D332D]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => articleGalleryInputRef.current?.click()}
                    className="border border-dashed border-[#D9D1C5] hover:border-[#2D5A27] rounded-xl p-5 text-center cursor-pointer bg-white transition-all"
                  >
                    <ImageIcon className="w-6 h-6 text-[#8B7E6D] mx-auto mb-1" />
                    <p className="text-[11px] font-bold text-[#1A1F1A]">
                      В фотоотчете пока нет фотографий
                    </p>
                    <p className="text-[10px] text-[#8B7E6D]">
                      Нажмите здесь, чтобы выбрать несколько фото с устройства
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E5E0D8] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8] transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isNewArticle ? 'Опубликовать статью' : 'Сохранить изменения'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EDIT COMPANION TRIP MODAL */}
      {/* ---------------------------------------------------- */}
      {editingTrip && (
        <div className="fixed inset-0 z-[2950] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1F1A]">Редактирование похода</h3>
                  <p className="text-[11px] text-[#6B665F]">Измените параметры похода, даты, количество мест и описание</p>
                </div>
              </div>
              <button onClick={() => setEditingTrip(null)} className="p-1 rounded-full hover:bg-[#F9F7F4] text-[#8B7E6D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Название экспедиции *</label>
                <input
                  type="text"
                  required
                  value={editingTrip.title}
                  onChange={(e) => setEditingTrip({ ...editingTrip, title: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Река *</label>
                  <input
                    type="text"
                    required
                    value={editingTrip.riverName}
                    onChange={(e) => setEditingTrip({ ...editingTrip, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Регион</label>
                  <select
                    value={editingTrip.region}
                    onChange={(e) => setEditingTrip({ ...editingTrip, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="ХМАО">ХМАО-Югра</option>
                    <option value="ЯНАО">ЯНАО (Ямал)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Категория сложности</label>
                  <input
                    type="text"
                    value={editingTrip.fstrCategory}
                    onChange={(e) => setEditingTrip({ ...editingTrip, fstrCategory: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Статус набора</label>
                  <select
                    value={editingTrip.status}
                    onChange={(e) => setEditingTrip({ ...editingTrip, status: e.target.value as any })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="recruiting">Набор открыт</option>
                    <option value="confirmed">Группа укомплектована</option>
                    <option value="completed">Поход завершен</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Дата старта</label>
                  <input
                    type="date"
                    value={editingTrip.startDate}
                    onChange={(e) => setEditingTrip({ ...editingTrip, startDate: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Дата финиша</label>
                  <input
                    type="date"
                    value={editingTrip.endDate}
                    onChange={(e) => setEditingTrip({ ...editingTrip, endDate: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Всего мест в группе</label>
                  <input
                    type="number"
                    min={editingTrip.bookedSeats || 1}
                    max={30}
                    value={editingTrip.totalSeats}
                    onChange={(e) => setEditingTrip({ ...editingTrip, totalSeats: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Оргвзнос (₽)</label>
                  <input
                    type="number"
                    value={editingTrip.estimatedCostPerPersonRub}
                    onChange={(e) => setEditingTrip({ ...editingTrip, estimatedCostPerPersonRub: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">
                    📦 Предоставляется организатором
                    <span className="text-[10px] text-[#8B7E6D] font-normal block">Каждый пункт с новой строки</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Костровое снаряжение&#10;Групповая аптечка&#10;Тент лагерный"
                    value={(editingTrip.gearProvided || []).join('\n')}
                    onChange={(e) => setEditingTrip({ 
                      ...editingTrip, 
                      gearProvided: e.target.value.split('\n').filter(s => s.trim().length > 0) 
                    })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">
                    🎒 Личное снаряжение участника
                    <span className="text-[10px] text-[#8B7E6D] font-normal block">Каждый пункт с новой строки</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Спасжилет с сертификатом&#10;Палатка&#10;Спальник по сезону"
                    value={(editingTrip.requiredPersonalGear || []).join('\n')}
                    onChange={(e) => setEditingTrip({ 
                      ...editingTrip, 
                      requiredPersonalGear: e.target.value.split('\n').filter(s => s.trim().length > 0) 
                    })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Требуемый опыт</label>
                  <input
                    type="text"
                    value={editingTrip.requiredExperience || ''}
                    onChange={(e) => setEditingTrip({ ...editingTrip, requiredExperience: e.target.value })}
                    placeholder="Например: Средний (2-4 сплава)"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Ссылка на чат (Telegram)</label>
                  <input
                    type="text"
                    placeholder="https://t.me/..."
                    value={editingTrip.groupChatLink || ''}
                    onChange={(e) => setEditingTrip({ ...editingTrip, groupChatLink: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Описание похода и план</label>
                <textarea
                  rows={3}
                  value={editingTrip.description}
                  onChange={(e) => setEditingTrip({ ...editingTrip, description: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8] hover:bg-[#EAE7E2]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MANAGE TRIP APPLICATIONS MODAL (IN CABINET) */}
      {/* ---------------------------------------------------- */}
      {managingTripApps && (
        <div className="fixed inset-0 z-[2960] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-start justify-between pb-3 border-b border-[#E5E0D8]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#2D5A27] px-2 py-0.5 rounded-full bg-[#E8F1E7]">
                  Управление экипажем
                </span>
                <h3 className="text-base font-black text-[#1A1F1A] mt-1">{managingTripApps.title}</h3>
                <p className="text-xs text-[#6B665F]">
                  Всего мест: {managingTripApps.totalSeats} (занято {managingTripApps.bookedSeats})
                </p>
              </div>
              <button
                onClick={() => setManagingTripApps(null)}
                className="p-1.5 rounded-full hover:bg-[#F9F7F4] text-[#8B7E6D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!managingTripApps.applications || managingTripApps.applications.length === 0) ? (
              <div className="text-center py-8 text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6]">
                Заявок в этот поход пока нет.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {managingTripApps.applications.map((app) => (
                  <div key={app.id} className="bg-[#F9F7F4] border border-[#EEEBE6] rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={app.applicantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                          alt={app.applicantName}
                          className="w-10 h-10 rounded-xl object-cover border border-[#CDE0CC]"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-[#1A1F1A]">{app.applicantName}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            app.status === 'accepted' ? 'bg-[#E8F1E7] text-[#2D5A27]' :
                            app.status === 'declined' ? 'bg-[#FDE8E8] text-[#E54B4B]' :
                            'bg-[#FEF3C7] text-[#B45309]'
                          }`}>
                            {app.status === 'accepted' ? 'Принят в экипаж' : app.status === 'declined' ? 'Отклонен' : 'На рассмотрении'}
                          </span>
                        </div>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCabinetAcceptApp(managingTripApps, app)}
                            className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Принять</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCabinetDeclineApp(managingTripApps, app.id)}
                            className="px-2.5 py-1.5 bg-white hover:bg-[#FDE8E8] text-[#E54B4B] text-xs font-bold rounded-xl border border-[#F8B4B4]"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-[#E5E0D8] text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[#6B665F]">
                        <span>📞 {app.applicantPhone}</span>
                        <span>Плавсредство: <strong>{app.vesselType || 'байдарка'}</strong></span>
                      </div>
                      <p className="text-[#4A443E]">Опыт: {app.experienceLevel}</p>
                      {app.notes && <p className="text-[#8B7E6D] italic">«{app.notes}»</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[#E5E0D8] flex justify-end">
              <button
                type="button"
                onClick={() => setManagingTripApps(null)}
                className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#E5E0D8] space-y-5 my-8">
            
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1F1A]">Редактирование профиля</h3>
                  <p className="text-[11px] text-[#6B665F]">Обновите ваши персональные данные и квалификацию</p>
                </div>
              </div>

              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 rounded-full hover:bg-[#F9F7F4] text-[#6B665F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              
              {/* Avatar Selector with Device Upload */}
              <div className="space-y-3 bg-[#F9F7F4] p-3.5 sm:p-4 rounded-2xl border border-[#EEEBE6]">
                <div className="flex items-center justify-between">
                  <label className="text-[#4A443E] font-bold text-xs">Фотография профиля</label>
                  <span className="text-[10px] text-[#8B7E6D]">JPG, PNG, WEBP с устройства</span>
                </div>

                {/* Hidden Native File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Interactive Avatar Preview */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group cursor-pointer shrink-0"
                    title="Нажмите, чтобы загрузить фото с устройства"
                  >
                    <img
                      src={profileForm.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                      alt="Предпросмотр"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#2D5A27] shadow-md group-hover:opacity-80 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-bold">Сменить</span>
                    </div>
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Actions & Presets */}
                  <div className="flex-1 space-y-2.5 w-full">
                    {/* Big Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Загрузить фото с устройства</span>
                    </button>

                    {/* Presets row */}
                    <div>
                      <span className="text-[10px] text-[#8B7E6D] font-bold block mb-1">Или выберите готовую аватарку:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setProfileForm({ ...profileForm, avatar: preset.url })}
                            className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all ${
                              profileForm.avatar === preset.url ? 'border-[#2D5A27] scale-110 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <input
                    type="url"
                    placeholder="Либо вставьте URL картинки из интернета"
                    value={profileForm.avatar.startsWith('data:') ? '' : profileForm.avatar}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-[11px] text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Имя / Никнейм *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Иван Иванов"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Номер телефона</label>
                  <input
                    type="tel"
                    placeholder="+7 (922) 123-45-67"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Email & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Город / Населенный пункт</label>
                  <input
                    type="text"
                    placeholder="Сургут, Салехард, Ханты-Мансийск..."
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Опыт в водном туризме</label>
                <select
                  value={profileForm.experienceLevel}
                  onChange={(e) => setProfileForm({ ...profileForm, experienceLevel: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                >
                  <option value="Начинающий (первый сезон)">Начинающий (первый сезон)</option>
                  <option value="Любитель (1-2 к.с., спокойные реки)">Любитель (1-2 к.с., спокойные реки)</option>
                  <option value="Опытный турист (3-4 к.с., горные реки Урала)">Опытный турист (3-4 к.с., горные реки Урала)</option>
                  <option value="Инструктор-проводник / Эксперт">Инструктор-проводник / Эксперт</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8] transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Сохранить профиль
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
