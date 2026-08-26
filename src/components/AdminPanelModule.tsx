import React, { useState, useMemo } from 'react';
import { 
  AppUser, 
  UserRole, 
  RiverRoute, 
  CompanionTrip, 
  Article, 
  TravelNote, 
  FaqDataConfig, 
  TravelNotesConfig 
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
  AlertCircle
} from 'lucide-react';
import { CloudSqlDbService } from '../services/cloudSqlDb';
import { RoutesSyncService, TripsSyncService, ArticlesSyncService, UsersSyncService, FaqSyncService, TravelNotesSyncService } from '../firebase';

interface AdminPanelModuleProps {
  currentUser: AppUser | null;
  routes: RiverRoute[];
  trips: CompanionTrip[];
  articles: Article[];
  travelNotes: TravelNote[];
  registeredUsers: AppUser[];
  faqData: FaqDataConfig;
  notesConfig: TravelNotesConfig;
  onUpdateRoutes: React.Dispatch<React.SetStateAction<RiverRoute[]>>;
  onUpdateTrips: React.Dispatch<React.SetStateAction<CompanionTrip[]>>;
  onUpdateArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onDeleteUser: (userId: string) => void;
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
  onUpdateUserRole,
  onDeleteUser,
  onOpenPassportEditor,
  onOpenFaqEditor
}) => {
  const [adminTab, setAdminTab] = useState<'dashboard' | 'routes' | 'trips' | 'users' | 'moderation' | 'database' | 'logs'>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'incomplete' | 'needs_review'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // 1. DATA QUALITY AUDIT METRICS (Requirement 11)
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

  // Update Route Verification Status
  const handleSetRouteStatus = (routeId: string, status: 'verified' | 'incomplete' | 'needs_review') => {
    const updated = routes.map((r) => {
      if (r.id !== routeId) return r;
      return {
        ...r,
        verificationStatus: status,
        lastVerifiedAt: new Date().toISOString().split('T')[0]
      };
    });
    onUpdateRoutes(updated);
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

  // Full Database Sync Trigger
  const handleFullSync = async () => {
    setIsSyncingAll(true);
    setSyncStatusMsg('Синхронизация Cloud SQL и Firestore...');
    try {
      await Promise.all([
        ...routes.map((r) => RoutesSyncService.saveRoute(r).catch(console.warn)),
        ...trips.map((t) => TripsSyncService.saveTrip(t).catch(console.warn)),
        ...articles.map((a) => ArticlesSyncService.saveArticle(a).catch(console.warn)),
        CloudSqlDbService.saveRoutes(routes).catch(console.warn),
        CloudSqlDbService.saveTrips(trips).catch(console.warn),
      ]);
      setSyncStatusMsg('Все коллекции успешно синхронизированы');
    } catch (e: any) {
      setSyncStatusMsg(`Ошибка: ${e.message || 'Сбой соединения'}`);
    } finally {
      setIsSyncingAll(false);
      setTimeout(() => setSyncStatusMsg(''), 4000);
    }
  };

  // Filtered routes list
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchesSearch = !searchQuery || 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.riverName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.verificationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routes, searchQuery, statusFilter]);

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
              Администрирование Splav86
            </h1>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="p-3 bg-[#E8F1E7] border border-[#CDE0CC] text-xs font-bold text-[#2D5A27] rounded-xl">
            {syncStatusMsg}
          </div>
        )}

        {/* Admin Section Tabs - Column on mobile, grid/flex on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-2 border-t border-[#EEEBE6] pt-3">
          {[
            { id: 'dashboard', label: 'Дашборд и KPI', icon: Activity },
            { id: 'routes', label: 'Аудит паспортов рек', count: qualityAudit.totalRoutes, icon: Compass },
            { id: 'trips', label: 'Сплавы и заявки', count: trips.length, icon: Users },
            { id: 'users', label: 'Пользователи', count: registeredUsers.length, icon: ShieldCheck },
            { id: 'moderation', label: 'Контент', icon: FileText },
            { id: 'database', label: 'База данных', icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`w-full lg:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-between sm:justify-start gap-2.5 transition-all ${
                  isActive
                    ? 'bg-[#8A3B14] text-white shadow-2xs'
                    : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
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

      {/* 1. DASHBOARD & DATA QUALITY KPI (Requirement 11) */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main KPI Stats Grid */}
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

          {/* Quality Audit Alerts Breakdown */}
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

      {/* 2. ROUTES QUALITY & VERIFICATION MANAGER */}
      {adminTab === 'routes' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">
                Аудит и верификация паспортов рек
              </h2>
              <p className="text-xs text-[#6B665F]">
                Проверка статусов паспортов (🟢 проверен, 🟡 неполный, 🔴 требует проверки) и даты ревизии
              </p>
            </div>

            {onOpenPassportEditor && (
              <button
                onClick={() => onOpenPassportEditor(null)}
                className="px-3.5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
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
                placeholder="Поиск маршрута по названию или реке..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'verified', 'incomplete', 'needs_review'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#8A3B14] text-white'
                      : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                  }`}
                >
                  {st === 'all' ? 'Все' : st === 'verified' ? '🟢 Проверен' : st === 'incomplete' ? '🟡 Неполный' : '🔴 Требует проверки'}
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
                  <th className="py-2.5 px-3">GPX / Точки</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3">Ревизия</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEBE6]">
                {filteredRoutes.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9F7F4]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#1A1F1A]">{r.name}</div>
                      <div className="text-[11px] text-[#6B665F]">р. {r.riverName} • {r.fstrCategory}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold">{r.region}</td>
                    <td className="py-3 px-3">
                      {r.gpxFileName ? (
                        <span className="text-[#2D5A27] font-bold">✓ GPX есть ({r.coordinates.length} тчк)</span>
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
                    <td className="py-3 px-3 text-[11px] text-[#8B7E6D]">
                      {r.lastVerifiedAt || r.lastPassportRevision || '26.08.2026'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onOpenPassportEditor && (
                        <button
                          onClick={() => onOpenPassportEditor(r)}
                          className="px-2.5 py-1 text-xs font-bold text-[#2D5A27] hover:bg-[#E8F1E7] rounded-lg transition-colors"
                        >
                          Редактор
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 3. USERS MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <h2 className="text-base font-black text-[#1A1F1A]">
            Управление пользователями ({registeredUsers.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEBE6] text-[#8B7E6D] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Пользователь</th>
                  <th className="py-2.5 px-3">Контакты</th>
                  <th className="py-2.5 px-3">Роль</th>
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
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateUserRole(u.id, e.target.value as any)}
                        className="px-2 py-1 rounded-lg text-xs font-bold border border-[#E5E0D8] bg-white"
                      >
                        <option value="user">Пользователь</option>
                        <option value="editor">Редактор</option>
                        <option value="admin">Администратор</option>
                        <option value="superadmin">Суперадмин</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DATABASE SYNC & STATUS */}
      {adminTab === 'database' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <h2 className="text-base font-black text-[#1A1F1A]">
            Синхронизация Cloud SQL & Firestore
          </h2>
          <p className="text-xs text-[#6B665F]">
            Архитектура с централизованным хранилищем, защищенными правилами Firestore и резервированием в Cloud SQL.
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
              <div className="text-xs font-bold text-[#1A1F1A]">Статьи и материалы</div>
              <div className="text-lg font-black text-[#2D5A27]">{articles.length} записей</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
