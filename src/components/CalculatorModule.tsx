import React, { useState } from 'react';
import { VesselType } from '../types';
import { Calculator, Clock, Utensils, CheckSquare, Sparkles, Download, Copy, Check, Scale } from 'lucide-react';

export const CalculatorModule: React.FC = () => {
  // Navigation speed calculator
  const [distanceKm, setDistanceKm] = useState<number>(120);
  const [vesselType, setVesselType] = useState<VesselType>('kayak');
  const [riverFlowKmh, setRiverFlowKmh] = useState<number>(4.5);
  const [paddlingHoursPerDay, setPaddlingHoursPerDay] = useState<number>(5);

  // Food & Provisions calculator
  const [crewCount, setCrewCount] = useState<number>(4);
  const [tripDays, setTripDays] = useState<number>(6);
  const [isColdWeather, setIsColdWeather] = useState<boolean>(true); // Arctic / Cold water: 3400 kcal vs 2800 kcal

  // Checklist items
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Speed calculation
  let basePaddlingSpeed = 4.0; // km/h
  if (vesselType === 'sup') basePaddlingSpeed = 3.5;
  if (vesselType === 'kayak') basePaddlingSpeed = 5.0;
  if (vesselType === 'catamaran') basePaddlingSpeed = 4.0;
  if (vesselType === 'raft') basePaddlingSpeed = 3.0;
  if (vesselType === 'motorboat') basePaddlingSpeed = 22.0;

  const totalSpeedKmh = Math.round((basePaddlingSpeed + riverFlowKmh) * 10) / 10;
  const totalHoursRequired = Math.round((distanceKm / totalSpeedKmh) * 10) / 10;
  const calculatedDays = Math.max(1, Math.ceil(totalHoursRequired / paddlingHoursPerDay));

  // Calories & weight calculation
  const dailyKcal = isColdWeather ? 3400 : 2800;
  const totalKcalGroup = crewCount * tripDays * dailyKcal;
  const dryFoodWeightKgPerPersonDay = isColdWeather ? 0.75 : 0.65;
  const totalDryFoodWeightKg = Math.round(crewCount * tripDays * dryFoodWeightKgPerPersonDay * 10) / 10;

  const checklistCategories = [
    {
      category: '🦺 Индивидуальная безопасность и гидрозащита',
      items: [
        'Сертифицированный спасательный жилет (с паховыми ремнями)',
        'Сухой гидрокостюм (Drysuit) или неопреновый комбинезон 5мм',
        'Неопреновые ботинки с жесткой подошвой + неопреновые перчатки',
        'Каска водная (для рек II-III к.с.)',
        'Стропорез на жилете + свисток аварийный'
      ]
    },
    {
      category: '🛶 Плавсредство и ремнабор',
      items: [
        'Основное и запасное весло (разборное)',
        'Гермомешки (гермы 80-100л для вещей, 20л для быстрого доступа)',
        'Спасательный конец Александрова (морковка 15-20м)',
        'Ремнабор для ПВХ (клей Cosmofen/Десмокол, заплатки, ацетон)',
        'Насос высокого давления (для сапов/рафтов) + переходники'
      ]
    },
    {
      category: '📡 Навигация, связь и тайга',
      items: [
        'Спутниковый трекер Iridium (RockSTAR / Garmin inReach)',
        'GPS-навигатор с загруженными офлайн-картами и треком GPX',
        'Рация УКВ (Baofeng) с гермочехлом',
        'Фальшфейеры красного огня (2 шт.) и сигнал охотника от медведей',
        'Защитная сетка (накомарник) и репеллент от мошки (ДЭТА 30%+)'
      ]
    },
    {
      category: '🏕️ Лагерь и ночевка в тайге',
      items: [
        'Палатка ветроустойчивая с водостойкостью тента от 4000мм',
        'Спальник с температурой комфорта 0...+5°C',
        'Тент групповой 4х6м от таежных затяжных дождей',
        'Топор кованый таежный / складная пила',
        'Костровой тросик и котлы из нержавеющей стали'
      ]
    }
  ];

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleCopyChecklist = () => {
    const text = checklistCategories.map((c) => `${c.category}:\n` + c.items.map((i) => `[${checkedItems[i] ? 'X' : ' '}] ${i}`).join('\n')).join('\n\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
              Калькулятор сплава и экспедиционный чек-лист
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
            Точный расчет ходового времени с учетом скорости течения рек Югры/Ямала, раскладка питания и чеклист снаряжения.
          </p>
        </div>
      </div>

      {/* 2 Main Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Speed & Time Calculator + Provisions */}
        <div className="space-y-6">
          
          {/* Speed & Day Planner */}
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2D5A27]" />
              1. Расчет ходового времени по воде
            </h2>

            <div className="space-y-4 text-xs">
              
              <div>
                <div className="flex justify-between text-[#2D332D] mb-1 font-semibold">
                  <span>Дистанция маршрута:</span>
                  <strong className="text-[#2D5A27] font-black">{distanceKm} км</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="350"
                  step="5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full accent-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] mb-1 font-medium">Тип плавсредства</label>
                <select
                  value={vesselType}
                  onChange={(e) => setVesselType(e.target.value as VesselType)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                >
                  <option value="sup">🏄‍♂️ SUP-борд туринговый (базовая ~3.5 км/ч)</option>
                  <option value="kayak">🛶 Байдарка / Каяк (базовая ~5.0 км/ч)</option>
                  <option value="catamaran">⛵ Катамаран туристский (базовая ~4.0 км/ч)</option>
                  <option value="raft">🚣 Рафт надувной (базовая ~3.0 км/ч)</option>
                  <option value="motorboat">🚤 Моторная лодка (глиссирование ~22 км/ч)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[#2D332D] mb-1 font-semibold">
                  <span>Скорость течения реки (по лоции):</span>
                  <strong className="text-[#2B4C7E] font-black">{riverFlowKmh} км/ч</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={riverFlowKmh}
                  onChange={(e) => setRiverFlowKmh(Number(e.target.value))}
                  className="w-full accent-[#2B4C7E]"
                />
                <span className="text-[10px] text-[#8B7E6D] block mt-0.5">
                  Собь: 6-8 км/ч • Северная Сосьва: 4 км/ч • Тромъёган: 3.5 км/ч
                </span>
              </div>

              <div>
                <div className="flex justify-between text-[#2D332D] mb-1 font-semibold">
                  <span>Ходовых часов гребли в день:</span>
                  <strong className="text-[#2D5A27] font-black">{paddlingHoursPerDay} ч/день</strong>
                </div>
                <input
                  type="range"
                  min="3"
                  max="9"
                  step="0.5"
                  value={paddlingHoursPerDay}
                  onChange={(e) => setPaddlingHoursPerDay(Number(e.target.value))}
                  className="w-full accent-[#2D5A27]"
                />
              </div>

            </div>

            {/* Calculated Output Box */}
            <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-[#8B7E6D] block font-medium">Общая скорость</span>
                <strong className="text-base font-black text-[#2B4C7E]">{totalSpeedKmh} км/ч</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#8B7E6D] block font-medium">Чистое время</span>
                <strong className="text-base font-black text-[#1A1F1A]">{totalHoursRequired} ч</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#8B7E6D] block font-medium">Дней похода</span>
                <strong className="text-base font-black text-[#2D5A27]">{calculatedDays} дн.</strong>
              </div>
            </div>

          </div>

          {/* Provisions & Calories Planner */}
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#D97706]" />
              2. Раскладка питания и вес провизии
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#4A443E] mb-1 font-medium">Количество участников</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={crewCount}
                  onChange={(e) => setCrewCount(Number(e.target.value))}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>
              <div>
                <label className="block text-[#4A443E] mb-1 font-medium">Дней автономки</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={tripDays}
                  onChange={(e) => setTripDays(Number(e.target.value))}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#F9F7F4] p-3 rounded-2xl border border-[#EEEBE6] text-xs">
              <input
                type="checkbox"
                id="coldWeather"
                checked={isColdWeather}
                onChange={(e) => setIsColdWeather(e.target.checked)}
                className="w-4 h-4 accent-[#2D5A27]"
              />
              <label htmlFor="coldWeather" className="text-[#2D332D] cursor-pointer">
                Холодные северные условия (+5...+12°C, 3400 ккал/день на человека)
              </label>
            </div>

            <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="text-[10px] text-[#8B7E6D] block font-medium">Суммарная калорийность</span>
                <strong className="text-sm font-black text-[#D97706]">{totalKcalGroup.toLocaleString()} ккал</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#8B7E6D] block font-medium">Сухой вес еды на группу</span>
                <strong className="text-sm font-black text-[#1A1F1A]">~{totalDryFoodWeightKg} кг</strong>
              </div>
            </div>

          </div>

        </div>

        {/* Right: Interactive Gear Checklist */}
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4 flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#2D5A27]" />
                Чек-лист снаряжения для сплава
              </h2>

              <button
                onClick={handleCopyChecklist}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                  isCopied
                    ? 'bg-[#E8F1E7] text-[#2D5A27] border-[#CDE0CC]'
                    : 'bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] border-[#E5E0D8]'
                }`}
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-[#2D5A27]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {checklistCategories.map((cat, idx) => (
                <div key={idx} className="space-y-2 bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                  <h3 className="text-xs font-bold text-[#2D5A27] uppercase tracking-wider">
                    {cat.category}
                  </h3>
                  <div className="space-y-1.5">
                    {cat.items.map((item, i) => {
                      const isChecked = !!checkedItems[item];
                      return (
                        <div
                          key={i}
                          onClick={() => toggleCheck(item)}
                          className={`p-2.5 rounded-xl text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                            isChecked ? 'bg-[#E8F1E7] text-[#2D5A27] font-medium line-through opacity-80' : 'hover:bg-white text-[#2D332D]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded accent-[#2D5A27] pointer-events-none"
                          />
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E0D8] text-[11px] text-[#8B7E6D] flex items-center justify-between">
            <span>Проверено: {Object.values(checkedItems).filter(Boolean).length} пунктов</span>
            <span className="text-[#2D5A27] font-bold">Готовность к автономке</span>
          </div>

        </div>

      </div>

    </div>
  );
};
