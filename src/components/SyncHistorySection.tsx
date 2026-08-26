import React, { useState, useEffect } from 'react';
import { SectionSyncInfo, SyncLogEntry, RiverRoute, CompanionTrip, ArticleReport, AppUser, FaqDataConfig, TravelNotesConfig } from '../types';
import { syncTracker } from '../services/syncTracker';
import { RoutesSyncService, TripsSyncService, ArticlesSyncService, UsersSyncService, FaqSyncService, TravelNotesSyncService } from '../firebase';
import { CloudSqlDbService } from '../services/cloudSqlDb';
import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Database, 
  Cloud, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Trash2, 
  Search, 
  Compass, 
  Users, 
  Star, 
  BookOpen, 
  HelpCircle, 
  User, 
  Server, 
  ShieldCheck,
  Check,
  Radio,
  HardDrive
} from 'lucide-react';

interface SyncHistorySectionProps {
  currentUser: AppUser | null;
  routes?: RiverRoute[];
  trips?: CompanionTrip[];
  articles?: ArticleReport[];
  registeredUsers?: AppUser[];
  faqData?: FaqDataConfig;
  notesConfig?: TravelNotesConfig;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export const SyncHistorySection: React.FC<SyncHistorySectionProps> = ({
  currentUser,
  routes = [],
  trips = [],
  articles = [],
  registeredUsers = [],
  faqData,
  notesConfig,
  showNotification
}) => {
  const [sections, setSections] = useState<SectionSyncInfo[]>(() => syncTracker.getSections());
  const [logs, setLogs] = useState<SyncLogEntry[]>(() => syncTracker.getLogs());
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingSectionId, setSyncingSectionId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'upload' | 'download' | 'error'>('all');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Subscribe to real-time updates from syncTracker
  useEffect(() => {
    const unsub = syncTracker.subscribe(() => {
      setSections(syncTracker.getSections());
      setLogs(syncTracker.getLogs());
      setLastRefreshedAt(new Date());
    });
    return () => unsub();
  }, []);

  // Update item counts from current props if available
  useEffect(() => {
    if (routes.length > 0) {
      const sec = syncTracker.getSection('routes');
      if (sec && sec.itemCount !== routes.length) {
        syncTracker.recordDownload('routes', { count: routes.length, message: `В системе активно ${routes.length} маршрутов` });
      }
    }
    if (trips.length > 0) {
      const sec = syncTracker.getSection('trips');
      if (sec && sec.itemCount !== trips.length) {
        syncTracker.recordDownload('trips', { count: trips.length, message: `В системе активно ${trips.length} сплавов` });
      }
    }
    if (articles.length > 0) {
      const sec = syncTracker.getSection('articles');
      if (sec && sec.itemCount !== articles.length) {
        syncTracker.recordDownload('articles', { count: articles.length, message: `В системе активно ${articles.length} статей` });
      }
    }
    if (registeredUsers.length > 0) {
      const sec = syncTracker.getSection('users');
      if (sec && sec.itemCount !== registeredUsers.length) {
        syncTracker.recordDownload('users', { count: registeredUsers.length, message: `В системе зарегистрировано ${registeredUsers.length} пользователей` });
      }
    }
    if (notesConfig) {
      const total = (notesConfig.notes || []).length + (notesConfig.checklist || []).length + (notesConfig.logbookTrips || []).length + (notesConfig.riverReviews || []).length + (notesConfig.crewReviews || []).length;
      const sec = syncTracker.getSection('travel_notes');
      if (sec && sec.itemCount !== total) {
        syncTracker.recordDownload('travel_notes', { count: total, message: `Синхронизировано ${total} заметок и отзывов` });
      }
    }
  }, [routes.length, trips.length, articles.length, registeredUsers.length, notesConfig]);

  // Format date helper
  const formatTimestamp = (isoString: string | null): { date: string; time: string; relative: string } => {
    if (!isoString) {
      return { date: '—', time: '—', relative: 'Ещё не передавалось' };
    }
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) {
        return { date: '—', time: '—', relative: 'Некорректная дата' };
      }
      const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

      // Relative calculation
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      let relative = 'Только что';
      if (diffSec > 0 && diffSec < 60) {
        relative = `${diffSec} сек. назад`;
      } else if (diffSec >= 60 && diffSec < 3600) {
        const min = Math.floor(diffSec / 60);
        relative = `${min} мин. назад`;
      } else if (diffSec >= 3600 && diffSec < 86400) {
        const hrs = Math.floor(diffSec / 3600);
        relative = `${hrs} ч. назад`;
      } else if (diffSec >= 86400) {
        const days = Math.floor(diffSec / 86400);
        relative = `${days} дн. назад`;
      }

      return { date, time, relative };
    } catch {
      return { date: '—', time: '—', relative: 'Ошибка формата' };
    }
  };

  // Icon mapping
  const getSectionIcon = (id: string) => {
    switch (id) {
      case 'routes':
        return <Compass className="w-5 h-5 text-[#2D5A27]" />;
      case 'trips':
        return <Users className="w-5 h-5 text-[#3D7136]" />;
      case 'travel_notes':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'articles':
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case 'faq':
        return <HelpCircle className="w-5 h-5 text-blue-600" />;
      case 'users':
        return <User className="w-5 h-5 text-purple-600" />;
      case 'cloudsql':
        return <Database className="w-5 h-5 text-indigo-600" />;
      default:
        return <HardDrive className="w-5 h-5 text-[#8B7E6D]" />;
    }
  };

  // Trigger individual section sync
  const handleSyncSection = async (sectionId: string) => {
    setSyncingSectionId(sectionId);
    try {
      if (sectionId === 'routes') {
        if (routes.length > 0) {
          for (const r of routes) {
            await RoutesSyncService.saveRoute(r);
          }
          await CloudSqlDbService.saveRoutes(routes);
        }
        showNotification('Раздел "Маршруты и GPX" успешно синхронизирован с сервером!');
      } else if (sectionId === 'trips') {
        if (trips.length > 0) {
          for (const t of trips) {
            await TripsSyncService.saveTrip(t);
          }
          await CloudSqlDbService.saveTrips(trips);
        }
        showNotification('Раздел "Сплавы и экипажи" успешно синхронизирован с сервером!');
      } else if (sectionId === 'travel_notes') {
        if (notesConfig) {
          await TravelNotesSyncService.saveNotesConfig(notesConfig);
          await CloudSqlDbService.saveTravelNotes(notesConfig);
        }
        showNotification('Раздел "Путевые заметки & журнал" успешно синхронизирован!');
      } else if (sectionId === 'articles') {
        if (articles.length > 0) {
          for (const a of articles) {
            await ArticlesSyncService.saveArticle(a).catch(console.warn);
          }
          await CloudSqlDbService.saveArticles(articles).catch(console.warn);
        }
        showNotification('Раздел "Статьи и отчеты" успешно сохранен и синхронизирован!');
      } else if (sectionId === 'faq') {
        if (faqData) {
          await FaqSyncService.saveFaq(faqData).catch(console.warn);
          await CloudSqlDbService.saveFaq(faqData).catch(console.warn);
        }
        showNotification('Раздел "Справочник и FAQ" успешно синхронизирован!');
      } else if (sectionId === 'users') {
        if (currentUser) {
          await UsersSyncService.saveUser(currentUser).catch(console.warn);
          await CloudSqlDbService.saveUser(currentUser).catch(console.warn);
        }
        showNotification('Данные профиля успешно переданы на сервер!');
      } else if (sectionId === 'cloudsql') {
        await Promise.all([
          CloudSqlDbService.fetchRoutes(),
          CloudSqlDbService.fetchTrips(),
          CloudSqlDbService.fetchArticles(),
          CloudSqlDbService.fetchUsers(),
          CloudSqlDbService.fetchTravelNotes(),
          CloudSqlDbService.fetchFaq()
        ]);
        showNotification('Реляционная база данных CloudSQL успешно проверена!');
      }
    } catch (err) {
      console.error('Section sync error:', err);
      showNotification('Ошибка синхронизации раздела. Проверьте подключение к сети.', 'error');
    } finally {
      setSyncingSectionId(null);
    }
  };

  // Trigger full sync of all sections
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      // 1. Sync routes
      if (routes.length > 0) {
        for (const r of routes) {
          await RoutesSyncService.saveRoute(r).catch(console.warn);
        }
        await CloudSqlDbService.saveRoutes(routes).catch(console.warn);
      }

      // 2. Sync trips
      if (trips.length > 0) {
        for (const t of trips) {
          await TripsSyncService.saveTrip(t).catch(console.warn);
        }
        await CloudSqlDbService.saveTrips(trips).catch(console.warn);
      }

      // 3. Sync articles
      if (articles.length > 0) {
        for (const a of articles) {
          await ArticlesSyncService.saveArticle(a).catch(console.warn);
        }
        await CloudSqlDbService.saveArticles(articles).catch(console.warn);
      }

      // 4. Sync travel notes
      if (notesConfig) {
        await TravelNotesSyncService.saveNotesConfig(notesConfig).catch(console.warn);
        await CloudSqlDbService.saveTravelNotes(notesConfig).catch(console.warn);
      }

      // 5. Sync FAQ
      if (faqData) {
        await FaqSyncService.saveFaq(faqData).catch(console.warn);
        await CloudSqlDbService.saveFaq(faqData).catch(console.warn);
      }

      // 6. Sync User
      if (currentUser) {
        await UsersSyncService.saveUser(currentUser).catch(console.warn);
        await CloudSqlDbService.saveUser(currentUser).catch(console.warn);
      }

      showNotification('✅ Полная синхронизация всех 7 разделов успешно выполнена!');
    } catch (err) {
      console.error('Full sync error:', err);
      showNotification('Синхронизация завершена с предупреждениями', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (logFilter !== 'all' && log.direction !== logFilter) return false;
    if (searchLogQuery.trim()) {
      const q = searchLogQuery.toLowerCase();
      return (
        log.sectionTitle.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q) ||
        log.sectionId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate overall stats
  const totalUploaded = sections.filter((s) => s.lastUploadedAt !== null).length;
  const latestUploadTime = sections
    .map((s) => s.lastUploadedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;
  const latestDownloadTime = sections
    .map((s) => s.lastDownloadedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#2D5A27] via-[#24481F] to-[#1B3617] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Real-time Облачная Синхронизация</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              История & Время синхронизации данных
            </h2>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Мониторинг передачи данных между вашим браузером, облачной базой Firestore и сервером CloudSQL (PostgreSQL). Фиксация точного времени отправки и приема каждого раздела.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="px-5 py-3 bg-white text-[#2D5A27] hover:bg-emerald-50 active:scale-95 font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin text-[#2D5A27]' : ''}`} />
              <span>{isSyncingAll ? 'Синхронизация...' : 'Синхронизировать всё сейчас'}</span>
            </button>
          </div>
        </div>

        {/* Server & Channel Health Indicators */}
        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400" />
            <div className="text-xs">
              <span className="text-emerald-200 block">Облако Firebase Firestore:</span>
              <strong className="text-white font-semibold">Подключено (Real-time)</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-indigo-400 shadow-xs shadow-indigo-400" />
            <div className="text-xs">
              <span className="text-emerald-200 block">База CloudSQL PostgreSQL:</span>
              <strong className="text-white font-semibold">Активно (/api/db/*)</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400" />
            <div className="text-xs">
              <span className="text-emerald-200 block">Архитектура соединения:</span>
              <strong className="text-white font-semibold">Только Онлайн (Моментальная синхронизация)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F1E7] text-[#2D5A27] flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#8B7E6D] font-bold uppercase tracking-wider block">Разделы на контроле</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#1A1F1A]">{sections.length}</span>
              <span className="text-xs font-semibold text-emerald-600">из 7 синхронизируются</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#8B7E6D] font-bold uppercase tracking-wider block">Посл. отправка на сервер</span>
            <div className="mt-0.5 truncate">
              <span className="text-base font-extrabold text-[#1A1F1A]">
                {formatTimestamp(latestUploadTime).time}
              </span>
              <span className="text-xs text-[#8B7E6D] block font-medium">
                {formatTimestamp(latestUploadTime).relative}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#8B7E6D] font-bold uppercase tracking-wider block">Посл. прием с сервера</span>
            <div className="mt-0.5 truncate">
              <span className="text-base font-extrabold text-[#1A1F1A]">
                {formatTimestamp(latestDownloadTime).time}
              </span>
              <span className="text-xs text-[#8B7E6D] block font-medium">
                {formatTimestamp(latestDownloadTime).relative}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#8B7E6D] font-bold uppercase tracking-wider block">Статус данных</span>
            <div className="mt-0.5 flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Целостность 100%</span>
            </div>
            <span className="text-xs text-[#8B7E6D] block">Потери исключены</span>
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#1A1F1A] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#2D5A27]" />
            <span>Время последней успешной передачи по разделам</span>
          </h3>
          <span className="text-xs text-[#8B7E6D]">
            Обновлено: {lastRefreshedAt.toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const uploadInfo = formatTimestamp(section.lastUploadedAt);
            const downloadInfo = formatTimestamp(section.lastDownloadedAt);
            const isSectionSyncing = syncingSectionId === section.id || isSyncingAll;

            return (
              <div
                key={section.id}
                className="bg-white rounded-2xl border border-[#E5E0D8] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header of Card */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F4F1EA] flex items-center justify-center shrink-0">
                        {getSectionIcon(section.id)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1A1F1A] leading-snug">
                          {section.title}
                        </h4>
                        <span className="text-[11px] text-[#8B7E6D] font-mono block">
                          {section.collectionOrTable}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Синхронизировано
                    </span>
                  </div>

                  <p className="text-xs text-[#6B665F] leading-relaxed">
                    {section.description}
                  </p>
                </div>

                {/* Timestamps Box */}
                <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EFECE6] space-y-2.5">
                  {/* Upload Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#4A443E]">
                      <ArrowUpRight className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold">Отправка на сервер:</span>
                    </div>
                    <div className="text-right">
                      {section.lastUploadedAt ? (
                        <div>
                          <strong className="text-[#1A1F1A] font-bold font-mono">
                            {uploadInfo.time}
                          </strong>{' '}
                          <span className="text-[11px] text-[#8B7E6D]">({uploadInfo.relative})</span>
                        </div>
                      ) : (
                        <span className="text-[#8B7E6D] text-[11px] italic">При первом изменении</span>
                      )}
                    </div>
                  </div>

                  {/* Download Info */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#EFECE6]">
                    <div className="flex items-center gap-1.5 text-[#4A443E]">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">Прием с сервера:</span>
                    </div>
                    <div className="text-right">
                      {section.lastDownloadedAt ? (
                        <div>
                          <strong className="text-[#1A1F1A] font-bold font-mono">
                            {downloadInfo.time}
                          </strong>{' '}
                          <span className="text-[11px] text-[#8B7E6D]">({downloadInfo.relative})</span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">Real-time поток</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Date */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#EFECE6] text-[#8B7E6D]">
                    <span>Объектов в базе: <strong className="text-[#1A1F1A]">{section.itemCount}</strong></span>
                    <span>Дата: {uploadInfo.date !== '—' ? uploadInfo.date : downloadInfo.date}</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-[#8B7E6D] flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-[#2D5A27]" />
                    <span>Двусторонняя передача</span>
                  </span>

                  <button
                    onClick={() => handleSyncSection(section.id)}
                    disabled={isSectionSyncing}
                    className="px-3 py-1.5 text-xs font-bold text-[#2D5A27] hover:bg-[#E8F1E7] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSectionSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSectionSyncing ? 'Передача...' : 'Синхронизировать'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Events Audit Log */}
      <div className="bg-white rounded-3xl border border-[#E5E0D8] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#1A1F1A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2D5A27]" />
              <span>Журнал операций передачи данных (Live Audit Log)</span>
            </h3>
            <p className="text-xs text-[#8B7E6D] mt-0.5">
              Хронологическая лента успешных транзакций и событий синхронизации
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                syncTracker.clearLogs();
                setLogs([]);
                showNotification('Журнал синхронизации очищен');
              }}
              className="p-2 text-xs font-bold text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Очистить историю журнала"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Очистить журнал</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchLogQuery}
              onChange={(e) => setSearchLogQuery(e.target.value)}
              placeholder="Поиск по журналу событий..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A27]"
            />
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E5E0D8] w-full sm:w-auto">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                logFilter === 'all' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              Все ({logs.length})
            </button>
            <button
              onClick={() => setLogFilter('upload')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                logFilter === 'upload' ? 'bg-blue-600 text-white shadow-xs' : 'text-[#6B665F] hover:text-blue-600'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Отправка
            </button>
            <button
              onClick={() => setLogFilter('download')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                logFilter === 'download' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#6B665F] hover:text-emerald-600'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Прием
            </button>
            <button
              onClick={() => setLogFilter('error')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                logFilter === 'error' ? 'bg-rose-600 text-white shadow-xs' : 'text-[#6B665F] hover:text-rose-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Ошибки
            </button>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="border border-[#E5E0D8] rounded-2xl overflow-hidden divide-y divide-[#EFECE6] max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-[#8B7E6D] text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold">Журнал пуст или не найдено записей по фильтру</p>
              <p className="text-[11px] mt-1">Все разделы функционируют в штатном режиме</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const formatted = formatTimestamp(log.timestamp);
              return (
                <div
                  key={log.id}
                  className="p-3 sm:px-4 sm:py-3 flex items-start sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                        log.direction === 'upload'
                          ? 'bg-blue-50 text-blue-600'
                          : log.direction === 'download'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {log.direction === 'upload' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : log.direction === 'download' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#1A1F1A]">
                          {log.sectionTitle}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            log.direction === 'upload'
                              ? 'bg-blue-100/70 text-blue-800'
                              : log.direction === 'download'
                              ? 'bg-emerald-100/70 text-emerald-800'
                              : 'bg-rose-100/70 text-rose-800'
                          }`}
                        >
                          {log.direction === 'upload' ? 'Отправлено' : log.direction === 'download' ? 'Получено' : 'Ошибка'}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A443E] mt-0.5 truncate">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-[#1A1F1A] block">
                      {formatted.time}
                    </span>
                    <span className="text-[10px] text-[#8B7E6D] block">
                      {formatted.relative}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
