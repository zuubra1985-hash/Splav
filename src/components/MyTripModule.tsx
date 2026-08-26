import React, { useState, useEffect, useMemo } from 'react';
import { MyTrip, RiverRoute, AppUser } from '../types';
import { MyTripsStore } from '../services/myTripsStore';
import { generateGpxString } from '../utils/gpxParser';
import { 
  Compass, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Square, 
  Radio, 
  Phone, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Download, 
  Users, 
  FileText, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  Flame, 
  Navigation, 
  Eye, 
  ExternalLink,
  Edit3,
  Share2
} from 'lucide-react';

interface MyTripModuleProps {
  currentUser: AppUser | null;
  routes: RiverRoute[];
  onOpenRouteDetails?: (route: RiverRoute) => void;
  onOpenMchsRegistration?: (route?: RiverRoute) => void;
  onOpenCompanions?: () => void;
  initialSelectedTripId?: string | null;
}

export const MyTripModule: React.FC<MyTripModuleProps> = ({
  currentUser,
  routes,
  onOpenRouteDetails,
  onOpenMchsRegistration,
  onOpenCompanions,
  initialSelectedTripId
}) => {
  const [trips, setTrips] = useState<MyTrip[]>(() => MyTripsStore.getMyTrips(currentUser?.id));
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initialSelectedTripId || (trips.length > 0 ? trips[0].id : null));
  const [isExpeditionMode, setIsExpeditionMode] = useState<boolean>(false);
  const [newChecklistItemText, setNewChecklistItemText] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec-route-gpx');

  // Reload trips when currentUser or initialSelectedTripId changes
  useEffect(() => {
    const list = MyTripsStore.getMyTrips(currentUser?.id);
    setTrips(list);
    if (initialSelectedTripId) {
      setSelectedTripId(initialSelectedTripId);
    } else if (list.length > 0 && (!selectedTripId || !list.some(t => t.id === selectedTripId))) {
      setSelectedTripId(list[0].id);
    }
  }, [currentUser, initialSelectedTripId]);

  const activeTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || (trips.length > 0 ? trips[0] : null);
  }, [trips, selectedTripId]);

  const matchingRoute = useMemo(() => {
    if (!activeTrip) return null;
    return routes.find((r) => r.id === activeTrip.routeId || r.name.toLowerCase() === activeTrip.routeName.toLowerCase()) || null;
  }, [activeTrip, routes]);

  const progress = useMemo(() => {
    if (!activeTrip) return { percent: 0, completedCount: 0, totalCount: 0 };
    return MyTripsStore.calculateProgress(activeTrip);
  }, [activeTrip]);

  // Toggle item in checklist
  const handleToggleItem = (sectionId: string, itemId: string) => {
    if (!activeTrip) return;
    const updated = {
      ...activeTrip,
      checklistSections: activeTrip.checklistSections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((it) => it.id === itemId ? { ...it, completed: !it.completed } : it)
        };
      })
    };
    const saved = MyTripsStore.saveTrip(updated);
    setTrips((prev) => prev.map((t) => t.id === saved.id ? saved : t));
  };

  // Add custom item to section
  const handleAddCustomItem = (sectionId: string) => {
    if (!activeTrip || !newChecklistItemText.trim()) return;
    const updated = {
      ...activeTrip,
      checklistSections: activeTrip.checklistSections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: [
            ...sec.items,
            {
              id: `item-custom-${Date.now()}`,
              text: newChecklistItemText.trim(),
              completed: false
            }
          ]
        };
      })
    };
    const saved = MyTripsStore.saveTrip(updated);
    setTrips((prev) => prev.map((t) => t.id === saved.id ? saved : t));
    setNewChecklistItemText('');
  };

  // Toggle checkpoint
  const handleToggleCheckpoint = (cpId: string) => {
    if (!activeTrip) return;
    const updated = {
      ...activeTrip,
      checkpoints: activeTrip.checkpoints.map((cp) => cp.id === cpId ? { ...cp, passed: !cp.passed } : cp)
    };
    const saved = MyTripsStore.saveTrip(updated);
    setTrips((prev) => prev.map((t) => t.id === saved.id ? saved : t));
  };

  // Delete trip
  const handleDeleteTrip = (tripId: string) => {
    if (!window.confirm('Удалить этот сплав из списка?')) return;
    MyTripsStore.deleteTrip(tripId);
    const updatedList = MyTripsStore.getMyTrips(currentUser?.id);
    setTrips(updatedList);
    setSelectedTripId(updatedList.length > 0 ? updatedList[0].id : null);
  };

  // Download GPX for active trip
  const handleDownloadGpx = () => {
    if (!matchingRoute) return;
    const gpxContent = generateGpxString(matchingRoute);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = matchingRoute.gpxFileName || `${matchingRoute.name.toLowerCase().replace(/\s+/g, '_')}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // If no trips exist
  if (!activeTrip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[#E8F1E7] text-[#2D5A27] mx-auto flex items-center justify-center shadow-xs">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
            У вас пока нет активных сплавов
          </h2>
          <p className="text-xs sm:text-sm text-[#6B665F] max-w-md mx-auto">
            Выберите маршрут в каталоге рек и нажмите кнопку <strong>«Создать мой сплав»</strong>. Система автоматически сформирует чек-лист подготовки, график связи и контрольные точки.
          </p>
        </div>

        {routes.length > 0 && (
          <div className="pt-4 max-w-md mx-auto">
            <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-3">
              Рекомендуемые маршруты для старта:
            </h3>
            <div className="space-y-2">
              {routes.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    const newTrip = MyTripsStore.createFromRoute(r, currentUser);
                    setTrips(MyTripsStore.getMyTrips(currentUser?.id));
                    setSelectedTripId(newTrip.id);
                  }}
                  className="p-3.5 rounded-2xl bg-white border border-[#E5E0D8] hover:border-[#2D5A27] text-left cursor-pointer transition-all flex items-center justify-between shadow-2xs group"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1F1A] group-hover:text-[#2D5A27]">{r.name}</div>
                    <div className="text-[11px] text-[#6B665F]">{r.region} • {r.lengthKm} км • {r.durationDays} дн. • {r.fstrCategory}</div>
                  </div>
                  <Plus className="w-4 h-4 text-[#2D5A27]" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      
      {/* Top Header & Trip Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E0D8] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
              {activeTrip.region} • {activeTrip.fstrCategory}
            </span>
            <span className="text-xs text-[#6B665F]">
              {activeTrip.durationDays} дня ({activeTrip.startDate} – {activeTrip.endDate})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A] mt-1">
            {activeTrip.routeName}
          </h1>
        </div>

        {/* Trips Switcher if multiple */}
        <div className="flex items-center gap-2 flex-wrap">
          {trips.length > 1 && (
            <select
              value={activeTrip.id}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A]"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.routeName} ({t.startDate})</option>
              ))}
            </select>
          )}

          {/* Expedition Mode Toggle Button */}
          <button
            onClick={() => setIsExpeditionMode(!isExpeditionMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isExpeditionMode
                ? 'bg-[#E54B4B] text-white'
                : 'bg-[#2D5A27] hover:bg-[#3D7136] text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isExpeditionMode ? 'Выйти из режима сплава' : 'Режим «На сплаве»'}</span>
          </button>
        </div>
      </div>

      {/* 19. EXPEDITION MODE ("В ПОХОДЕ") */}
      {isExpeditionMode ? (
        <div className="space-y-5 bg-[#1F241F] text-white p-5 sm:p-7 rounded-3xl border border-[#3A443A] shadow-xl">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Экспедиционный режим онлайн</span>
                <h2 className="text-lg sm:text-xl font-black">{activeTrip.routeName}</h2>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-300">День 2 из {activeTrip.durationDays}</div>
              <div className="text-[11px] text-emerald-400">График соблюдается</div>
            </div>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Внимание:</strong> Данный интерфейс предназначен для быстрой сверки чек-листа и контактов. Он не заменяет автономный спутниковый трекер (Iridium, Garmin inReach) и аварийные радиомаяки.
            </span>
          </div>

          {/* Quick Expedition Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Next Checkpoint */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
              <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Контрольная точка</span>
              </div>
              <div className="text-sm font-bold truncate">
                {activeTrip.checkpoints.find(c => !c.passed)?.name || 'Все точки пройдены'}
              </div>
              <div className="text-[11px] text-gray-400">
                Контрольное время: 18:00
              </div>
            </div>

            {/* Radio / Satellite Frequencies */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
              <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Радиосвязь и SOS</span>
              </div>
              <div className="text-sm font-bold font-mono text-sky-300">
                145.500 МГц (VHF)
              </div>
              <div className="text-[11px] text-gray-400">
                Канал 16 морской: 156.800 МГц
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
              <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>Экстренный контакт</span>
              </div>
              <div className="text-sm font-bold truncate">
                {activeTrip.emergencyContact?.name || 'Иванова А. (Дежурный)'}
              </div>
              <div className="text-[11px] text-gray-400">
                {activeTrip.emergencyContact?.phone || '+7 (922) 111-22-33'}
              </div>
            </div>

          </div>

          {/* Expedition Check-in Checkpoints Checklist */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Контрольные точки и график движения:
            </h3>
            <div className="space-y-2">
              {activeTrip.checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  onClick={() => handleToggleCheckpoint(cp.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    cp.passed 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {cp.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold">{cp.name}</div>
                      <div className="text-[11px] text-gray-400">{cp.date} {cp.time || ''}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10">
                    {cp.passed ? 'Отмечено' : 'Ожидает'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Offline Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handleDownloadGpx}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать GPX в навигатор</span>
            </button>
            <button
              onClick={() => setIsExpeditionMode(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-colors"
            >
              Закрыть режим
            </button>
          </div>

        </div>
      ) : (
        /* STANDARD TRIP PREPARATION HUB */
        <div className="space-y-6">

          {/* 6. PREPARATION PROGRESS GAUGE (Состояние подготовки) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E0D8] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider">
                  Состояние подготовки сплава
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#1A1F1A] mt-0.5">
                  Готовность: <span className="text-[#2D5A27]">{progress.percent}%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#6B665F]">Выполнено пунктов:</span>
                <div className="text-sm font-bold text-[#1A1F1A]">
                  {progress.completedCount} из {progress.totalCount}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full bg-[#EEEBE6] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2D5A27] to-[#5C8D55] transition-all duration-300 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Key Preparation Milestones Checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
              
              <div className="p-2.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
                <span className="font-bold text-[#1A1F1A] truncate">Маршрут выбран</span>
              </div>

              <div 
                onClick={handleDownloadGpx}
                className="p-2.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#2D5A27] flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  <span className="font-bold text-[#1A1F1A] truncate">GPX трек</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#6B665F] group-hover:text-[#2D5A27]" />
              </div>

              <div 
                onClick={() => onOpenMchsRegistration && onOpenMchsRegistration(matchingRoute || undefined)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  activeTrip.mchsRegistered
                    ? 'bg-[#E8F1E7] border-[#CDE0CC] text-[#2D5A27]'
                    : 'bg-[#F9F7F4] border-[#EEEBE6] hover:border-[#2D5A27]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {activeTrip.mchsRegistered ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[#6B665F] shrink-0" />
                  )}
                  <span className="font-bold truncate">Регистрация МЧС</span>
                </div>
              </div>

              <div 
                onClick={onOpenCompanions}
                className="p-2.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#2D5A27] flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  <span className="font-bold text-[#1A1F1A] truncate">Участники ({activeTrip.participants.length})</span>
                </div>
                <Users className="w-3.5 h-3.5 text-[#6B665F] group-hover:text-[#2D5A27]" />
              </div>

            </div>
          </div>

          {/* 7. CONTEXTUAL CHECKLIST TABS & ITEMS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E0D8] space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEBE6] pb-4">
              <div>
                <h3 className="text-base font-black text-[#1A1F1A]">Чек-лист подготовки сплава</h3>
                <p className="text-xs text-[#6B665F]">Сформирован на основе паспорта реки и условий региона</p>
              </div>

              {/* Section Tabs - Column/Grid on mobile, flex on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {activeTrip.checklistSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all text-left sm:text-center ${
                      selectedSectionId === sec.id
                        ? 'bg-[#2D5A27] text-white shadow-2xs'
                        : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                    }`}
                  >
                    {sec.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Section Checklist Items */}
            {activeTrip.checklistSections.filter(s => s.id === selectedSectionId).map((sec) => (
              <div key={sec.id} className="space-y-2.5">
                <div className="space-y-2">
                  {sec.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(sec.id, item.id)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        item.completed
                          ? 'bg-[#F4F8F3] border-[#CDE0CC] text-[#2D5A27]'
                          : 'bg-[#F9F7F4] border-[#EEEBE6] hover:bg-white text-[#2D332D]'
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#2D5A27] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-[#8B7E6D] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-xs">
                        <span className={`font-semibold ${item.completed ? 'line-through opacity-75' : ''}`}>
                          {item.text}
                        </span>
                        {item.required && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-[#E54B4B] px-1.5 py-0.2 rounded bg-red-50">
                            Обязательно
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Item Row */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newChecklistItemText}
                    onChange={(e) => setNewChecklistItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem(sec.id)}
                    placeholder="Добавить свой пункт в этот раздел..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
                  />
                  <button
                    onClick={() => handleAddCustomItem(sec.id)}
                    disabled={!newChecklistItemText.trim()}
                    className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Route Passport & Logistics Reference Card */}
          {matchingRoute && (
            <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={matchingRoute.coverImage}
                  alt={matchingRoute.name}
                  className="w-14 h-14 rounded-xl object-cover border border-[#E5E0D8]"
                />
                <div>
                  <div className="text-xs font-bold text-[#8B7E6D] uppercase">Привязанный паспорт реки</div>
                  <h4 className="text-sm font-black text-[#1A1F1A]">{matchingRoute.name}</h4>
                  <p className="text-[11px] text-[#6B665F]">{matchingRoute.lengthKm} км • {matchingRoute.fstrCategory} • {matchingRoute.region}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenRouteDetails && (
                  <button
                    onClick={() => onOpenRouteDetails(matchingRoute)}
                    className="px-3.5 py-2 bg-white text-[#2D5A27] border border-[#CDE0CC] text-xs font-bold rounded-xl shadow-2xs hover:bg-[#E8F1E7] transition-all"
                  >
                    Паспорт реки
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTrip(activeTrip.id)}
                  className="p-2 text-[#E54B4B] hover:bg-red-50 rounded-xl transition-colors"
                  title="Удалить сплав"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
