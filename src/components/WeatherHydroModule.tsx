import React, { useState } from 'react';
import { WeatherPoint, HydroStation, Region } from '../types';
import { CloudRain, Wind, Droplets, Sun, AlertTriangle, Compass, TrendingUp, TrendingDown, Clock, ShieldCheck, Thermometer, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';

interface WeatherHydroModuleProps {
  weatherPoints: WeatherPoint[];
  hydroStations: HydroStation[];
  selectedRegion: Region;
}

export const WeatherHydroModule: React.FC<WeatherHydroModuleProps> = ({
  weatherPoints,
  hydroStations,
  selectedRegion
}) => {
  const [selectedWeatherPointId, setSelectedWeatherPointId] = useState<string>(weatherPoints[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'weather' | 'hydro' | 'polar_sun'>('hydro');

  const filteredWeather = weatherPoints.filter((w) => selectedRegion === 'ALL' || w.region === selectedRegion);
  const filteredHydro = hydroStations.filter((h) => selectedRegion === 'ALL' || h.region === selectedRegion);

  const currentWeatherPoint = weatherPoints.find((w) => w.id === selectedWeatherPointId) || weatherPoints[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner / Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
              <Droplets className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
              Гидрология и метеообстановка Югры и Ямала
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
            Оперативные данные Росгидромета по уровням рек, температура воды, роза ветров и световой день Арктики.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-[#F9F7F4] p-1 rounded-2xl border border-[#EEEBE6] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('hydro')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'hydro'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Гидропосты ({filteredHydro.length})
          </button>
          <button
            onClick={() => setActiveTab('weather')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'weather'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            Погода и ветер
          </button>
          <button
            onClick={() => setActiveTab('polar_sun')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'polar_sun'
                ? 'bg-[#2D5A27] text-white shadow-sm'
                : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Полярный день
          </button>
        </div>
      </div>

      {/* 1. HYDROLOGY STATIONS TAB */}
      {activeTab === 'hydro' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHydro.map((station) => {
              const isRising = station.change24hCm > 0;
              const isDanger = station.currentLevelCm >= station.floodLevelCm;

              return (
                <div
                  key={station.id}
                  className={`bg-white border rounded-[24px] p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                    isDanger ? 'border-[#F8B4B4] ring-1 ring-[#E54B4B]/20' : 'border-[#E5E0D8] hover:border-[#D9D1C5]'
                  }`}
                >
                  {/* Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                          {station.region} • {station.river}
                        </span>
                        <span className="text-[10px] font-medium text-[#8B7E6D]">
                          {station.lastUpdated}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#1A1F1A] leading-snug">
                        {station.name}
                      </h3>
                    </div>

                    <div className="p-2 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] text-[#2B4C7E]">
                      <Droplets className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Level numbers */}
                  <div className="my-4 bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-[#8B7E6D] block font-medium">Уровень над нулем поста</span>
                        <span className="text-2xl font-black text-[#2B4C7E]">{station.currentLevelCm} <span className="text-xs text-[#8B7E6D] font-normal">см</span></span>
                      </div>

                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                        isRising ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' : 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                      }`}>
                        {isRising ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span>{station.change24hCm > 0 ? `+${station.change24hCm}` : station.change24hCm} см / 24ч</span>
                      </div>
                    </div>

                    {/* Progress bar towards flood limit */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-[#8B7E6D]">
                        <span>Норма: {station.normalLevelCm} см</span>
                        <span className="text-[#D97706] font-semibold">Пойма: {station.floodLevelCm} см</span>
                        <span className="text-[#E54B4B] font-semibold">Опасный: {station.dangerLevelCm} см</span>
                      </div>
                      <div className="w-full h-2 bg-[#E5E0D8] rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${Math.min(100, (station.currentLevelCm / station.dangerLevelCm) * 100)}%` }}
                          className={`h-full rounded-full ${
                            isDanger ? 'bg-[#E54B4B]' : 'bg-[#2B4C7E]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mini Sparkline 7-days Trend */}
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[11px] text-[#8B7E6D] font-medium flex items-center justify-between">
                      <span>Динамика за 7 дней:</span>
                      <span className="text-[10px] text-[#8B7E6D]">см</span>
                    </div>
                    <div className="flex items-end justify-between h-10 gap-1.5 bg-[#F9F7F4] p-1.5 rounded-xl border border-[#EEEBE6]">
                      {station.historicalTrend.map((t, idx) => {
                        const maxL = Math.max(...station.historicalTrend.map((x) => x.level));
                        const minL = Math.min(...station.historicalTrend.map((x) => x.level));
                        const diff = maxL - minL || 1;
                        const h = Math.max(20, Math.round(((t.level - minL) / diff) * 100));

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${t.date}: ${t.level} см`}>
                            <div
                              style={{ height: `${h}%` }}
                              className="w-full bg-[#2B4C7E] rounded-t group-hover:bg-[#5C8D55] transition-all"
                            />
                            <span className="text-[8px] text-[#8B7E6D] mt-0.5 truncate">{t.date.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E0D8] text-xs text-[#2D332D]">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-[#2B4C7E]" />
                      <span>Вода: <strong className="text-[#1A1F1A]">+{station.waterTempC}°C</strong></span>
                    </div>
                    <span className="text-[11px] text-[#6B665F] italic">
                      {station.iceCondition}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Hydrology Information Alert */}
          <div className="bg-[#E8F1E7] border border-[#CDE0CC] rounded-2xl p-4 text-xs text-[#2D332D] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[#1A1F1A] font-bold mb-1">
                Как уровень воды влияет на категорию сложности сплава:
              </strong>
              <p className="text-[#4A443E] leading-relaxed">
                На северных и горных реках (Собь, Ляпин, Щучья) при паводке скрываются опасные обливные камни, но резко увеличивается скорость течения, появляются мощные стоячие валы и прижимы к скалам. В межень (низкая вода) требуется проводка судов на перекатах и обнос отмелей.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 2. WEATHER & WIND COMPASS TAB */}
      {activeTab === 'weather' && (
        <div className="space-y-6">
          
          {/* Location picker */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {filteredWeather.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWeatherPointId(w.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                  currentWeatherPoint.id === w.id
                    ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                    : 'bg-white text-[#4A443E] border-[#E5E0D8] hover:border-[#2D5A27]'
                }`}
              >
                {w.locationName}
              </button>
            ))}
          </div>

          {/* Current Weather Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Weather Display */}
            <div className="lg:col-span-2 bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                    {currentWeatherPoint.region} • Метеопрогноз
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1A1F1A] mt-1">
                    {currentWeatherPoint.locationName}
                  </h2>
                  <p className="text-xs text-[#8B7E6D]">
                    Текущие условия OpenWeather • Обновлено 15 минут назад
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-4xl sm:text-5xl font-black text-[#1A1F1A]">
                      +{currentWeatherPoint.tempC}°
                    </div>
                    <div className="text-xs text-[#8B7E6D]">
                      Ощущается как +{currentWeatherPoint.feelsLikeC}°
                    </div>
                  </div>
                </div>
              </div>

              {/* Weather Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] text-center">
                <div>
                  <span className="text-[11px] text-[#8B7E6D] block font-medium">Ветер</span>
                  <span className="text-sm font-bold text-[#1A1F1A] mt-0.5 block">{currentWeatherPoint.windSpeedMs} м/с</span>
                  <span className="text-[10px] text-[#2D5A27]">порывы до {currentWeatherPoint.windGustMs} м/с</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8B7E6D] block font-medium">Давление</span>
                  <span className="text-sm font-bold text-[#1A1F1A] mt-0.5 block">{currentWeatherPoint.pressureMmHg} мм рт. ст.</span>
                  <span className="text-[10px] text-[#8B7E6D]">в норме</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8B7E6D] block font-medium">Влажность</span>
                  <span className="text-sm font-bold text-[#1A1F1A] mt-0.5 block">{currentWeatherPoint.humidityPercent}%</span>
                  <span className="text-[10px] text-[#8B7E6D]">осадки: {currentWeatherPoint.precipitationMm} мм</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8B7E6D] block font-medium">Темп. воды</span>
                  <span className="text-sm font-bold text-[#2B4C7E] mt-0.5 block">+{currentWeatherPoint.waterTempC}°C</span>
                  <span className="text-[10px] text-[#8B7E6D]">по руслу</span>
                </div>
              </div>

              {/* 5-Day Forecast Strip */}
              <div>
                <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider mb-3">
                  Прогноз на 5 дней для водников
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {currentWeatherPoint.forecast5Days.map((fc, i) => (
                    <div
                      key={i}
                      className="bg-[#F9F7F4] p-3 rounded-2xl border border-[#EEEBE6] text-center space-y-1"
                    >
                      <div className="text-xs font-bold text-[#1A1F1A]">{fc.day}</div>
                      <div className="text-[10px] text-[#8B7E6D]">{fc.date}</div>
                      <div className="text-sm font-extrabold text-[#2B4C7E] py-1">+{fc.tempDay}°</div>
                      <div className="text-[10px] text-[#8B7E6D]">ночь +{fc.tempNight}°</div>
                      <div className="text-[10px] text-[#4A443E] font-medium truncate" title={fc.condition}>{fc.condition}</div>
                      <div className="text-[9px] text-[#2D5A27] font-bold">{fc.windSpeedMs} м/с</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Wind Compass & Rose Widget for Paddlers */}
            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Compass className="w-5 h-5 text-[#2D5A27]" />
                  <h3 className="text-base font-bold text-[#1A1F1A]">Роза ветров и SUP-риски</h3>
                </div>
                <p className="text-xs text-[#6B665F]">
                  Оценка безопасности гребли на открытых акваториях
                </p>
              </div>

              {/* Animated Compass Dial */}
              <div className="relative w-48 h-48 mx-auto my-2 rounded-full border-2 border-[#D9D1C5] bg-[#F9F7F4] flex items-center justify-center shadow-inner">
                {/* Cardinal marks */}
                <span className="absolute top-2 text-[11px] font-bold text-[#E54B4B]">С (N)</span>
                <span className="absolute bottom-2 text-[11px] font-bold text-[#8B7E6D]">Ю (S)</span>
                <span className="absolute left-2 text-[11px] font-bold text-[#8B7E6D]">З (W)</span>
                <span className="absolute right-2 text-[11px] font-bold text-[#8B7E6D]">В (E)</span>

                {/* Compass Needle */}
                <div
                  style={{ transform: `rotate(${currentWeatherPoint.windDirectionDeg}deg)` }}
                  className="w-1.5 h-32 bg-gradient-to-t from-transparent via-[#2D5A27] to-[#E54B4B] rounded-full transition-transform duration-700 ease-out origin-center"
                />

                {/* Center cap */}
                <div className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#2D5A27] flex items-center justify-center text-[9px] font-bold text-[#2D332D] shadow-md">
                  {currentWeatherPoint.windSpeedMs}
                </div>
              </div>

              {/* Wind Safety Assessment */}
              <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">Направление:</span>
                  <strong className="text-[#1A1F1A]">{currentWeatherPoint.windDirectionText}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">Для сапбордов (SUP):</span>
                  <span className={`font-bold ${currentWeatherPoint.windSpeedMs > 5 ? 'text-[#E54B4B]' : 'text-[#2D5A27]'}`}>
                    {currentWeatherPoint.windSpeedMs > 5 ? '⚠️ Требуется опыт' : '✅ Безопасно'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8B7E6D]">Волнение реки:</span>
                  <span className="text-[#2B4C7E] font-semibold">
                    {currentWeatherPoint.windSpeedMs > 6 ? 'Волна 0.4 - 0.7м' : 'Слабая рябь (< 0.2м)'}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 3. POLAR DAY & EXPEDITION DAYLIGHT HOURS TAB */}
      {activeTab === 'polar_sun' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {weatherPoints.map((wp) => (
              <div
                key={wp.id}
                className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      Широта: {wp.lat.toFixed(2)}° N ({wp.region})
                    </span>
                    <h3 className="text-base font-bold text-[#1A1F1A] mt-1">{wp.locationName}</h3>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
                    <Sun className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6]">
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Восход солнца</span>
                    <span className="text-sm font-bold text-[#D97706] mt-0.5 block">{wp.polarDayInfo.sunrise}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Закат солнца</span>
                    <span className="text-sm font-bold text-[#EA580C] mt-0.5 block">{wp.polarDayInfo.sunset}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Световой день</span>
                    <span className="text-sm font-bold text-[#1A1F1A] mt-0.5 block">{wp.polarDayInfo.daylightHours}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B7E6D] block font-medium">Ночной период</span>
                    <span className="text-sm font-bold text-[#6B665F] mt-0.5 block">{wp.polarDayInfo.nightHours}</span>
                  </div>
                </div>

                <div className="bg-[#FEF3C7]/40 border border-[#FDE68A] p-3.5 rounded-2xl space-y-1 text-xs">
                  <div className="text-[#92400E] font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#D97706]" />
                    Рекомендуемое ходовое окно по воде:
                  </div>
                  <p className="text-[#4A443E]">
                    {wp.polarDayInfo.paddlingWindow}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
