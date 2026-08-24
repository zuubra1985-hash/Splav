import React from 'react';
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
  Wind, 
  Clock, 
  Edit3, 
  Printer, 
  Truck, 
  ShieldCheck, 
  User, 
  Phone,
  Camera,
  BookOpen,
  ExternalLink,
  Heart
} from 'lucide-react';
import { generateGpxString } from '../utils/gpxParser';

interface RouteDetailModalProps {
  route: RiverRoute;
  currentUser?: AppUser | null;
  onClose: () => void;
  onSelectForMchs: (route: RiverRoute) => void;
  onEditRoute?: (route: RiverRoute) => void;
  onToggleFavorite?: (routeId: string) => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  route,
  currentUser,
  onClose,
  onSelectForMchs,
  onEditRoute,
  onToggleFavorite
}) => {
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'superadmin' || 
                  currentUser?.email?.toLowerCase() === 'zuubra1985@gmail.com' || 
                  currentUser?.email?.toLowerCase() === 'novichek2@narod.ru';

  const isFavorite = Boolean(currentUser?.favoriteRouteIds?.includes(route.id));

  // Sample elevation points to maximum 16 points to prevent freezing/lag on GPX tracks with thousands of points
  const displayElevationPoints = React.useMemo(() => {
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

  const { minElev, maxElev } = React.useMemo(() => {
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

  return (
    <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto text-[#2D332D]">
        
        {/* Hero Image Header */}
        <div className="relative h-56 sm:h-72 w-full shrink-0 overflow-hidden rounded-t-[28px]">
          <img
            src={route.coverImage}
            alt={route.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          
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
                <span>Редактировать паспорт</span>
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

          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg bg-[#2D5A27] text-white shadow-sm">
                ФСТР: {route.fstrCategory} ({route.intlClass})
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/90 text-[#1A1F1A] backdrop-blur-md">
                {route.region}
              </span>
              {route.riverBasin && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 text-[#2D332D] backdrop-blur-md">
                  {route.riverBasin}
                </span>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/90 text-[#2D332D] backdrop-blur-md flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2D5A27]" />
                Сезон: {route.seasonMonths}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {route.name}
            </h1>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-7 space-y-6 flex-1 text-[#2D332D]">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6]">
            <div className="text-center">
              <div className="text-[11px] text-[#8B7E6D] font-bold uppercase">Протяженность</div>
              <div className="text-xl font-extrabold text-[#1A1F1A] mt-0.5">{route.lengthKm} км</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] text-[#8B7E6D] font-bold uppercase">Срок сплава</div>
              <div className="text-xl font-extrabold text-[#1A1F1A] mt-0.5">{route.durationDays} дн.</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] text-[#8B7E6D] font-bold uppercase">Течение реки</div>
              <div className="text-xl font-extrabold text-[#2B4C7E] mt-0.5">{route.avgFlowSpeedKmh} км/ч</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] text-[#8B7E6D] font-bold uppercase">Перепад высот</div>
              <div className="text-xl font-extrabold text-[#2D5A27] mt-0.5">{route.elevationGainM} м</div>
            </div>
          </div>

          {/* Suitable Vessels */}
          <div>
            <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-2.5">
              Рекомендуемые типы плавсредств
            </h3>
            <div className="flex flex-wrap gap-2">
              {route.recommendedVessels.map((v, vIdx) => {
                let name = 'Плавсредство';
                let icon = '🛶';
                if (v === 'sup') { name = 'SUP-борд (туринговый)'; icon = '🏄‍♂️'; }
                if (v === 'kayak') { name = 'Байдарка / Сплавной каяк'; icon = '🛶'; }
                if (v === 'catamaran') { name = 'Катамаран туристический'; icon = '⛵'; }
                if (v === 'raft') { name = 'Рафт экспедиционный'; icon = '🚣'; }
                if (v === 'motorboat') { name = 'Моторная лодка / Катер'; icon = '🚤'; }

                return (
                  <span
                    key={`${v}-${vIdx}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] text-[#2D332D] flex items-center gap-1.5"
                  >
                    <span>{icon}</span> {name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Route Description */}
          <div>
            <h3 className="text-sm font-bold text-[#1A1F1A] mb-2">Описание маршрута и локация реки</h3>
            <p className="text-xs sm:text-sm text-[#4A443E] leading-relaxed whitespace-pre-line">
              {route.description || route.shortDesc}
            </p>
          </div>

          {/* Wikipedia Geo Reference Block (If available) */}
          {(route.wikipediaUrl || route.wikipediaExtract) && (
            <div className="p-4 bg-gradient-to-br from-[#F4F8F3] to-[#EAEFE9] rounded-2xl border border-[#CDE0CC] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#2D5A27] text-white flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-[#1A1F1A] uppercase tracking-wide">
                    Географическая справка (Википедия)
                  </span>
                </div>
                {route.wikipediaUrl && (
                  <a
                    href={route.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2D5A27] hover:text-[#1F3E1B] font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>Читать статью</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {route.wikipediaExtract && (
                <p className="text-xs text-[#4A443E] leading-relaxed italic bg-white/70 p-3 rounded-xl border border-[#CDE0CC]/50">
                  «{route.wikipediaExtract}»
                </p>
              )}
            </div>
          )}

          {/* Highlights & Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Highlights */}
            <div className="bg-[#F4F8F3] p-4 rounded-2xl border border-[#CDE0CC] space-y-2">
              <h4 className="text-xs font-bold text-[#2D5A27] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A27]" />
                Особенности и преимущества
              </h4>
              <ul className="space-y-1.5">
                {route.highlights.map((h, i) => (
                  <li key={`hl-${i}-${h.slice(0, 15)}`} className="text-xs text-[#2D332D] flex items-start gap-2">
                    <span className="text-[#2D5A27] font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div className="bg-[#FDF2F2] p-4 rounded-2xl border border-[#F8B4B4] space-y-2">
              <h4 className="text-xs font-bold text-[#E54B4B] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#E54B4B]" />
                Предупреждения и риски
              </h4>
              <ul className="space-y-1.5">
                {route.warnings.map((w, i) => (
                  <li key={`warn-${i}-${w.slice(0, 15)}`} className="text-xs text-[#7F1D1D] flex items-start gap-2">
                    <span className="text-[#E54B4B] font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Logistics & Transfer Section (If Available) */}
          {route.logisticsTransfer && (route.logisticsTransfer.accessIn || route.logisticsTransfer.accessOut) && (
            <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] space-y-3">
              <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#2D5A27]" />
                Логистика: Заброска и Выброска
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {route.logisticsTransfer.accessIn && (
                  <div className="bg-white p-3 rounded-xl border border-[#E5E0D8]">
                    <strong className="text-[#2D5A27] block mb-1">🏁 Заброска (Стапель):</strong>
                    <p className="text-[#4A443E]">{route.logisticsTransfer.accessIn}</p>
                  </div>
                )}
                {route.logisticsTransfer.accessOut && (
                  <div className="bg-white p-3 rounded-xl border border-[#E5E0D8]">
                    <strong className="text-[#E54B4B] block mb-1">🏁 Выброска (Антистапель):</strong>
                    <p className="text-[#4A443E]">{route.logisticsTransfer.accessOut}</p>
                  </div>
                )}
              </div>

              {route.logisticsTransfer.transportContacts && (
                <div className="bg-[#E8F1E7]/50 p-2.5 rounded-xl border border-[#CDE0CC] text-xs flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  <span className="text-[#2D332D]">
                    <strong>Контакты забросчиков:</strong> {route.logisticsTransfer.transportContacts}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Elevation Profile Visualization */}
          {displayElevationPoints.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mountain className="w-4 h-4 text-[#2D5A27]" />
                Профиль высот реки
              </h3>
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6]">
                <div className="flex items-end justify-between h-28 gap-2 pt-4 px-2">
                  {displayElevationPoints.map((pt, i) => {
                    const heightPercent = Math.max(15, Math.min(100, Math.round(((pt.elevationM - minElev + 10) / (maxElev - minElev + 20)) * 100)));

                    return (
                      <div key={`elev-${i}-${pt.distanceKm ?? i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span className="text-[10px] font-bold text-[#2B4C7E] opacity-90 group-hover:opacity-100">
                          {pt.elevationM}м
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-[#2B4C7E] via-[#5C8D55] to-[#2D5A27] rounded-t-md transition-all group-hover:brightness-110 shadow-sm"
                        />
                        <span className="text-[9px] text-[#8B7E6D] truncate max-w-[60px] text-center font-medium mt-1">
                          {pt.pointName || `${pt.distanceKm} км`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Key POIs List */}
          <div>
            <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#2D5A27]" />
              График препятствий и ориентиры локации ({route.pois.length})
            </h3>
            <div className="space-y-2.5">
              {route.pois.map((poi, idx) => (
                <div
                  key={`poi-${poi.id || idx}-${idx}`}
                  className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-[#D9D1C5] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {poi.photo ? (
                      <img
                        src={poi.photo}
                        alt={poi.name}
                        className="w-16 h-16 rounded-xl object-cover border border-[#CDE0CC] shrink-0 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(poi.photo, '_blank')}
                        title="Нажмите, чтобы открыть фото в полном размере"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-center text-lg shrink-0">
                        {poi.type === 'rapid' && '🌊'}
                        {poi.type === 'camp' && '⛺'}
                        {poi.type === 'hydro_post' && '💧'}
                        {poi.type === 'cabin' && '🏠'}
                        {poi.type === 'indigenous' && '🏕️'}
                        {poi.type === 'slipway' && '🛶'}
                        {poi.type === 'portage' && '🪵'}
                        {poi.type === 'danger' && '⚠️'}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#1A1F1A]">{poi.name}</span>
                        {poi.kmMark !== undefined && (
                          <span className="text-[10px] text-[#2D5A27] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] border border-[#CDE0CC]">
                            {poi.kmMark} км
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-[#8B7E6D]">
                          {poi.type}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B665F] mt-1 leading-relaxed">{poi.description}</p>
                      {poi.safetyTips && (
                        <p className="text-[11px] text-[#92400E] mt-1 font-semibold flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{poi.safetyTips}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-mono text-[#8B7E6D] self-end sm:self-auto shrink-0">
                    {poi.lat != null && !isNaN(Number(poi.lat)) ? Number(poi.lat).toFixed(4) : '—'}, {poi.lng != null && !isNaN(Number(poi.lng)) ? Number(poi.lng).toFixed(4) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Gallery Section if Route has Photos */}
          {route.photos && route.photos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#2D5A27]" />
                Фотогалерея реки ({route.photos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {route.photos.map((imgUrl, i) => (
                  <div
                    key={`photo-${i}-${imgUrl.slice(-10)}`}
                    className="relative group rounded-xl overflow-hidden h-28 border border-[#E5E0D8] shadow-xs cursor-pointer"
                    onClick={() => window.open(imgUrl, '_blank')}
                  >
                    <img src={imgUrl} alt={`Фото реки ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passport Metadata Footer */}
          <div className="pt-2 border-t border-[#E5E0D8] flex flex-wrap items-center justify-between text-[11px] text-[#8B7E6D]">
            <span>Составитель: {route.authorName || 'Турклуб Splav86'}</span>
            <span>Ревизия паспорта: {route.lastPassportRevision || '2026'}</span>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#F9F7F4] border-t border-[#E5E0D8] rounded-b-[28px] flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2">
            <button
              onClick={downloadGPX}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-[#2D332D] hover:border-[#2D5A27] border border-[#E5E0D8] flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-[#2D5A27]" />
              Экспорт трека GPX
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onEditRoute && (
              <button
                onClick={() => onEditRoute(route)}
                className="px-4 py-2.5 bg-white text-[#2D5A27] border border-[#CDE0CC] hover:bg-[#E8F1E7] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
            )}

            <button
              onClick={() => {
                onSelectForMchs(route);
                onClose();
              }}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              Заявка в МЧС
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
