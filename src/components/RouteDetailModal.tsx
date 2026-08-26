import React, { useState, useMemo } from 'react';
import { RiverRoute, AppUser } from '../types';
import { 
  Download, 
  ShieldAlert, 
  AlertTriangle, 
  Waves, 
  MapPin, 
  Compass, 
  Mountain, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Calendar, 
  Clock, 
  Edit3, 
  Printer, 
  Truck, 
  ShieldCheck, 
  Phone,
  Camera,
  BookOpen,
  ExternalLink,
  Heart,
  Users,
  HelpCircle,
  Radio,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Map as MapIcon
} from 'lucide-react';
import { generateGpxString } from '../utils/gpxParser';

interface RouteDetailModalProps {
  route: RiverRoute;
  currentUser?: AppUser | null;
  onClose: () => void;
  onSelectForMchs: (route: RiverRoute) => void;
  onEditRoute?: (route: RiverRoute) => void;
  onToggleFavorite?: (routeId: string) => void;
  onOpenSuitabilityModal?: (route: RiverRoute) => void;
  onCreateMyTrip?: (route: RiverRoute) => void;
  onFindCompanions?: (route: RiverRoute) => void;
  onOpenOnMap?: (route: RiverRoute) => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  route,
  currentUser,
  onClose,
  onSelectForMchs,
  onEditRoute,
  onToggleFavorite,
  onOpenSuitabilityModal,
  onCreateMyTrip,
  onFindCompanions,
  onOpenOnMap
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isFavorite = Boolean(currentUser?.favoriteRouteIds?.includes(route.id));
  const [showAllRisks, setShowAllRisks] = useState<boolean>(false);
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

  // Difficulty percentage for progress bar
  const difficultyLevel = useMemo(() => {
    const cat = route.fstrCategory || '';
    if (/V|5/i.test(cat)) return { score: 95, label: 'Экстремальная (V к.с.)', fill: 'bg-[#991B1B]' };
    if (/IV|4/i.test(cat)) return { score: 80, label: 'Очень высокая (IV к.с.)', fill: 'bg-[#DC2626]' };
    if (/III|3/i.test(cat)) return { score: 65, label: 'Высокая (III к.с.)', fill: 'bg-[#EA580C]' };
    if (/II|2/i.test(cat)) return { score: 45, label: 'Средняя (II к.с.)', fill: 'bg-[#D97706]' };
    if (/I|1/i.test(cat)) return { score: 25, label: 'Базовая (I к.с.)', fill: 'bg-[#2D5A27]' };
    return { score: 15, label: 'Некатегорийный', fill: 'bg-[#16A34A]' };
  }, [route.fstrCategory]);

  // Sample elevation points
  const displayElevationPoints = useMemo(() => {
    if (!route.elevationProfile || route.elevationProfile.length === 0) return [];
    const pts = route.elevationProfile;
    if (pts.length <= 16) return pts;
    const step = (pts.length - 1) / 15;
    const sampled: typeof pts = [];
    for (let i = 0; i < 16; i++) {
      const idx = Math.min(pts.length - 1, Math.round(i * step));
      sampled.push(pts[idx]);
    }
    return sampled;
  }, [route.elevationProfile]);

  const { minElev, maxElev } = useMemo(() => {
    if (displayElevationPoints.length === 0) return { minElev: 0, maxElev: 100 };
    const elevs = displayElevationPoints.map((p) => Number(p.elevationM) || 0);
    const min = Math.min(...elevs);
    const max = Math.max(...elevs);
    return { minElev: min, maxElev: max === min ? min + 50 : max };
  }, [displayElevationPoints]);

  const downloadGPX = () => {
    const gpxContent = generateGpxString(route);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = route.gpxFileName || `${route.name.toLowerCase().replace(/\s+/g, '_')}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Top risks list (max 3 by default)
  const topRisks = route.warnings && route.warnings.length > 0
    ? (showAllRisks ? route.warnings : route.warnings.slice(0, 3))
    : ['Быстрое течение и прижимы', 'Отсутствие устойчивой сотовой связи', 'Удаленность от населенных пунктов и медицины'];

  return (
    <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col my-auto text-[#2D332D]">
        
        {/* 1. HEADER (Hero Image & Badges) */}
        <div className="relative h-56 sm:h-72 w-full shrink-0 overflow-hidden rounded-t-[28px]">
          <img
            src={route.coverImage}
            alt={route.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {currentUser && onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(route.id)}
                className={`px-3 py-2 text-xs font-black rounded-xl backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                  isFavorite
                    ? 'bg-[#E54B4B] hover:bg-[#D43F3F] text-white'
                    : 'bg-white/95 hover:bg-white text-[#E54B4B]'
                }`}
                title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : 'fill-[#E54B4B]'}`} />
                <span className="hidden sm:inline">{isFavorite ? 'В избранном' : 'В избранное'}</span>
              </button>
            )}

            {onEditRoute && (
              <button
                onClick={() => onEditRoute(route)}
                className="px-3 py-2 bg-white/95 hover:bg-white text-[#2D5A27] text-xs font-black rounded-xl backdrop-blur-md transition-all shadow-md flex items-center gap-1.5"
                title="Редактировать паспорт реки"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Редактировать</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
              title="Печать паспорта"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg bg-[#2D5A27] text-white shadow-sm">
                {route.fstrCategory} ({route.intlClass || 'Class I'})
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/90 text-[#1A1F1A] backdrop-blur-md">
                {route.region}
              </span>
              {route.riverBasin && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 text-[#2D332D] backdrop-blur-md hidden sm:inline">
                  {route.riverBasin}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {route.name}
            </h1>
          </div>
        </div>

        {/* Modal Body Content (Ordered Flow) */}
        <div className="p-5 sm:p-7 space-y-6 flex-1 text-[#2D332D]">
          
          {/* 2. CORE INDICATORS (Основные показатели) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6]">
            <div className="text-center">
              <div className="text-[10px] text-[#8B7E6D] font-bold uppercase tracking-wider">Протяженность</div>
              <div className="text-xl font-extrabold text-[#1A1F1A] mt-0.5">{route.lengthKm} км</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#8B7E6D] font-bold uppercase tracking-wider">Срок сплава</div>
              <div className="text-xl font-extrabold text-[#1A1F1A] mt-0.5">{route.durationDays} дня</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#8B7E6D] font-bold uppercase tracking-wider">Сложность</div>
              <div className="text-xl font-extrabold text-[#2D5A27] mt-0.5">{route.fstrCategory}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#8B7E6D] font-bold uppercase tracking-wider">Сезон</div>
              <div className="text-sm font-extrabold text-[#2B4C7E] mt-1.5 truncate">{route.seasonMonths || 'июль–август'}</div>
            </div>
          </div>

          {/* 3. QUICK ASSESSMENT (Быстрая оценка) */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider">
                Быстрая оценка маршрута
              </span>
              <span className="text-xs font-bold text-[#2D5A27]">
                {difficultyLevel.label}
              </span>
            </div>

            {/* Difficulty Scale Bar */}
            <div>
              <div className="h-2.5 w-full bg-[#EEEBE6] rounded-full overflow-hidden flex">
                <div 
                  className={`h-full ${difficultyLevel.fill} transition-all duration-300 rounded-full`}
                  style={{ width: `${difficultyLevel.score}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-[#F9F7F4] p-2.5 rounded-xl border border-[#EEEBE6]">
                <div className="text-[10px] text-[#8B7E6D] font-semibold uppercase">Опыт</div>
                <div className="font-bold text-[#1A1F1A] mt-0.5">
                  {route.fstrCategory.includes('III') || route.fstrCategory.includes('IV') ? 'Опытный водник' : route.fstrCategory.includes('II') ? 'Базовый опыт (1-2 сплава)' : 'Для новичков'}
                </div>
              </div>

              <div className="bg-[#F9F7F4] p-2.5 rounded-xl border border-[#EEEBE6]">
                <div className="text-[10px] text-[#8B7E6D] font-semibold uppercase">Автономность</div>
                <div className="font-bold text-[#1A1F1A] mt-0.5">
                  {route.durationDays} {route.durationDays === 1 ? 'день' : route.durationDays < 5 ? 'дня' : 'дней'}
                </div>
              </div>

              <div className="bg-[#F9F7F4] p-2.5 rounded-xl border border-[#EEEBE6]">
                <div className="text-[10px] text-[#8B7E6D] font-semibold uppercase">Плавсредство</div>
                <div className="font-bold text-[#1A1F1A] mt-0.5 truncate">
                  {route.recommendedVessels && route.recommendedVessels.length > 0 
                    ? route.recommendedVessels.map(v => v === 'sup' ? 'SUP' : v === 'kayak' ? 'Байдарка' : v === 'catamaran' ? 'Катамаран' : v === 'raft' ? 'Рафт' : 'Пакрафт').join(', ')
                    : 'Байдарка / Катамаран'}
                </div>
              </div>
            </div>

            {/* Suitability Wizard Trigger Button */}
            {onOpenSuitabilityModal && (
              <button
                type="button"
                onClick={() => onOpenSuitabilityModal(route)}
                className="w-full py-2.5 px-4 bg-[#E8F1E7] hover:bg-[#D9EAD8] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Подходит ли мне этот маршрут? (Экспресс-тест)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 4. MAIN RISKS (Главные риски) */}
          <div className="bg-[#FDF2F2] p-4 rounded-2xl border border-[#F8B4B4] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#E54B4B] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#E54B4B]" />
                Основные риски и опасности
              </h3>
              {route.warnings && route.warnings.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllRisks(!showAllRisks)}
                  className="text-xs font-bold text-[#E54B4B] hover:underline flex items-center gap-1"
                >
                  <span>{showAllRisks ? 'Свернуть' : `Все риски (${route.warnings.length})`}</span>
                  {showAllRisks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <ul className="space-y-1.5 text-xs text-[#7F1D1D]">
              {topRisks.map((w, i) => (
                <li key={`risk-${i}`} className="flex items-start gap-2">
                  <span className="text-[#E54B4B] font-bold">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 5. LOGISTICS (Логистика) */}
          <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] space-y-3">
            <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#2D5A27]" />
              Логистика: Заброска, Выброска, Транспорт
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#E5E0D8]">
                <strong className="text-[#2D5A27] block mb-1">🏁 Заброска (Стапель):</strong>
                <p className="text-[#4A443E]">
                  {route.logisticsTransfer?.accessIn || `Точка старта: ${route.startPoint.name}. Авто/поезд до берега.`}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E0D8]">
                <strong className="text-[#E54B4B] block mb-1">🏁 Выброска (Антистапель):</strong>
                <p className="text-[#4A443E]">
                  {route.logisticsTransfer?.accessOut || `Точка финиша: ${route.endPoint.name}. Удобный съезд к воде.`}
                </p>
              </div>
            </div>

            {route.logisticsTransfer?.transportContacts && (
              <div className="bg-[#E8F1E7]/60 p-2.5 rounded-xl border border-[#CDE0CC] text-xs flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#2D5A27] shrink-0" />
                <span className="text-[#2D332D]">
                  <strong>Контакты перевозчиков:</strong> {route.logisticsTransfer.transportContacts}
                </span>
              </div>
            )}
          </div>

          {/* Route Description / Details Expander */}
          <div>
            <h3 className="text-sm font-bold text-[#1A1F1A] mb-1.5">Описание водного пути</h3>
            <p className="text-xs sm:text-sm text-[#4A443E] leading-relaxed whitespace-pre-line">
              {showFullDesc ? (route.description || route.shortDesc) : (route.shortDesc || route.description?.slice(0, 220) + '...')}
            </p>
            {route.description && route.description.length > 220 && (
              <button
                type="button"
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-xs font-bold text-[#2D5A27] hover:underline mt-1 inline-block"
              >
                {showFullDesc ? 'Свернуть описание' : 'Читать полное описание лоции'}
              </button>
            )}
          </div>

          {/* 6. ELEVATION & MAP SECTION */}
          {displayElevationPoints.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mountain className="w-4 h-4 text-[#2D5A27]" />
                Профиль высот реки ({route.elevationGainM} м перепад)
              </h3>
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6]">
                <div className="flex items-end justify-between h-28 gap-2 pt-4 px-2">
                  {displayElevationPoints.map((pt, i) => {
                    const heightPercent = Math.max(15, Math.min(100, Math.round(((pt.elevationM - minElev + 10) / (maxElev - minElev + 20)) * 100)));

                    return (
                      <div key={`elev-${i}-${pt.distanceKm ?? i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span className="text-[9px] font-bold text-[#2B4C7E] opacity-90 group-hover:opacity-100">
                          {pt.elevationM}м
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-[#2B4C7E] via-[#5C8D55] to-[#2D5A27] rounded-t-md transition-all group-hover:brightness-110 shadow-xs"
                        />
                        <span className="text-[8px] text-[#8B7E6D] truncate max-w-[50px] text-center font-medium mt-1">
                          {pt.pointName || `${pt.distanceKm}км`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Obstacles & POIs preview */}
          {route.pois && route.pois.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2D5A27]" />
                Ключевые ориентиры и препятствия ({route.pois.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {route.pois.slice(0, 4).map((poi, idx) => (
                  <div key={`poi-${idx}`} className="p-2.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span>{poi.type === 'rapid' ? '🌊' : poi.type === 'camp' ? '⛺' : '📍'}</span>
                      <span className="font-bold text-[#1A1F1A] truncate">{poi.name}</span>
                    </div>
                    {poi.kmMark !== undefined && (
                      <span className="text-[10px] font-bold text-[#2D5A27] px-1.5 py-0.5 rounded bg-[#E8F1E7]">
                        {poi.kmMark} км
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passport Quality / Verification Date metadata */}
          <div className="pt-3 border-t border-[#EEEBE6] flex flex-wrap items-center justify-between text-[11px] text-[#8B7E6D]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${route.verificationStatus === 'verified' ? 'bg-[#16A34A]' : route.verificationStatus === 'incomplete' ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`} />
              <span>Статус: <strong>{route.verificationStatus === 'incomplete' ? 'Неполные данные' : 'Проверено'}</strong></span>
            </div>
            <span>Последняя проверка: {route.lastVerifiedAt || route.lastPassportRevision || '26.08.2026'}</span>
          </div>

        </div>

        {/* 7, 8, 9. ACTION BAR & FOOTER (GPX, Мой сплав, Попутчики) */}
        <div className="p-4 sm:p-6 bg-[#F9F7F4] border-t border-[#E5E0D8] rounded-b-[28px] flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadGPX}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-[#2D332D] hover:border-[#2D5A27] border border-[#E5E0D8] flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Download className="w-4 h-4 text-[#2D5A27]" />
              <span>Скачать GPX</span>
            </button>

            {onOpenOnMap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenOnMap(route);
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-[#2D332D] hover:border-[#2D5A27] border border-[#E5E0D8] flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <MapIcon className="w-4 h-4 text-[#2B4C7E]" />
                <span>Открыть на карте</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onFindCompanions && (
              <button
                onClick={() => {
                  onClose();
                  onFindCompanions(route);
                }}
                className="px-3.5 py-2.5 bg-white text-[#2D332D] border border-[#E5E0D8] hover:border-[#2D5A27] font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <Users className="w-4 h-4 text-[#2D5A27]" />
                <span>Найти попутчиков</span>
              </button>
            )}

            {onCreateMyTrip && (
              <button
                onClick={() => {
                  onClose();
                  onCreateMyTrip(route);
                }}
                className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Создать мой сплав</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
