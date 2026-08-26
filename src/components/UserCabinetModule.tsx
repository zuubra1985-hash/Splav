import React, { useState, useRef } from 'react';
import { AppUser, UserRole, RiverRoute, ArticleReport, CompanionTrip, TripApplication, FaqDataConfig, TravelNotesConfig, VesselType } from '../types';
import { parseGpxFile, generateGpxString } from '../utils/gpxParser';
import { compressImageFile, compressAvatarFile, compressDataUrl } from '../utils/imageCompressor';
import { recordTripDeletion, recordArticleDeletion, recordRouteDeletion } from '../utils/deletionRegistry';
import { ArticlesSyncService, TripsSyncService, RoutesSyncService, UsersSyncService, FaqSyncService, TravelNotesSyncService } from '../firebase';
import { CloudSqlDbService } from '../services/cloudSqlDb';
import { INITIAL_FAQ_DATA } from '../data/faqData';
import { INITIAL_TRAVEL_NOTES_CONFIG } from '../data/logbookData';
import { FaqAdminSection } from './FaqAdminSection';
import { TravelNotesAdminSection } from './TravelNotesAdminSection';
import { SyncHistorySection } from './SyncHistorySection';
import { TelegramMiniAppSection } from './TelegramMiniAppSection';
import { UserProfileModal } from './UserProfileModal';
import { 
  ShieldCheck, 
  User, 
  Crown, 
  Users, 
  Compass, 
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
  AlertTriangle,
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
  Navigation2,
  HelpCircle,
  Star,
  Anchor,
  Sparkles,
  Send,
  Eye,
  Check,
  Share2,
  Globe,
  Lock,
  Unlock,
  Clock,
  Phone
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
  articles: ArticleReport[];
  setArticles: React.Dispatch<React.SetStateAction<ArticleReport[]>>;
  trips: CompanionTrip[];
  setTrips: React.Dispatch<React.SetStateAction<CompanionTrip[]>>;
  faqData?: FaqDataConfig;
  setFaqData?: React.Dispatch<React.SetStateAction<FaqDataConfig>>;
  notesConfig?: TravelNotesConfig;
  setNotesConfig?: React.Dispatch<React.SetStateAction<TravelNotesConfig>>;
  onResetToDefaults: () => void;
  onClearAllUserCards?: () => void;
  onSelectRoute: (route: RiverRoute) => void;
  onOpenRouteDetails: (route: RiverRoute) => void;
  onOpenPassportEditor?: (route?: RiverRoute) => void;
  initialCabinetTab?: 'profile' | 'routes' | 'articles' | 'trips' | 'faq' | 'travel_notes' | 'users' | 'backup';
  initialEditingArticle?: ArticleReport | null;
  onClearInitialArticle?: () => void;
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
  articles,
  setArticles,
  trips,
  setTrips,
  faqData = INITIAL_FAQ_DATA,
  setFaqData,
  notesConfig = INITIAL_TRAVEL_NOTES_CONFIG,
  setNotesConfig,
  onResetToDefaults,
  onClearAllUserCards,
  onSelectRoute,
  onOpenRouteDetails,
  onOpenPassportEditor,
  initialCabinetTab,
  initialEditingArticle,
  onClearInitialArticle
}) => {
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isMasterAdmin = isSuperAdmin;
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin';

  const [activeCabinetTab, setActiveCabinetTabState] = useState<'profile' | 'applications' | 'sync_history' | 'routes' | 'articles' | 'trips' | 'faq' | 'travel_notes' | 'users' | 'backup' | 'telegram'>(() => {
    if (initialCabinetTab && (isAdmin || initialCabinetTab !== 'sync_history')) return initialCabinetTab;
    try {
      const saved = localStorage.getItem('splav86_cabinet_active_tab');
      if (saved) {
        if (saved === 'sync_history' && !isAdmin) return 'profile';
        return saved as any;
      }
    } catch (e) {}
    return 'profile';
  });

  const setActiveCabinetTab = (tab: 'profile' | 'applications' | 'sync_history' | 'routes' | 'articles' | 'trips' | 'faq' | 'travel_notes' | 'users' | 'backup' | 'telegram') => {
    setActiveCabinetTabState(tab);
    try {
      localStorage.setItem('splav86_cabinet_active_tab', tab);
    } catch (e) {}
  };

  // Local fallback state for Notes if parent setNotesConfig isn't provided
  const [internalNotesConfig, setInternalNotesConfig] = useState<TravelNotesConfig>(notesConfig || INITIAL_TRAVEL_NOTES_CONFIG);
  const currentNotesConfig = notesConfig || internalNotesConfig;
  const handleSetNotesConfig: React.Dispatch<React.SetStateAction<TravelNotesConfig>> = (value) => {
    if (setNotesConfig) {
      setNotesConfig(value);
    } else {
      setInternalNotesConfig(value);
    }
  };

  // Local fallback state for FAQ if parent setFaqData isn't provided
  const [internalFaqData, setInternalFaqData] = useState<FaqDataConfig>(faqData || INITIAL_FAQ_DATA);
  const currentFaqData = faqData || internalFaqData;

  const handleSetFaqData: React.Dispatch<React.SetStateAction<FaqDataConfig>> = (action) => {
    if (setFaqData) {
      setFaqData(action);
    } else {
      setInternalFaqData(action);
    }
  };

  // Ensure regular users only access profile, applications, and sync_history tabs
  React.useEffect(() => {
    if (!isAdmin && activeCabinetTab !== 'profile' && activeCabinetTab !== 'applications' && activeCabinetTab !== 'sync_history') {
      setActiveCabinetTab('profile');
    }
  }, [isAdmin, activeCabinetTab]);

  React.useEffect(() => {
    if (initialCabinetTab) {
      if (isAdmin || initialCabinetTab === 'profile' || initialCabinetTab === 'applications' || initialCabinetTab === 'sync_history') {
        setActiveCabinetTab(initialCabinetTab);
      }
    }
  }, [initialCabinetTab, isAdmin]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Deduplicated unique users map (guarantees no double accounts)
  const uniqueUsers = React.useMemo(() => {
    const map = new Map<string, AppUser>();
    registeredUsers.forEach((u) => {
      const emailKey = (u.email || '').trim().toLowerCase();
      if (emailKey) {
        if (!map.has(emailKey)) {
          map.set(emailKey, u);
        } else {
          // If collision, prefer user with canonical id or more filled fields
          const existing = map.get(emailKey)!;
          if (u.id === 'user-superadmin-novichek' || u.id === 'user-superadmin-zuubra') {
            map.set(emailKey, { ...existing, ...u });
          }
        }
      } else if (!map.has(u.id)) {
        map.set(u.id, u);
      }
    });
    return Array.from(map.values());
  }, [registeredUsers]);

  // Profile Dossier & Modal Viewing State
  const [viewingUserModal, setViewingUserModal] = useState<AppUser | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileEditTab, setProfileEditTab] = useState<'main' | 'fleet' | 'gear' | 'rivers' | 'badges' | 'contacts'>('main');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cabinetGpxFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Удалить',
      cancelText: opts.cancelText || 'Отмена',
      confirmVariant: opts.confirmVariant || 'danger',
      onConfirm: opts.onConfirm
    });
  };

  // Custom text inputs for quick adding
  const [customGearInput, setCustomGearInput] = useState<string>('');
  const [customRiverInput, setCustomRiverInput] = useState<string>('');

  const [profileForm, setProfileForm] = useState<{
    name: string;
    callsign: string;
    phone: string;
    email: string;
    password?: string;
    city: string;
    experienceLevel: string;
    fstrRank: string;
    avatar: string;
    bio: string;
    vesselsOwned: VesselType[];
    gearInventory: string[];
    favoriteRivers: string[];
    badges: string[];
    telegram: string;
    vk: string;
    isReadyForExpeditions: boolean;
    showContactsPublicly: boolean;
  }>({
    name: currentUser?.name || '',
    callsign: currentUser?.callsign || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    password: currentUser?.password || '',
    city: currentUser?.city || 'Сургут',
    experienceLevel: currentUser?.experienceLevel || 'Любитель (1-2 к.с., спокойные реки)',
    fstrRank: currentUser?.fstrRank || '',
    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: currentUser?.bio || '',
    vesselsOwned: currentUser?.vesselsOwned || [],
    gearInventory: currentUser?.gearInventory || [],
    favoriteRivers: currentUser?.favoriteRivers || [],
    badges: currentUser?.badges || [],
    telegram: currentUser?.telegram || '',
    vk: currentUser?.vk || '',
    isReadyForExpeditions: currentUser?.isReadyForExpeditions !== false,
    showContactsPublicly: currentUser?.showContactsPublicly || false
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
      callsign: currentUser.callsign || '',
      phone: currentUser.phone,
      email: currentUser.email,
      password: currentUser.password || '',
      city: currentUser.city || 'Сургут',
      experienceLevel: currentUser.experienceLevel || 'Любитель водных походов',
      fstrRank: currentUser.fstrRank || '',
      avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      bio: currentUser.bio || '',
      vesselsOwned: currentUser.vesselsOwned || [],
      gearInventory: currentUser.gearInventory || [],
      favoriteRivers: currentUser.favoriteRivers || [],
      badges: currentUser.badges || [],
      telegram: currentUser.telegram || '',
      vk: currentUser.vk || '',
      isReadyForExpeditions: currentUser.isReadyForExpeditions !== false,
      showContactsPublicly: currentUser.showContactsPublicly || false
    });
    setProfileEditTab('main');
    setIsEditingProfile(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Пожалуйста, выберите файл изображения (JPG, PNG, WEBP)', 'error');
      return;
    }

    setIsProcessingImage(true);
    try {
      const dataUrl = await compressAvatarFile(file);
      setProfileForm((prev) => ({ ...prev, avatar: dataUrl }));
      showNotification('Фотография профиля успешно загружена!');
    } catch (err) {
      console.error(err);
      showNotification('Ошибка обработки фото', 'error');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileForm.name.trim()) {
      showNotification('Укажите ваше имя или никнейм', 'error');
      return;
    }

    if (profileForm.password && profileForm.password.trim().length > 0 && profileForm.password.trim().length < 12) {
      showNotification('Пароль должен содержать не менее 12 символов', 'error');
      return;
    }

    const updated: AppUser = {
      ...currentUser,
      name: profileForm.name.trim(),
      callsign: profileForm.callsign.trim(),
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim(),
      password: (profileForm.password || '').trim(),
      city: profileForm.city.trim(),
      experienceLevel: profileForm.experienceLevel,
      fstrRank: profileForm.fstrRank.trim(),
      avatar: profileForm.avatar.trim(),
      bio: profileForm.bio.trim(),
      vesselsOwned: profileForm.vesselsOwned,
      gearInventory: profileForm.gearInventory,
      favoriteRivers: profileForm.favoriteRivers,
      badges: profileForm.badges,
      telegram: profileForm.telegram.trim(),
      vk: profileForm.vk.trim(),
      isReadyForExpeditions: profileForm.isReadyForExpeditions,
      showContactsPublicly: profileForm.showContactsPublicly
    };

    onUpdateCurrentUser(updated);
    UsersSyncService.saveUser(updated).catch((err) => {
      console.warn('Failed to sync user profile to Firestore:', err);
    });

    setIsEditingProfile(false);
    showNotification('Визитная карточка туриста успешно сохранена!');
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  // Edit / Create States
  const [editingRoute, setEditingRoute] = useState<RiverRoute | null>(null);
  const [isNewRoute, setIsNewRoute] = useState<boolean>(false);

  const [editingArticle, setEditingArticle] = useState<ArticleReport | null>(initialEditingArticle || null);
  const [isNewArticle, setIsNewArticle] = useState<boolean>(false);
  const [isSavingArticle, setIsSavingArticle] = useState<boolean>(false);
  const articleCoverInputRef = useRef<HTMLInputElement>(null);
  const articleGalleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingArticlePhoto, setIsProcessingArticlePhoto] = useState<boolean>(false);

  const handleCloseArticleEditor = () => {
    setEditingArticle(null);
    if (onClearInitialArticle) {
      onClearInitialArticle();
    }
  };

  // Sync initialCabinetTab from external triggers (e.g. from CompanionsModule)
  React.useEffect(() => {
    if (initialCabinetTab) {
      setActiveCabinetTab(initialCabinetTab);
    }
  }, [initialCabinetTab]);

  // Sync initialEditingArticle from external trigger (e.g. from ArticlesModule "Редактировать")
  React.useEffect(() => {
    if (initialEditingArticle) {
      setEditingArticle(JSON.parse(JSON.stringify(initialEditingArticle)));
      setIsNewArticle(!articles.some(a => a.id === initialEditingArticle.id));
      if (onClearInitialArticle) {
        onClearInitialArticle();
      }
    }
  }, [initialEditingArticle, articles, onClearInitialArticle]);

  const handleArticleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingArticlePhoto(true);
    try {
      const dataUrl = await compressImageFile(file, 1200, 800, 0.74);
      setEditingArticle((prev) => (prev ? { ...prev, coverImage: dataUrl } : null));
      showNotification('Главная обложка статьи успешно загружена и оптимизирована!');
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
          const dataUrl = await compressImageFile(file, 1000, 750, 0.70);
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
    setTrips((prev) => {
      const updated = prev.map((t) => (t.id === editingTrip.id ? editingTrip : t));
      try {
        localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      CloudSqlDbService.saveTrips(updated).catch(console.warn);
      return updated;
    });
    TripsSyncService.saveTrip(editingTrip).catch((err) => {
      console.warn('Failed to sync trip to Firestore:', err);
    });
    CloudSqlDbService.saveTrip(editingTrip).catch(console.warn);
    showNotification(`Экспедиция "${editingTrip.title}" успешно обновлена!`);
    setEditingTrip(null);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleDeleteTrip = (tripId: string, title: string) => {
    askConfirmation({
      title: 'Удалить экспедицию?',
      message: `Вы уверены, что хотите удалить экспедицию "${title}"? Это действие необратимо.`,
      confirmText: 'Да, удалить поход',
      confirmVariant: 'danger',
      onConfirm: () => {
        recordTripDeletion(tripId);
        setTrips((prev) => {
          const updated = prev.filter((t) => t.id !== tripId);
          try {
            localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
          } catch (err) {
            console.error(err);
          }
          CloudSqlDbService.saveTrips(updated).catch(console.warn);
          return updated;
        });
        TripsSyncService.removeTrip(tripId).catch((err) => {
          console.warn('Failed to remove trip from Firestore:', err);
        });
        CloudSqlDbService.deleteTrip(tripId).catch(console.warn);
        showNotification(`Экспедиция "${title}" удалена.`, 'error');
      }
    });
  };

  const handleToggleRoutePublic = (routeId: string) => {
    const targetRoute = routes.find((r) => r.id === routeId);
    if (!targetRoute) return;

    const nextIsPublic = !targetRoute.isPublic;
    const updatedRoute: RiverRoute = {
      ...targetRoute,
      isPublic: nextIsPublic,
      lastPassportRevision: new Date().toISOString().split('T')[0]
    };

    setRoutes((prev) => {
      const next = prev.map((r) => (r.id === routeId ? updatedRoute : r));
      try {
        localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    RoutesSyncService.saveRoute(updatedRoute).catch(console.warn);
    CloudSqlDbService.saveRoute(updatedRoute).catch(console.warn);

    if (nextIsPublic) {
      showNotification(`Трек "${updatedRoute.name}" опубликован! Теперь он доступен всем сплавщикам в каталоге и на интерактивной карте.`);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else {
      showNotification(`Трек "${updatedRoute.name}" переведен в личный статус (скрыт из общего каталога).`);
    }
  };

  const handleDownloadGpx = (route: RiverRoute) => {
    try {
      const gpxString = generateGpxString(route);
      const blob = new Blob([gpxString], { type: 'application/gpx+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = route.gpxFileName || `${(route.name || 'track').replace(/\s+/g, '_')}_splav86.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification(`GPX файл "${route.name}" успешно скачан!`);
    } catch (e: any) {
      showNotification('Ошибка скачивания GPX файла', 'error');
    }
  };

  const handleDeleteMyRoute = (routeId: string) => {
    const target = routes.find((r) => r.id === routeId);
    if (!target) return;
    askConfirmation({
      title: 'Удалить личный GPX трек?',
      message: `Вы действительно хотите удалить ваш трек "${target.name}" (${target.lengthKm} км)? Это действие необратимо.`,
      confirmText: 'Да, удалить трек',
      confirmVariant: 'danger',
      onConfirm: () => {
        confirmDeleteRoute(target);
      }
    });
  };

  const confirmDeleteRoute = (target: RiverRoute) => {
    const routeId = target.id;
    const nextRoutes = routes.filter((r) => r.id !== routeId);

    setRoutes(nextRoutes);
    try {
      localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(nextRoutes));
    } catch (e) {
      console.error(e);
    }

    if (currentUser?.favoriteRouteIds?.includes(routeId)) {
      const updatedUser = {
        ...currentUser,
        favoriteRouteIds: currentUser.favoriteRouteIds.filter((id) => id !== routeId)
      };
      onUpdateCurrentUser(updatedUser);
      UsersSyncService.saveUser(updatedUser).catch(console.warn);
      CloudSqlDbService.saveUser(updatedUser).catch(console.warn);
    }

    RoutesSyncService.removeRoute(routeId).catch(console.warn);
    CloudSqlDbService.saveRoutes(nextRoutes).catch(console.warn);
    showNotification(`Личный трек "${target.name}" успешно удален.`);
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
          description: parsed.description || `Личный GPX трек водного похода по реке ${parsed.name}.`,
          shortDesc: `Личный трек (${parsed.totalDistanceKm} км, перепад ${parsed.elevationGainM} м).`,
          highlights: ['Личный GPS трек из навигатора', 'Фактически пройденная нитка маршрута'],
          warnings: ['Проверьте уровень воды и гидрологическую обстановку'],
          mchsRegistrationRequired: true,
          kmnsPermitNeeded: false,
          coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          elevationProfile: parsed.elevationPoints.map((ep) => ({
            distanceKm: ep.distKm,
            elevationM: ep.elev
          })),
          gpxFileName: `${parsed.name.toLowerCase().replace(/\s+/g, '_')}_splav86.gpx`,
          isPersonal: true,
          isPublic: false, // Приватный по умолчанию: виден и редактируется только автором!
          authorId: currentUser?.id || 'guest',
          authorName: currentUser?.name || 'Турист',
          authorEmail: currentUser?.email || '',
          lastPassportRevision: new Date().toISOString().split('T')[0],
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

        RoutesSyncService.saveRoute(newRoute).catch((err) => {
          console.warn('Failed to sync imported GPX route to Firestore:', err);
        });
        CloudSqlDbService.saveRoute(newRoute).catch((err) => {
          console.warn('Failed to sync imported GPX route to CloudSQL:', err);
        });

        // Add to user's favorites as well
        if (currentUser) {
          const favs = currentUser.favoriteRouteIds || [];
          if (!favs.includes(newRoute.id)) {
            const updatedUser = { ...currentUser, favoriteRouteIds: [...favs, newRoute.id] };
            onUpdateCurrentUser(updatedUser);
            UsersSyncService.saveUser(updatedUser).catch(console.warn);
            CloudSqlDbService.saveUser(updatedUser).catch(console.warn);
          }
        }

        showNotification(`Личный GPX трек "${parsed.name}" (${parsed.totalDistanceKm} км) загружен! Он сохранен как приватный (видите только вы). Нажмите «Поделиться», если захотите опубликовать его.`);
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
    askConfirmation({
      title: 'Отозвать заявку?',
      message: 'Вы уверены, что хотите отозвать вашу заявку на участие в этом походе?',
      confirmText: 'Отозвать заявку',
      confirmVariant: 'danger',
      onConfirm: () => {
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
    });
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

  // Favorite routes & User's Custom/Personal Routes
  const favoriteRoutes = routes.filter((r) => currentUser.favoriteRouteIds?.includes(r.id));
  const myCustomRoutes = routes.filter((r) => {
    if (!currentUser) return false;
    return Boolean(r.authorId && r.authorId === currentUser.id);
  });

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
    askConfirmation({
      title: 'Удалить маршрут?',
      message: `Вы уверены, что хотите удалить маршрут "${name}" с сайта?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: () => {
        recordRouteDeletion(id);
        setRoutes((prev) => {
          const updated = prev.filter((r) => r.id !== id);
          try {
            localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          CloudSqlDbService.deleteRoute(id).catch(console.warn);
          return updated;
        });
        RoutesSyncService.removeRoute(id).catch((err) => {
          console.warn('Failed to remove route from Firestore:', err);
        });
        showNotification(`Маршрут "${name}" удален.`, 'error');
      }
    });
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
    setIsSavingArticle(true);

    try {
      // Compress cover image if it is base64 data-url
      let compressedCover = editingArticle.coverImage;
      if (compressedCover && compressedCover.startsWith('data:image/')) {
        compressedCover = await compressDataUrl(compressedCover, 1000, 750, 0.70);
      }

      // Compress gallery images if any are base64
      let compressedGallery = editingArticle.gallery || [];
      if (compressedGallery.length > 0) {
        compressedGallery = await Promise.all(
          compressedGallery.map(async (img) => {
            if (img && img.startsWith('data:image/')) {
              return await compressDataUrl(img, 1000, 750, 0.70);
            }
            return img;
          })
        );
      }

      const articleToSave: ArticleReport = {
        ...editingArticle,
        title: editingArticle.title.trim(),
        summary: editingArticle.summary.trim(),
        riverName: editingArticle.riverName.trim(),
        author: editingArticle.author.trim() || (currentUser?.name || 'Администратор'),
        coverImage: compressedCover,
        gallery: compressedGallery
      };

      let updatedArticlesList: ArticleReport[] = [];
      if (isNewArticle) {
        updatedArticlesList = [articleToSave, ...articles.filter((a) => a.id !== articleToSave.id)];
      } else {
        updatedArticlesList = articles.map((a) => (a.id === articleToSave.id ? articleToSave : a));
      }

      // 1. Immediately update in-memory state
      setArticles(updatedArticlesList);

      // 2. Immediately cache in localStorage
      try {
        localStorage.setItem('splav86_custom_articles', JSON.stringify(updatedArticlesList));
      } catch (lsErr) {
        console.warn('localStorage quota save note:', lsErr);
      }

      // 3. Save to Firestore & CloudSQL concurrently
      await Promise.allSettled([
        ArticlesSyncService.saveArticle(articleToSave),
        CloudSqlDbService.saveArticle(articleToSave)
      ]);

      showNotification(`Статья "${articleToSave.title}" успешно сохранена и синхронизирована!`);
    } catch (err) {
      console.error('Save article error:', err);
      showNotification('Статья сохранена локально', 'success');
    } finally {
      setIsSavingArticle(false);
      handleCloseArticleEditor();
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    askConfirmation({
      title: 'Удалить статью?',
      message: `Вы уверены, что хотите удалить статью "${title}"?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: async () => {
        recordArticleDeletion(id);
        const updated = articles.filter((a) => a.id !== id);
        setArticles(updated);
        try {
          localStorage.setItem('splav86_custom_articles', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        showNotification(`Статья "${title}" удалена.`, 'error');
        try {
          await Promise.allSettled([
            ArticlesSyncService.removeArticle(id),
            CloudSqlDbService.deleteArticle(id)
          ]);
        } catch (err) {
          console.error('Remove article error:', err);
        }
      }
    });
  };

  // --- Handlers for Database Backup ---
  const handleExportFullDatabase = () => {
    const fullDb = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      routes,
      articles,
      trips,
      faqData: currentFaqData,
      notesConfig: currentNotesConfig,
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
        if (parsed.articles && Array.isArray(parsed.articles)) setArticles(parsed.articles);
        if (parsed.trips && Array.isArray(parsed.trips)) setTrips(parsed.trips);
        if (parsed.faqData && parsed.faqData.safetyGuides) {
          handleSetFaqData(parsed.faqData);
          FaqSyncService.saveFaq(parsed.faqData).catch(console.warn);
        }
        if (parsed.notesConfig && parsed.notesConfig.notes) {
          handleSetNotesConfig(parsed.notesConfig);
          TravelNotesSyncService.saveNotesConfig(parsed.notesConfig).catch(console.warn);
        }

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
      {/* Hidden GPX input for cabinet (available on all tabs for regular users and admins) */}
      <input
        type="file"
        ref={cabinetGpxFileInputRef}
        accept=".gpx,.kml,.xml"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleCabinetGpxUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      
      {/* User Header Profile Card */}
      <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E8F1E7] shadow-sm"
            />
            {currentUser.isReadyForExpeditions !== false && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Готов к экспедициям" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-[#1A1F1A]">{currentUser.name}</h1>
              {currentUser.callsign && (
                <span className="px-2 py-0.5 rounded-lg bg-[#E8F1E7] text-[#2D5A27] text-xs font-bold font-mono border border-[#CDE0CC]">
                  «{currentUser.callsign}»
                </span>
              )}
              {currentUser.role === 'admin' && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FEF3C7] text-[#92400E] text-[10px] font-black uppercase">
                  Администратор
                </span>
              )}
            </div>

            <div className="text-xs text-[#6B665F] mt-1 flex items-center gap-3 flex-wrap">
              <span>✉️ {currentUser.email}</span>
              {currentUser.phone && <span>📞 {currentUser.phone}</span>}
              <span>📍 {currentUser.city || 'Югра'}</span>
              <span className="text-[#2D5A27] font-semibold">🌊 {currentUser.experienceLevel}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setActiveCabinetTab('sync_history')}
              className="px-3 py-2 bg-[#E8F1E7] hover:bg-[#D5E8D3] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Панель синхронизации (для администраторов)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Синхронизация: В сети</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="px-3.5 py-2 bg-[#F9F7F4] hover:bg-[#FDE8E8] text-[#6B665F] hover:text-[#E54B4B] font-bold text-xs rounded-xl border border-[#E5E0D8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>

      </div>

      {/* Tabs navigation: Structured grid / vertical list of sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 bg-white p-2.5 sm:p-3 rounded-2xl border border-[#E5E0D8] shadow-xs">
        <button
          onClick={() => setActiveCabinetTab('profile')}
          className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
            activeCabinetTab === 'profile'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 shrink-0" />
            <span>Мой профиль</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal hidden sm:inline">Личные данные</span>
        </button>

        {/* 2. ALL USERS APPLICATIONS TAB */}
        {(() => {
          const userPendingCount = trips.reduce((acc, trip) => {
            const isMyTrip = (trip.organizer.userId && trip.organizer.userId === currentUser?.id) ||
              (currentUser?.name && trip.organizer.name.toLowerCase().includes(currentUser.name.toLowerCase()));
            if (isMyTrip || isAdmin) {
              const pending = (trip.applications || []).filter(a => a.status === 'pending').length;
              return acc + pending;
            }
            return acc;
          }, 0);

          return (
            <button
              onClick={() => setActiveCabinetTab('applications')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'applications'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span>Заявки на сплавы</span>
              </div>
              {userPendingCount > 0 && (
                <span className="px-2 py-0.5 bg-[#E54B4B] text-white rounded-full text-[10px] font-black animate-pulse">
                  +{userPendingCount}
                </span>
              )}
            </button>
          );
        })()}

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveCabinetTab('sync_history')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'sync_history'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>История синхронизации</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </button>

            <button
              onClick={() => setActiveCabinetTab('routes')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'routes'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 shrink-0" />
                <span>Управление реками</span>
              </div>
              <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {routes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCabinetTab('articles')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'articles'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Статьи и отчеты</span>
              </div>
              <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {articles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCabinetTab('trips')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'trips'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span>Все походы</span>
              </div>
              <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {trips.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCabinetTab('faq')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'faq'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Редактор FAQ</span>
              </div>
              <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {(currentFaqData.faqQuestions || []).length}
              </span>
            </button>

            <button
              onClick={() => setActiveCabinetTab('travel_notes')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'travel_notes'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Заметки и отзывы</span>
              </div>
              <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800">
                { (currentNotesConfig.notes || []).length + (currentNotesConfig.riverReviews || []).length + (currentNotesConfig.crewReviews || []).length }
              </span>
            </button>

            {/* Admins & SuperAdmin can view participants directory & access control */}
            {isAdmin && (
              <button
                onClick={() => setActiveCabinetTab('users')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  activeCabinetTab === 'users'
                    ? 'bg-[#E54B4B] text-white shadow-xs'
                    : 'text-[#E54B4B] hover:bg-[#FDE8E8] border border-[#F8B4B4]/60 sm:border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 shrink-0" />
                  <span>Карточки участников</span>
                </div>
                <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-red-50 text-[#E54B4B]">
                  {uniqueUsers.length}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveCabinetTab('backup')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'backup'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4] border border-[#E5E0D8]/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 shrink-0" />
                <span>Бэкап базы</span>
              </div>
            </button>

            <button
              onClick={() => setActiveCabinetTab('telegram')}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activeCabinetTab === 'telegram'
                  ? 'bg-[#0088cc] text-white shadow-xs'
                  : 'text-[#0088cc] hover:bg-sky-50 border border-sky-200/60 sm:border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 shrink-0 text-[#0088cc]" />
                <span>Telegram Mini App</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-[#0088cc] font-bold">
                @SSplav86_bot
              </span>
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
          
          {/* Tourist Dossier Overview Card */}
          <div className="bg-gradient-to-br from-white to-[#F9F7F4] border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A1F1A]">
                    Визитная карточка водного туриста
                  </h2>
                  <p className="text-xs text-[#6B665F]">
                    Так вас видят капитаны и участники других походов при просмотре экипажа
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingUserModal(currentUser)}
                  className="px-3.5 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Открыть визитку</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="px-3 py-1.5 bg-white hover:bg-[#F9F7F4] text-[#2D332D] font-bold text-xs rounded-xl border border-[#E5E0D8] transition-all flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#8B7E6D]" />
                  <span>Редактировать</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {/* Fleet */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#EEEBE6] space-y-1.5">
                <span className="text-[11px] font-bold text-[#8B7E6D] flex items-center gap-1">
                  <Anchor className="w-3.5 h-3.5 text-[#2D5A27]" />
                  Личный флот
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentUser.vesselsOwned && currentUser.vesselsOwned.length > 0 ? (
                    currentUser.vesselsOwned.map((v) => (
                      <span key={v} className="px-2 py-0.5 bg-[#F9F7F4] border border-[#E5E0D8] text-[11px] font-medium rounded-lg text-[#2D332D]">
                        {v === 'catamaran' ? '⛵ Катамаран' : v === 'kayak' ? '🛶 Каяк/Байдарка' : v === 'packraft' ? '🎒 Пакрафт' : v === 'sup' ? '🏄 SUP' : v === 'motorboat' ? '🚤 Моторка' : '🛟 Рафт'}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#8B7E6D] italic">Не указан</span>
                  )}
                </div>
              </div>

              {/* Skills / Badges */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#EEEBE6] space-y-1.5">
                <span className="text-[11px] font-bold text-[#8B7E6D] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Роли & Навыки
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentUser.badges && currentUser.badges.length > 0 ? (
                    currentUser.badges.map((b) => (
                      <span key={b} className="px-2 py-0.5 bg-[#FEF3C7]/40 border border-[#FDE68A] text-[10px] font-bold rounded-lg text-[#92400E]">
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#8B7E6D] italic">Не выбраны</span>
                  )}
                </div>
              </div>

              {/* Favorite Rivers */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#EEEBE6] space-y-1.5">
                <span className="text-[11px] font-bold text-[#8B7E6D] flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Любимые реки
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentUser.favoriteRivers && currentUser.favoriteRivers.length > 0 ? (
                    currentUser.favoriteRivers.map((r) => (
                      <span key={r} className="px-2 py-0.5 bg-[#E8F1E7] border border-[#CDE0CC] text-[11px] font-medium rounded-lg text-[#2D5A27]">
                        р. {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#8B7E6D] italic">Не указаны</span>
                  )}
                </div>
              </div>

              {/* Rating & Reviews from Crew */}
              {(() => {
                const myReviews = (currentNotesConfig?.crewReviews || []).filter((r) => {
                  const targetId = (r.targetUserId || '').trim().toLowerCase();
                  const userId = (currentUser.id || '').trim().toLowerCase();
                  const userEmail = (currentUser.email || '').trim().toLowerCase();
                  const targetName = (r.targetUserName || '').trim().toLowerCase();
                  const userName = (currentUser.name || '').trim().toLowerCase();
                  const userCallsign = (currentUser.callsign || '').trim().toLowerCase();

                  return (
                    (targetId && targetId === userId) ||
                    (targetId && userEmail && targetId === userEmail) ||
                    (targetName && userName && (targetName === userName || userName.includes(targetName) || targetName.includes(userName))) ||
                    (targetName && userCallsign && (targetName === userCallsign || targetName.includes(userCallsign))) ||
                    (targetId && userCallsign && targetId === userCallsign)
                  );
                });
                const myAvg = myReviews.length > 0
                  ? (myReviews.reduce((sum, r) => sum + r.ratingOverall, 0) / myReviews.length).toFixed(1)
                  : null;

                return (
                  <div
                    onClick={() => setViewingUserModal(currentUser)}
                    className="bg-white p-3.5 rounded-2xl border border-[#EEEBE6] space-y-1.5 cursor-pointer hover:border-[#2D5A27] transition-all group"
                  >
                    <span className="text-[11px] font-bold text-[#8B7E6D] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        Рейтинг экипажа
                      </span>
                      <span className="text-[10px] text-[#2D5A27] group-hover:underline">Визитка →</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {myAvg ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-[#1A1F1A]">{myAvg}</span>
                          <div className="flex items-center text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= Math.round(Number(myAvg)) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-[#8B7E6D] font-bold">({myReviews.length})</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8B7E6D] italic">Нет отзывов</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {currentUser.bio && (
              <div className="bg-white p-3 rounded-2xl border border-[#EEEBE6] text-xs text-[#4A443E] italic">
                «{currentUser.bio}»
              </div>
            )}
          </div>
          
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

          {/* My Uploaded & Custom GPX Tracks Section */}
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                  <Navigation2 className="w-4 h-4 text-[#2D5A27]" />
                  Мои авторские и загруженные GPX треки ({myCustomRoutes.length})
                </h2>
                <p className="text-xs text-[#6B665F] mt-0.5">
                  Ваши персональные водные маршруты. Вы можете редактировать их для себя или открыть общий доступ для всего сообщества.
                </p>
              </div>

              {myCustomRoutes.length > 0 && (
                <button
                  type="button"
                  onClick={() => cabinetGpxFileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto shrink-0"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Выбрать GPX файл на устройстве</span>
                </button>
              )}
            </div>

            {/* Privacy note banner */}
            <div className="p-3 bg-[#F9F7F4] border border-[#EBE7DF] rounded-2xl flex items-start gap-2.5 text-xs text-[#5C554E]">
              <Lock className="w-4 h-4 text-[#8B7E6D] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-[#2D332D]">Приватность по умолчанию:</span> Все загруженные треки изначально сохраняются со статусом <span className="font-semibold text-[#8B7E6D]">«Личный 🔒»</span> — их видите и редактируете исключительно вы. Чтобы добавить маршрут в общий каталог Югры для всех туристов, просто нажмите кнопку <span className="font-semibold text-[#2D5A27]">«Поделиться со всеми 🌐»</span>.
              </div>
            </div>

            {myCustomRoutes.length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-[#E5E0D8] rounded-2xl bg-[#FAFAF8] space-y-2">
                <Compass className="w-8 h-8 text-[#8B7E6D] mx-auto opacity-70" />
                <p className="text-sm font-bold text-[#2D332D]">У вас пока нет загруженных личных треков</p>
                <p className="text-xs text-[#6B665F] max-w-md mx-auto">
                  Импортируйте трек со своего GPS навигатора (.gpx, .kml). Он появится в вашем кабинете, построит график высот и будет готов к планированию похода.
                </p>
                <button
                  type="button"
                  onClick={() => cabinetGpxFileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Выбрать GPX файл на устройстве</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCustomRoutes.map((route) => {
                  const isPublic = route.isPublic === true;
                  return (
                    <div
                      key={route.id}
                      className={`border rounded-[24px] p-4 flex flex-col justify-between space-y-3 transition-all ${
                        isPublic
                          ? 'bg-[#F4F9F4] border-[#CDE0CC] shadow-xs'
                          : 'bg-[#F9F7F4] border-[#EEEBE6]'
                      }`}
                    >
                      <div>
                        {/* Status Header */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isPublic
                                ? 'bg-[#2D5A27] text-white'
                                : 'bg-[#EAE5DC] text-[#6B665F]'
                            }`}
                          >
                            {isPublic ? (
                              <>
                                <Globe className="w-3 h-3" />
                                <span>Опубликован (виден всем)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Личный трек (только вы)</span>
                              </>
                            )}
                          </span>

                          <span className="text-xs font-bold text-[#2D5A27]">
                            {route.lengthKm} км
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#1A1F1A] line-clamp-1">{route.name}</h3>
                        <p className="text-xs text-[#6B665F] line-clamp-2 mt-1 leading-relaxed">
                          {route.shortDesc || route.description}
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-[11px] text-[#8B7E6D]">
                          <span>📍 {route.region}</span>
                          <span>•</span>
                          <span>⛰️ {route.elevationGainM || 0} м</span>
                          <span>•</span>
                          <span>🚩 {route.pois?.length || 2} точек</span>
                        </div>
                      </div>

                      {/* Controls & Actions */}
                      <div className="space-y-2 pt-3 border-t border-[#E5E0D8]">
                        {/* Publish / Private Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleRoutePublic(route.id)}
                          className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            isPublic
                              ? 'bg-[#FFF2F2] hover:bg-[#FFE5E5] text-[#E54B4B] border border-[#F8C8C8]'
                              : 'bg-[#2D5A27] hover:bg-[#3D7136] text-white shadow-xs'
                          }`}
                        >
                          {isPublic ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Скрыть (сделать личным)</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Поделиться со всеми (опубликовать)</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenPassportEditor) {
                                  onOpenPassportEditor(route);
                                } else {
                                  onSelectRoute(route);
                                  onOpenRouteDetails(route);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-[#F2EFE9] text-[#2D332D] font-bold rounded-lg border border-[#E5E0D8] flex items-center gap-1"
                              title="Редактировать описание, стоянки, фотографии"
                            >
                              <Edit3 className="w-3 h-3 text-[#2D5A27]" />
                              <span>Редактировать</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadGpx(route)}
                              className="p-1.5 bg-white hover:bg-[#F2EFE9] text-[#2D332D] rounded-lg border border-[#E5E0D8]"
                              title="Скачать GPX трек"
                            >
                              <FileDown className="w-3.5 h-3.5 text-[#2D5A27]" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectRoute(route);
                                onOpenRouteDetails(route);
                              }}
                              className="px-2.5 py-1.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] font-bold rounded-lg"
                            >
                              Лоция
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMyRoute(route.id)}
                              className="p-1.5 text-[#8B7E6D] hover:text-[#E54B4B] hover:bg-[#FFF2F2] rounded-lg transition-colors"
                              title="Удалить личный трек"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E54B4B] fill-[#E54B4B]" />
                Избранные реки и запланированные сплавы ({favoriteRoutes.length})
              </h2>
              {favoriteRoutes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    askConfirmation({
                      title: 'Очистить избранное?',
                      message: 'Вы действительно хотите удалить все сохраненные реки и сплавы из списка избранного?',
                      confirmText: 'Да, очистить',
                      confirmVariant: 'danger',
                      onConfirm: () => {
                        const updatedUser: AppUser = {
                          ...currentUser,
                          favoriteRouteIds: []
                        };
                        onUpdateCurrentUser(updatedUser);
                        UsersSyncService.saveUser(updatedUser).catch(console.warn);
                        CloudSqlDbService.saveUser(updatedUser).catch(console.warn);
                        showNotification('Список избранных рек очищен.');
                      }
                    });
                  }}
                  className="text-xs text-[#8B7E6D] hover:text-[#E54B4B] font-bold transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистить всё избранное</span>
                </button>
              )}
            </div>

            {favoriteRoutes.length === 0 ? (
              <p className="text-xs text-[#6B665F]">
                У вас пока нет сохраненных рек. Выберите маршруты в каталоге или откройте лоцию любой реки и нажмите «В избранное».
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#D6CFBE] rounded-[24px] p-4 flex flex-col justify-between space-y-3 transition-all group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] truncate">
                          {route.region} • ФСТР {route.fstrCategory}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-[#2D5A27]">{route.lengthKm} км</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextFavs = (currentUser.favoriteRouteIds || []).filter((id) => id !== route.id);
                              const updatedUser: AppUser = {
                                ...currentUser,
                                favoriteRouteIds: nextFavs
                              };
                              onUpdateCurrentUser(updatedUser);
                              UsersSyncService.saveUser(updatedUser).catch(console.warn);
                              CloudSqlDbService.saveUser(updatedUser).catch(console.warn);
                              showNotification(`«${route.name}» удалена из избранного.`);
                            }}
                            className="p-1 text-[#E54B4B] hover:text-[#B91C1C] hover:bg-[#FDE8E8] rounded-lg transition-colors cursor-pointer"
                            title="Удалить из избранного"
                          >
                            <Heart className="w-4 h-4 fill-[#E54B4B] text-[#E54B4B]" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-[#1A1F1A] mt-1 leading-snug">{route.name}</h3>
                      <p className="text-xs text-[#6B665F] line-clamp-2 mt-1 leading-relaxed">{route.shortDesc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E0D8] text-xs">
                      <span className="text-[#8B7E6D] font-medium">⏱ {route.durationDays} дн. сплава</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nextFavs = (currentUser.favoriteRouteIds || []).filter((id) => id !== route.id);
                            const updatedUser: AppUser = {
                              ...currentUser,
                              favoriteRouteIds: nextFavs
                            };
                            onUpdateCurrentUser(updatedUser);
                            UsersSyncService.saveUser(updatedUser).catch(console.warn);
                            CloudSqlDbService.saveUser(updatedUser).catch(console.warn);
                            showNotification(`«${route.name}» удалена из избранного.`);
                          }}
                          className="px-2.5 py-1 text-[#8B7E6D] hover:text-[#E54B4B] hover:bg-[#FDE8E8] font-bold text-xs rounded-xl border border-[#E5E0D8] transition-colors cursor-pointer"
                          title="Убрать реку из избранного"
                        >
                          Убрать
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectRoute(route);
                            onOpenRouteDetails(route);
                          }}
                          className="px-3 py-1 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
                        >
                          Лоция
                        </button>
                      </div>
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

      {/* 2. DEDICATED APPLICATIONS & EXPEDITIONS CABINET TAB */}
      {activeCabinetTab === 'applications' && (
        <div className="space-y-6">
          
          {/* Telegram Notifications Info Banner */}
          <div className="bg-gradient-to-r from-[#2AABEE]/10 via-[#2D5A27]/10 to-white border border-[#2AABEE]/30 rounded-[28px] p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2AABEE] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                    Telegram-уведомления о заявках
                    <span className="px-2 py-0.5 rounded-full bg-[#2AABEE]/20 text-[#0088cc] text-[10px] font-bold">
                      Мгновенно
                    </span>
                  </h3>
                  <p className="text-xs text-[#4A443E] mt-0.5">
                    Когда турист подает заявку в ваш поход, вам мгновенно приходит персональное уведомление в Telegram с именем, судном, телефоном и опытом туриста.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {currentUser?.telegram ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-[#E8F1E7] border border-[#CDE0CC] rounded-xl text-xs font-bold text-[#2D5A27] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A27]" />
                      @{currentUser.telegram.replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileEditTab('contacts');
                        setIsEditingProfile(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-[#E5E0D8] hover:bg-[#F9F7F4] text-[#4A443E] text-xs font-bold rounded-xl transition-all"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileEditTab('contacts');
                      setIsEditingProfile(true);
                    }}
                    className="px-4 py-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Указать Telegram в визитке</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* INCOMING APPLICATIONS SECTION (FOR CAPTAINS) */}
          {(() => {
            const myOrganizedTrips = trips.filter(t => 
              (t.organizer.userId && t.organizer.userId === currentUser?.id) ||
              (currentUser?.name && t.organizer.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
              isAdmin
            );

            return (
              <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E0D8]">
                  <div>
                    <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#2D5A27]" />
                      Заявки в организованные мной походы ({myOrganizedTrips.length} {myOrganizedTrips.length === 1 ? 'поход' : 'походов'})
                    </h2>
                    <p className="text-xs text-[#6B665F] mt-0.5">
                      Здесь вы можете рассматривать входящие заявки от туристов, принимать их в экипаж или связываться с ними в Telegram
                    </p>
                  </div>
                </div>

                {myOrganizedTrips.length === 0 ? (
                  <div className="p-8 text-center bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-2">
                    <Compass className="w-8 h-8 text-[#8B7E6D] mx-auto opacity-60" />
                    <p className="text-xs font-bold text-[#1A1F1A]">Вы пока не создали ни одного похода</p>
                    <p className="text-[11px] text-[#6B665F]">
                      Перейдите во вкладку «Попутчики» и нажмите «+ Создать поход», чтобы набрать команду!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myOrganizedTrips.map(trip => {
                      const allApps = trip.applications || [];
                      const pendingApps = allApps.filter(a => a.status === 'pending');
                      const acceptedApps = allApps.filter(a => a.status === 'accepted');
                      const declinedApps = allApps.filter(a => a.status === 'declined');

                      return (
                        <div key={trip.id} className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl p-4 sm:p-5 space-y-4">
                          {/* Trip header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E0D8]">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-[#2D5A27] text-white text-[10px] font-bold rounded-md">
                                  {trip.region}
                                </span>
                                <h3 className="text-sm font-bold text-[#1A1F1A]">{trip.title}</h3>
                              </div>
                              <p className="text-xs text-[#6B665F] mt-1">
                                🌊 р. <strong>{trip.riverName}</strong> • 📅 {trip.startDate} — {trip.endDate} • 👥 Экипаж: <strong>{trip.bookedSeats} из {trip.totalSeats}</strong> мест
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTrip(trip)}
                                className="px-3 py-1.5 bg-white border border-[#E5E0D8] hover:bg-[#F2EFE9] text-[#2D332D] text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#2D5A27]" />
                                <span>Настройки похода</span>
                              </button>
                            </div>
                          </div>

                          {/* Applications list */}
                          {allApps.length === 0 ? (
                            <div className="py-4 text-center text-xs text-[#8B7E6D] bg-white rounded-xl border border-dashed border-[#E5E0D8]">
                              Заявок в этот поход пока не поступало.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {allApps.map(app => {
                                const cleanTg = (app.notes || '').match(/@([a-zA-Z0-9_]+)/)?.[1] || '';
                                return (
                                  <div
                                    key={app.id}
                                    className={`bg-white border rounded-2xl p-3.5 space-y-2.5 shadow-2xs ${
                                      app.status === 'pending' ? 'border-[#FDE68A] ring-2 ring-[#FEF3C7]' :
                                      app.status === 'accepted' ? 'border-[#CDE0CC]' : 'border-[#F8C8C8] opacity-75'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5">
                                        <img
                                          src={app.applicantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                                          alt={app.applicantName}
                                          className="w-10 h-10 rounded-xl object-cover border border-[#E5E0D8]"
                                        />
                                        <div>
                                          <h4 className="text-xs font-bold text-[#1A1F1A]">{app.applicantName}</h4>
                                          <p className="text-[10px] text-[#8B7E6D]">Подано: {app.appliedAt}</p>
                                        </div>
                                      </div>

                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        app.status === 'pending' ? 'bg-[#FEF3C7] text-[#B45309]' :
                                        app.status === 'accepted' ? 'bg-[#E8F1E7] text-[#2D5A27]' :
                                        'bg-[#FDE8E8] text-[#E54B4B]'
                                      }`}>
                                        {app.status === 'pending' ? '⏳ На рассмотрении' :
                                         app.status === 'accepted' ? '✅ Принят в экипаж' : '❌ Отклонен'}
                                      </span>
                                    </div>

                                    <div className="bg-[#F9F7F4] p-2.5 rounded-xl text-[11px] text-[#4A443E] space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span>Судно: <strong>{app.vesselType ? app.vesselType.toUpperCase() : 'Свое'}</strong></span>
                                        <span>Опыт: <strong>{app.experienceLevel}</strong></span>
                                      </div>
                                      {app.applicantPhone && (
                                        <div className="flex items-center gap-1 text-[#2D5A27] font-medium">
                                          <span>📞 {app.applicantPhone}</span>
                                        </div>
                                      )}
                                      {app.notes && (
                                        <p className="text-[10px] text-[#6B665F] italic pt-1 border-t border-[#EAE7E2]">
                                          «{app.notes}»
                                        </p>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-2 border-t border-[#E5E0D8]/60">
                                      <div className="flex items-center gap-1.5">
                                        {app.applicantPhone && (
                                          <a
                                            href={`tel:${app.applicantPhone}`}
                                            className="px-3 py-1.5 bg-[#F2EFE9] hover:bg-[#E5E0D8] text-[#2D332D] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                                          >
                                            <Phone className="w-3.5 h-3.5 text-[#2D5A27]" />
                                            <span>Позвонить</span>
                                          </a>
                                        )}
                                      </div>

                                      {app.status === 'pending' && (
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                          <button
                                            type="button"
                                            onClick={() => handleCabinetAcceptApp(trip, app)}
                                            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                          >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            <span>Принять в экипаж</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCabinetDeclineApp(trip, app.id)}
                                            className="px-3 py-1.5 bg-white hover:bg-[#FDE8E8] text-[#E54B4B] text-xs font-bold rounded-xl border border-[#F8B4B4] transition-all cursor-pointer flex items-center justify-center"
                                            title="Отклонить заявку"
                                          >
                                            <UserX className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* OUTGOING APPLICATIONS (WHERE CURRENT USER APPLIED AS A PARTICIPANT) */}
          {(() => {
            const myAppliedTrips = trips.filter(t => 
              (t.applications || []).some(a => 
                (a.userId && a.userId === currentUser?.id) || 
                (currentUser?.name && a.applicantName && a.applicantName.toLowerCase() === currentUser.name.toLowerCase()) ||
                (currentUser?.phone && a.applicantPhone === currentUser.phone)
              )
            );

            return (
              <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-[#E5E0D8]">
                  <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[#2D5A27]" />
                    Мои поданные заявки на сплавы ({myAppliedTrips.length})
                  </h2>
                  <p className="text-xs text-[#6B665F] mt-0.5">
                    Статус ваших заявок на участие в сборных походах других капитанов
                  </p>
                </div>

                {myAppliedTrips.length === 0 ? (
                  <div className="p-8 text-center bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-1">
                    <p className="text-xs font-bold text-[#1A1F1A]">Вы пока не подавали заявок в походы</p>
                    <p className="text-[11px] text-[#6B665F]">
                      Откройте раздел «Попутчики» на главном экране и нажмите кнопку «Подать заявку» на понравившемся маршруте!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {myAppliedTrips.map(trip => {
                      const myApp = (trip.applications || []).find(a => 
                        (a.userId && a.userId === currentUser?.id) || 
                        (currentUser?.name && a.applicantName && a.applicantName.toLowerCase() === currentUser.name.toLowerCase()) ||
                        (currentUser?.phone && a.applicantPhone === currentUser.phone)
                      );
                      const isPending = myApp?.status === 'pending';
                      const isAccepted = myApp?.status === 'accepted';
                      const captainTg = (trip.organizer.telegram || trip.groupChatLink || '').replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '').trim();

                      return (
                        <div
                          key={trip.id}
                          className={`bg-[#FAF8F5] border rounded-2xl p-4 space-y-3 ${
                            isAccepted ? 'border-[#CDE0CC] bg-[#E8F1E7]/30' :
                            isPending ? 'border-[#FDE68A] bg-[#FEF3C7]/20' :
                            'border-[#F8C8C8]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-[#2D5A27] px-2 py-0.5 bg-[#E8F1E7] rounded-md">
                                р. {trip.riverName} ({trip.region})
                              </span>
                              <h4 className="text-xs font-bold text-[#1A1F1A] mt-1">{trip.title}</h4>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isAccepted ? 'bg-[#2D5A27] text-white' :
                              isPending ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]' :
                              'bg-[#FDE8E8] text-[#E54B4B]'
                            }`}>
                              {isAccepted ? '✓ Вы в экипаже' : isPending ? '⏳ На рассмотрении' : 'Отклонено'}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#4A443E] bg-white p-2.5 rounded-xl border border-[#E5E0D8] space-y-1">
                            <p>📅 Сроки: <strong>{trip.startDate} — {trip.endDate}</strong></p>
                            <p>Капитан: <strong>{trip.organizer.name}</strong> {trip.organizer.phone && `(${trip.organizer.phone})`}</p>
                            {myApp && <p className="text-[#6B665F]">Ваше судно: {myApp.vesselType ? myApp.vesselType.toUpperCase() : 'SUP/Байдарка'}</p>}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            {captainTg ? (
                              <a
                                href={`https://t.me/${captainTg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                              >
                                <Send className="w-3 h-3" />
                                <span>Написать капитану @{captainTg}</span>
                              </a>
                            ) : (
                              <div />
                            )}

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleWithdrawApplication(trip.id)}
                                className="text-xs text-[#E54B4B] hover:underline font-bold"
                              >
                                Отозвать заявку
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* 2. SUPER ADMIN: USER & ADMIN ROLES MANAGEMENT */}
      {activeCabinetTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#E54B4B]" />
                Управление администраторами и пользователями ({uniqueUsers.length})
              </h2>
              <p className="text-xs text-[#6B665F] mt-1">
                Супер-администратор имеет полный доступ к назначению и управлению правами учетных записей.
              </p>
            </div>

            {onClearAllUserCards && (
              <button
                type="button"
                onClick={() => {
                  askConfirmation({
                    title: 'Очистить карточки всех участников?',
                    message: 'Сбросить снаряжение, флот, реки, контакты и отзывы у всех зарегистрированных участников? Это действие необратимо.',
                    confirmText: 'Да, очистить карточки',
                    confirmVariant: 'danger',
                    onConfirm: () => {
                      onClearAllUserCards();
                      showNotification('Карточки всех участников и отзывы успешно очищены.');
                    }
                  });
                }}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                Очистить карточки всех участников
              </button>
            )}
          </div>

          <div className="bg-white border border-[#E5E0D8] rounded-[28px] overflow-hidden shadow-sm">
            <div className="divide-y divide-[#E5E0D8]">
              {uniqueUsers.map((user) => {
                const isThisSuper = user.role === 'superadmin';
                const isMe = user.id === currentUser.id;
                const canManageThisUser = !isMe && (isSuperAdmin ? true : !isThisSuper);

                return (
                  <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9F7F4]">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#CDE0CC]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#E8F1E7] text-[#2D5A27] flex items-center justify-center font-bold text-sm">
                            {user.name ? user.name.slice(0, 1).toUpperCase() : 'У'}
                          </div>
                        )}
                        {user.isReadyForExpeditions !== false && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-[#1A1F1A]">{user.name}</strong>
                          {isThisSuper ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FDE8E8] text-[#E54B4B] border border-[#F8B4B4]">
                              Главный админ
                            </span>
                          ) : user.role === 'admin' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                              Администратор
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#6B665F]">
                          {user.email} {user.telegram ? `• ${user.telegram}` : ''} {user.telegramId ? `(ID: ${user.telegramId})` : ''} • {user.phone || 'без тел.'} • {user.city || 'Югра'}
                        </p>
                      </div>
                    </div>

                    {canManageThisUser && (
                      <div className="flex items-center gap-2">
                        {(user.role === 'admin' || isThisSuper) ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateUserRole(user.id, 'user');
                              showNotification(`Пользователь ${user.name} переведен в статус обычного туриста.`);
                            }}
                            className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#FDE8E8] text-[#E54B4B] font-bold text-xs rounded-xl border border-[#E5E0D8] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Снять права админа
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateUserRole(user.id, 'admin');
                              showNotification(`Пользователю ${user.name} назначены права администратора!`);
                            }}
                            className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Назначить админом
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            askConfirmation({
                              title: 'Удалить аккаунт?',
                              message: `Удалить аккаунт ${user.name} (${user.email})? Это действие навсегда сотрет пользователя из базы.`,
                              confirmText: 'Да, удалить аккаунт',
                              confirmVariant: 'danger',
                              onConfirm: () => {
                                onDeleteUser(user.id);
                                showNotification(`Аккаунт ${user.name} удален.`);
                              }
                            });
                          }}
                          className="p-2 text-[#8B7E6D] hover:text-[#E54B4B] hover:bg-[#FDE8E8] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#F8B4B4]"
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

      {/* 5. ARTICLES ADMIN */}
      {activeCabinetTab === 'articles' && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-xs">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2D5A27]" />
                <span>Лоции и статьи ({articles.length})</span>
              </h2>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Публикуйте авторские отчеты об экспедициях, фотоотчеты и описания порогов
              </p>
            </div>
            <button
              onClick={handleOpenNewArticle}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Написать лоцию</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => (
              <div
                key={art.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {art.coverImage ? (
                    <div className="relative h-36 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                      />
                      <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                        {art.riverName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                            р. {art.riverName}
                          </span>
                        )}
                        {art.region && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2D5A27]/80 text-white backdrop-blur-xs">
                            {art.region}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 bg-[#F5F2ED] border-b border-[#E5E0D8] flex items-center justify-between px-4">
                      <div className="flex items-center gap-1.5">
                        {art.riverName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                            р. {art.riverName}
                          </span>
                        )}
                        {art.region && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                            {art.region}
                          </span>
                        )}
                      </div>
                      <BookOpen className="w-5 h-5 text-[#8B7E6D]/40" />
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-[#1A1F1A] line-clamp-2 leading-snug">{art.title}</h3>
                    {art.summary && (
                      <p className="text-xs text-[#6B665F] line-clamp-2">{art.summary}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-2 border-t border-[#E5E0D8]/60 flex items-center justify-between text-xs bg-[#FAF8F5]">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className="text-[#8B7E6D] text-[11px] truncate">{art.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingArticle(JSON.parse(JSON.stringify(art)));
                        setIsNewArticle(false);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-[#F9F7F4] text-[#2D5A27] rounded-xl border border-[#E5E0D8] transition-all flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                      title="Редактировать статью"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Изменить</span>
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(art.id, art.title)}
                      className="p-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-xl border border-[#F8B4B4] transition-all cursor-pointer"
                      title="Удалить статью"
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

      {/* 6. FAQ & SAFETY ADMIN */}
      {activeCabinetTab === 'faq' && isAdmin && (
        <FaqAdminSection
          faqData={currentFaqData}
          setFaqData={handleSetFaqData}
          showNotification={showNotification}
        />
      )}

      {/* 6.5. TRAVEL NOTES, REVIEWS & LOGBOOK ADMIN */}
      {activeCabinetTab === 'travel_notes' && isAdmin && (
        <TravelNotesAdminSection
          notesConfig={currentNotesConfig}
          setNotesConfig={handleSetNotesConfig}
          currentUser={currentUser}
          routes={routes}
          registeredUsers={registeredUsers}
          showNotification={showNotification}
        />
      )}

      {/* 6.8. USERS & PARTICIPANT CARDS DIRECTORY (ADMIN & SUPER ADMIN) */}
      {activeCabinetTab === 'users' && isAdmin && (
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#E54B4B]" />
                <h2 className="text-base font-black text-[#1A1F1A]">
                  Карточки участников сообщества & Управление доступом
                </h2>
              </div>
              <p className="text-xs text-[#6B665F] mt-1">
                Всего зарегистрировано туристов: <strong>{uniqueUsers.length}</strong>. Нажмите на любого туриста, чтобы открыть его визитку или изменить права.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueUsers.map((u) => {
              const isTargetSuperAdmin = u.role === 'superadmin';
              const isTargetAdmin = u.role === 'admin';
              const isMe = u.id === currentUser.id;
              const canManageThisCard = !isMe && (isSuperAdmin ? true : !isTargetSuperAdmin);

              return (
                <div
                  key={u.id}
                  className="bg-[#F9F7F4] border border-[#E5E0D8] hover:border-[#2D5A27] rounded-2xl p-4 space-y-3.5 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => setViewingUserModal(u)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="relative">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                            alt={u.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#CDE0CC] group-hover:scale-105 transition-transform"
                          />
                          {u.isReadyForExpeditions !== false && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-[#1A1F1A] group-hover:text-[#2D5A27] transition-colors">
                              {u.name}
                            </h4>
                            {u.callsign && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#E8F1E7] text-[#2D5A27] font-bold">
                                «{u.callsign}»
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6B665F]">📍 {u.city || 'Югра'}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isTargetSuperAdmin
                            ? 'bg-[#FDE8E8] text-[#E54B4B]'
                            : isTargetAdmin
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#E8F1E7] text-[#2D5A27]'
                        }`}
                      >
                        {isTargetSuperAdmin ? 'Главный админ' : isTargetAdmin ? 'Админ' : 'Турист'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-[#EEEBE6] text-[11px] space-y-1">
                      <div className="text-[#6B665F] truncate">✉️ {u.email}</div>
                      {u.telegram && <div className="text-[#0088cc] font-medium truncate">✈️ {u.telegram} {u.telegramId ? <span className="text-[10px] text-[#8B7E6D] font-mono">(ID: {u.telegramId})</span> : null}</div>}
                      {u.phone && <div className="text-[#6B665F]">📞 {u.phone}</div>}
                      <div className="text-[#2D5A27] font-medium truncate">🌊 {u.experienceLevel}</div>
                      {u.fstrRank && <div className="text-[#92400E] font-medium truncate">🏆 {u.fstrRank}</div>}

                      {/* Crew Reviews Rating Badge */}
                      {(() => {
                        const uReviews = (currentNotesConfig?.crewReviews || []).filter((r) => {
                          const targetId = (r.targetUserId || '').trim().toLowerCase();
                          const userId = (u.id || '').trim().toLowerCase();
                          const userEmail = (u.email || '').trim().toLowerCase();
                          const targetName = (r.targetUserName || '').trim().toLowerCase();
                          const userName = (u.name || '').trim().toLowerCase();
                          const userCallsign = (u.callsign || '').trim().toLowerCase();

                          return (
                            (targetId && targetId === userId) ||
                            (targetId && userEmail && targetId === userEmail) ||
                            (targetName && userName && (targetName === userName || userName.includes(targetName) || targetName.includes(userName))) ||
                            (targetName && userCallsign && (targetName === userCallsign || targetName.includes(userCallsign))) ||
                            (targetId && userCallsign && targetId === userCallsign)
                          );
                        });
                        const uAvg = uReviews.length > 0
                          ? (uReviews.reduce((sum, r) => sum + r.ratingOverall, 0) / uReviews.length).toFixed(1)
                          : null;

                        if (!uAvg) return null;
                        return (
                          <div className="pt-1 flex items-center justify-between border-t border-[#EEEBE6] mt-1">
                            <span className="text-[10px] text-[#8B7E6D]">Рейтинг экипажа:</span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{uAvg}</span>
                              <span className="text-[10px] text-amber-600 font-normal">({uReviews.length})</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Badges preview */}
                    {u.badges && u.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {u.badges.slice(0, 3).map((b) => (
                          <span key={b} className="text-[9px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold">
                            {b}
                          </span>
                        ))}
                        {u.badges.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md font-bold">
                            +{u.badges.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingUserModal(u)}
                      className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Визитка</span>
                    </button>

                    {canManageThisCard && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const newRole = (isTargetAdmin || isTargetSuperAdmin) ? 'user' : 'admin';
                            askConfirmation({
                              title: 'Изменение роли',
                              message: `Изменить роль пользователя ${u.name} на "${newRole === 'admin' ? 'Администратор' : 'Обычный турист'}"?`,
                              confirmText: 'Применить',
                              confirmVariant: 'primary',
                              onConfirm: () => {
                                onUpdateUserRole(u.id, newRole as UserRole);
                                showNotification(`Роль пользователя ${u.name} изменена на ${newRole === 'admin' ? 'Администратор' : 'Турист'}!`);
                              }
                            });
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            (isTargetAdmin || isTargetSuperAdmin)
                              ? 'bg-[#FDE8E8] text-[#E54B4B] border-[#F8B4B4] hover:bg-[#FCD8D8]'
                              : 'bg-white text-[#4A443E] border-[#E5E0D8] hover:bg-[#F2EFE9]'
                          }`}
                        >
                          {(isTargetAdmin || isTargetSuperAdmin) ? 'Снять админа' : 'Сделать админом'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            askConfirmation({
                              title: 'Удалить участника?',
                              message: `Удалить участника ${u.name} (${u.email}) из базы данных? Это действие навсегда сотрет профиль.`,
                              confirmText: 'Да, удалить',
                              confirmVariant: 'danger',
                              onConfirm: () => {
                                onDeleteUser(u.id);
                                showNotification(`Участник ${u.name} успешно удален.`);
                              }
                            });
                          }}
                          className="p-1.5 text-[#8B7E6D] hover:text-[#E54B4B] hover:bg-[#FDE8E8] rounded-xl transition-colors border border-transparent hover:border-[#F8B4B4] cursor-pointer"
                          title="Удалить участника"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. BACKUP & JSON RESTORE */}
      {activeCabinetTab === 'backup' && isAdmin && (
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1A1F1A]">Резервное копирование и экспорт базы</h2>
            <p className="text-xs text-[#6B665F] mt-1">
              Скачивайте резервную копию со всеми маршрутами, статьями и пользователями, или восстанавливайте базу.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] space-y-3 flex flex-col justify-between">
              <div>
                <Download className="w-6 h-6 text-[#2D5A27] mb-2" />
                <h3 className="text-sm font-bold text-[#1A1F1A]">Экспорт в JSON</h3>
                <p className="text-xs text-[#6B665F] mt-1">
                  Скачать текущую базу данных ({routes.length} рек, {articles.length} статей, {trips.length} походов, {(currentNotesConfig.notes || []).length} заметок, {(currentNotesConfig.riverReviews || []).length + (currentNotesConfig.crewReviews || []).length} отзывов).
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
                <h3 className="text-sm font-bold text-[#E54B4B]">Очистка базы (Чистый старт)</h3>
                <p className="text-xs text-[#7F1D1D] mt-1">Очистить все статьи, реки, походы и заметки перед публикацией.</p>
              </div>
              <button
                onClick={() => {
                  askConfirmation({
                    title: 'Очистить всю базу данных?',
                    message: 'Полностью очистить все статьи, карты, паспорта рек, походы и заметки? База данных будет абсолютно чистой для последующего наполнения контентом администратором.',
                    confirmText: 'Да, очистить всё',
                    confirmVariant: 'danger',
                    onConfirm: () => {
                      onResetToDefaults();
                      showNotification('База данных полностью очищена. Сайт готов к первичному наполнению!');
                    }
                  });
                }}
                className="w-full py-2.5 bg-[#E54B4B] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Очистить базу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SYNC HISTORY & STATUS SECTION */}
      {activeCabinetTab === 'sync_history' && isAdmin && (
        <SyncHistorySection
          currentUser={currentUser}
          routes={routes}
          trips={trips}
          articles={articles}
          registeredUsers={registeredUsers}
          faqData={currentFaqData}
          notesConfig={currentNotesConfig}
          showNotification={showNotification}
        />
      )}

      {/* 9. TELEGRAM MINI APP SECTION */}
      {activeCabinetTab === 'telegram' && (
        <TelegramMiniAppSection
          onShowNotification={showNotification}
        />
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
      {/* EDIT / CREATE ARTICLE & EXPEDITION REPORT MODAL */}
      {/* ---------------------------------------------------- */}
      {editingArticle && (
        <div className="fixed inset-0 z-[2900] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-[#2D332D]">
            
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E0D8] bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27] shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#1A1F1A] truncate">
                    {isNewArticle ? 'Новая статья / Отчет об экспедиции' : `Редактирование: ${editingArticle.title}`}
                  </h3>
                  <p className="text-[11px] text-[#6B665F] truncate">
                    Полное управление текстом, параметрами маршрута и фотоотчетом
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseArticleEditor} 
                className="p-1.5 rounded-xl text-[#8B7E6D] hover:text-[#1A1F1A] hover:bg-[#F9F7F4] transition-colors cursor-pointer shrink-0"
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

            {/* Scrollable Form Body */}
            <form id="article-editor-form" onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs no-scrollbar">
              
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

            </form>

            {/* Fixed Footer with Action Buttons */}
            <div className="p-3 sm:p-4 border-t border-[#E5E0D8] bg-[#FAF8F5] shrink-0 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSavingArticle}
                onClick={handleCloseArticleEditor}
                className="px-4 py-2.5 bg-white hover:bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8] transition-colors disabled:opacity-50 cursor-pointer text-xs"
              >
                Отмена
              </button>
              <button 
                type="submit" 
                form="article-editor-form"
                disabled={isSavingArticle || isProcessingArticlePhoto}
                className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer text-xs"
              >
                <Save className="w-4 h-4" />
                {isSavingArticle ? 'Сохранение...' : (isNewArticle ? 'Опубликовать статью' : 'Сохранить изменения')}
              </button>
            </div>

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

      {/* ---------------------------------------------------- */}
      {/* RICH PROFILE DOSSIER & FLOTILLA EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[3200] bg-black/70 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-[#E5E0D8] space-y-5 my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#1A1F1A]">
                    Визитная карточка туриста
                  </h3>
                  <p className="text-xs text-[#6B665F]">
                    Заполните информацию о себе, вашем флоте и снаряжении
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-2 rounded-full hover:bg-[#F9F7F4] text-[#6B665F] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Tabs Navigation */}
            <div className="flex items-center gap-1 bg-[#F9F7F4] p-1.5 rounded-2xl border border-[#EEEBE6] overflow-x-auto shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setProfileEditTab('main')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                  profileEditTab === 'main' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Основное</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileEditTab('fleet')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                  profileEditTab === 'fleet' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>Флот ({profileForm.vesselsOwned.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileEditTab('gear')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                  profileEditTab === 'gear' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Снаряжение ({profileForm.gearInventory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileEditTab('rivers')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                  profileEditTab === 'rivers' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Любимые реки ({profileForm.favoriteRivers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileEditTab('badges')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                  profileEditTab === 'badges' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Навыки ({profileForm.badges.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileEditTab('contacts')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                  profileEditTab === 'contacts' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>О себе & Связь</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* TAB 1: MAIN INFO & AVATAR */}
              {profileEditTab === 'main' && (
                <div className="space-y-4">
                  {/* Avatar Selector with Device Upload */}
                  <div className="space-y-3 bg-[#F9F7F4] p-3.5 sm:p-4 rounded-2xl border border-[#EEEBE6]">
                    <div className="flex items-center justify-between">
                      <label className="text-[#4A443E] font-bold text-xs">Фотография профиля</label>
                      <span className="text-[10px] text-[#8B7E6D]">JPG, PNG, WEBP с устройства</span>
                    </div>

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
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2.5 px-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Загрузить фото с устройства</span>
                        </button>

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

                  {/* Name & Callsign */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4A443E] font-bold mb-1">Имя / Фамилия *</label>
                      <input
                        type="text"
                        required
                        placeholder="Например: Дмитрий Васильев"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#4A443E] font-bold mb-1">Позывной на реке / Псевдоним</label>
                      <input
                        type="text"
                        placeholder="Например: Северный Ветер, Капитан"
                        value={profileForm.callsign}
                        onChange={(e) => setProfileForm({ ...profileForm, callsign: e.target.value })}
                        className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                      />
                    </div>
                  </div>

                  {/* City & Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4A443E] font-bold mb-1">Город / Населенный пункт</label>
                      <input
                        type="text"
                        placeholder="Сургут, Салехард, Нижневартовск..."
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                      />
                    </div>

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
                  </div>

                  {/* FSTR Rank / Sport Certificate */}
                  <div>
                    <label className="block text-[#4A443E] font-bold mb-1">
                      Спортивный разряд / Звание / Сертификат проводника
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Инструктор водного туризма, II спортивный разряд, Турист России"
                      value={profileForm.fstrRank}
                      onChange={(e) => setProfileForm({ ...profileForm, fstrRank: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: FLOTILLA (VESSELS) */}
              {profileEditTab === 'fleet' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#6B665F]">
                    Отметьте типы плавсредств, которыми вы владеете или на которых регулярно ходите в экспедиции:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { type: 'catamaran' as VesselType, label: 'Катамаран 4/6 мест', emoji: '⛵', desc: 'Сплавной катамаран для порогов и озер' },
                      { type: 'kayak' as VesselType, label: 'Байдарка / Каяк', emoji: '🛶', desc: 'Каркасная или надувная байдарка' },
                      { type: 'packraft' as VesselType, label: 'Пакрафт экспедиционный', emoji: '🎒', desc: 'Легкое судно для пеше-водных связок' },
                      { type: 'sup' as VesselType, label: 'SUP-борд надувной', emoji: '🏄', desc: 'САП-доска для гладкой воды и озер' },
                      { type: 'motorboat' as VesselType, label: 'Лодка ПВХ / Мотор', emoji: '🚤', desc: 'Моторная лодка или водомет' },
                      { type: 'raft' as VesselType, label: 'Рафт многоместный', emoji: '🛟', desc: 'Большой сплавной рафт для команды' }
                    ].map((v) => {
                      const isSelected = profileForm.vesselsOwned.includes(v.type);
                      return (
                        <div
                          key={v.type}
                          onClick={() => {
                            setProfileForm((prev) => ({
                              ...prev,
                              vesselsOwned: isSelected
                                ? prev.vesselsOwned.filter((t) => t !== v.type)
                                : [...prev.vesselsOwned, v.type]
                            }));
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#E8F1E7] border-[#2D5A27] text-[#1A1F1A] shadow-xs'
                              : 'bg-[#F9F7F4] border-[#EEEBE6] text-[#6B665F] hover:border-[#CDE0CC]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl p-2 bg-white rounded-xl border border-[#E5E0D8]">
                              {v.emoji}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-[#1A1F1A]">{v.label}</div>
                              <div className="text-[10px] text-[#8B7E6D]">{v.desc}</div>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected ? 'bg-[#2D5A27] border-[#2D5A27] text-white' : 'border-[#CBD5E1] bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: GEAR INVENTORY */}
              {profileEditTab === 'gear' && (
                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-[#1A1F1A] block mb-1">Популярное походное снаряжение:</span>
                    <p className="text-[11px] text-[#6B665F] mb-2.5">
                      Кликайте по тегам, чтобы быстро добавить или убрать из вашей визитки:
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '📡 Спутниковый трекер Garmin / SOS',
                        '⛺ Палатка 4-сезонная штормовая',
                        '🪓 Бензопила Stihl / Топор',
                        '📻 Рации 433 / 144 МГц',
                        '🍲 Костровой набор и казан',
                        '⚡ Генератор 1 кВт',
                        '🧭 GPS-навигатор Garmin',
                        '🦺 Спасжилеты (100+ кг)',
                        '🩺 Расширенная аптечка',
                        '🔋 Солнечная панель и станция',
                        '🐟 Рыболовные снасти и забродники',
                        '⛺ Лагерный тент 4х6 м'
                      ].map((item) => {
                        const isIncluded = profileForm.gearInventory.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setProfileForm((prev) => ({
                                ...prev,
                                gearInventory: isIncluded
                                  ? prev.gearInventory.filter((g) => g !== item)
                                  : [...prev.gearInventory, item]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isIncluded
                                ? 'bg-[#2D5A27] text-white shadow-2xs'
                                : 'bg-[#F9F7F4] text-[#4A443E] border border-[#E5E0D8] hover:border-[#2D5A27]'
                            }`}
                          >
                            <span>{item}</span>
                            {isIncluded && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Custom Gear */}
                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
                    <label className="font-bold text-[#1A1F1A] block text-xs">
                      Добавить свое снаряжение:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Например: Мотор Yamaha 9.9, Эхолот, Сухой гидрокостюм..."
                        value={customGearInput}
                        onChange={(e) => setCustomGearInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customGearInput.trim()) {
                              setProfileForm((prev) => ({
                                ...prev,
                                gearInventory: [...prev.gearInventory, customGearInput.trim()]
                              }));
                              setCustomGearInput('');
                            }
                          }
                        }}
                        className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#2D5A27]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customGearInput.trim()) {
                            setProfileForm((prev) => ({
                              ...prev,
                              gearInventory: [...prev.gearInventory, customGearInput.trim()]
                            }));
                            setCustomGearInput('');
                          }
                        }}
                        className="px-4 py-2 bg-[#2D5A27] text-white font-bold rounded-xl text-xs shadow-xs"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>

                  {/* Currently Added Gear Chips */}
                  {profileForm.gearInventory.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[#8B7E6D]">Ваш выбранный список ({profileForm.gearInventory.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profileForm.gearInventory.map((g, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-[#E8F1E7] text-[#2D5A27] text-xs font-medium rounded-xl border border-[#CDE0CC] flex items-center gap-1.5"
                          >
                            <span>{g}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileForm((prev) => ({
                                  ...prev,
                                  gearInventory: prev.gearInventory.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-[#2D5A27] hover:text-[#E54B4B]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FAVORITE RIVERS */}
              {profileEditTab === 'rivers' && (
                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-[#1A1F1A] block mb-1">Реки Севера (быстрый выбор):</span>
                    <p className="text-[11px] text-[#6B665F] mb-2.5">
                      Выберите реки, по которым вы уже ходили или куда мечтаете отправиться:
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Собь', 'Щучья', 'Тромъёган', 'Аган', 'Казым', 'Северная Сосьва',
                        'Вах', 'Лямин', 'Надым', 'Пим', 'Полуй', 'Войкар', 'Сыня', 'Юган'
                      ].map((river) => {
                        const isSelected = profileForm.favoriteRivers.includes(river);
                        return (
                          <button
                            key={river}
                            type="button"
                            onClick={() => {
                              setProfileForm((prev) => ({
                                ...prev,
                                favoriteRivers: isSelected
                                  ? prev.favoriteRivers.filter((r) => r !== river)
                                  : [...prev.favoriteRivers, river]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#2D5A27] text-white shadow-2xs'
                                : 'bg-[#F9F7F4] text-[#4A443E] border border-[#E5E0D8] hover:border-[#2D5A27]'
                            }`}
                          >
                            <span>р. {river}</span>
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Custom River */}
                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
                    <label className="font-bold text-[#1A1F1A] block text-xs">
                      Добавить другую реку:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Например: Таз, Пур, Хадуттэ..."
                        value={customRiverInput}
                        onChange={(e) => setCustomRiverInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customRiverInput.trim()) {
                              setProfileForm((prev) => ({
                                ...prev,
                                favoriteRivers: [...prev.favoriteRivers, customRiverInput.trim()]
                              }));
                              setCustomRiverInput('');
                            }
                          }
                        }}
                        className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#2D5A27]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customRiverInput.trim()) {
                            setProfileForm((prev) => ({
                              ...prev,
                              favoriteRivers: [...prev.favoriteRivers, customRiverInput.trim()]
                            }));
                            setCustomRiverInput('');
                          }
                        }}
                        className="px-4 py-2 bg-[#2D5A27] text-white font-bold rounded-xl text-xs shadow-xs"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BADGES & SPECIALIZATIONS */}
              {profileEditTab === 'badges' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#6B665F]">
                    Отметьте ваши роли, навыки и достижения в походах:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: '🔥 Мастер костра', desc: 'Разведет костер в любой дождь и мороз' },
                      { key: '🧭 Надежный штурман', desc: 'Безупречное чтение лоции и карты' },
                      { key: '🍲 Шеф-повар похода', desc: 'Вкусно накормит экипаж в тайге' },
                      { key: '⚓ Капитан судна', desc: 'Опыт руководства экипажем на воде' },
                      { key: '💪 Мощный гребец', desc: 'Вынослив на многокилометровых переходах' },
                      { key: '⛺ Знаток стоянок', desc: 'Найдет сухую и укрытую поляну' },
                      { key: '🐟 Рыбак Севера', desc: 'Ловит хариуса, щуку и окуня' },
                      { key: '📸 Летописец экспедиций', desc: 'Создает красивые фото и видеоотчеты' },
                      { key: '⚡ Первая помощь', desc: 'Навыки полевой медицины и спасения' },
                      { key: '🏔 Полярный Урал', desc: 'Пройдены сложные горные реки ЯНАО' }
                    ].map((badge) => {
                      const isSelected = profileForm.badges.includes(badge.key);
                      return (
                        <div
                          key={badge.key}
                          onClick={() => {
                            setProfileForm((prev) => ({
                              ...prev,
                              badges: isSelected
                                ? prev.badges.filter((b) => b !== badge.key)
                                : [...prev.badges, badge.key]
                            }));
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-[#E8F1E7] border-[#2D5A27] text-[#1A1F1A] shadow-xs'
                              : 'bg-[#F9F7F4] border-[#EEEBE6] text-[#6B665F] hover:border-[#CDE0CC]'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs text-[#1A1F1A]">{badge.key}</div>
                            <div className="text-[10px] text-[#8B7E6D]">{badge.desc}</div>
                          </div>

                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected ? 'bg-[#2D5A27] border-[#2D5A27] text-white' : 'border-[#CBD5E1] bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: BIO, TELEGRAM & CONTACTS */}
              {profileEditTab === 'contacts' && (
                <div className="space-y-4">
                  {/* Bio */}
                  <div>
                    <label className="block text-[#4A443E] font-bold mb-1">
                      О себе и походном стиле
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Расскажите о своем походном опыте, стиле сплава (автономные экспедиции, спортивные пороги, неспешный туризм с рыбалкой), характере в команде..."
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                  </div>

                  {/* Telegram & VK */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4A443E] font-bold mb-1">Telegram (@username)</label>
                      <input
                        type="text"
                        placeholder="@ivan_taiga"
                        value={profileForm.telegram}
                        onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
                        className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#4A443E] font-bold mb-1">VK (ссылка или id)</label>
                      <input
                        type="text"
                        placeholder="https://vk.com/ivan_taiga"
                        value={profileForm.vk}
                        onChange={(e) => setProfileForm({ ...profileForm, vk: e.target.value })}
                        className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                      />
                    </div>
                  </div>

                  {/* Web Login & Cross-Platform Credentials */}
                  <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1A1F1A] text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#2D5A27]" />
                        Вход с компьютера (Web) и безопасность
                      </span>
                      <span className="text-[10px] text-[#2D5A27] font-bold">Кроссплатформенный доступ</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[#4A443E] font-medium text-[11px] mb-1">Email для входа</label>
                        <input
                          type="email"
                          placeholder="name@mail.ru"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 text-[#2D332D] outline-none focus:border-[#2D5A27] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[#4A443E] font-medium text-[11px] mb-1">Пароль для входа (мин. 12 симв.)</label>
                        <input
                          type="password"
                          minLength={12}
                          placeholder="Минимум 12 символов"
                          value={profileForm.password || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                          className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 text-[#2D332D] outline-none focus:border-[#2D5A27] text-xs"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-[#8B7E6D] leading-tight">
                      Укажите пароль, чтобы иметь возможность авторизоваться в SPLAV86 с любого компьютера или смартфона по вашему Email или Telegram-логину.
                    </p>
                  </div>

                  {/* Readiness & Privacy Toggles */}
                  <div className="space-y-2.5 bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileForm.isReadyForExpeditions}
                        onChange={(e) => setProfileForm({ ...profileForm, isReadyForExpeditions: e.target.checked })}
                        className="w-4 h-4 rounded text-[#2D5A27] focus:ring-[#2D5A27]"
                      />
                      <div>
                        <span className="font-bold text-[#1A1F1A] text-xs">🟢 Готов к экспедициям / Ищу команду</span>
                        <p className="text-[10px] text-[#8B7E6D]">Ваша карточка будет помечена зеленым бейджем готовности к походам</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-[#E5E0D8]">
                      <input
                        type="checkbox"
                        checked={profileForm.showContactsPublicly}
                        onChange={(e) => setProfileForm({ ...profileForm, showContactsPublicly: e.target.checked })}
                        className="w-4 h-4 rounded text-[#2D5A27] focus:ring-[#2D5A27]"
                      />
                      <div>
                        <span className="font-bold text-[#1A1F1A] text-xs">Показывать номер телефона в открытой карточке</span>
                        <p className="text-[10px] text-[#8B7E6D]">Если выключено, номер телефона виден только организаторам походов, куда вы подали заявку</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2 shrink-0">
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
                  Сохранить визитку
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* UNIVERSAL CONFIRMATION DIALOG MODAL */}
      {/* ---------------------------------------------------- */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-[#E5E0D8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
              confirmModal.confirmVariant === 'primary'
                ? 'bg-[#E8F1E7] text-[#2D5A27] border-[#CDE0CC]'
                : 'bg-[#FFF2F2] text-[#E54B4B] border-[#F8C8C8]'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-[#1A1F1A]">{confirmModal.title}</h3>
              <p className="text-xs text-[#6B665F] leading-relaxed whitespace-pre-line">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 px-4 bg-[#F2EFE9] hover:bg-[#E5E0D8] text-[#2D332D] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {confirmModal.cancelText || 'Отмена'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConfirmAction = confirmModal.onConfirm;
                  setConfirmModal(null);
                  onConfirmAction();
                }}
                className={`flex-1 py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  confirmModal.confirmVariant === 'primary'
                    ? 'bg-[#2D5A27] hover:bg-[#3D7136]'
                    : 'bg-[#E54B4B] hover:bg-[#D43F3F]'
                }`}
              >
                {confirmModal.confirmVariant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmModal.confirmText || 'Подтвердить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* USER PROFILE CARD PREVIEW MODAL */}
      {/* ---------------------------------------------------- */}
      {viewingUserModal && (
        <UserProfileModal
          user={viewingUserModal}
          isOpen={!!viewingUserModal}
          onClose={() => setViewingUserModal(null)}
          currentUser={currentUser}
          crewReviews={currentNotesConfig?.crewReviews || []}
          trips={trips}
          routes={routes}
          onSelectRoute={onSelectRoute}
          onOpenAuth={onOpenAuth}
          onAddCrewReview={(newRev) => {
            const updated = [newRev, ...(currentNotesConfig?.crewReviews || [])];
            const newConfig = { ...currentNotesConfig, crewReviews: updated };
            handleSetNotesConfig(newConfig);
            TravelNotesSyncService.saveNotesConfig(newConfig).catch(console.warn);
            showNotification('Отзыв успешно опубликован!');
          }}
          onDeleteCrewReview={(reviewId) => {
            const updated = (currentNotesConfig?.crewReviews || []).filter(r => r.id !== reviewId);
            const newConfig = { ...currentNotesConfig, crewReviews: updated };
            handleSetNotesConfig(newConfig);
            TravelNotesSyncService.saveNotesConfig(newConfig).catch(console.warn);
            showNotification('Отзыв успешно удален.');
          }}
        />
      )}

    </div>
  );
};

