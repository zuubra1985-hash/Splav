import React, { useState, useMemo } from 'react';
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
  X
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
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
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
  onUpdateUserRole,
  onDeleteUser,
  onDeleteRoute,
  onDeleteTrip,
  onDeleteArticle,
  onOpenPassportEditor
}) => {
  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'routes' | 'trips' | 'articles' | 'travel_notes' | 'faq_safety' | 'users' | 'database'
  >('dashboard');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'incomplete' | 'needs_review'>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | 'ХМАО' | 'ЯНАО'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // Editing Modals State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isCreatingArticle, setIsCreatingArticle] = useState<boolean>(false);

  const [editingTrip, setEditingTrip] = useState<CompanionTrip | null>(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState<boolean>(false);
  const [selectedTripForApps, setSelectedTripForApps] = useState<CompanionTrip | null>(null);

  const [editingFaqItem, setEditingFaqItem] = useState<FaqQuestionItem | null>(null);
  const [isCreatingFaqItem, setIsCreatingFaqItem] = useState<boolean>(false);

  const [editingSafetyGuide, setEditingSafetyGuide] = useState<SafetyGuide | null>(null);
  const [isCreatingSafetyGuide, setIsCreatingSafetyGuide] = useState<boolean>(false);

  const [editingEmergencyContact, setEditingEmergencyContact] = useState<FaqEmergencyContact | null>(null);
  const [isCreatingEmergencyContact, setIsCreatingEmergencyContact] = useState<boolean>(false);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // 1. DATA QUALITY AUDIT METRICS
  const qualityAudit = useMemo(() => {
    const routesWithoutGpx = routes.filter(r => !r.gpxFileName || r.coordinates.length <= 2);
    const routesWithoutLogistics = routes.filter(r => !r.logisticsTransfer?.accessIn || !r.logisticsTransfer?.accessOut);
    const routesWithoutWarnings = routes.filter(r => !r.warnings || r.warnings.length === 0);
    const outdatedRoutes = routes.filter(r => {
      if (!r.lastVerifiedAt && !r.lastPassportRevision) return true;
      const dateStr = r.lastVerifiedAt || r.lastPassportRevision;
      try {
        const diffDays = (Date.now() - new Date(dateStr!).getTime()) / (1000 * 3600 * 24);
        return diffDays > 365;
      } catch {
        return false;
      }
    });

    return {
      totalRoutes: routes.length,
      routesWithoutGpx,
      routesWithoutLogistics,
      routesWithoutWarnings,
      outdatedRoutes,
      activeTrips: trips.filter(t => t.status === 'recruiting' || t.status === 'confirmed').length,
      totalUsers: registeredUsers.length,
      totalArticles: articles.length,
      qualityScore: Math.round(
        100 - ((routesWithoutGpx.length * 15 + routesWithoutLogistics.length * 10 + routesWithoutWarnings.length * 10 + outdatedRoutes.length * 5) / (Math.max(1, routes.length) * 0.4))
      )
    };
  }, [routes, trips, registeredUsers, articles]);

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
      registeredUsers: registeredUsers.map(u => ({ ...u, password: '[PROTECTED]' }))
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
    if (!window.confirm(`Удалить паспорт маршрута "${name}" безвозвратно?`)) return;
    if (onDeleteRoute) {
      onDeleteRoute(routeId);
    } else {
      const updated = routes.filter(r => r.id !== routeId);
      if (typeof onUpdateRoutes === 'function') {
        onUpdateRoutes(updated as any);
      }
      RoutesSyncService.removeRoute(routeId).catch(console.warn);
      CloudSqlDbService.deleteRoute(routeId).catch(console.warn);
    }
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
    if (!window.confirm(`Удалить сплав "${title}"?`)) return;
    if (onDeleteTrip) {
      onDeleteTrip(tripId);
    } else {
      const updated = trips.filter(t => t.id !== tripId);
      if (typeof onUpdateTrips === 'function') {
        onUpdateTrips(updated as any);
      }
      TripsSyncService.removeTrip(tripId).catch(console.warn);
      CloudSqlDbService.deleteTrip(tripId).catch(console.warn);
    }
    if (selectedTripForApps?.id === tripId) setSelectedTripForApps(null);
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
  // ARTICLE ACTIONS
  // ==========================================
  const handleSaveArticle = (articleToSave: Article) => {
    const exists = articles.some(a => a.id === articleToSave.id);
    const updated = exists
      ? articles.map(a => a.id === articleToSave.id ? articleToSave : a)
      : [articleToSave, ...articles];

    if (typeof onUpdateArticles === 'function') {
      onUpdateArticles(updated as any);
    }
    try {
      localStorage.setItem('splav86_custom_articles', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    ArticlesSyncService.saveArticle(articleToSave).catch(console.warn);
    CloudSqlDbService.saveArticle(articleToSave).catch(console.warn);

    setEditingArticle(null);
    setIsCreatingArticle(false);
  };

  const handleDeleteArticleConfirmed = (articleId: string, title: string) => {
    if (!window.confirm(`Удалить статью "${title}"?`)) return;
    if (onDeleteArticle) {
      onDeleteArticle(articleId);
    } else {
      const updated = articles.filter(a => a.id !== articleId);
      if (typeof onUpdateArticles === 'function') {
        onUpdateArticles(updated as any);
      }
      ArticlesSyncService.removeArticle(articleId).catch(console.warn);
      CloudSqlDbService.deleteArticle(articleId).catch(console.warn);
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
    if (!window.confirm('Удалить этот вопрос FAQ?')) return;
    const updatedQuestions = (faqData.faqQuestions || []).filter(q => q.id !== itemId);
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
    if (!window.confirm('Удалить эту памятку безопасности?')) return;
    const updatedGuides = (faqData.safetyGuides || []).filter(g => g.id !== guideId);
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
  };

  // ==========================================
  // TRAVEL NOTES & REVIEWS MODERATION
  // ==========================================
  const handleDeleteTravelNote = (noteId: string) => {
    if (!window.confirm('Удалить эту заметку/отчет?')) return;
    const updatedNotes = (notesConfig.notes || []).filter(n => n.id !== noteId);
    const newConfig: TravelNotesConfig = {
      ...notesConfig,
      notes: updatedNotes,
      updatedAt: new Date().toISOString()
    };
    if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
    try {
      localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
    } catch (e) {}
    TravelNotesSyncService.saveNotesConfig(newConfig).catch(console.warn);
    CloudSqlDbService.saveTravelNotes(newConfig).catch(console.warn);
  };

  const handleDeleteCrewReview = (reviewId: string) => {
    if (!window.confirm('Удалить этот отзыв экипажа?')) return;
    const updatedReviews = (notesConfig.crewReviews || []).filter(r => r.id !== reviewId);
    const newConfig: TravelNotesConfig = {
      ...notesConfig,
      crewReviews: updatedReviews,
      updatedAt: new Date().toISOString()
    };
    if (onUpdateNotesConfig) onUpdateNotesConfig(newConfig);
    try {
      localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
    } catch (e) {}
    TravelNotesSyncService.saveNotesConfig(newConfig).catch(console.warn);
    CloudSqlDbService.saveTravelNotes(newConfig).catch(console.warn);
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
            <button
              onClick={handleExportFullBackup}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#4A443E] border border-[#E5E0D8] flex items-center gap-1.5 transition-colors"
              title="Выгрузить резервную копию JSON всего сайта"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт бэкапа</span>
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
            { id: 'routes', label: 'Паспорта рек & Маршруты', count: routes.length, icon: Compass },
            { id: 'trips', label: 'Сплавы & Заявки', count: trips.length, icon: Users },
            { id: 'articles', label: 'Статьи & Гайды', count: articles.length, icon: BookOpen },
            { id: 'travel_notes', label: 'Отчеты & Отзывы', count: (notesConfig.notes || []).length + (notesConfig.crewReviews || []).length, icon: MessageSquare },
            { id: 'faq_safety', label: 'Безопасность & FAQ', count: (faqData.faqQuestions || []).length + (faqData.safetyGuides || []).length, icon: ShieldAlert },
            { id: 'users', label: 'Пользователи (RBAC)', count: registeredUsers.length, icon: ShieldCheck },
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

      {/* 1. DASHBOARD & KPI */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Всего пользователей</div>
              <div className="text-2xl font-black text-[#1A1F1A] mt-1">{qualityAudit.totalUsers}</div>
              <div className="text-[11px] text-[#2D5A27] font-medium mt-0.5">База синхронизирована</div>
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

      {/* 4. ARTICLES & KNOWLEDGE BASE MANAGEMENT */}
      {adminTab === 'articles' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Управление статьями и гайдами ({articles.length})
              </h2>
              <p className="text-xs text-[#6B665F]">
                Публикация, редактирование текстов, лоций, обложек и удаление материалов
              </p>
            </div>

            <button
              onClick={() => {
                setEditingArticle({
                  id: `art-${Date.now()}`,
                  title: '',
                  subtitle: '',
                  author: currentUser?.name || 'Редакция SPLAV86',
                  authorRank: 'Эксперт по водному туризму',
                  riverName: 'Северная Сосьва',
                  region: 'ХМАО',
                  date: new Date().toISOString().split('T')[0],
                  readTimeMin: 7,
                  coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
                  tags: ['Лоция', 'ХМАО', 'Безопасность'],
                  summary: '',
                  fullContent: ['Введение в маршрут...', 'Особенности сплава и стоянки...'],
                  stats: { distanceKm: 120, days: 5, vessel: 'Байдарка / Катамаран', bestMonth: 'Июль' },
                  gallery: []
                });
                setIsCreatingArticle(true);
              }}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Создать статью</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {articles.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] flex flex-col justify-between space-y-3">
                <div className="flex gap-3">
                  <img
                    src={a.coverImage}
                    alt={a.title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#E5E0D8]"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[#2D5A27]/10 text-[#2D5A27]">
                        {a.region}
                      </span>
                      <span className="text-[11px] text-[#8B7E6D]">{a.date}</span>
                    </div>
                    <h4 className="text-sm font-black text-[#1A1F1A] line-clamp-1">{a.title}</h4>
                    <p className="text-xs text-[#6B665F] line-clamp-2">{a.summary || a.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#E5E0D8] pt-2.5 text-xs text-[#6B665F]">
                  <span>Автор: <strong className="text-[#1A1F1A]">{a.author}</strong></span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingArticle(a);
                        setIsCreatingArticle(false);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-[#2D5A27] hover:bg-[#E8F1E7] rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Изменить</span>
                    </button>
                    <button
                      onClick={() => handleDeleteArticleConfirmed(a.id, a.title)}
                      className="p-1 text-[#E54B4B] hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
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

      {/* 5. TRAVEL NOTES & CREW REVIEWS MODERATION */}
      {adminTab === 'travel_notes' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Отчеты о реках и Отзывы экипажей
              </h2>
              <p className="text-xs text-[#6B665F]">
                Модерация пользовательских отчетов TravelNotes и взаимных отзывов туристов
              </p>
            </div>
          </div>

          {/* Sub-section: Travel Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2D5A27]" />
              Заметки и отчеты о реках ({notesConfig.notes?.length || 0})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(notesConfig.notes || []).map((n) => (
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
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-section: Crew Reviews */}
          <div className="space-y-3 border-t border-[#EEEBE6] pt-4">
            <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D97706]" />
              Отзывы об участниках экипажей ({notesConfig.crewReviews?.length || 0})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(notesConfig.crewReviews || []).map((cr) => (
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
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                Управление туристами и ролями (RBAC) ({registeredUsers.length})
              </h2>
              <p className="text-xs text-[#6B665F]">
                Назначение прав: Пользователь / Организатор / Редактор / Администратор / Суперадмин
              </p>
            </div>
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
                {registeredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F9F7F4]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#1A1F1A]">{u.name}</div>
                      <div className="text-[11px] text-[#6B665F]">Опыт: {u.experienceLevel || u.experience || 'Турист'}</div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#4A443E]">
                      <div>{u.email}</div>
                      {u.phone && <div>{u.phone}</div>}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {u.callsign && <span className="font-mono font-bold text-[#2D5A27]">{u.callsign}</span>}
                      {u.fstrRank && <div className="text-[#8B7E6D]">{u.fstrRank}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateUserRole(u.id, e.target.value as any)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[#E5E0D8] bg-white"
                      >
                        <option value="user">Пользователь</option>
                        <option value="organizer">Организатор</option>
                        <option value="editor">Редактор</option>
                        <option value="admin">Администратор</option>
                        <option value="superadmin">Суперадмин</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 text-[#2D5A27] hover:bg-[#E8F1E7] rounded-lg transition-colors"
                          title="Редактировать профиль"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Удалить пользователя ${u.name}?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1.5 text-[#E54B4B] hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* 8. DATABASE & BACKUP */}
      {adminTab === 'database' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <h2 className="text-base font-black text-[#1A1F1A]">
            Управление базой данных и резервными копиями
          </h2>
          <p className="text-xs text-[#6B665F]">
            Централизованное хранилище Firestore, репликация в Cloud SQL API и полный экспорт состояния
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
              <div className="text-xs font-bold text-[#1A1F1A]">Маршруты (Routes)</div>
              <div className="text-lg font-black text-[#2D5A27]">{routes.length} записей</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
              <div className="text-xs font-bold text-[#1A1F1A]">Сплавы (Trips)</div>
              <div className="text-lg font-black text-[#2D5A27]">{trips.length} записей</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
              <div className="text-xs font-bold text-[#1A1F1A]">Статьи & Лоции</div>
              <div className="text-lg font-black text-[#2D5A27]">{articles.length} записей</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FDFCFB] flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <div>
              <h4 className="text-xs font-bold text-[#1A1F1A]">Экспорт полного снапшота базы (JSON)</h4>
              <p className="text-[11px] text-[#6B665F]">Скачать все маршруты, сплавы, статьи, FAQ и пользователей в один файл</p>
            </div>
            <button
              onClick={handleExportFullBackup}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Скачать резервную копию</span>
            </button>
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

      {/* ARTICLE EDITOR MODAL */}
      {(editingArticle || isCreatingArticle) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4 border border-[#E5E0D8] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EEEBE6] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A]">
                {isCreatingArticle ? 'Создание новой статьи / гайда' : 'Редактирование статьи'}
              </h3>
              <button
                onClick={() => {
                  setEditingArticle(null);
                  setIsCreatingArticle(false);
                }}
                className="p-1.5 text-[#8B7E6D] hover:text-[#1A1F1A] rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingArticle && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Заголовок статьи</label>
                  <input
                    type="text"
                    value={editingArticle.title}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold text-sm"
                    placeholder="Например: Полный путеводитель по реке Собь"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Река</label>
                    <input
                      type="text"
                      value={editingArticle.riverName}
                      onChange={(e) => setEditingArticle({ ...editingArticle, riverName: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Регион</label>
                    <select
                      value={editingArticle.region}
                      onChange={(e) => setEditingArticle({ ...editingArticle, region: e.target.value as any })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-bold"
                    >
                      <option value="ХМАО">ХМАО</option>
                      <option value="ЯНАО">ЯНАО</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#1A1F1A] block mb-1">Автор</label>
                    <input
                      type="text"
                      value={editingArticle.author}
                      onChange={(e) => setEditingArticle({ ...editingArticle, author: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">URL Обложки статьи</label>
                  <input
                    type="text"
                    value={editingArticle.coverImage}
                    onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Краткое содержание (Summary)</label>
                  <textarea
                    rows={2}
                    value={editingArticle.summary}
                    onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1F1A] block mb-1">Полный текст статьи (Абзацы или Markdown)</label>
                  <textarea
                    rows={8}
                    value={Array.isArray(editingArticle.fullContent) ? editingArticle.fullContent.join('\n\n') : (editingArticle.content || '')}
                    onChange={(e) => {
                      const text = e.target.value;
                      setEditingArticle({
                        ...editingArticle,
                        fullContent: text.split('\n\n').filter(Boolean),
                        content: text
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] font-mono"
                    placeholder="Введите текст статьи с переносами строк между абзацами..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEBE6]">
                  <button
                    onClick={() => {
                      setEditingArticle(null);
                      setIsCreatingArticle(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E5E0D8] text-[#6B665F] font-bold hover:bg-gray-100"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleSaveArticle(editingArticle)}
                    className="px-5 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Сохранить статью</span>
                  </button>
                </div>
              </div>
            )}
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

    </div>
  );
};
