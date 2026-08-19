import React, { useState } from 'react';
import { RiverRoute, HydroStation, ArticleReport, CompanionTrip, Region, VesselType, RoutePOI } from '../types';
import { 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  Image as ImageIcon, 
  MapPin, 
  Droplets, 
  BookOpen, 
  Users, 
  Compass, 
  CheckCircle2, 
  AlertCircle,
  FileJson,
  Layers,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminModuleProps {
  routes: RiverRoute[];
  setRoutes: React.Dispatch<React.SetStateAction<RiverRoute[]>>;
  hydroStations: HydroStation[];
  setHydroStations: React.Dispatch<React.SetStateAction<HydroStation[]>>;
  articles: ArticleReport[];
  setArticles: React.Dispatch<React.SetStateAction<ArticleReport[]>>;
  trips: CompanionTrip[];
  setTrips: React.Dispatch<React.SetStateAction<CompanionTrip[]>>;
  onResetToDefaults: () => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
  routes,
  setRoutes,
  hydroStations,
  setHydroStations,
  articles,
  setArticles,
  trips,
  setTrips,
  onResetToDefaults
}) => {
  const [adminTab, setAdminTab] = useState<'routes' | 'hydro' | 'articles' | 'trips' | 'backup'>('routes');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit / Create States
  const [editingRoute, setEditingRoute] = useState<RiverRoute | null>(null);
  const [isNewRoute, setIsNewRoute] = useState<boolean>(false);

  const [editingHydro, setEditingHydro] = useState<HydroStation | null>(null);
  const [isNewHydro, setIsNewHydro] = useState<boolean>(false);

  const [editingArticle, setEditingArticle] = useState<ArticleReport | null>(null);
  const [isNewArticle, setIsNewArticle] = useState<boolean>(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ----------------------------------------------------
  // ROUTES CRUD
  // ----------------------------------------------------
  const handleOpenNewRoute = () => {
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
      showNotification(`Маршрут "${editingRoute.name}" успешно добавлен!`);
    } else {
      setRoutes((prev) => prev.map((r) => (r.id === editingRoute.id ? editingRoute : r)));
      showNotification(`Маршрут "${editingRoute.name}" успешно сохранен!`);
    }

    setEditingRoute(null);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleDeleteRoute = (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить маршрут "${name}"?`)) {
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      showNotification(`Маршрут "${name}" удален.`, 'error');
    }
  };

  // ----------------------------------------------------
  // HYDRO STATIONS CRUD
  // ----------------------------------------------------
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
        { date: '12.08', level: 235 },
        { date: '13.08', level: 240 },
        { date: '14.08', level: 242 },
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
    setEditingHydro(null);
  };

  const handleDeleteHydro = (id: string, name: string) => {
    if (window.confirm(`Удалить гидропост "${name}"?`)) {
      setHydroStations((prev) => prev.filter((h) => h.id !== id));
      showNotification(`Гидропост "${name}" удален.`, 'error');
    }
  };

  // ----------------------------------------------------
  // ARTICLES CRUD
  // ----------------------------------------------------
  const handleOpenNewArticle = () => {
    const template: ArticleReport = {
      id: `art-${Date.now()}`,
      title: 'Новая лоция реки',
      subtitle: 'Практическое руководство по сплаву',
      riverName: 'Северная река',
      region: 'ХМАО',
      author: 'Администрация Splav86',
      authorRank: 'Эксперт',
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

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    if (isNewArticle) {
      setArticles((prev) => [editingArticle, ...prev]);
      showNotification(`Статья "${editingArticle.title}" опубликована!`);
    } else {
      setArticles((prev) => prev.map((a) => (a.id === editingArticle.id ? editingArticle : a)));
      showNotification(`Статья "${editingArticle.title}" сохранена!`);
    }
    setEditingArticle(null);
  };

  const handleDeleteArticle = (id: string, title: string) => {
    if (window.confirm(`Удалить статью "${title}"?`)) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showNotification(`Статья удалена.`, 'error');
    }
  };

  // ----------------------------------------------------
  // BACKUP & RESTORE TOOLS
  // ----------------------------------------------------
  const handleExportFullDatabase = () => {
    const fullDb = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      routes,
      hydroStations,
      articles,
      trips
    };

    const blob = new Blob([JSON.stringify(fullDb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Полная база данных успешно экспортирована в JSON файл!');
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

        showNotification('База данных успешно восстановлена из файла!');
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (err) {
        showNotification('Ошибка парсинга JSON файла резервной копии!', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
              Личный кабинет администратора
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
            Прямое редактирование контента сайта, добавление маршрутов, гидропостов, статей и модерация походов.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-[#F9F7F4] p-1 rounded-2xl border border-[#EEEBE6] self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setAdminTab('routes')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'routes'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Маршруты ({routes.length})
          </button>

          <button
            onClick={() => setAdminTab('hydro')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'hydro'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Гидропосты ({hydroStations.length})
          </button>

          <button
            onClick={() => setAdminTab('articles')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'articles'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Статьи ({articles.length})
          </button>

          <button
            onClick={() => setAdminTab('trips')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'trips'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Походы ({trips.length})
          </button>

          <button
            onClick={() => setAdminTab('backup')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'backup'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Резервное копирование
          </button>
        </div>
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

      {/* 1. ROUTES MANAGEMENT TAB */}
      {adminTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1F1A]">Каталог водных маршрутов ({routes.length})</h2>
            <button
              onClick={handleOpenNewRoute}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Добавить маршрут
            </button>
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
                  <span className="text-[#8B7E6D] font-medium">{route.lengthKm} км • {route.durationDays} дн.</span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingRoute(JSON.parse(JSON.stringify(route)));
                        setIsNewRoute(false);
                      }}
                      className="p-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] rounded-lg border border-[#E5E0D8] transition-colors"
                      title="Редактировать"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRoute(route.id, route.name)}
                      className="p-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-lg border border-[#F8B4B4] transition-colors"
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

      {/* 2. HYDRO STATIONS MANAGEMENT TAB */}
      {adminTab === 'hydro' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1F1A]">Гидропосты Росгидромета ({hydroStations.length})</h2>
            <button
              onClick={handleOpenNewHydro}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
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
                  <p className="text-xs text-[#6B665F] mt-1">
                    Норма: {station.normalLevelCm} см | Пойма: {station.floodLevelCm} см | Опасный: {station.dangerLevelCm} см
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">Вода: +{station.waterTempC}°C</span>
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

      {/* 3. ARTICLES MANAGEMENT TAB */}
      {adminTab === 'articles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1F1A]">Лоции и статьи ({articles.length})</h2>
            <button
              onClick={handleOpenNewArticle}
              className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Написать статью / лоцию
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
                  <span className="text-[#8B7E6D]">{art.author} • {art.date}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingArticle(JSON.parse(JSON.stringify(art)));
                        setIsNewArticle(false);
                      }}
                      className="p-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] rounded-lg border border-[#E5E0D8]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(art.id, art.title)}
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

      {/* 4. COMPANIONS TRIPS MODERATION TAB */}
      {adminTab === 'trips' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1F1A]">Активные экспедиции и походы ({trips.length})</h2>
          </div>

          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27]">
                      {trip.region} • {trip.riverName}
                    </span>
                    <span className="text-xs font-bold text-[#1A1F1A]">{trip.startDate} — {trip.endDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1F1A]">{trip.title}</h3>
                  <p className="text-xs text-[#6B665F]">Организатор: {trip.organizer.name} ({trip.organizer.phone})</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm(`Удалить поход "${trip.title}"?`)) {
                        setTrips((prev) => prev.filter((t) => t.id !== trip.id));
                        showNotification('Поход удален.', 'error');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] font-bold text-xs rounded-xl border border-[#F8B4B4]"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. BACKUP & RESTORE TAB */}
      {adminTab === 'backup' && (
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1A1F1A]">Управление базой данных и резервное копирование</h2>
            <p className="text-xs text-[#6B665F] mt-1">
              Экспортируйте все созданные маршруты, гидропосты, статьи и изменения в файл JSON, либо восстанавливайте базу из копии.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Export */}
            <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] space-y-3 flex flex-col justify-between">
              <div>
                <Download className="w-6 h-6 text-[#2D5A27] mb-2" />
                <h3 className="text-sm font-bold text-[#1A1F1A]">Экспорт в JSON</h3>
                <p className="text-xs text-[#6B665F] mt-1">
                  Скачать текущую базу данных ({routes.length} рек, {hydroStations.length} постов, {articles.length} статей) на устройство.
                </p>
              </div>
              <button
                onClick={handleExportFullDatabase}
                className="w-full py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Скачать JSON бэкап
              </button>
            </div>

            {/* Import */}
            <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] space-y-3 flex flex-col justify-between">
              <div>
                <Upload className="w-6 h-6 text-[#2B4C7E] mb-2" />
                <h3 className="text-sm font-bold text-[#1A1F1A]">Импорт из JSON</h3>
                <p className="text-xs text-[#6B665F] mt-1">
                  Загрузить сохраненную резервную копию и применить изменения на сайте.
                </p>
              </div>
              <label className="w-full py-2.5 bg-[#2B4C7E] hover:bg-[#1E3A5F] text-white font-bold text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer block">
                Выбрать JSON файл
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  className="hidden"
                />
              </label>
            </div>

            {/* Reset to Factory Defaults */}
            <div className="bg-[#FDF2F2] p-5 rounded-2xl border border-[#F8B4B4] space-y-3 flex flex-col justify-between">
              <div>
                <RefreshCw className="w-6 h-6 text-[#E54B4B] mb-2" />
                <h3 className="text-sm font-bold text-[#E54B4B]">Сброс к исходным данным</h3>
                <p className="text-xs text-[#7F1D1D] mt-1">
                  Очистить локальные правки и восстановить оригинальную базу рек Югры и Ямала по умолчанию.
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Сбросить все данные к исходным заводским настройкам?')) {
                    onResetToDefaults();
                    showNotification('База сброшена к исходным данным.');
                  }
                }}
                className="w-full py-2.5 bg-[#E54B4B] hover:bg-[#D43A3A] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Сбросить данные
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
              <button
                onClick={() => setEditingRoute(null)}
                className="p-1 rounded-lg text-[#8B7E6D] hover:text-[#1A1F1A]"
              >
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
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Река</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.riverName}
                    onChange={(e) => setEditingRoute({ ...editingRoute, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Регион</label>
                  <select
                    value={editingRoute.region}
                    onChange={(e) => setEditingRoute({ ...editingRoute, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
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
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Международный класс</label>
                  <input
                    type="text"
                    value={editingRoute.intlClass}
                    onChange={(e) => setEditingRoute({ ...editingRoute, intlClass: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Длина (км)</label>
                  <input
                    type="number"
                    value={editingRoute.lengthKm}
                    onChange={(e) => setEditingRoute({ ...editingRoute, lengthKm: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Дней сплава</label>
                  <input
                    type="number"
                    value={editingRoute.durationDays}
                    onChange={(e) => setEditingRoute({ ...editingRoute, durationDays: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Скорость течения (км/ч)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRoute.avgFlowSpeedKmh}
                    onChange={(e) => setEditingRoute({ ...editingRoute, avgFlowSpeedKmh: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">URL обложки фотографии</label>
                <input
                  type="text"
                  value={editingRoute.coverImage}
                  onChange={(e) => setEditingRoute({ ...editingRoute, coverImage: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Краткое описание (для карточки)</label>
                <textarea
                  rows={2}
                  value={editingRoute.shortDesc}
                  onChange={(e) => setEditingRoute({ ...editingRoute, shortDesc: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Полная лоция и описание реки</label>
                <textarea
                  rows={4}
                  value={editingRoute.description}
                  onChange={(e) => setEditingRoute({ ...editingRoute, description: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Сохранить маршрут
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
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2D5A27] text-white font-bold rounded-xl shadow-sm"
                >
                  Сохранить
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EDIT / CREATE ARTICLE MODAL */}
      {/* ---------------------------------------------------- */}
      {editingArticle && (
        <div className="fixed inset-0 z-[2900] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <h3 className="text-base font-bold text-[#1A1F1A]">
                {isNewArticle ? 'Новая статья / Лоция' : `Редактирование: ${editingArticle.title}`}
              </h3>
              <button onClick={() => setEditingArticle(null)} className="text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Заголовок статьи</label>
                <input
                  type="text"
                  required
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Река</label>
                  <input
                    type="text"
                    value={editingArticle.riverName}
                    onChange={(e) => setEditingArticle({ ...editingArticle, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-medium mb-1">Автор</label>
                  <input
                    type="text"
                    value={editingArticle.author}
                    onChange={(e) => setEditingArticle({ ...editingArticle, author: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">URL обложки</label>
                <input
                  type="text"
                  value={editingArticle.coverImage}
                  onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Краткое резюме</label>
                <textarea
                  rows={2}
                  value={editingArticle.summary}
                  onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Текст статьи (абзацы через перевод строки)</label>
                <textarea
                  rows={5}
                  value={editingArticle.fullContent.join('\n\n')}
                  onChange={(e) => setEditingArticle({ ...editingArticle, fullContent: e.target.value.split('\n\n') })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2 bg-[#F9F7F4] text-[#2D332D] rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2D5A27] text-white font-bold rounded-xl shadow-sm"
                >
                  Опубликовать
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
