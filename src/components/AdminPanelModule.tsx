import React, { useState, useMemo, useRef } from 'react';
import { 
  AppUser, 
  UserRole, 
  RiverRoute, 
  CompanionTrip, 
  Article, 
  TravelNote, 
  FaqDataConfig, 
  TravelNotesConfig,
  SafetyGuide,
  FaqQuestionItem,
  FaqEmergencyContact,
  FaqRadioFrequency,
  VesselType,
  TripApplication
} from '../types';
import { 
  ShieldCheck, 
  Users, 
  Compass, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Save, 
  Plus, 
  RefreshCw, 
  Database, 
  FileText, 
  Radio, 
  ShieldAlert, 
  Activity, 
  Clock, 
  Search, 
  Check, 
  ChevronRight, 
  AlertCircle,
  Eye,
  Globe,
  Lock,
  Download,
  Upload,
  Calendar,
  MapPin,
  LifeBuoy,
  MessageSquare,
  Sparkles,
  Layers,
  Phone,
  UserX,
  UserCheck,
  Star,
  ExternalLink,
  HelpCircle,
  RotateCcw,
  Camera,
  Key,
  X,
  Code2,
  FileCode,
  Copy,
  FileUp,
  FileSpreadsheet,
  CheckCheck,
  Wrench,
  Info
} from 'lucide-react';
import { CloudSqlDbService } from '../services/cloudSqlDb';
import { 
  RoutesSyncService, 
  TripsSyncService, 
  ArticlesSyncService, 
  UsersSyncService, 
  FaqSyncService, 
  TravelNotesSyncService 
} from '../firebase';
import { CentralSyncManager } from '../services/centralSyncManager';
import { 
  filterActiveEntities, 
  filterDeletedEntities, 
  deduplicateUsers,
  mergeRoutes,
  mergeTrips,
  mergeArticles,
  mergeTravelNotesConfigs,
  mergeFaqConfigs,
  mergeUsers
} from '../utils/syncMerge';
import { compressAvatarFile } from '../utils/imageCompressor';

interface AdminPanelModuleProps {
  currentUser: AppUser | null;
  routes: RiverRoute[];
  trips: CompanionTrip[];
  articles: Article[];
  travelNotes: TravelNote[];
  registeredUsers: AppUser[];
  faqData: FaqDataConfig;
  notesConfig: TravelNotesConfig;
  onUpdateRoutes: React.Dispatch<React.SetStateAction<RiverRoute[]>> | ((routes: RiverRoute[]) => void);
  onUpdateTrips: React.Dispatch<React.SetStateAction<CompanionTrip[]>> | ((trips: CompanionTrip[]) => void);
  onUpdateArticles: React.Dispatch<React.SetStateAction<Article[]>> | ((articles: Article[]) => void);
  onUpdateNotesConfig?: (config: TravelNotesConfig) => void;
  onUpdateFaqData?: (faq: FaqDataConfig) => void;
  onUpdateUsers?: (users: AppUser[]) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onUpdateUser?: (updatedUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onDeleteRoute?: (routeId: string) => void;
  onDeleteTrip?: (tripId: string) => void;
  onDeleteArticle?: (articleId: string) => void;
  onOpenPassportEditor?: (route: RiverRoute | null) => void;
  onOpenFaqEditor?: (faq: FaqDataConfig) => void;
}

export const AdminPanelModule: React.FC<AdminPanelModuleProps> = ({
  currentUser,
  routes,
  trips,
  articles,
  travelNotes,
  registeredUsers,
  faqData,
  notesConfig,
  onUpdateRoutes,
  onUpdateTrips,
  onUpdateArticles,
  onUpdateNotesConfig,
  onUpdateFaqData,
  onUpdateUsers,
  onUpdateUserRole,
  onUpdateUser,
  onDeleteUser,
  onDeleteRoute,
  onDeleteTrip,
  onDeleteArticle,
  onOpenPassportEditor
}) => {
  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'routes' | 'trips' | 'travel_notes' | 'faq_safety' | 'users' | 'recycle_bin' | 'database'
  >('dashboard');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'incomplete' | 'needs_review'>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | 'ХМАО' | 'ЯНАО'>('all');
  const [notesSubTab, setNotesSubTab] = useState<'all' | 'notes' | 'river_reviews' | 'crew_reviews' | 'checklist'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // Active entities computed for main view
  const activeNotes = useMemo(() => filterActiveEntities(notesConfig.notes || []), [notesConfig.notes]);
  const activeChecklist = useMemo(() => filterActiveEntities(notesConfig.checklist || []), [notesConfig.checklist]);
  const activeRiverReviews = useMemo(() => filterActiveEntities(notesConfig.riverReviews || []), [notesConfig.riverReviews]);
  const activeCrewReviews = useMemo(() => filterActiveEntities(notesConfig.crewReviews || []), [notesConfig.crewReviews]);

  // Deleted entities computed for Recycle Bin
  const deletedRoutes = useMemo(() => filterDeletedEntities(routes), [routes]);
  const deletedTrips = useMemo(() => filterDeletedEntities(trips), [trips]);
  const deletedArticles = useMemo(() => filterDeletedEntities(articles), [articles]);
  const deletedNotes = useMemo(() => filterDeletedEntities(notesConfig.notes || []), [notesConfig.notes]);
  const deletedChecklist = useMemo(() => filterDeletedEntities(notesConfig.checklist || []), [notesConfig.checklist]);
  const deletedRiverReviews = useMemo(() => filterDeletedEntities(notesConfig.riverReviews || []), [notesConfig.riverReviews]);
  const deletedCrewReviews = useMemo(() => filterDeletedEntities(notesConfig.crewReviews || []), [notesConfig.crewReviews]);
  const activeUsers = useMemo(() => deduplicateUsers(filterActiveEntities(registeredUsers)), [registeredUsers]);
  const deletedUsers = useMemo(() => deduplicateUsers(filterDeletedEntities(registeredUsers)), [registeredUsers]);

  const totalDeletedCount = 
    deletedRoutes.length + 
    deletedTrips.length + 
    deletedArticles.length + 
    deletedNotes.length + 
    deletedChecklist.length + 
    deletedRiverReviews.length + 
    deletedCrewReviews.length + 
    deletedUsers.length;

  // Editing Modals State
  const [editingTrip, setEditingTrip] = useState<CompanionTrip | null>(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState<boolean>(false);
  const [selectedTripForApps, setSelectedTripForApps] = useState<CompanionTrip | null>(null);

  const [editingFaqItem, setEditingFaqItem] = useState<FaqQuestionItem | null>(null);
  const [isCreatingFaqItem, setIsCreatingFaqItem] = useState<boolean>(false);

  const [editingSafetyGuide, setEditingSafetyGuide] = useState<SafetyGuide | null>(null);
  const [isCreatingSafetyGuide, setIsCreatingSafetyGuide] = useState<boolean>(false);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'route' | 'trip' | 'article' | 'faq' | 'guide' | 'note' | 'riverReview' | 'crewReview' | 'checklist' | 'permanent_route' | 'permanent_trip' | 'permanent_article' | 'permanent_note' | 'permanent_riverReview' | 'permanent_crewReview' | 'permanent_checklist' | 'permanent_user';
    id: string;
    name: string;
    subtitle?: string;
    isPermanent?: boolean;
  } | null>(null);
  const [userNewPassword, setUserNewPassword] = useState<string>('');
  const [userActionMessage, setUserActionMessage] = useState<string>('');
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleUserAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;
    try {
      const compressed = await compressAvatarFile(file);
      setEditingUser({ ...editingUser, avatar: compressed });
      setUserActionMessage('Фото успешно загружено и сжато');
    } catch (err) {
      console.warn('Avatar compression error:', err);
      setUserActionMessage('Ошибка загрузки фото');
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsSavingUser(true);
    setUserActionMessage('');
    try {
      const updatedUser: AppUser = {
        ...editingUser,
        isDeleted: false,
        updatedAt: new Date().toISOString()
      };

      // 1. Call prop handler
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
      
      // 2. Call CloudSQL update
      try {
        await CloudSqlDbService.adminUpdateUser(updatedUser.id, updatedUser);
      } catch (err) {
        console.warn('Admin API update user note:', err);
      }

      // 3. Sync to CentralSyncManager
      CentralSyncManager.saveUser(updatedUser).catch(console.warn);

      // 4. Update role if changed
      if (editingUser.role) {
        onUpdateUserRole(editingUser.id, editingUser.role);
      }

      setUserActionMessage('Данные пользователя успешно сохранены');
      setTimeout(() => {
        setEditingUser(null);
        setUserActionMessage('');
      }, 700);
    } catch (err: any) {
      setUserActionMessage(err.message || 'Ошибка сохранения данных');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser || !userNewPassword.trim()) return;
    try {
      await CloudSqlDbService.adminResetUserPassword(editingUser.id, userNewPassword.trim());
      setUserActionMessage('Пароль пользователя успешно обновлен!');
      setUserNewPassword('');
    } catch (err: any) {
      setUserActionMessage(err.message || 'Ошибка смены пароля');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      onDeleteUser(userToDelete.id);
      try {
        await CloudSqlDbService.adminDeleteUser(userToDelete.id);
      } catch (e) {
        console.warn('CloudSQL admin delete note:', e);
      }
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
    }
  };

  // 1. DATA QUALITY AUDIT METRICS
  const qualityAudit = useMemo(() => {
    const activeRoutes = filterActiveEntities(routes);
    const routesWithoutGpx = activeRoutes.filter(r => !r.gpxFileName || r.coordinates.length <= 2);
    const routesWithoutLogistics = activeRoutes.filter(r => !r.logisticsTransfer?.accessIn || !r.logisticsTransfer?.accessOut);
    const routesWithoutWarnings = activeRoutes.filter(r => !r.warnings || r.warnings.length === 0);
    const outdatedRoutes = activeRoutes.filter(r => {
      if (!r.lastVerifiedAt && !r.lastPassportRevision) return true;
      const dateStr = r.lastVerifiedAt || r.lastPassportRevision;
      try {
        const diffDays = (Date.now() - new Date(dateStr!).getTime()) / (1000 * 3600 * 24);
        return diffDays > 365;
      } catch {
        return false;
      }
    });

    const activeNotesCount = filterActiveEntities(notesConfig.notes || []).length;
    const activeCrewReviewsCount = filterActiveEntities(notesConfig.crewReviews || []).length;
    const activeRiverReviewsCount = filterActiveEntities(notesConfig.riverReviews || []).length;
    const totalCommunityItems = activeNotesCount + activeCrewReviewsCount + activeRiverReviewsCount;

    return {
      totalRoutes: activeRoutes.length,
      routesWithoutGpx,
      routesWithoutLogistics,
      routesWithoutWarnings,
      outdatedRoutes,
      activeTrips: filterActiveEntities(trips).filter(t => t.status === 'recruiting' || t.status === 'confirmed').length,
      totalUsers: filterActiveEntities(registeredUsers).length,
      totalNotes: totalCommunityItems,
      faqCount: (faqData.faqQuestions || []).length + (faqData.safetyGuides || []).length,
      qualityScore: Math.max(0, Math.min(100, Math.round(
        100 - ((routesWithoutGpx.length * 15 + routesWithoutLogistics.length * 10 + routesWithoutWarnings.length * 10 + outdatedRoutes.length * 5) / (Math.max(1, activeRoutes.length) * 0.4))
      )))
    };
  }, [routes, trips, registeredUsers, notesConfig, faqData]);

  // Full Database Sync Trigger
  const handleFullSync = async () => {
    setIsSyncingAll(true);
    setSyncStatusMsg('Синхронизация Cloud SQL и Firestore...');
    try {
      await Promise.all([
        ...routes.map((r) => RoutesSyncService.saveRoute(r).catch(console.warn)),
        ...trips.map((t) => TripsSyncService.saveTrip(t).catch(console.warn)),
        ...articles.map((a) => ArticlesSyncService.saveArticle(a).catch(console.warn)),
        ...registeredUsers.map((u) => UsersSyncService.saveUser(u).catch(console.warn)),
        FaqSyncService.saveFaq(faqData).catch(console.warn),
        TravelNotesSyncService.saveNotesConfig(notesConfig).catch(console.warn),
        CloudSqlDbService.saveRoutes(routes).catch(console.warn),
        CloudSqlDbService.saveTrips(trips).catch(console.warn),
        CloudSqlDbService.saveArticles(articles).catch(console.warn),
        CloudSqlDbService.saveFaq(faqData).catch(console.warn),
        CloudSqlDbService.saveTravelNotes(notesConfig).catch(console.warn)
      ]);
      setSyncStatusMsg('Все коллекции успешно синхронизированы в облако');
    } catch (e: any) {
      setSyncStatusMsg(`Ошибка: ${e.message || 'Сбой соединения'}`);
    } finally {
      setIsSyncingAll(false);
      setTimeout(() => setSyncStatusMsg(''), 4000);
    }
  };

  // Export Full Site Backup JSON
  const handleExportFullBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      version: '5.0',
      routes,
      trips,
      articles,
      faqData,
      notesConfig,
      registeredUsers: registeredUsers.map(u => ({ ...u, password: '[PROTECTED]', passwordHash: '[PROTECTED]' }))
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Users JSON
  const handleExportUsers = () => {
    const usersData = {
      exportedAt: new Date().toISOString(),
      totalUsers: registeredUsers.length,
      users: registeredUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        city: u.city,
        experienceLevel: u.experienceLevel,
        telegram: u.telegram,
        vk: u.vk,
        vesselsOwned: u.vesselsOwned,
        gearInventory: u.gearInventory,
        badges: u.badges,
        fstrRank: u.fstrRank,
        registeredAt: u.registeredAt,
        updatedAt: u.updatedAt
      }))
    };
    const blob = new Blob([JSON.stringify(usersData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_users_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Notes and Reviews JSON
  const handleExportNotes = () => {
    const notesData = {
      exportedAt: new Date().toISOString(),
      travelNotes: notesConfig.notes || [],
      riverReviews: notesConfig.riverReviews || [],
      crewReviews: notesConfig.crewReviews || [],
      checklist: notesConfig.checklist || []
    };
    const blob = new Blob([JSON.stringify(notesData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_travel_notes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Routes Catalog JSON
  const handleExportRoutes = () => {
    const routesData = {
      exportedAt: new Date().toISOString(),
      totalRoutes: routes.length,
      routes
    };
    const blob = new Blob([JSON.stringify(routesData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_routes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // BACKUP IMPORT & RESTORE ENGINE
  // ==========================================
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupRawJson, setBackupRawJson] = useState<string>('');
  const [backupFileName, setBackupFileName] = useState<string>('splav86_full_backup.json');
  const [backupImportMode, setBackupImportMode] = useState<'merge' | 'replace'>('merge');
  const [isApplyingBackup, setIsApplyingBackup] = useState<boolean>(false);
  const [isDraggingBackupFile, setIsDraggingBackupFile] = useState<boolean>(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic statistics and validation of the JSON payload
  const backupStats = useMemo(() => {
    if (!backupRawJson.trim()) {
      return { isValid: false, error: 'JSON пустой', counts: null, parsed: null };
    }
    try {
      const parsed = JSON.parse(backupRawJson);
      let routesCount = 0;
      let tripsCount = 0;
      let articlesCount = 0;
      let usersCount = 0;
      let notesCount = 0;
      let reviewsCount = 0;
      let faqQuestionsCount = 0;
      let safetyGuidesCount = 0;

      if (Array.isArray(parsed)) {
        if (parsed.length > 0) {
          const first = parsed[0];
          if (first && (first.riverName || first.riverLengthKm !== undefined || first.gpxTrack || first.startPoint)) {
            routesCount = parsed.length;
          } else if (first && (first.email || first.role || first.experienceLevel)) {
            usersCount = parsed.length;
          } else if (first && (first.organizer || first.meetingPoint || first.dates)) {
            tripsCount = parsed.length;
          } else if (first && (first.title && (first.content || first.readingTime))) {
            articlesCount = parsed.length;
          } else {
            routesCount = parsed.length;
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.routes)) routesCount = parsed.routes.length;
        if (Array.isArray(parsed.trips)) tripsCount = parsed.trips.length;
        if (Array.isArray(parsed.articles)) articlesCount = parsed.articles.length;
        if (Array.isArray(parsed.registeredUsers)) usersCount = parsed.registeredUsers.length;
        else if (Array.isArray(parsed.users)) usersCount = parsed.users.length;

        if (parsed.notesConfig) {
          if (Array.isArray(parsed.notesConfig.notes)) notesCount += parsed.notesConfig.notes.length;
          if (Array.isArray(parsed.notesConfig.riverReviews)) reviewsCount += parsed.notesConfig.riverReviews.length;
          if (Array.isArray(parsed.notesConfig.crewReviews)) reviewsCount += parsed.notesConfig.crewReviews.length;
        }
        if (Array.isArray(parsed.travelNotes)) notesCount += parsed.travelNotes.length;
        if (Array.isArray(parsed.notes)) notesCount += parsed.notes.length;
        if (Array.isArray(parsed.riverReviews)) reviewsCount += parsed.riverReviews.length;
        if (Array.isArray(parsed.crewReviews)) reviewsCount += parsed.crewReviews.length;

        if (parsed.faqData) {
          if (Array.isArray(parsed.faqData.faqQuestions)) faqQuestionsCount += parsed.faqData.faqQuestions.length;
          if (Array.isArray(parsed.faqData.safetyGuides)) safetyGuidesCount += parsed.faqData.safetyGuides.length;
        }
        if (Array.isArray(parsed.faqQuestions)) faqQuestionsCount += parsed.faqQuestions.length;
        if (Array.isArray(parsed.safetyGuides)) safetyGuidesCount += parsed.safetyGuides.length;
      }

      const total = routesCount + tripsCount + articlesCount + usersCount + notesCount + reviewsCount + faqQuestionsCount + safetyGuidesCount;

      return {
        isValid: true,
        error: null,
        parsed,
        counts: {
          routes: routesCount,
          trips: tripsCount,
          articles: articlesCount,
          users: usersCount,
          notes: notesCount,
          reviews: reviewsCount,
          faqQuestions: faqQuestionsCount,
          safetyGuides: safetyGuidesCount,
          totalRecognized: total
        }
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: err.message || 'Синтаксическая ошибка в формате JSON',
        counts: null,
        parsed: null
      };
    }
  }, [backupRawJson]);

  const handleTriggerUploadBackup = () => {
    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = '';
      backupFileInputRef.current.click();
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadBackupFile(file);
  };

  const loadBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = (event.target?.result as string) || '';
        const parsed = JSON.parse(content);
        setBackupFileName(file.name);
        setBackupRawJson(JSON.stringify(parsed, null, 2));
        setIsBackupModalOpen(true);
      } catch (err: any) {
        alert(`Ошибка при чтении файла «${file.name}»: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyBackup = async () => {
    if (!backupStats.isValid || !backupStats.parsed) {
      alert('Невозможно применить бэкап: исправьте синтаксические ошибки в JSON');
      return;
    }

    setIsApplyingBackup(true);
    try {
      const parsed = backupStats.parsed;
      const isReplace = backupImportMode === 'replace';
      const appliedSummary: string[] = [];

      // 1. ROUTES
      let nextRoutes = routes;
      const incomingRoutes: RiverRoute[] | undefined = 
        Array.isArray(parsed) && parsed[0]?.riverName ? parsed :
        Array.isArray(parsed.routes) ? parsed.routes : undefined;

      if (incomingRoutes && incomingRoutes.length > 0) {
        nextRoutes = isReplace ? filterActiveEntities(incomingRoutes) : mergeRoutes(routes, incomingRoutes);
        onUpdateRoutes(nextRoutes);
        try {
          localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(nextRoutes));
        } catch (e) {}
        appliedSummary.push(`Маршрутов: ${nextRoutes.length}`);
      }

      // 2. TRIPS
      let nextTrips = trips;
      const incomingTrips: CompanionTrip[] | undefined =
        Array.isArray(parsed) && (parsed[0]?.meetingPoint || parsed[0]?.organizer) ? parsed :
        Array.isArray(parsed.trips) ? parsed.trips : undefined;

      if (incomingTrips && incomingTrips.length > 0) {
        nextTrips = isReplace ? filterActiveEntities(incomingTrips) : mergeTrips(trips, incomingTrips);
        onUpdateTrips(nextTrips);
        try {
          localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(nextTrips));
        } catch (e) {}
        appliedSummary.push(`Сплавов: ${nextTrips.length}`);
      }

      // 3. ARTICLES
      let nextArticles = articles;
      const incomingArticles: Article[] | undefined =
        Array.isArray(parsed) && parsed[0]?.title && (parsed[0]?.content || parsed[0]?.readingTime) ? parsed :
        Array.isArray(parsed.articles) ? parsed.articles : undefined;

      if (incomingArticles && incomingArticles.length > 0) {
        nextArticles = isReplace ? filterActiveEntities(incomingArticles) : (mergeArticles(articles as any, incomingArticles as any) as any);
        onUpdateArticles(nextArticles);
        try {
          localStorage.setItem('splav86_custom_articles', JSON.stringify(nextArticles));
        } catch (e) {}
        appliedSummary.push(`Статей: ${nextArticles.length}`);
      }

      // 4. NOTES & REVIEWS (TravelNotesConfig)
      let nextNotesConfig = notesConfig;
      const incomingNotesConfig: TravelNotesConfig | undefined = 
        parsed.notesConfig ? parsed.notesConfig :
        (parsed.travelNotes || parsed.notes || parsed.riverReviews || parsed.crewReviews || parsed.checklist) ? {
          id: notesConfig.id || 'splav86_travel_notes_main',
          notes: parsed.travelNotes || parsed.notes || notesConfig.notes || [],
          riverReviews: parsed.riverReviews || notesConfig.riverReviews || [],
          crewReviews: parsed.crewReviews || notesConfig.crewReviews || [],
          checklist: parsed.checklist || notesConfig.checklist || [],
          logbookTrips: parsed.logbookTrips || notesConfig.logbookTrips || [],
          updatedAt: new Date().toISOString()
        } : undefined;

      if (incomingNotesConfig) {
        nextNotesConfig = isReplace ? incomingNotesConfig : mergeTravelNotesConfigs(notesConfig, incomingNotesConfig);
        if (onUpdateNotesConfig) onUpdateNotesConfig(nextNotesConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config', JSON.stringify(nextNotesConfig));
        } catch (e) {}
        appliedSummary.push(`Заметок: ${(nextNotesConfig.notes || []).length}`);
      }

      // 5. FAQ & SAFETY DATA
      let nextFaqData = faqData;
      const incomingFaqData: FaqDataConfig | undefined =
        parsed.faqData ? parsed.faqData :
        (parsed.faqQuestions || parsed.safetyGuides || parsed.emergencyContacts || parsed.radioFrequencies || parsed.visualSignals) ? {
          ...faqData,
          faqQuestions: parsed.faqQuestions || faqData.faqQuestions || [],
          safetyGuides: parsed.safetyGuides || faqData.safetyGuides || [],
          emergencyContacts: parsed.emergencyContacts || faqData.emergencyContacts || [],
          radioFrequencies: parsed.radioFrequencies || faqData.radioFrequencies || [],
          visualSignals: parsed.visualSignals || faqData.visualSignals || [],
          updatedAt: new Date().toISOString()
        } : undefined;

      if (incomingFaqData) {
        nextFaqData = isReplace ? incomingFaqData : mergeFaqConfigs(faqData, incomingFaqData);
        if (onUpdateFaqData) onUpdateFaqData(nextFaqData);
        try {
          localStorage.setItem('splav86_faq_data', JSON.stringify(nextFaqData));
        } catch (e) {}
        appliedSummary.push(`FAQ/Безопасность: ${(nextFaqData.faqQuestions || []).length + (nextFaqData.safetyGuides || []).length}`);
      }

      // 6. USERS
      const incomingUsers: AppUser[] | undefined =
        Array.isArray(parsed) && parsed[0]?.email && parsed[0]?.role ? parsed :
        Array.isArray(parsed.registeredUsers) ? parsed.registeredUsers :
        Array.isArray(parsed.users) ? parsed.users : undefined;

      if (incomingUsers && incomingUsers.length > 0) {
        const nextUsers = isReplace ? deduplicateUsers(filterActiveEntities(incomingUsers)) : mergeUsers(registeredUsers, incomingUsers);
        if (onUpdateUsers) onUpdateUsers(nextUsers);
        try {
          localStorage.setItem('splav86_users', JSON.stringify(nextUsers));
        } catch (e) {}
        appliedSummary.push(`Пользователей: ${nextUsers.length}`);
      }

      // 7. Background synchronization with Firestore & Cloud SQL
      CentralSyncManager.saveRoutes(nextRoutes).catch(console.warn);
      CentralSyncManager.saveTrips(nextTrips).catch(console.warn);
      CentralSyncManager.saveArticles(nextArticles).catch(console.warn);
      if (nextNotesConfig) CentralSyncManager.saveNotesConfig(nextNotesConfig).catch(console.warn);
      if (nextFaqData) CentralSyncManager.saveFaqData(nextFaqData).catch(console.warn);

      setSyncStatusMsg(
        `Бэкап успешно применен (${isReplace ? 'Полная замена' : 'Умное слияние'}): ${
          appliedSummary.join(', ') || 'Все данные синхронизированы'
        }`
      );
      setIsBackupModalOpen(false);
      setTimeout(() => setSyncStatusMsg(''), 6000);
    } catch (err: any) {
      console.error('Failed to apply backup:', err);
      alert(`Ошибка применения бэкапа: ${err.message}`);
    } finally {
      setIsApplyingBackup(false);
    }
  };

  // ==========================================
  // ROUTE ACTIONS
  // ==========================================
  const handleSetRouteStatus = (routeId: string, status: 'verified' | 'incomplete' | 'needs_review') => {
    const updated = routes.map((r) => {
      if (r.id !== routeId) return r;
      return {
        ...r,
        verificationStatus: status,
        lastVerifiedAt: new Date().toISOString().split('T')[0]
      };
    });
    if (typeof onUpdateRoutes === 'function') {
      onUpdateRoutes(updated as any);
    }
    try {
      localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    const target = updated.find(r => r.id === routeId);
    if (target) {
      RoutesSyncService.saveRoute(target).catch(console.warn);
      CloudSqlDbService.saveRoute(target).catch(console.warn);
    }
  };

  const handleToggleRoutePublic = (routeId: string) => {
    const updated = routes.map((r) => {
      if (r.id !== routeId) return r;
      return {
        ...r,
        isPublic: !r.isPublic
      };
    });
    if (typeof onUpdateRoutes === 'function') {
      onUpdateRoutes(updated as any);
    }
    try {
      localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    const target = updated.find(r => r.id === routeId);
    if (target) {
      RoutesSyncService.saveRoute(target).catch(console.warn);
      CloudSqlDbService.saveRoute(target).catch(console.warn);
    }
  };

  const handleDeleteRouteConfirmed = (routeId: string, name: string) => {
    const target = routes.find(r => r.id === routeId);
    setItemToDelete({
      type: 'route',
      id: routeId,
      name: name || target?.name || 'Маршрут',
      subtitle: target ? `р. ${target.riverName} • ${target.lengthKm} км • ${target.fstrCategory}` : undefined
    });
  };

  // Filtered routes list
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchesSearch = !searchQuery || 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.riverName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.verificationStatus === statusFilter;
      const matchesRegion = regionFilter === 'all' || r.region === regionFilter;
      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [routes, searchQuery, statusFilter, regionFilter]);

  // ==========================================
  // TRIP ACTIONS
  // ==========================================
  const handleSaveTrip = (tripToSave: CompanionTrip) => {
    const exists = trips.some(t => t.id === tripToSave.id);
    const updated = exists 
      ? trips.map(t => t.id === tripToSave.id ? tripToSave : t)
      : [tripToSave, ...trips];
    
    if (typeof onUpdateTrips === 'function') {
      onUpdateTrips(updated as any);
    }
    try {
      localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    TripsSyncService.saveTrip(tripToSave).catch(console.warn);
    CloudSqlDbService.saveTrip(tripToSave).catch(console.warn);

    setEditingTrip(null);
    setIsCreatingTrip(false);
  };

  const handleDeleteTripConfirmed = (tripId: string, title: string) => {
    const target = trips.find(t => t.id === tripId);
    setItemToDelete({
      type: 'trip',
      id: tripId,
      name: title || target?.title || 'Сплав',
      subtitle: target ? `Река: ${target.riverName || 'не указана'} • Даты: ${target.startDate} – ${target.endDate}` : undefined
    });
  };

  const handleUpdateTripApplicationStatus = (tripId: string, appId: string, newStatus: 'accepted' | 'declined') => {
    const targetTrip = trips.find(t => t.id === tripId);
    if (!targetTrip) return;

    const currentApps = targetTrip.applications || [];
    const appToUpdate = currentApps.find(a => a.id === appId);
    if (!appToUpdate) return;

    const updatedApps = currentApps.map(a => a.id === appId ? { ...a, status: newStatus } : a);
    let updatedParticipants = targetTrip.participants || [];

    if (newStatus === 'accepted') {
      const alreadyInCrew = updatedParticipants.some(p => 
        (p.userId && p.userId === appToUpdate.userId) || p.name === appToUpdate.applicantName
      );
      if (!alreadyInCrew) {
        updatedParticipants = [
          ...updatedParticipants,
          {
            userId: appToUpdate.userId || appToUpdate.applicantUserId,
            name: appToUpdate.applicantName,
            role: 'Участник',
            vessel: appToUpdate.vesselType || 'kayak',
            avatar: appToUpdate.applicantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            phone: appToUpdate.applicantPhone
          }
        ];
      }
    } else if (newStatus === 'declined') {
      updatedParticipants = updatedParticipants.filter(p => 
        (p.userId && p.userId !== appToUpdate.userId) && p.name !== appToUpdate.applicantName
      );
    }

    const updatedTrip: CompanionTrip = {
      ...targetTrip,
      applications: updatedApps,
      participants: updatedParticipants,
      bookedSeats: updatedParticipants.length
    };

    handleSaveTrip(updatedTrip);
    if (selectedTripForApps?.id === tripId) {
      setSelectedTripForApps(updatedTrip);
    }
  };

  // ==========================================
  // FAQ & SAFETY ACTIONS
  // ==========================================
  const handleSaveFaqItem = (itemToSave: FaqQuestionItem) => {
    const currentQuestions = faqData.faqQuestions || [];
    const exists = currentQuestions.some(q => q.id === itemToSave.id);
    const updatedQuestions = exists
      ? currentQuestions.map(q => q.id === itemToSave.id ? itemToSave : q)
      : [itemToSave, ...currentQuestions];

    const updatedFaq: FaqDataConfig = {
      ...faqData,
      faqQuestions: updatedQuestions,
      updatedAt: new Date().toISOString()
    };

    if (onUpdateFaqData) onUpdateFaqData(updatedFaq);
    try {
      localStorage.setItem('splav86_faq_data_v1', JSON.stringify(updatedFaq));
    } catch (e) {}
    FaqSyncService.saveFaq(updatedFaq).catch(console.warn);
    CloudSqlDbService.saveFaq(updatedFaq).catch(console.warn);

    setEditingFaqItem(null);
    setIsCreatingFaqItem(false);
  };

  const handleDeleteFaqItem = (itemId: string) => {
    const q = (faqData.faqQuestions || []).find(x => x.id === itemId);
    setItemToDelete({
      type: 'faq',
      id: itemId,
      name: q?.question || 'Вопрос FAQ'
    });
  };

  const handleSaveSafetyGuide = (guideToSave: SafetyGuide) => {
    const currentGuides = faqData.safetyGuides || [];
    const exists = currentGuides.some(g => g.id === guideToSave.id);
    const updatedGuides = exists
      ? currentGuides.map(g => g.id === guideToSave.id ? guideToSave : g)
      : [guideToSave, ...currentGuides];

    const updatedFaq: FaqDataConfig = {
      ...faqData,
      safetyGuides: updatedGuides,
      updatedAt: new Date().toISOString()
    };

    if (onUpdateFaqData) onUpdateFaqData(updatedFaq);
    try {
      localStorage.setItem('splav86_faq_data_v1', JSON.stringify(updatedFaq));
    } catch (e) {}
    FaqSyncService.saveFaq(updatedFaq).catch(console.warn);
    CloudSqlDbService.saveFaq(updatedFaq).catch(console.warn);

    setEditingSafetyGuide(null);
    setIsCreatingSafetyGuide(false);
  };

  const handleDeleteSafetyGuide = (guideId: string) => {
    const g = (faqData.safetyGuides || []).find(x => x.id === guideId);
    setItemToDelete({
      type: 'guide',
      id: guideId,
      name: g?.title || 'Памятка безопасности'
    });
  };

  // ==========================================
  // TRAVEL NOTES & REVIEWS MODERATION
  // ==========================================
  const handleDeleteTravelNote = (noteId: string) => {
    const n = (notesConfig.notes || []).find(x => x.id === noteId);
    setItemToDelete({
      type: 'note',
      id: noteId,
      name: n?.title || 'Заметка/отчет'
    });
  };

  const handleDeleteRiverReview = (reviewId: string) => {
    const r = (notesConfig.riverReviews || []).find(x => x.id === reviewId);
    setItemToDelete({
      type: 'riverReview',
      id: reviewId,
      name: r ? `Отзыв о реке ${r.riverName}` : 'Отзыв о реке'
    });
  };

  const handleDeleteCrewReview = (reviewId: string) => {
    const r = (notesConfig.crewReviews || []).find(x => x.id === reviewId);
    setItemToDelete({
      type: 'crewReview',
      id: reviewId,
      name: r ? `Отзыв от ${r.authorUserName}` : 'Отзыв экипажа'
    });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const c = (notesConfig.checklist || []).find(x => x.id === itemId);
    setItemToDelete({
      type: 'checklist',
      id: itemId,
      name: c?.text || 'Элемент чек-листа'
    });
  };

  // ==========================================
  // RECYCLE BIN RESTORE & PURGE HANDLERS
  // ==========================================
  const handleRestoreRoute = (routeId: string) => {
    const target = routes.find(r => r.id === routeId);
    if (!target) return;
    const restored: RiverRoute = {
      ...target,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    const updated = routes.map(r => r.id === routeId ? restored : r);
    if (typeof onUpdateRoutes === 'function') onUpdateRoutes(updated as any);
    CentralSyncManager.saveRoute(restored).catch(console.warn);
    setSyncStatusMsg(`Маршрут "${restored.name}" успешно восстановлен`);
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handlePermanentDeleteRoute = (routeId: string) => {
    const target = routes.find(r => r.id === routeId);
    setItemToDelete({
      type: 'permanent_route',
      id: routeId,
      name: target?.name || 'Маршрут',
      isPermanent: true
    });
  };

  const handleRestoreTrip = (tripId: string) => {
    const target = trips.find(t => t.id === tripId);
    if (!target) return;
    const restored: CompanionTrip = {
      ...target,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    const updated = trips.map(t => t.id === tripId ? restored : t);
    if (typeof onUpdateTrips === 'function') onUpdateTrips(updated as any);
    CentralSyncManager.saveTrip(restored).catch(console.warn);
    setSyncStatusMsg(`Сплав "${restored.title}" успешно восстановлен`);
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handlePermanentDeleteTrip = (tripId: string) => {
    const target = trips.find(t => t.id === tripId);
    setItemToDelete({
      type: 'permanent_trip',
      id: tripId,
      name: target?.title || 'Сплав',
      isPermanent: true
    });
  };

  const handleRestoreArticle = (articleId: string) => {
    const target = articles.find(a => a.id === articleId);
    if (!target) return;
    const restored: Article = {
      ...target,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    const updated = articles.map(a => a.id === articleId ? restored : a);
    if (typeof onUpdateArticles === 'function') onUpdateArticles(updated as any);
    CentralSyncManager.saveArticle(restored).catch(console.warn);
    setSyncStatusMsg(`Статья "${restored.title}" успешно восстановлена`);
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handlePermanentDeleteArticle = (articleId: string) => {
    const target = articles.find(a => a.id === articleId);
    setItemToDelete({
      type: 'permanent_article',
      id: articleId,
      name: target?.title || 'Статья',
      isPermanent: true
    });
  };

  const handlePermanentDeleteNote = (noteId: string) => {
    const target = (notesConfig.notes || []).find(n => n.id === noteId);
    setItemToDelete({
      type: 'permanent_note',
      id: noteId,
      name: target?.title || 'Заметка',
      isPermanent: true
    });
  };

  const handlePermanentDeleteCrewReview = (reviewId: string) => {
    const target = (notesConfig.crewReviews || []).find(r => r.id === reviewId);
    setItemToDelete({
      type: 'permanent_crewReview',
      id: reviewId,
      name: target ? `Отзыв об участнике ${target.targetUserName}` : 'Отзыв экипажа',
      isPermanent: true
    });
  };

  const handlePermanentDeleteRiverReview = (reviewId: string) => {
    const target = (notesConfig.riverReviews || []).find(r => r.id === reviewId);
    setItemToDelete({
      type: 'permanent_riverReview',
      id: reviewId,
      name: target ? `Отзыв о реке ${target.riverName}` : 'Отзыв о реке',
      isPermanent: true
    });
  };

  const handlePermanentDeleteChecklistItem = (itemId: string) => {
    const target = (notesConfig.checklist || []).find(c => c.id === itemId);
    setItemToDelete({
      type: 'permanent_checklist',
      id: itemId,
      name: target?.text || 'Пункт чек-листа',
      isPermanent: true
    });
  };

  const handlePermanentDeleteUser = (userId: string) => {
    const target = registeredUsers.find(u => u.id === userId);
    setItemToDelete({
      type: 'permanent_user',
      id: userId,
      name: target?.name || 'Пользователь',
      isPermanent: true
    });
  };

  // Master delete execution handler
  const handleExecuteDeleteItem = async () => {
    if (!itemToDelete) return;
    const { type, id, name } = itemToDelete;

    switch (type) {
      case 'route': {
        if (onDeleteRoute) {
          onDeleteRoute(id);
        }
        const updated = routes.filter(r => r.id !== id);
        if (typeof onUpdateRoutes === 'function') {
          onUpdateRoutes(updated as any);
        }
        try {
          localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
        } catch (e) {}
        RoutesSyncService.removeRoute(id).catch(console.warn);
        CloudSqlDbService.deleteRoute(id).catch(console.warn);
        CentralSyncManager.deleteRoute(id).catch(console.warn);
        setSyncStatusMsg(`Маршрут "${name}" успешно удален`);
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_route': {
        const updated = routes.filter(r => r.id !== id);
        if (typeof onUpdateRoutes === 'function') onUpdateRoutes(updated as any);
        try {
          localStorage.setItem('splav86_custom_routes_v5', JSON.stringify(updated));
        } catch (e) {}
        RoutesSyncService.removeRoute(id).catch(console.warn);
        CloudSqlDbService.deleteRoute(id).catch(console.warn);
        CentralSyncManager.deleteRoute(id).catch(console.warn);
        setSyncStatusMsg('Маршрут окончательно удален из базы');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'trip': {
        if (onDeleteTrip) {
          onDeleteTrip(id);
        }
        const updated = trips.filter(t => t.id !== id);
        if (typeof onUpdateTrips === 'function') {
          onUpdateTrips(updated as any);
        }
        try {
          localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
        } catch (e) {}
        TripsSyncService.removeTrip(id).catch(console.warn);
        CloudSqlDbService.deleteTrip(id).catch(console.warn);
        if (selectedTripForApps?.id === id) setSelectedTripForApps(null);
        setSyncStatusMsg(`Сплав "${name}" успешно удален`);
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_trip': {
        const updated = trips.filter(t => t.id !== id);
        if (typeof onUpdateTrips === 'function') onUpdateTrips(updated as any);
        try {
          localStorage.setItem('splav86_custom_trips_v5', JSON.stringify(updated));
        } catch (e) {}
        TripsSyncService.removeTrip(id).catch(console.warn);
        CloudSqlDbService.deleteTrip(id).catch(console.warn);
        setSyncStatusMsg('Сплав окончательно удален из базы');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'article': {
        if (onDeleteArticle) {
          onDeleteArticle(id);
        }
        const updated = articles.filter(a => a.id !== id);
        if (typeof onUpdateArticles === 'function') {
          onUpdateArticles(updated as any);
        }
        ArticlesSyncService.removeArticle(id).catch(console.warn);
        CloudSqlDbService.deleteArticle(id).catch(console.warn);
        setSyncStatusMsg(`Статья "${name}" удалена`);
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_article': {
        const updated = articles.filter(a => a.id !== id);
        if (typeof onUpdateArticles === 'function') onUpdateArticles(updated as any);
        ArticlesSyncService.removeArticle(id).catch(console.warn);
        CloudSqlDbService.deleteArticle(id).catch(console.warn);
        setSyncStatusMsg('Статья окончательно удалена');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'faq': {
        const updatedQuestions = (faqData.faqQuestions || []).filter(q => q.id !== id);
        const updatedFaq: FaqDataConfig = {
          ...faqData,
          faqQuestions: updatedQuestions,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateFaqData) onUpdateFaqData(updatedFaq);
        try {
          localStorage.setItem('splav86_faq_data_v1', JSON.stringify(updatedFaq));
        } catch (e) {}
        FaqSyncService.saveFaq(updatedFaq).catch(console.warn);
        CloudSqlDbService.saveFaq(updatedFaq).catch(console.warn);
        setSyncStatusMsg('Вопрос FAQ удален');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'guide': {
        const updatedGuides = (faqData.safetyGuides || []).filter(g => g.id !== id);
        const updatedFaq: FaqDataConfig = {
          ...faqData,
          safetyGuides: updatedGuides,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateFaqData) onUpdateFaqData(updatedFaq);
        try {
          localStorage.setItem('splav86_faq_data_v1', JSON.stringify(updatedFaq));
        } catch (e) {}
        FaqSyncService.saveFaq(updatedFaq).catch(console.warn);
        CloudSqlDbService.saveFaq(updatedFaq).catch(console.warn);
        setSyncStatusMsg('Памятка безопасности удалена');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'note': {
        const updatedNotes = (notesConfig.notes || []).map(n => 
          n.id === id ? { ...n, isDeleted: true, updatedAt: new Date().toISOString() } : n
        );
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          notes: updatedNotes,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Заметка перемещена в корзину');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'riverReview': {
        const updatedReviews = (notesConfig.riverReviews || []).map(r => 
          r.id === id ? { ...r, isDeleted: true, updatedAt: new Date().toISOString() } : r
        );
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          riverReviews: updatedReviews,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Отзыв о реке перемещен в корзину');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'crewReview': {
        const updatedReviews = (notesConfig.crewReviews || []).map(r => 
          r.id === id ? { ...r, isDeleted: true, updatedAt: new Date().toISOString() } : r
        );
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          crewReviews: updatedReviews,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Отзыв экипажа перемещен в корзину');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_note': {
        const updatedNotes = (notesConfig.notes || []).filter(n => n.id !== id);
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          notes: updatedNotes,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
          const storedNotes = localStorage.getItem('splav86_travel_notes_v2');
          if (storedNotes) {
            try {
              const list = JSON.parse(storedNotes);
              if (Array.isArray(list)) {
                localStorage.setItem('splav86_travel_notes_v2', JSON.stringify(list.filter((x: any) => x.id !== id)));
              }
            } catch (e) {}
          }
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Заметка окончательно удалена из базы');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_riverReview': {
        const updatedReviews = (notesConfig.riverReviews || []).filter(r => r.id !== id);
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          riverReviews: updatedReviews,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Отзыв о реке окончательно удален');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_crewReview': {
        const updatedReviews = (notesConfig.crewReviews || []).filter(r => r.id !== id);
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          crewReviews: updatedReviews,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
          const storedCrew = localStorage.getItem('splav86_crew_reviews_v2');
          if (storedCrew) {
            try {
              const list = JSON.parse(storedCrew);
              if (Array.isArray(list)) {
                localStorage.setItem('splav86_crew_reviews_v2', JSON.stringify(list.filter((x: any) => x.id !== id)));
              }
            } catch (e) {}
          }
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Отзыв экипажа окончательно удален');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_checklist': {
        const updatedChecklist = (notesConfig.checklist || []).filter(c => c.id !== id);
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          checklist: updatedChecklist,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Элемент чек-листа окончательно удален');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'checklist': {
        const updatedChecklist = (notesConfig.checklist || []).filter(c => c.id !== id);
        const newConfig: TravelNotesConfig = {
          ...notesConfig,
          checklist: updatedChecklist,
          updatedAt: new Date().toISOString()
        };
        if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
        try {
          localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
        } catch (e) {}
        CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
        setSyncStatusMsg('Элемент чек-листа удален');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
      case 'permanent_user': {
        const updatedUsers = registeredUsers.filter(u => u.id !== id);
        if (onUpdateUsers) onUpdateUsers(updatedUsers);
        try {
          await CloudSqlDbService.adminDeleteUser(id);
        } catch (e) {
          console.warn('CloudSQL admin permanent delete user:', e);
        }
        setSyncStatusMsg('Пользователь окончательно удален из базы');
        setTimeout(() => setSyncStatusMsg(''), 3500);
        break;
      }
    }

    setItemToDelete(null);
  };

  const handleRestoreUser = (userId: string) => {
    const target = registeredUsers.find(u => u.id === userId);
    if (!target) return;
    const restored: AppUser = {
      ...target,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };
    onUpdateUserRole(userId, target.role || 'user');
    CentralSyncManager.saveUser(restored).catch(console.warn);
    setSyncStatusMsg(`Пользователь "${restored.name}" успешно восстановлен`);
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handleRestoreTravelNote = (noteId: string) => {
    const updatedNotes = (notesConfig.notes || []).map(n => 
      n.id === noteId ? { ...n, isDeleted: false, updatedAt: new Date().toISOString() } : n
    );
    const newConfig: TravelNotesConfig = {
      ...notesConfig,
      notes: updatedNotes,
      updatedAt: new Date().toISOString()
    };
    if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
    CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
    setSyncStatusMsg('Заметка восстановлена');
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handleRestoreCrewReview = (reviewId: string) => {
    const updatedReviews = (notesConfig.crewReviews || []).map(r => 
      r.id === reviewId ? { ...r, isDeleted: false, updatedAt: new Date().toISOString() } : r
    );
    const newConfig: TravelNotesConfig = {
      ...notesConfig,
      crewReviews: updatedReviews,
      updatedAt: new Date().toISOString()
    };
    if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
    CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
    setSyncStatusMsg('Отзыв экипажа восстановлен');
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handleRestoreRiverReview = (reviewId: string) => {
    const updatedReviews = (notesConfig.riverReviews || []).map(r => 
      r.id === reviewId ? { ...r, isDeleted: false, updatedAt: new Date().toISOString() } : r
    );
    const newConfig: TravelNotesConfig = {
      ...notesConfig,
      riverReviews: updatedReviews,
      updatedAt: new Date().toISOString()
    };
    if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
    CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
    setSyncStatusMsg('Отзыв о реке восстановлен');
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handleRestoreChecklistItem = (itemId: string) => {
    const updatedChecklist = (notesConfig.checklist || []).map(c => 
      c.id === itemId ? { ...c, isDeleted: false, updatedAt: new Date().toISOString() } : c
    );
    const newConfig: TravelNotesConfig = {
      ...notesConfig,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString()
    };
    if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
    CentralSyncManager.saveTravelNotes(newConfig).catch(console.warn);
    setSyncStatusMsg('Пункт чек-листа восстановлен');
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 text-[#2D332D]">
      
      {/* Admin Panel Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#8A3B14]/15 text-[#8A3B14] border border-[#8A3B14]/30">
                Панель управления системой
              </span>
              <span className="text-xs text-[#6B665F]">Администратор: {currentUser?.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A] mt-1">
              Администрирование контента и базы SPLAV86
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={backupFileInputRef}
              accept=".json,application/json"
              onChange={handleBackupFileChange}
              className="hidden"
            />

            <button
              onClick={handleExportFullBackup}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#4A443E] border border-[#E5E0D8] flex items-center gap-1.5 transition-colors"
              title="Выгрузить резервную копию всей базы данных (JSON)"
            >
              <Download className="w-3.5 h-3.5 text-[#8A3B14]" />
              <span>Скачать бэкап</span>
            </button>

            <button
              onClick={handleTriggerUploadBackup}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#4A443E] border border-[#E5E0D8] flex items-center gap-1.5 transition-colors"
              title="Загрузить и применить резервную копию JSON"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Загрузить бэкап</span>
            </button>

            <button
              onClick={handleFullSync}
              disabled={isSyncingAll}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2D5A27] hover:bg-[#3D7136] text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Синхронизация...' : 'Синхронизировать БД'}</span>
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="p-3 bg-[#E8F1E7] border border-[#CDE0CC] text-xs font-bold text-[#2D5A27] rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        {/* Admin Section Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap gap-2 border-t border-[#EEEBE6] pt-3">
          {[
            { id: 'dashboard', label: 'Дашборд & KPI', icon: Activity },
            { id: 'routes', label: 'Паспорта рек & Маршруты', count: filterActiveEntities(routes).length, icon: Compass },
            { id: 'trips', label: 'Сплавы & Заявки', count: filterActiveEntities(trips).length, icon: Users },
            { id: 'travel_notes', label: 'Путевые заметки & Отзывы', count: filterActiveEntities(notesConfig.notes || []).length + filterActiveEntities(notesConfig.crewReviews || []).length + filterActiveEntities(notesConfig.riverReviews || []).length, icon: MessageSquare },
            { id: 'faq_safety', label: 'Безопасность & FAQ', count: (faqData.faqQuestions || []).length + (faqData.safetyGuides || []).length, icon: ShieldAlert },
            { id: 'users', label: 'Пользователи (RBAC)', count: filterActiveEntities(registeredUsers).length, icon: ShieldCheck },
            { id: 'recycle_bin', label: 'Корзина', count: totalDeletedCount, icon: Trash2 },
            { id: 'database', label: 'База данных & Бэкап', icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-between sm:justify-start gap-2 transition-all ${
                  isActive
                    ? 'bg-[#8A3B14] text-white shadow-2xs'
                    : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : tab.id === 'recycle_bin' && tab.count > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#E5E0D8] text-[#2D332D]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. DASHBOARD & KPI */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Всего пользователей</div>
              <div className="text-2xl font-black text-[#1A1F1A] mt-1">{qualityAudit.totalUsers}</div>
              <div className="text-[11px] text-[#2D5A27] font-medium mt-0.5">Активные профили туристов</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Паспортов маршрутов</div>
              <div className="text-2xl font-black text-[#1A1F1A] mt-1">{qualityAudit.totalRoutes}</div>
              <div className="text-[11px] text-[#2B4C7E] font-medium mt-0.5">ХМАО и ЯНАО</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Активных сплавов</div>
              <div className="text-2xl font-black text-[#1A1F1A] mt-1">{qualityAudit.activeTrips}</div>
              <div className="text-[11px] text-[#2D5A27] font-medium mt-0.5">Открытый набор группы</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Индекс качества данных</div>
              <div className="text-2xl font-black text-[#2D5A27] mt-1">
                {Math.max(0, qualityAudit.qualityScore)}%
              </div>
              <div className="text-[11px] text-[#8B7E6D] font-medium mt-0.5">Полнота паспортов рек</div>
            </div>
          </div>

          {/* Quick Actions Hub */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#8A3B14]" />
              Центр оперативного управления разделами
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                onClick={() => setAdminTab('routes')}
                className="p-3.5 rounded-2xl bg-[#F9F7F4] hover:bg-[#F0EBE1] border border-[#EEEBE6] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#8A3B14] transition-colors">Паспорта рек & Маршруты</div>
                  <div className="text-[11px] text-[#6B665F]">{filterActiveEntities(routes).length} рек • статусы, GPX, точки POI</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B7E6D] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setAdminTab('trips')}
                className="p-3.5 rounded-2xl bg-[#F9F7F4] hover:bg-[#F0EBE1] border border-[#EEEBE6] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#8A3B14] transition-colors">Сплавы & Заявки</div>
                  <div className="text-[11px] text-[#6B665F]">{filterActiveEntities(trips).length} экспедиций • модерация экипажей</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B7E6D] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setAdminTab('travel_notes')}
                className="p-3.5 rounded-2xl bg-[#F9F7F4] hover:bg-[#F0EBE1] border border-[#EEEBE6] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#8A3B14] transition-colors">Путевые заметки & Отзывы</div>
                  <div className="text-[11px] text-[#6B665F]">{qualityAudit.totalNotes} записей • дневники и отзывы о реках</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B7E6D] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setAdminTab('faq_safety')}
                className="p-3.5 rounded-2xl bg-[#F9F7F4] hover:bg-[#F0EBE1] border border-[#EEEBE6] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#8A3B14] transition-colors">Безопасность & FAQ</div>
                  <div className="text-[11px] text-[#6B665F]">{qualityAudit.faqCount} памяток • МЧС, медведи, радиосвязь</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B7E6D] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setAdminTab('users')}
                className="p-3.5 rounded-2xl bg-[#F9F7F4] hover:bg-[#F0EBE1] border border-[#EEEBE6] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#8A3B14] transition-colors">Пользователи & Роли RBAC</div>
                  <div className="text-[11px] text-[#6B665F]">{qualityAudit.totalUsers} участников • админы, организаторы</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B7E6D] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setAdminTab('database')}
                className="p-3.5 rounded-2xl bg-[#F9F7F4] hover:bg-[#F0EBE1] border border-[#EEEBE6] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#8A3B14] transition-colors">База данных & Бэкап</div>
                  <div className="text-[11px] text-[#6B665F]">Синхронизация Firestore + Cloud SQL, JSON экспорт</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B7E6D] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              Контроль качества данных (Data Quality Audit)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
                <div className="text-xs font-bold text-[#1A1F1A]">Маршруты без GPX трека</div>
                <div className="text-xl font-black text-[#E54B4B]">{qualityAudit.routesWithoutGpx.length}</div>
                <div className="text-[11px] text-[#6B665F]">Требуется загрузка GPX</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
                <div className="text-xs font-bold text-[#1A1F1A]">Без данных логистики</div>
                <div className="text-xl font-black text-[#D97706]">{qualityAudit.routesWithoutLogistics.length}</div>
                <div className="text-[11px] text-[#6B665F]">Нет точек стапеля/выброски</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
                <div className="text-xs font-bold text-[#1A1F1A]">Без блока предупреждений</div>
                <div className="text-xl font-black text-[#D97706]">{qualityAudit.routesWithoutWarnings.length}</div>
                <div className="text-[11px] text-[#6B665F]">Опасности не заполнены</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
                <div className="text-xs font-bold text-[#1A1F1A]">Не обновлялись &gt; 12 мес.</div>
                <div className="text-xl font-black text-[#8B7E6D]">{qualityAudit.outdatedRoutes.length}</div>
                <div className="text-[11px] text-[#6B665F]">Требуют ревизии</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ROUTES MANAGEMENT */}
      {adminTab === 'routes' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Управление паспортами рек и маршрутами ({routes.length})
              </h2>
              <p className="text-xs text-[#6B665F]">
                Полный контроль: создание, редактирование характеристик рек, точек POI, верификации и публичности
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRoutes}
                className="px-3.5 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Скачать все паспорта рек в формате JSON"
              >
                <Download className="w-4 h-4 text-[#8A3B14]" />
                <span>Экспорт маршрутов</span>
              </button>

              {onOpenPassportEditor && (
                <button
                  onClick={() => onOpenPassportEditor(null)}
                  className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать паспорт реки</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B7E6D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск маршрута по названию, реке, автору..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#E5E0D8] bg-[#F9F7F4]"
              >
                <option value="all">Все регионы</option>
                <option value="ХМАО">ХМАО</option>
                <option value="ЯНАО">ЯНАО</option>
              </select>

              {(['all', 'verified', 'incomplete', 'needs_review'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#8A3B14] text-white'
                      : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                  }`}
                >
                  {st === 'all' ? 'Все' : st === 'verified' ? '🟢 Проверен' : st === 'incomplete' ? '🟡 Неполный' : '🔴 На проверке'}
                </button>
              ))}
            </div>
          </div>

          {/* Routes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEBE6] text-[#8B7E6D] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Маршрут / Река</th>
                  <th className="py-2.5 px-3">Регион</th>
                  <th className="py-2.5 px-3">Доступ</th>
                  <th className="py-2.5 px-3">GPX / Точки</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3">Автор</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEBE6]">
                {filteredRoutes.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9F7F4]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#1A1F1A]">{r.name}</div>
                      <div className="text-[11px] text-[#6B665F]">р. {r.riverName} • {r.lengthKm} км • {r.fstrCategory}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold">{r.region}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleRoutePublic(r.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          r.isPublic || !r.isPersonal
                            ? 'bg-[#E8F1E7] text-[#2D5A27] hover:bg-green-100'
                            : 'bg-[#F9F7F4] text-[#8B7E6D] hover:bg-gray-200'
                        }`}
                        title="Нажмите для переключения публичности"
                      >
                        {r.isPublic || !r.isPersonal ? (
                          <>
                            <Globe className="w-3 h-3 text-[#2D5A27]" />
                            <span>Публичный</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-[#8B7E6D]" />
                            <span>Личный</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      {r.gpxFileName ? (
                        <span className="text-[#2D5A27] font-bold">✓ GPX ({r.coordinates.length} тчк)</span>
                      ) : (
                        <span className="text-[#E54B4B] font-bold">✕ Без GPX</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={r.verificationStatus || 'verified'}
                        onChange={(e) => handleSetRouteStatus(r.id, e.target.value as any)}
                        className="px-2 py-1 rounded-lg text-xs font-bold border border-[#E5E0D8] bg-white"
                      >
                        <option value="verified">🟢 Проверен</option>
                        <option value="incomplete">🟡 Неполный</option>
                        <option value="needs_review">🔴 На проверке</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#6B665F]">
                      {r.authorName || 'SPLAV86'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onOpenPassportEditor && (
                          <button
                            onClick={() => onOpenPassportEditor(r)}
                            className="p-1.5 text-[#2D5A27] hover:bg-[#E8F1E7] rounded-lg transition-colors"
                            title="Редактировать паспорт"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRouteConfirmed(r.id, r.name)}
                          className="p-1.5 text-[#E54B4B] hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить маршрут"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TRIPS & APPLICATIONS MANAGEMENT */}
      {adminTab === 'trips' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Управление сплавами и экспедициями ({trips.length})
              </h2>
              <p className="text-xs text-[#6B665F]">
                Модерация дат, капитанов, статусов набора группы, заявок и состава экипажей
              </p>
            </div>

            <button
              onClick={() => {
                setEditingTrip({
                  id: `trip-${Date.now()}`,
                  title: '',
                  riverName: '',
                  region: 'ХМАО',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                  durationDays: 5,
                  vessels: ['kayak', 'sup'],
                  fstrCategory: 'I к.с.',
                  totalSeats: 6,
                  bookedSeats: 1,
                  organizer: {
                    userId: currentUser?.id,
                    name: currentUser?.name || 'Администратор',
                    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                    experienceYears: 7,
                    completedTrips: 12,
                    fstrRank: 'Инструктор-проводник',
                    phone: currentUser?.phone || '+7 (900) 000-00-00',
                    telegram: currentUser?.telegram || '@splav86'
                  },
                  description: '',
                  requiredExperience: 'Начинающий (0-1 сплав)',
                  gearProvided: ['Костровое оборудование', 'Групповая аптечка'],
                  requiredPersonalGear: ['Личный спасжилет', 'Гермомешок 80л'],
                  estimatedCostPerPersonRub: 5000,
                  status: 'recruiting',
                  participants: [{
                    userId: currentUser?.id,
                    name: currentUser?.name || 'Организатор',
                    role: 'Капитан',
                    vessel: 'kayak',
                    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                    phone: currentUser?.phone
                  }],
                  commentsCount: 0
                });
                setIsCreatingTrip(true);
              }}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Создать сплав</span>
            </button>
          </div>

          {/* Trips Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEBE6] text-[#8B7E6D] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Сплав / Река</th>
                  <th className="py-2.5 px-3">Даты</th>
                  <th className="py-2.5 px-3">Капитан</th>
                  <th className="py-2.5 px-3">Экипаж / Места</th>
                  <th className="py-2.5 px-3">Заявки</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEBE6]">
                {trips.map((t) => {
                  const pendingApps = (t.applications || []).filter(a => a.status === 'pending');
                  return (
                    <tr key={t.id} className="hover:bg-[#F9F7F4]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1A1F1A]">{t.title}</div>
                        <div className="text-[11px] text-[#6B665F]">р. {t.riverName} • {t.region} • {t.fstrCategory}</div>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-semibold text-[#1A1F1A]">{t.startDate} &mdash; {t.endDate}</div>
                        <div className="text-[#8B7E6D]">{t.durationDays} дн.</div>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-bold">{t.organizer.name}</div>
                        <div className="text-[#8B7E6D]">{t.organizer.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#2D5A27]">{t.participants.length}</span> / {t.totalSeats} чел.
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setSelectedTripForApps(t)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            pendingApps.length > 0
                              ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                              : 'bg-[#F9F7F4] text-[#6B665F]'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{t.applications?.length || 0} (новых: {pendingApps.length})</span>
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={t.status}
                          onChange={(e) => {
                            const updated = { ...t, status: e.target.value as any };
                            handleSaveTrip(updated);
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-bold border border-[#E5E0D8] bg-white"
                        >
                          <option value="recruiting">🟢 Набор открыт</option>
                          <option value="confirmed">🔒 Набор закрыт</option>
                          <option value="completed">🏁 Завершен</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingTrip(t);
                              setIsCreatingTrip(false);
                            }}
                            className="p-1.5 text-[#2D5A27] hover:bg-[#E8F1E7] rounded-lg transition-colors"
                            title="Редактировать параметры сплава"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTripConfirmed(t.id, t.title)}
                            className="p-1.5 text-[#E54B4B] hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить сплав"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TRAVEL NOTES & COMMUNITY REVIEWS MODERATION */}
      {adminTab === 'travel_notes' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Путевые заметки, Отчеты и Отзывы сообщества ({qualityAudit.totalNotes})
              </h2>
              <p className="text-xs text-[#6B665F]">
                Модерация пользовательских заметок о реках, взаимных отзывов об экипажах и снаряжения
              </p>
            </div>
            
            {/* Filter Sub-tabs and Export */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: `Все материалы (${activeNotes.length + activeRiverReviews.length + activeCrewReviews.length + activeChecklist.length})` },
                  { id: 'notes', label: `Заметки (${activeNotes.length})` },
                  { id: 'river_reviews', label: `Отзывы о реках (${activeRiverReviews.length})` },
                  { id: 'crew_reviews', label: `Экипажи (${activeCrewReviews.length})` },
                  { id: 'checklist', label: `Чек-листы (${activeChecklist.length})` }
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setNotesSubTab(sub.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      notesSubTab === sub.id
                        ? 'bg-[#2D5A27] text-white shadow-xs'
                        : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportNotes}
                className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Скачать все заметки и отзывы в формате JSON"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" />
                <span>Экспорт заметок</span>
              </button>
            </div>
          </div>

          {/* Sub-section: Travel Notes */}
          {(notesSubTab === 'all' || notesSubTab === 'notes') && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2D5A27]" />
                Заметки и отчеты о реках ({activeNotes.length})
              </h3>

              {activeNotes.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-2xl border border-dashed border-[#E5E0D8]">
                  Нет активных заметок
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeNotes.map((n) => (
                    <div key={n.id} className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs text-[#8B7E6D]">
                          <span className="font-bold text-[#2D5A27]">{n.riverName || 'Река'}</span>
                          <span>{n.createdAt?.split('T')[0] || '2026'}</span>
                        </div>
                        <h5 className="text-xs font-bold text-[#1A1F1A] mt-1">{n.title}</h5>
                        <p className="text-xs text-[#6B665F] line-clamp-2 mt-1">{n.content}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#E5E0D8] pt-2 text-[11px] text-[#6B665F]">
                        <span>Автор: {n.authorName || 'Турист'}</span>
                        <button
                          onClick={() => handleDeleteTravelNote(n.id)}
                          className="text-[#E54B4B] hover:underline font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>В корзину</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-section: River Reviews */}
          {(notesSubTab === 'all' || notesSubTab === 'river_reviews') && (
            <div className="space-y-3 border-t border-[#EEEBE6] pt-4">
              <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2B4C7E]" />
                Отзывы о реках ({activeRiverReviews.length})
              </h3>

              {activeRiverReviews.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-2xl border border-dashed border-[#E5E0D8]">
                  Нет активных отзывов о реках
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRiverReviews.map((rr) => (
                    <div key={rr.id} className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1A1F1A]">р. {rr.riverName}</span>
                          <span className="font-bold text-[#D97706]">★ {rr.ratingOverall} / 5</span>
                        </div>
                        <p className="text-xs text-[#6B665F] mt-1 italic">"{rr.comment}"</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#E5E0D8] pt-2 text-[11px] text-[#6B665F]">
                        <span>Автор: {rr.userName} ({rr.date})</span>
                        <button
                          onClick={() => handleDeleteRiverReview(rr.id)}
                          className="text-[#E54B4B] hover:underline font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>В корзину</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-section: Crew Reviews */}
          {(notesSubTab === 'all' || notesSubTab === 'crew_reviews') && (
            <div className="space-y-3 border-t border-[#EEEBE6] pt-4">
              <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-[#D97706]" />
                Отзывы об участниках экипажей ({activeCrewReviews.length})
              </h3>

              {activeCrewReviews.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-2xl border border-dashed border-[#E5E0D8]">
                  Нет активных отзывов об участниках экипажей
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCrewReviews.map((cr) => (
                    <div key={cr.id} className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1A1F1A]">О ком: {cr.targetUserName}</span>
                          <span className="font-bold text-[#D97706]">★ {cr.ratingOverall} / 5</span>
                        </div>
                        <p className="text-xs text-[#6B665F] mt-1 italic">"{cr.comment}"</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {cr.tags?.map((tg, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#E5E0D8] text-[#2D332D]">
                              {tg}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#E5E0D8] pt-2 text-[11px] text-[#6B665F]">
                        <span>От автора: {cr.authorUserName} ({cr.date})</span>
                        <button
                          onClick={() => handleDeleteCrewReview(cr.id)}
                          className="text-[#E54B4B] hover:underline font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>В корзину</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-section: Checklist items */}
          {(notesSubTab === 'all' || notesSubTab === 'checklist') && (
            <div className="space-y-3 border-t border-[#EEEBE6] pt-4">
              <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A27]" />
                Шаблоны снаряжения чек-листа ({activeChecklist.length})
              </h3>

              {activeChecklist.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-2xl border border-dashed border-[#E5E0D8]">
                  Нет активных элементов чек-листа
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeChecklist.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#1A1F1A]">{item.text}</div>
                        <div className="text-[10px] text-[#8B7E6D]">{item.category}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="text-[#E54B4B] p-1 hover:bg-red-50 rounded"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* 6. FAQ & SAFETY GUIDES & EMERGENCY */}
      {adminTab === 'faq_safety' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Безопасность, Памятки МЧС и База FAQ
              </h2>
              <p className="text-xs text-[#6B665F]">
                Редактирование памяток (медведи, паводки, радиосвязь), экстренных контактов спасателей и вопросов FAQ
              </p>
            </div>
          </div>

          {/* 1. FAQ Questions Manager */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#2D5A27]" />
                Вопросы и ответы FAQ ({faqData.faqQuestions?.length || 0})
              </h3>
              <button
                onClick={() => {
                  setEditingFaqItem({
                    id: `faq-${Date.now()}`,
                    question: '',
                    answer: '',
                    category: 'general',
                    isPopular: true
                  });
                  setIsCreatingFaqItem(true);
                }}
                className="px-2.5 py-1 bg-[#2D5A27] text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить вопрос</span>
              </button>
            </div>

            <div className="divide-y divide-[#EEEBE6] border border-[#EEEBE6] rounded-2xl overflow-hidden bg-[#F9F7F4]">
              {(faqData.faqQuestions || []).map((q) => (
                <div key={q.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition-colors">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-[#1A1F1A] flex items-center gap-2">
                      <span>{q.question}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#E5E0D8] text-[#4A443E]">
                        {q.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B665F] line-clamp-1">{q.answer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditingFaqItem(q);
                        setIsCreatingFaqItem(false);
                      }}
                      className="p-1 text-[#2D5A27] hover:bg-[#E8F1E7] rounded-md transition-colors"
                      title="Изменить"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFaqItem(q.id)}
                      className="p-1 text-[#E54B4B] hover:bg-red-50 rounded-md transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Safety Guides Manager */}
          <div className="space-y-3 border-t border-[#EEEBE6] pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#D97706]" />
                Памятки безопасности и выживания ({faqData.safetyGuides?.length || 0})
              </h3>
              <button
                onClick={() => {
                  setEditingSafetyGuide({
                    id: `guide-${Date.now()}`,
                    category: 'bear',
                    title: '',
                    tag: 'Памятка',
                    readTimeMin: 4,
                    importance: 'Высокая важность',
                    shortSummary: '',
                    rules: ['Правило 1', 'Правило 2'],
                    doList: ['Что делать'],
                    dontList: ['Чего нельзя делать']
                  });
                  setIsCreatingSafetyGuide(true);
                }}
                className="px-2.5 py-1 bg-[#8A3B14] text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить памятку</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(faqData.safetyGuides || []).map((g) => (
                <div key={g.id} className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[#8A3B14]/15 text-[#8A3B14]">
                      {g.importance}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSafetyGuide(g);
                          setIsCreatingSafetyGuide(false);
                        }}
                        className="p-1 text-[#2D5A27] hover:bg-[#E8F1E7] rounded-md transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSafetyGuide(g.id)}
                        className="p-1 text-[#E54B4B] hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-black text-[#1A1F1A]">{g.title}</h4>
                  <p className="text-xs text-[#6B665F] line-clamp-2">{g.shortSummary}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 7. USERS MANAGEMENT & RBAC */}
      {adminTab === 'users' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Управление туристами и ролями (RBAC) ({activeUsers.length})
              </h2>
              <p className="text-xs text-[#6B665F]">
                Назначение прав: Пользователь / Организатор / Редактор / Администратор / Суперадмин
              </p>
            </div>

            <button
              onClick={handleExportUsers}
              className="px-3.5 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Скачать список пользователей в формате JSON"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Экспорт пользователей</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEBE6] text-[#8B7E6D] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Пользователь</th>
                  <th className="py-2.5 px-3">Контакты</th>
                  <th className="py-2.5 px-3">Позывной / Звание</th>
                  <th className="py-2.5 px-3">Роль в системе</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEBE6]">
                {activeUsers.map((u, uIdx) => (
                  <tr key={u.id || `active-user-${uIdx}`} className="hover:bg-[#F9F7F4] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-9 h-9 rounded-xl object-cover border border-[#CDE0CC]"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center font-bold text-xs">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1F1A] flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] bg-[#E8F1E7] text-[#2D5A27] font-bold px-1.5 py-0.2 rounded">Вы</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#6B665F]">Опыт: {u.experienceLevel || u.experience || 'Турист'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#4A443E]">
                      <div className="font-mono">{u.email}</div>
                      {u.phone && <div>{u.phone}</div>}
                      {u.telegram && <div className="text-blue-600">{u.telegram}</div>}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {u.callsign && <span className="font-mono font-bold text-[#2D5A27] block">{u.callsign}</span>}
                      {u.fstrRank && <div className="text-[#8B7E6D]">{u.fstrRank}</div>}
                      {u.city && <div className="text-[#6B665F] text-[10px]">г. {u.city}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateUserRole(u.id, e.target.value as any)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[#E5E0D8] bg-white cursor-pointer"
                      >
                        <option value="user">Пользователь</option>
                        <option value="organizer">Организатор</option>
                        <option value="editor">Редактор</option>
                        <option value="admin">Администратор</option>
                        <option value="superadmin">Суперадмин</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUser({ ...u });
                            setUserNewPassword('');
                            setUserActionMessage('');
                          }}
                          className="px-2.5 py-1.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Редактировать профиль и аватар"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Изменить</span>
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Удалить пользователя"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Удалить</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. RECYCLE BIN (КОРЗИНА МЯГКО УДАЛЕННЫХ ОБЪЕКТОВ) */}
      {adminTab === 'recycle_bin' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEBE6] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Безопасное восстановление
                </span>
                <span className="text-xs text-[#6B665F]">Всего удаленных объектов: {totalDeletedCount}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1F1A] mt-1">
                Корзина удаленных объектов (Recycle Bin)
              </h2>
            </div>
          </div>

          {totalDeletedCount === 0 ? (
            <div className="p-8 sm:p-12 text-center text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-3xl border border-dashed border-[#E5E0D8] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#2D5A27] mx-auto opacity-70" />
              <div className="font-bold text-[#1A1F1A] text-sm">Корзина пуста</div>
              <p>Нет удаленных маршрутов, сплавов, статей, заметок или пользователей.</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Deleted Routes */}
              {deletedRoutes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#8A3B14]" />
                    <h3 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                      Удаленные паспорта рек & маршруты ({deletedRoutes.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {deletedRoutes.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A] flex items-center gap-2">
                            <span>{r.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#6B665F] font-semibold">{r.region}</span>
                          </div>
                          <div className="text-[11px] text-[#6B665F]">
                            р. {r.riverName} • {r.fstrCategory} • {r.lengthKm || 0} км • Обновлено: {r.updatedAt?.split('T')[0] || '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestoreRoute(r.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteRoute(r.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Trips */}
              {deletedTrips.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2D5A27]" />
                    <h3 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                      Удаленные сплавы & экипажи ({deletedTrips.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {deletedTrips.map((t) => (
                      <div key={t.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">{t.title}</div>
                          <div className="text-[11px] text-[#6B665F]">
                            р. {t.riverName} • {t.startDate} — {t.endDate} • Орг: {t.organizer?.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestoreTrip(t.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteTrip(t.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Articles */}
              {deletedArticles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                      Удаленные статьи & отчеты ({deletedArticles.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {deletedArticles.map((a) => (
                      <div key={a.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">{a.title}</div>
                          <div className="text-[11px] text-[#6B665F]">
                            {a.subtitle || a.riverName} • Автор: {a.author}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestoreArticle(a.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteArticle(a.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Notes & Reviews */}
              {(deletedNotes.length > 0 || deletedCrewReviews.length > 0 || deletedRiverReviews.length > 0 || deletedChecklist.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                      Удаленные заметки, отзывы и чек-листы ({deletedNotes.length + deletedCrewReviews.length + deletedRiverReviews.length + deletedChecklist.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {deletedNotes.map((n) => (
                      <div key={n.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">{n.title || 'Заметка без названия'}</div>
                          <div className="text-[11px] text-[#6B665F]">
                            Автор: {n.authorName || '—'} • р. {n.riverName || '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleRestoreTravelNote(n.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteNote(n.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {deletedCrewReviews.map((c) => (
                      <div key={c.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">Отзыв об участнике: {c.targetUserName}</div>
                          <div className="text-[11px] text-[#6B665F]">
                            Автор: {c.authorUserName} • Сплав: {c.tripTitle || '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleRestoreCrewReview(c.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteCrewReview(c.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {deletedRiverReviews.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">Отзыв о реке: {r.riverName}</div>
                          <div className="text-[11px] text-[#6B665F]">
                            Автор: {r.userName} • Оценка: {r.ratingOverall}★
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleRestoreRiverReview(r.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteRiverReview(r.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {deletedChecklist.map((ch) => (
                      <div key={ch.id} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">Пункт снаряжения: {ch.text}</div>
                          <div className="text-[11px] text-[#6B665F]">Категория: {ch.category}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleRestoreChecklistItem(ch.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteChecklistItem(ch.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Users */}
              {deletedUsers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                      Удаленные пользователи ({deletedUsers.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {deletedUsers.map((u, uIdx) => (
                      <div key={u.id ? `del-${u.id}` : `del-user-${uIdx}`} className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#1A1F1A]">{u.name} ({u.email || u.id})</div>
                          <div className="text-[11px] text-[#6B665F]">Роль: {u.role}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleRestoreUser(u.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteUser(u.id)}
                            className="p-1.5 rounded-xl text-[#E54B4B] hover:bg-red-50 transition-colors"
                            title="Удалить навсегда"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* 8. DATABASE & BACKUP */}
      {adminTab === 'database' && (
        <div className="space-y-5">
          {/* Main Status & Header */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#1A1F1A]">
                  Управление базой данных, резервными копиями и импортом
                </h2>
                <p className="text-xs text-[#6B665F] mt-0.5">
                  Полная выгрузка состояния сайта, редактирование JSON оффлайн/онлайн и безопасное восстановление
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportFullBackup}
                  className="px-4 py-2 bg-[#8A3B14] hover:bg-[#A34718] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать полную базу</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                <div className="text-xs font-bold text-[#1A1F1A]">Маршруты (Routes)</div>
                <div className="text-lg font-black text-[#2D5A27]">{routes.length} записей</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                <div className="text-xs font-bold text-[#1A1F1A]">Сплавы (Trips)</div>
                <div className="text-lg font-black text-[#2D5A27]">{trips.length} записей</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                <div className="text-xs font-bold text-[#1A1F1A]">Заметки & Отзывы</div>
                <div className="text-lg font-black text-[#2D5A27]">
                  {(notesConfig.notes || []).length + (notesConfig.crewReviews || []).length + (notesConfig.riverReviews || []).length} записей
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                <div className="text-xs font-bold text-[#1A1F1A]">FAQ & Безопасность</div>
                <div className="text-lg font-black text-[#2D5A27]">
                  {(faqData.faqQuestions || []).length + (faqData.safetyGuides || []).length} записей
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Backup Upload & Restore Engine */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#CDE0CC] shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1A1F1A]">
                  Загрузка и восстановление из бэкапа (Импорт JSON)
                </h3>
                <p className="text-xs text-[#6B665F]">
                  Загрузите скачанный ранее или отредактированный файл бэкапа для применения изменений
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingBackupFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingBackupFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingBackupFile(false);
                const file = e.dataTransfer.files?.[0];
                if (file) loadBackupFile(file);
              }}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                isDraggingBackupFile
                  ? 'border-[#2D5A27] bg-[#E8F1E7]/70 scale-[1.01]'
                  : 'border-[#D5CFE6] bg-[#FAF8FC] hover:border-[#8A3B14]/40 hover:bg-[#F9F7F4]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E0D8] shadow-xs flex items-center justify-center text-[#8A3B14]">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <div className="text-xs sm:text-sm font-black text-[#1A1F1A]">
                  Перетащите сюда JSON-файл бэкапа или выберите на компьютере
                </div>
                <div className="text-[11px] text-[#6B665F]">
                  Поддерживаются полные бэкапы сайта, а также отдельные экспорты (маршруты, пользователи, заметки, FAQ)
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleTriggerUploadBackup}
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Выбрать JSON-файл бэкапа для восстановления</span>
                </button>
              </div>
            </div>

            {/* Instructions Workflow */}
            <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#1A1F1A]">
                <Info className="w-4 h-4 text-[#8A3B14]" />
                <span>Как работает резервное копирование и восстановление:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-[#6B665F]">
                <div className="p-2.5 rounded-xl bg-white border border-[#E5E0D8]">
                  <span className="font-bold text-[#1A1F1A] block mb-0.5">1. Скачивание</span>
                  Скачайте полный бэкап или отдельный раздел (маршруты, пользователи, заметки) в формате JSON.
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E5E0D8]">
                  <span className="font-bold text-[#1A1F1A] block mb-0.5">2. Резервное хранение</span>
                  Сохраняйте копии для безопасности перед внесением крупных правок или миграцией.
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E5E0D8]">
                  <span className="font-bold text-[#1A1F1A] block mb-0.5">3. Загрузка и восстановление</span>
                  Загрузите файл: выберите «Умное слияние» (обновит записи) или «Полная замена» (перезапишет текущую базу).
                </div>
              </div>
            </div>
          </div>

          {/* Targeted Export Section */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
              Целевой экспорт разделов базы данных
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Export Users */}
              <div className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FDFCFB] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <h4 className="text-xs font-bold text-[#1A1F1A]">Пользователи (JSON)</h4>
                  </div>
                  <p className="text-[11px] text-[#6B665F]">
                    Экспорт всех профилей ({registeredUsers.length} чел.) с контактными данными и ролями
                  </p>
                </div>
                <button
                  onClick={handleExportUsers}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать пользователей</span>
                </button>
              </div>

              {/* Export Notes & Reviews */}
              <div className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FDFCFB] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                    <h4 className="text-xs font-bold text-[#1A1F1A]">Заметки & Отзывы (JSON)</h4>
                  </div>
                  <p className="text-[11px] text-[#6B665F]">
                    Экспорт путевых заметок, отзывов экипажа, отзывов о реках и чек-листов
                  </p>
                </div>
                <button
                  onClick={handleExportNotes}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать заметки</span>
                </button>
              </div>

              {/* Export Routes */}
              <div className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FDFCFB] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-[#8A3B14] shrink-0" />
                    <h4 className="text-xs font-bold text-[#1A1F1A]">Паспорта рек & GPX (JSON)</h4>
                  </div>
                  <p className="text-[11px] text-[#6B665F]">
                    Экспорт каталога рек ({routes.length} маршрутов) с точками POI и нитками треков
                  </p>
                </div>
                <button
                  onClick={handleExportRoutes}
                  className="w-full py-2 px-3 bg-[#8A3B14] hover:bg-[#A34718] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать маршруты</span>
                </button>
              </div>
            </div>

            {/* Full Site Backup */}
            <div className="p-4 rounded-2xl border border-[#CDE0CC] bg-[#E8F1E7]/50 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div>
                <h4 className="text-xs font-bold text-[#2D5A27]">Экспорт полного комплексного снапшота базы (JSON)</h4>
                <p className="text-[11px] text-[#6B665F]">Включает маршруты, походы, статьи, FAQ, заметки, отзывы и пользователей</p>
              </div>
              <button
                onClick={handleExportFullBackup}
                className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Скачать полный бэкап (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS & EDITORS
         ========================================== */}

      {/* TRIP APPLICATIONS & CREW MODAL */}
      {selectedTripForApps && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1A1F1A]">Заявки и экипаж: {selectedTripForApps.title}</h3>
                <p className="text-xs text-[#6B665F]">р. {selectedTripForApps.riverName} • Мест: {selectedTripForApps.participants.length} / {selectedTripForApps.totalSeats}</p>
              </div>
              <button
                onClick={() => setSelectedTripForApps(null)}
                className="p-2 text-[#8B7E6D] hover:text-[#1A1F1A] rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applications List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                Поступившие заявки ({selectedTripForApps.applications?.length || 0})
              </h4>

              {(!selectedTripForApps.applications || selectedTripForApps.applications.length === 0) ? (
                <div className="p-4 text-center text-xs text-[#8B7E6D] bg-[#F9F7F4] rounded-2xl">
                  Заявок от туристов пока нет
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTripForApps.applications.map((app) => (
                    <div key={app.id} className="p-3 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-[#1A1F1A] flex items-center gap-2">
                          <span>{app.applicantName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            app.status === 'accepted' ? 'bg-[#E8F1E7] text-[#2D5A27]' :
                            app.status === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {app.status === 'accepted' ? 'Принят в экипаж' : app.status === 'declined' ? 'Отклонен' : 'На рассмотрении'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B665F]">
                          Тел: {app.applicantPhone} • Опыт: {app.experienceLevel} {app.vesselType ? `• Судно: ${app.vesselType}` : ''}
                        </div>
                        {app.notes && <div className="text-[11px] italic text-[#4A443E]">"{app.notes}"</div>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {app.status !== 'accepted' && (
                          <button
                            onClick={() => handleUpdateTripApplicationStatus(selectedTripForApps.id, app.id, 'accepted')}
                            className="px-2.5 py-1 bg-[#2D5A27] text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#3D7136]"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Принять</span>
                          </button>
                        )}
                        {app.status !== 'declined' && (
                          <button
                            onClick={() => handleUpdateTripApplicationStatus(selectedTripForApps.id, app.id, 'declined')}
                            className="px-2.5 py-1 bg-[#F9F7F4] hover:bg-red-50 text-[#E54B4B] border border-[#E54B4B]/30 text-xs font-bold rounded-lg flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Отклонить</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Crew */}
            <div className="space-y-2 border-t border-[#EEEBE6] pt-3">
              <h4 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                Текущий экипаж ({selectedTripForApps.participants.length} чел.)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedTripForApps.participants.map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] flex items-center gap-2.5">
                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="text-xs">
                      <div className="font-bold text-[#1A1F1A]">{p.name}</div>
                      <div className="text-[11px] text-[#6B665F]">{p.role} • {p.vessel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TRIP EDITOR MODAL */}
      {(editingTrip || isCreatingTrip) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A]">
                {isCreatingTrip ? 'Создание нового сплава / экспедиции' : 'Редактирование сплава'}
              </h3>
              <button
                onClick={() => {
                  setEditingTrip(null);
                  setIsCreatingTrip(false);
                }}
                className="p-1.5 text-[#8B7E6D] hover:text-[#1A1F1A] rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingTrip && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Название сплава</label>
                  <input
                    type="text"
                    value={editingTrip.title}
                    onChange={(e) => setEditingTrip({ ...editingTrip, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold text-sm"
                    placeholder="Например: Полярный Урал: Сплав по реке Собь"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Река</label>
                    <input
                      type="text"
                      value={editingTrip.riverName}
                      onChange={(e) => setEditingTrip({ ...editingTrip, riverName: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Регион</label>
                    <select
                      value={editingTrip.region}
                      onChange={(e) => setEditingTrip({ ...editingTrip, region: e.target.value as any })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                    >
                      <option value="ХМАО">ХМАО</option>
                      <option value="ЯНАО">ЯНАО</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Категория трудности</label>
                    <input
                      type="text"
                      value={editingTrip.fstrCategory}
                      onChange={(e) => setEditingTrip({ ...editingTrip, fstrCategory: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                      placeholder="I к.с. / II к.с."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Дата старта</label>
                    <input
                      type="date"
                      value={editingTrip.startDate}
                      onChange={(e) => setEditingTrip({ ...editingTrip, startDate: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Дата завершения</label>
                    <input
                      type="date"
                      value={editingTrip.endDate}
                      onChange={(e) => setEditingTrip({ ...editingTrip, endDate: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Всего мест в группе</label>
                    <input
                      type="number"
                      value={editingTrip.totalSeats}
                      onChange={(e) => setEditingTrip({ ...editingTrip, totalSeats: Number(e.target.value) || 1 })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Имя капитана / организатора</label>
                    <input
                      type="text"
                      value={editingTrip.organizer.name}
                      onChange={(e) => setEditingTrip({
                        ...editingTrip,
                        organizer: { ...editingTrip.organizer, name: e.target.value }
                      })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Телефон / Связь организатора</label>
                    <input
                      type="text"
                      value={editingTrip.organizer.phone}
                      onChange={(e) => setEditingTrip({
                        ...editingTrip,
                        organizer: { ...editingTrip.organizer, phone: e.target.value }
                      })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Описание маршрута и программы</label>
                  <textarea
                    rows={4}
                    value={editingTrip.description}
                    onChange={(e) => setEditingTrip({ ...editingTrip, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEBE6]">
                  <button
                    onClick={() => {
                      setEditingTrip(null);
                      setIsCreatingTrip(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E5E0D8] text-[#6B665F] font-bold hover:bg-gray-100"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleSaveTrip(editingTrip)}
                    className="px-5 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Сохранить сплав</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ ITEM EDITOR MODAL */}
      {(editingFaqItem || isCreatingFaqItem) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-2">
              <h3 className="text-sm font-black text-[#1A1F1A]">
                {isCreatingFaqItem ? 'Новый вопрос FAQ' : 'Редактирование вопроса'}
              </h3>
              <button
                onClick={() => {
                  setEditingFaqItem(null);
                  setIsCreatingFaqItem(false);
                }}
                className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingFaqItem && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Вопрос</label>
                  <input
                    type="text"
                    value={editingFaqItem.question}
                    onChange={(e) => setEditingFaqItem({ ...editingFaqItem, question: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Категория</label>
                  <select
                    value={editingFaqItem.category}
                    onChange={(e) => setEditingFaqItem({ ...editingFaqItem, category: e.target.value as any })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                  >
                    <option value="general">Общие вопросы</option>
                    <option value="permits_gims">Разрешения и ГИМС</option>
                    <option value="satellite_sos">Спутниковая связь & SOS</option>
                    <option value="wildlife">Дикие животные и медведи</option>
                    <option value="routes_logistics">Маршруты и логистика</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Подробный ответ</label>
                  <textarea
                    rows={4}
                    value={editingFaqItem.answer}
                    onChange={(e) => setEditingFaqItem({ ...editingFaqItem, answer: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEEBE6]">
                  <button
                    onClick={() => {
                      setEditingFaqItem(null);
                      setIsCreatingFaqItem(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] text-[#6B665F] font-bold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleSaveFaqItem(editingFaqItem)}
                    className="px-4 py-1.5 rounded-xl bg-[#2D5A27] text-white font-bold"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAFETY GUIDE EDITOR MODAL */}
      {(editingSafetyGuide || isCreatingSafetyGuide) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-2">
              <h3 className="text-sm font-black text-[#1A1F1A]">
                {isCreatingSafetyGuide ? 'Новая памятка безопасности' : 'Редактирование памятки'}
              </h3>
              <button
                onClick={() => {
                  setEditingSafetyGuide(null);
                  setIsCreatingSafetyGuide(false);
                }}
                className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingSafetyGuide && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Заголовок памятки</label>
                  <input
                    type="text"
                    value={editingSafetyGuide.title}
                    onChange={(e) => setEditingSafetyGuide({ ...editingSafetyGuide, title: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Категория опасности</label>
                    <select
                      value={editingSafetyGuide.category}
                      onChange={(e) => setEditingSafetyGuide({ ...editingSafetyGuide, category: e.target.value as any })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                    >
                      <option value="bear">Медведи и хищники</option>
                      <option value="hypothermia">Переохлаждение</option>
                      <option value="rapids">Пороги и перевороты</option>
                      <option value="insects">Гнус и мошка</option>
                      <option value="firstaid">Первая помощь</option>
                      <option value="satellite">Спутниковая связь</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Степень важности</label>
                    <select
                      value={editingSafetyGuide.importance}
                      onChange={(e) => setEditingSafetyGuide({ ...editingSafetyGuide, importance: e.target.value as any })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                    >
                      <option value="Критически важно">Критически важно</option>
                      <option value="Высокая важность">Высокая важность</option>
                      <option value="Рекомендация">Рекомендация</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Краткая инструкция</label>
                  <textarea
                    rows={2}
                    value={editingSafetyGuide.shortSummary}
                    onChange={(e) => setEditingSafetyGuide({ ...editingSafetyGuide, shortSummary: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Обязательные действия (Что делать - по строке на пункт)</label>
                  <textarea
                    rows={3}
                    value={(editingSafetyGuide.doList || []).join('\n')}
                    onChange={(e) => setEditingSafetyGuide({
                      ...editingSafetyGuide,
                      doList: e.target.value.split('\n').filter(Boolean)
                    })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Запрещенные действия (Чего делать нельзя - по строке на пункт)</label>
                  <textarea
                    rows={3}
                    value={(editingSafetyGuide.dontList || []).join('\n')}
                    onChange={(e) => setEditingSafetyGuide({
                      ...editingSafetyGuide,
                      dontList: e.target.value.split('\n').filter(Boolean)
                    })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEEBE6]">
                  <button
                    onClick={() => {
                      setEditingSafetyGuide(null);
                      setIsCreatingSafetyGuide(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] text-[#6B665F] font-bold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleSaveSafetyGuide(editingSafetyGuide)}
                    className="px-4 py-1.5 rounded-xl bg-[#2D5A27] text-white font-bold"
                  >
                    Сохранить памятку
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. MODAL: EDIT USER & AVATAR (АДМИН РЕДАКТИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ) */}
      {editingUser && (
        <div className="fixed inset-0 z-[3300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-[#E5E0D8] shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto my-auto text-[#2D332D]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#E8F1E7] text-[#2D5A27] rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1F1A]">
                    Редактирование профиля туриста
                  </h3>
                  <p className="text-xs text-[#8B7E6D]">
                    ID: <span className="font-mono">{editingUser.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserActionMessage('');
                }}
                className="p-1.5 text-[#8B7E6D] hover:text-[#1A1F1A] rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Message */}
            {userActionMessage && (
              <div className="p-3 bg-[#E8F1E7] border border-[#CDE0CC] text-[#2D5A27] rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{userActionMessage}</span>
              </div>
            )}

            {/* Avatar Section */}
            <div className="p-4 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-3">
              <div className="text-xs font-bold text-[#1A1F1A] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#2D5A27]" />
                <span>Аватарка пользователя</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative shrink-0">
                  {editingUser.avatar ? (
                    <img
                      src={editingUser.avatar}
                      alt={editingUser.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#2D5A27] shadow-xs"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center text-2xl font-black">
                      {editingUser.name ? editingUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Загрузить с устройства</span>
                    </button>
                    {editingUser.avatar && (
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, avatar: '' })}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить фото</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    onChange={handleUserAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-[11px] text-[#8B7E6D]">
                    Поддерживаются любые фото (JPG, PNG, WebP). Автоматически оптимизируется и синхронизируется.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Имя и фамилия *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] font-bold outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Email адрес *</label>
                <input
                  type="email"
                  required
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Роль в системе (RBAC)</label>
                <select
                  value={editingUser.role || 'user'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] font-bold outline-none focus:border-[#2D5A27]"
                >
                  <option value="user">Пользователь (Турист)</option>
                  <option value="organizer">Организатор походов</option>
                  <option value="editor">Редактор контента</option>
                  <option value="admin">Администратор</option>
                  <option value="superadmin">Суперадмин</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Телефон</label>
                <input
                  type="text"
                  placeholder="+7 (922)..."
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Город проживания</label>
                <input
                  type="text"
                  placeholder="Сургут / Ханты-Мансийск / Салехард"
                  value={editingUser.city || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Опыт сплавов</label>
                <select
                  value={editingUser.experienceLevel || editingUser.experience || 'Любитель водных сплавов'}
                  onChange={(e) => setEditingUser({ 
                    ...editingUser, 
                    experienceLevel: e.target.value,
                    experience: e.target.value 
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                >
                  <option value="Начинающий (0-1 сплав)">Начинающий (0-1 сплав)</option>
                  <option value="Средний (2-4 сплава)">Средний (2-4 сплава)</option>
                  <option value="Опытный (5+ сплавов, пороги)">Опытный (5+ сплавов, пороги)</option>
                  <option value="Эксперт / Инструктор-проводник">Эксперт / Инструктор-проводник</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Позывной радиосвязи</label>
                <input
                  type="text"
                  placeholder="Кедр-86"
                  value={editingUser.callsign || editingUser.radioCallsign || ''}
                  onChange={(e) => setEditingUser({ 
                    ...editingUser, 
                    callsign: e.target.value,
                    radioCallsign: e.target.value 
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] font-mono outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A443E] block mb-1">Telegram (@username)</label>
                <input
                  type="text"
                  placeholder="@tourist_86"
                  value={editingUser.telegram || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, telegram: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            {/* Quick Password Reset by Admin */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-700" />
                <span>Сброс / изменение пароля туриста</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Новый пароль (мин. 6 символов)"
                  value={userNewPassword}
                  onChange={(e) => setUserNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-amber-300 text-[#1A1F1A] outline-none focus:border-amber-600"
                />
                <button
                  type="button"
                  disabled={!userNewPassword.trim() || userNewPassword.trim().length < 6}
                  onClick={handleResetPassword}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Установить пароль
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEEBE6]">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setUserActionMessage('');
                }}
                className="px-4 py-2 rounded-xl border border-[#E5E0D8] text-[#6B665F] hover:bg-[#F9F7F4] font-bold text-xs cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isSavingUser}
                onClick={handleSaveUser}
                className="px-5 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#3D7136] disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingUser ? 'Сохранение...' : 'Сохранить профиль'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: DELETE USER CONFIRMATION (БЕЗОПАСНОЕ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ) */}
      {userToDelete && (
        <div className="fixed inset-0 z-[3300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fade-in text-[#2D332D]">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1A1F1A]">
                  Удаление пользователя
                </h3>
                <p className="text-xs text-[#8B7E6D]">
                  Подтверждение удаления аккаунта
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5">
              <p>
                Вы уверены, что хотите удалить пользователя:
              </p>
              <div className="font-bold text-[#1A1F1A] text-sm bg-white p-2 rounded-xl border border-rose-200">
                {userToDelete.name} ({userToDelete.email})
              </div>
              <p className="text-[11px] text-rose-700">
                Роль: <strong>{userToDelete.role}</strong>. Доступ пользователя к системе будет прекращен.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEEBE6]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E0D8] text-[#6B665F] hover:bg-[#F9F7F4] font-bold text-xs cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить аккаунт</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: DELETE ENTITY CONFIRMATION (МАРШРУТЫ, СПЛАВЫ, СТАТЬИ, FAQ) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[3350] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fade-in text-[#2D332D]">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1A1F1A]">
                  {itemToDelete.isPermanent
                    ? 'Окончательное удаление'
                    : itemToDelete.type === 'route'
                    ? 'Удаление паспорта маршрута'
                    : itemToDelete.type === 'trip'
                    ? 'Удаление сплава'
                    : itemToDelete.type === 'article'
                    ? 'Удаление статьи'
                    : 'Подтверждение удаления'}
                </h3>
                <p className="text-xs text-[#8B7E6D]">
                  {itemToDelete.isPermanent
                    ? 'Действие невозможно отменить'
                    : 'Объект будет удален из каталога'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5">
              <p>
                {itemToDelete.isPermanent
                  ? 'Вы действительно хотите БЕЗВОЗВРАТНО удалить:'
                  : 'Вы действительно хотите удалить:'}
              </p>
              <div className="font-bold text-[#1A1F1A] text-sm bg-white p-2.5 rounded-xl border border-rose-200 shadow-xs">
                {itemToDelete.name}
              </div>
              {itemToDelete.subtitle && (
                <p className="text-[11px] text-[#6B665F]">
                  {itemToDelete.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEEBE6]">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E0D8] text-[#6B665F] hover:bg-[#F9F7F4] font-bold text-xs cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteItem}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{itemToDelete.isPermanent ? 'Удалить навсегда' : 'Удалить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACKUP RESTORE MODAL */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-[#E5E0D8] shadow-2xl animate-fadeIn overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#EEEBE6] flex items-center justify-between gap-3 bg-[#FCFAF7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#8A3B14]/10 border border-[#8A3B14]/20 flex items-center justify-center text-[#8A3B14] shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-[#1A1F1A]">
                      Восстановление базы данных из бэкапа
                    </h3>
                    {backupStats.isValid ? (
                      <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Файл валиден
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Ошибка файла
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B665F] truncate max-w-md font-mono mt-0.5">
                    {backupFileName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="p-2 text-[#8B7E6D] hover:text-[#1A1F1A] rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* Error banner if invalid JSON */}
              {!backupStats.isValid && backupStats.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{backupStats.error}</span>
                </div>
              )}

              <div className="space-y-5">
                
                {/* Mode Selector */}
                <div className="p-4 rounded-2xl bg-[#FDFCFB] border border-[#E5E0D8] space-y-3">
                  <label className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider block">
                    Режим применения бэкапа
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <button
                      type="button"
                      onClick={() => setBackupImportMode('merge')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        backupImportMode === 'merge'
                          ? 'border-[#2D5A27] bg-[#E8F1E7]/60 ring-2 ring-[#2D5A27]/20'
                          : 'border-[#E5E0D8] bg-white hover:border-[#8A3B14]/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        backupImportMode === 'merge' ? 'border-[#2D5A27] bg-[#2D5A27]' : 'border-gray-400'
                      }`}>
                        {backupImportMode === 'merge' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1A1F1A]">Умное слияние (Рекомендуется)</div>
                        <div className="text-[11px] text-[#6B665F] mt-0.5">
                          Обновит существующие записи и добавит новые, не удаляя текущие данные.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBackupImportMode('replace')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        backupImportMode === 'replace'
                          ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                          : 'border-[#E5E0D8] bg-white hover:border-[#8A3B14]/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        backupImportMode === 'replace' ? 'border-amber-600 bg-amber-600' : 'border-gray-400'
                      }`}>
                        {backupImportMode === 'replace' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1A1F1A]">Полная замена (Перезапись)</div>
                        <div className="text-[11px] text-[#6B665F] mt-0.5">
                          Полностью перезапишет текущие таблицы данными из загруженного файла.
                        </div>
                      </div>
                    </button>

                  </div>
                </div>

                {/* Recognized Content Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-[#1A1F1A] tracking-wider">
                      Обнаруженные данные в файле
                    </h4>
                    {backupStats.counts && (
                      <span className="text-xs font-bold text-[#2D5A27]">
                        Всего записей: {backupStats.counts.totalRecognized}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    
                    <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                      <div className="flex items-center gap-2 mb-1">
                        <Compass className="w-4 h-4 text-[#8A3B14]" />
                        <span className="text-xs font-bold text-[#1A1F1A]">Маршруты</span>
                      </div>
                      <div className="text-base font-black text-[#2D5A27]">
                        {backupStats.counts?.routes || 0} записей
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-[#2D5A27]" />
                        <span className="text-xs font-bold text-[#1A1F1A]">Сплавы</span>
                      </div>
                      <div className="text-base font-black text-[#2D5A27]">
                        {backupStats.counts?.trips || 0} записей
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-[#1A1F1A]">Пользователи</span>
                      </div>
                      <div className="text-base font-black text-[#2D5A27]">
                        {backupStats.counts?.users || 0} записей
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-[#1A1F1A]">Статьи</span>
                      </div>
                      <div className="text-base font-black text-[#2D5A27]">
                        {backupStats.counts?.articles || 0} записей
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-[#1A1F1A]">Заметки & Отзывы</span>
                      </div>
                      <div className="text-base font-black text-[#2D5A27]">
                        {(backupStats.counts?.notes || 0) + (backupStats.counts?.reviews || 0)} записей
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-[#1A1F1A]">FAQ & Безопасность</span>
                      </div>
                      <div className="text-base font-black text-[#2D5A27]">
                        {(backupStats.counts?.faqQuestions || 0) + (backupStats.counts?.safetyGuides || 0)} записей
                      </div>
                    </div>

                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F0F7EF] border border-[#CDE0CC] text-xs text-[#2D5A27] space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4" />
                    <span>Готово к применению и синхронизации</span>
                  </div>
                  <p className="text-[11px] text-[#3F6B38]">
                    При нажатии «Применить и синхронизировать» система обновит базу данных и запустит централизованную репликацию в Firestore / Cloud SQL.
                  </p>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#EEEBE6] bg-[#FCFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#6B665F]">
                {backupStats.isValid && backupStats.counts ? (
                  <span className="font-bold text-[#1A1F1A]">
                    Режим: <span className={backupImportMode === 'merge' ? 'text-[#2D5A27]' : 'text-amber-700'}>
                      {backupImportMode === 'merge' ? 'Умное слияние' : 'Полная замена'}
                    </span> ({backupStats.counts.totalRecognized} записей)
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">
                    Файл содержит синтаксические ошибки
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E0D8] text-[#6B665F] hover:bg-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleApplyBackup}
                  disabled={!backupStats.isValid || isApplyingBackup}
                  className="px-5 py-2.5 rounded-xl bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  <Save className={`w-4 h-4 ${isApplyingBackup ? 'animate-spin' : ''}`} />
                  <span>{isApplyingBackup ? 'Применение...' : 'Применить и синхронизировать'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
