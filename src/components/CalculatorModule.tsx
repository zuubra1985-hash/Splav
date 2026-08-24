import React, { useState, useMemo } from 'react';
import { RiverRoute, VesselType } from '../types';
import { 
  Compass, 
  Navigation, 
  MapPin, 
  Download, 
  Copy, 
  Check, 
  Clock, 
  Utensils, 
  CheckSquare, 
  Sparkles, 
  Wrench, 
  LifeBuoy, 
  Flame, 
  Scale, 
  ShoppingBag, 
  FileText, 
  HeartPulse, 
  RotateCcw, 
  Share2, 
  Package, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Calendar, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Printer,
  Fuel,
  Anchor,
  Sunrise,
  Sunset,
  Radio,
  Crosshair,
  Timer,
  FileDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CalculatorModuleProps {
  routes?: RiverRoute[];
}

export type ClimateSeason = 'summer_warm' | 'summer_polar' | 'autumn_cold';
export type AutonomyType = 'full_wilderness' | 'semi_settlements';

export interface ProvisionItem {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch_snack' | 'dinner' | 'pocket_energy' | 'beverages_sweet' | 'basics_spices';
  gramsPerPersonDay: number;
  packageUnit: string;
  packageSizeGrams: number;
  notes: string;
  isEssential: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  category: 'life_safety' | 'hydrowear' | 'drybags_camp' | 'repair_kit' | 'camp_kitchen' | 'wildlife_mchs' | 'first_aid';
  requiredCount: string;
  description: string;
  isMandatory: boolean;
  vessels?: VesselType[];
  seasons?: ClimateSeason[];
}

// Preset river profiles tailored for northern expeditions
const RIVER_PRESETS = [
  {
    name: 'р. Собь (Полярный Урал)',
    region: 'ЯНАО' as const,
    defaultDays: 4,
    defaultCrew: 4,
    distanceKm: 125,
    vessel: 'kayak' as VesselType,
    season: 'summer_polar' as ClimateSeason,
    autonomy: 'semi_settlements' as AutonomyType,
    flowSpeed: 6.5,
    description: 'Горно-таежная быстрая река Полярного Урала. Холодная вода (+8...+12°C), перекаты и шиверы.',
    hazards: 'Шиверы 2 к.с., острые камни на перекатах, резкие шквальные ветра с гор.',
    stages: [
      { day: 1, title: 'Станция Собь — Долина ручья Восточный Нырдвоменшор', kmStart: 0, kmEnd: 32, terrain: 'Горный участок, шиверы, каменистые перекаты', campType: 'Стоянка на террасе у чистых ручьев' },
      { day: 2, title: 'Нырдвоменшор — Впадение р. Ханмей', kmStart: 32, kmEnd: 65, terrain: 'Выход из ущелья, живописные скалы-бойцы', campType: 'Песчано-галечная коса, хорошая рыбалка на хариуса' },
      { day: 3, title: 'Р. Ханмей — Поселок Харп', kmStart: 65, kmEnd: 98, terrain: 'Умеренное течение, широкие плесы, галечные острова', campType: 'Лесная терраса в сосново-лиственничном лесу' },
      { day: 4, title: 'Харп — Ж/д мост ст. Собь / Обской залив', kmStart: 98, kmEnd: 125, terrain: 'Равнинный плесовый участок, спокойная вода', campType: 'Финишный антистапель у ж/д платформы' }
    ]
  },
  {
    name: 'р. Северная Сосьва',
    region: 'ХМАО' as const,
    defaultDays: 4,
    defaultCrew: 6,
    distanceKm: 110,
    vessel: 'motorboat' as VesselType,
    season: 'summer_warm' as ClimateSeason,
    autonomy: 'semi_settlements' as AutonomyType,
    flowSpeed: 3.8,
    description: 'Широкая таежная судоходная река. Рыбалка на сосьвинскую сельдь и щуку, открытые ветрам плесы.',
    hazards: 'Крутая речная волна при встречном ветре, топляки на фарватере.',
    stages: [
      { day: 1, title: 'Няксимволь — Устье р. Лепля', kmStart: 0, kmEnd: 30, terrain: 'Широкое русло, высокий правый яр', campType: 'Песчаная отмель у притока' },
      { day: 2, title: 'Р. Лепля — Деревня Хулимсунт', kmStart: 30, kmEnd: 60, terrain: 'Таежные повороты, старицы, заливы', campType: 'Берег вблизи кедровника' },
      { day: 3, title: 'Хулимсунт — Село Сартынья', kmStart: 60, kmEnd: 88, terrain: 'Плесовые участки, меандрирование', campType: 'Устье рыбной речки' },
      { day: 4, title: 'Сартынья — Поселок Игрим', kmStart: 88, kmEnd: 110, terrain: 'Судоходный участок, приближение к причалу', campType: 'Причал п. Игрим (выброска катером)' }
    ]
  },
  {
    name: 'р. Тромъёган (Русскинская)',
    region: 'ХМАО' as const,
    defaultDays: 3,
    defaultCrew: 4,
    distanceKm: 95,
    vessel: 'kayak' as VesselType,
    season: 'summer_warm' as ClimateSeason,
    autonomy: 'full_wilderness' as AutonomyType,
    flowSpeed: 3.5,
    description: 'Глухая тайга, живописные яры и песчаные косы. Обилие гнуса в июле, защита от медведей обязательна.',
    hazards: 'Обилие топляков и коряжника (заломы), полное отсутствие сотовой связи.',
    stages: [
      { day: 1, title: 'Мост автодороги — Остров Коренной', kmStart: 0, kmEnd: 35, terrain: 'Глухая сосновая тайга, песчаные пляжи', campType: 'Высокий сухой бор с белым мхом' },
      { day: 2, title: 'Остров Коренной — Урочище Хантыйские Юрты', kmStart: 35, kmEnd: 68, terrain: 'Сильное меандрирование, глубокие омуты', campType: 'Песчаный мыс на повороте русла' },
      { day: 3, title: 'Урочище — Село Русскинская', kmStart: 68, kmEnd: 95, terrain: 'Широкая пойма, песчаные косы', campType: 'Пологий берег музея Русскинской' }
    ]
  },
  {
    name: 'р. Казым (Белоярский)',
    region: 'ХМАО' as const,
    defaultDays: 2,
    defaultCrew: 3,
    distanceKm: 65,
    vessel: 'sup' as VesselType,
    season: 'summer_warm' as ClimateSeason,
    autonomy: 'semi_settlements' as AutonomyType,
    flowSpeed: 2.8,
    description: 'Спокойный равнинный сплав, идеально подходит для экспедиционных SUP-бордов и легких байдарок.',
    hazards: 'Встречный ветер на прямых плесах, медленное течение.',
    stages: [
      { day: 1, title: 'Юильск — Остров Сосновый', kmStart: 0, kmEnd: 35, terrain: 'Пологие берега, песчаные отмели', campType: 'Уютный сосновый яр с ягелем' },
      { day: 2, title: 'Остров Сосновый — Набережная г. Белоярский', kmStart: 35, kmEnd: 65, terrain: 'Широкое русло, приближение к городу', campType: 'Городской причал Белоярского' }
    ]
  },
  {
    name: 'р. Щучья (Приуралье)',
    region: 'ЯНАО' as const,
    defaultDays: 5,
    defaultCrew: 6,
    distanceKm: 140,
    vessel: 'catamaran' as VesselType,
    season: 'summer_polar' as ClimateSeason,
    autonomy: 'full_wilderness' as AutonomyType,
    flowSpeed: 5.0,
    description: 'Суровый северный маршрут по тундре. Сильные ветра, полная автономность до устья.',
    hazards: 'Сильные тундровые ветра (ветровой нагон волны), отсутствие дров (нужен газ/примус).',
    stages: [
      { day: 1, title: 'Озеро Большое Щучье — Исток р. Щучья', kmStart: 0, kmEnd: 28, terrain: 'Горно-тундровый участок, прозрачнейшая вода', campType: 'Стоянка у подножия сопок' },
      { day: 2, title: 'Исток — Урочище Тарседа', kmStart: 28, kmEnd: 58, terrain: 'Быстрины, шиверы, каменистые гряды', campType: 'Галечная коса, защита от ветра сопкой' },
      { day: 3, title: 'Днёвка / Радиальный выход в горы', kmStart: 58, kmEnd: 58, terrain: 'Днёвка, отдых экипажей, рыбалка на гольца', campType: 'Базовый лагерь' },
      { day: 4, title: 'Урочище Тарседа — Фактория Лаборовая', kmStart: 58, kmEnd: 105, terrain: 'Лесотундра, лиственничные островки', campType: 'Высокий яр над рекой' },
      { day: 5, title: 'Лаборовая — Поселок Белоярск', kmStart: 105, kmEnd: 140, terrain: 'Выход в широкую пойму, финишный переход', campType: 'Антистапель у поселка' }
    ]
  },
  {
    name: 'р. Лямин (Сургутский район)',
    region: 'ХМАО' as const,
    defaultDays: 3,
    defaultCrew: 4,
    distanceKm: 85,
    vessel: 'kayak' as VesselType,
    season: 'summer_warm' as ClimateSeason,
    autonomy: 'full_wilderness' as AutonomyType,
    flowSpeed: 3.2,
    description: 'Песчаные пляжи, чистая вода, глухие сосновые боры Югры.',
    hazards: 'Коряги в прибрежной зоне, отсутствие связи.',
    stages: [
      { day: 1, title: 'Мост трассы Лянтор — Песчаный мыс', kmStart: 0, kmEnd: 30, terrain: 'Белые песчаные пляжи, сосновые боры', campType: 'Песчаный пляж на мысу' },
      { day: 2, title: 'Песчаный мыс — Излучина Кедровой гривы', kmStart: 30, kmEnd: 60, terrain: 'Извилистые повороты, глубокие омуты', campType: 'Высокий кедровый бор' },
      { day: 3, title: 'Кедровая грива — Поселок Лямина (устье)', kmStart: 60, kmEnd: 85, terrain: 'Широкий плес перед впадением в Обь', campType: 'Причал пос. Лямина' }
    ]
  }
];

const BASE_PROVISIONS_DATABASE: ProvisionItem[] = [
  // Завтрак
  { id: 'p1', name: 'Овсяные хлопья / Каша дружба (завтрак)', category: 'breakfast', gramsPerPersonDay: 70, packageUnit: 'пач. (500г)', packageSizeGrams: 500, notes: 'Быстрая сытная энергия перед утренним переходом', isEssential: true },
  { id: 'p2', name: 'Сухое молоко цельное / Сгущенное молоко', category: 'breakfast', gramsPerPersonDay: 35, packageUnit: 'пач./банка (400г)', packageSizeGrams: 400, notes: 'Для утренних каш и кофе', isEssential: true },
  { id: 'p3', name: 'Сухофрукты (изюм, курага) в кашу', category: 'breakfast', gramsPerPersonDay: 25, packageUnit: 'упак. (300г)', packageSizeGrams: 300, notes: 'Витамины и быстрая глюкоза', isEssential: false },
  
  // Обед / Перекус на воде (без разведения костра)
  { id: 'p4', name: 'Сало соленое белорусское / шпик с чесноком', category: 'lunch_snack', gramsPerPersonDay: 50, packageUnit: 'упак. (400г)', packageSizeGrams: 400, notes: 'Главный источник калорий в холодном климате', isEssential: true },
  { id: 'p5', name: 'Сыр твердый / колбаса сырокопченая', category: 'lunch_snack', gramsPerPersonDay: 55, packageUnit: 'упак. (300г)', packageSizeGrams: 300, notes: 'Не портится без холодильника 14+ дней', isEssential: true },
  { id: 'p6', name: 'Хлебцы армейские / галеты "Арктика"', category: 'lunch_snack', gramsPerPersonDay: 60, packageUnit: 'пач. (200г)', packageSizeGrams: 200, notes: 'Влагостойкие герметичные пачки', isEssential: true },
  { id: 'p7', name: 'Паштеты мясные / рыбные риеты в банках', category: 'lunch_snack', gramsPerPersonDay: 40, packageUnit: 'банка (150г)', packageSizeGrams: 150, notes: 'Быстрый бутербродный перекус на короткой чалке', isEssential: false },

  // Ужин (костровой горячий прием пищи)
  { id: 'p8', name: 'Тушеное мясо ГОСТ (говядина/оленина 85% мяса)', category: 'dinner', gramsPerPersonDay: 130, packageUnit: 'банка (338г)', packageSizeGrams: 338, notes: 'Белок и горячий сытный ужин у костра', isEssential: true },
  { id: 'p9', name: 'Гречка ядрица / Рис пропаренный / Макароны', category: 'dinner', gramsPerPersonDay: 100, packageUnit: 'пач. (800г)', packageSizeGrams: 800, notes: 'Основной гарнир к вечернему костру', isEssential: true },
  { id: 'p10', name: 'Суповые основы / сушеные овощи и зелень', category: 'dinner', gramsPerPersonDay: 25, packageUnit: 'пак. (100г)', packageSizeGrams: 100, notes: 'Горячий наваристый суп после ходового дня', isEssential: true },
  { id: 'p11', name: 'Чеснок свежий / лук репчатый', category: 'dinner', gramsPerPersonDay: 20, packageUnit: 'сетка (1кг)', packageSizeGrams: 1000, notes: 'Фитонциды, иммунитет и вкус на Севере', isEssential: false },

  // Карманный перекус в спасжилет
  { id: 'p12', name: 'Орехи ассорти (кешью, миндаль, фундук)', category: 'pocket_energy', gramsPerPersonDay: 35, packageUnit: 'пач. (250г)', packageSizeGrams: 250, notes: 'В карман спасжилета — есть не выпуская весло', isEssential: true },
  { id: 'p13', name: 'Шоколад горький 75% / батончики мюсли', category: 'pocket_energy', gramsPerPersonDay: 40, packageUnit: 'плитка (90г)', packageSizeGrams: 90, notes: 'Моментальный подъем сил при усталости', isEssential: true },
  { id: 'p14', name: 'Карамель леденцовая / леденцы с мятой', category: 'pocket_energy', gramsPerPersonDay: 15, packageUnit: 'пач. (200г)', packageSizeGrams: 200, notes: 'Утоляет жажду и сухость во рту при гребле', isEssential: false },

  // Чай, кофе и сладкое
  { id: 'p15', name: 'Чай черный байховый листовой / иван-чай', category: 'beverages_sweet', gramsPerPersonDay: 15, packageUnit: 'пач. (200г)', packageSizeGrams: 200, notes: 'Костровой чай 3 раза в день (не пакетики)', isEssential: true },
  { id: 'p16', name: 'Кофе молотый / сублимированный', category: 'beverages_sweet', gramsPerPersonDay: 10, packageUnit: 'банка (100г)', packageSizeGrams: 100, notes: 'Для бодрого раннего подъема', isEssential: false },
  { id: 'p17', name: 'Сахар песок / рафинад', category: 'beverages_sweet', gramsPerPersonDay: 50, packageUnit: 'пач. (1кг)', packageSizeGrams: 1000, notes: 'Глюкоза для согревания и в чай', isEssential: true },
  { id: 'p18', name: 'Печенье овсяное / вафли / пряники', category: 'beverages_sweet', gramsPerPersonDay: 45, packageUnit: 'пач. (300г)', packageSizeGrams: 300, notes: 'К вечернему чаепитию у костра', isEssential: true },

  // Базовые специи, соль, масло и газ
  { id: 'p19', name: 'Соль поваренная йодированная', category: 'basics_spices', gramsPerPersonDay: 12, packageUnit: 'пач. (500г)', packageSizeGrams: 500, notes: 'Восстановление электролитов и готовка', isEssential: true },
  { id: 'p20', name: 'Масло подсолнечное рафинированное', category: 'basics_spices', gramsPerPersonDay: 20, packageUnit: 'бутылка (0.5л)', packageSizeGrams: 500, notes: 'Для жарки рыбы и заправки каш', isEssential: true },
  { id: 'p21', name: 'Приправы (лавровый лист, черный перец, хмели-сунели)', category: 'basics_spices', gramsPerPersonDay: 5, packageUnit: 'набор пак.', packageSizeGrams: 100, notes: 'Для ухи из свежевыловленного хариуса/щуки', isEssential: false }
];

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({ routes = [] }) => {
  // Combine custom user rivers from database into presets
  const dynamicRiverPresets = useMemo(() => {
    const list = [...RIVER_PRESETS];
    routes.forEach(r => {
      if (!list.some(p => p.name.toLowerCase() === r.name.toLowerCase() || p.name.toLowerCase() === r.riverName.toLowerCase())) {
        list.push({
          name: `${r.name}`,
          region: r.region,
          defaultDays: r.durationDays || 3,
          defaultCrew: 4,
          distanceKm: r.lengthKm || 80,
          vessel: (r.recommendedVessels && r.recommendedVessels[0]) || 'kayak',
          season: 'summer_warm',
          autonomy: r.region === 'ЯНАО' ? 'full_wilderness' : 'semi_settlements',
          flowSpeed: r.avgFlowSpeedKmh || 3.5,
          description: r.shortDesc || r.description,
          hazards: r.warnings && r.warnings.length > 0 ? r.warnings.join('. ') : 'Речной коряжник, переменчивая северная погода.',
          stages: [
            { day: 1, title: 'Старт — Первый базовый ночлег', kmStart: 0, kmEnd: Math.round(r.lengthKm / (r.durationDays || 3)), terrain: 'Начальный участок маршрута', campType: 'Удобная стоянка на берегу' },
            { day: 2, title: 'Ходовой переход по реке', kmStart: Math.round(r.lengthKm / (r.durationDays || 3)), kmEnd: Math.round((r.lengthKm / (r.durationDays || 3)) * 2), terrain: 'Плесовые и перекатные участки', campType: 'Песчаная коса или терраса' },
            { day: 3, title: 'Переход к финишной точке', kmStart: Math.round((r.lengthKm / (r.durationDays || 3)) * 2), kmEnd: r.lengthKm, terrain: 'Финальный участок до антистапеля', campType: 'Точка выброски' }
          ]
        });
      }
    });
    return list;
  }, [routes]);

  // Config state
  const [selectedPresetName, setSelectedPresetName] = useState<string>(RIVER_PRESETS[0].name);
  const [riverName, setRiverName] = useState<string>(RIVER_PRESETS[0].name);
  const [region, setRegion] = useState<'ХМАО' | 'ЯНАО'>('ЯНАО');
  const [crewCount, setCrewCount] = useState<number>(4);
  const [tripDays, setTripDays] = useState<number>(4);
  const [extraReserveDays, setExtraReserveDays] = useState<number>(1);
  const [vesselType, setVesselType] = useState<VesselType>('kayak');
  const [climateSeason, setClimateSeason] = useState<ClimateSeason>('summer_polar');
  const [autonomy, setAutonomy] = useState<AutonomyType>('semi_settlements');
  const [distanceKm, setDistanceKm] = useState<number>(125);
  const [flowSpeedKmh, setFlowSpeedKmh] = useState<number>(6.5);
  
  // Motorboat specific settings
  const [motorHp, setMotorHp] = useState<number>(9.9);
  const [motorStroke, setMotorStroke] = useState<'2T' | '4T'>('2T');

  // Active module tab
  const [activeTab, setActiveTab] = useState<'navigation' | 'provisions' | 'gear' | 'weight_safety'>('navigation');

  // Interactive Checklist states
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Handle Preset Selection
  const handleSelectPreset = (preset: typeof dynamicRiverPresets[0]) => {
    setSelectedPresetName(preset.name);
    setRiverName(preset.name);
    setRegion(preset.region);
    setTripDays(preset.defaultDays);
    setCrewCount(preset.defaultCrew);
    setVesselType(preset.vessel);
    setClimateSeason(preset.season);
    setAutonomy(preset.autonomy);
    setDistanceKm(preset.distanceKm);
    setFlowSpeedKmh(preset.flowSpeed);
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
  };

  const totalCalculatedDays = tripDays + extraReserveDays;

  const toggleCheck = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const showCopied = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // ----------------------------------------------------
  // OSMAND+ STYLE NAVIGATION & SPEED CALCULATIONS
  // ----------------------------------------------------
  const navStats = useMemo(() => {
    // Paddling / Cruising speeds on calm water
    const baseVesselSpeed = vesselType === 'sup' ? 3.8 : 
                            vesselType === 'kayak' ? 4.8 : 
                            vesselType === 'catamaran' ? 4.2 : 
                            vesselType === 'raft' ? 3.0 : 
                            vesselType === 'motorboat' ? (motorHp <= 5 ? 10 : motorHp <= 9.9 ? 18 : 25) : 4.5;
    
    // Effective ground speed over river bottom
    const effectiveGroundSpeedKmh = baseVesselSpeed + flowSpeedKmh;
    
    // River meander winding factor in northern terrain (~1.12x - 1.20x)
    const windingFactor = 1.15;
    const effectiveRiverKm = distanceKm * windingFactor;
    
    // Total pure water travel hours across entire expedition
    const totalWaterTravelHours = effectiveRiverKm / effectiveGroundSpeedKmh;
    
    // Daily target distance and daily paddling hours
    const dailyDistanceKm = distanceKm / tripDays;
    const dailyWaterHours = totalWaterTravelHours / tripDays;
    
    const dailyHoursInt = Math.floor(dailyWaterHours);
    const dailyMinutesInt = Math.round((dailyWaterHours - dailyHoursInt) * 60);

    // Motor Fuel Calculation (if motorboat)
    const litersPerHour = motorHp <= 3.5 ? 1.2 : 
                          motorHp <= 5 ? 2.0 : 
                          motorHp <= 9.9 ? (motorStroke === '2T' ? 4.2 : 3.0) : 
                          motorHp <= 15 ? (motorStroke === '2T' ? 5.8 : 4.2) : 7.5;
    
    const rawFuelLiters = totalWaterTravelHours * litersPerHour;
    const fuelWithSafetyReserveLiters = Math.ceil(rawFuelLiters * 1.30); // +30% reserve for wind/current
    const twoStrokeOilLiters = motorStroke === '2T' ? (fuelWithSafetyReserveLiters / 50).toFixed(1) : '0';

    return {
      baseVesselSpeed,
      effectiveGroundSpeedKmh: effectiveGroundSpeedKmh.toFixed(1),
      effectiveRiverKm: Math.round(effectiveRiverKm),
      totalWaterTravelHours: totalWaterTravelHours.toFixed(1),
      dailyDistanceKm: dailyDistanceKm.toFixed(1),
      dailyHoursInt,
      dailyMinutesInt,
      litersPerHour,
      rawFuelLiters: rawFuelLiters.toFixed(0),
      fuelWithSafetyReserveLiters,
      twoStrokeOilLiters
    };
  }, [vesselType, flowSpeedKmh, distanceKm, tripDays, motorHp, motorStroke]);

  // Dynamically generated stage breakdown by days (OsmAnd+ Track Roadbook)
  const calculatedStages = useMemo(() => {
    const activePreset = dynamicRiverPresets.find(p => p.name === selectedPresetName);
    const stagesList = [];
    const stepKm = distanceKm / tripDays;

    for (let i = 1; i <= tripDays; i++) {
      const kmStart = Math.round((i - 1) * stepKm);
      const kmEnd = i === tripDays ? distanceKm : Math.round(i * stepKm);
      const stageDist = kmEnd - kmStart;
      const stageHours = (stageDist * 1.15) / Number(navStats.effectiveGroundSpeedKmh);
      const sH = Math.floor(stageHours);
      const sM = Math.round((stageHours - sH) * 60);

      const presetStage = activePreset?.stages?.[i - 1];

      stagesList.push({
        dayNumber: i,
        title: presetStage ? presetStage.title : `День ${i}: Участок ${kmStart} км — ${kmEnd} км`,
        kmStart,
        kmEnd,
        stageDist,
        durationFormatted: `${sH} ч ${sM} мин`,
        terrain: presetStage ? presetStage.terrain : 'Речной переход по руслу реки, таежные яры и перекаты',
        campType: presetStage ? presetStage.campType : 'Обустройство лагеря на сухом песчаном берегу/террасе',
        startEta: '09:30',
        lunchEta: '13:30',
        finishCampEta: '17:30'
      });
    }

    return stagesList;
  }, [tripDays, distanceKm, navStats.effectiveGroundSpeedKmh, selectedPresetName, dynamicRiverPresets]);

  // ----------------------------------------------------
  // PROVISION CALCULATIONS
  // ----------------------------------------------------
  const calculatedProvisions = useMemo(() => {
    const climateMultiplier = climateSeason === 'autumn_cold' ? 1.2 : climateSeason === 'summer_polar' ? 1.1 : 1.0;
    
    return BASE_PROVISIONS_DATABASE.map(item => {
      const totalGrams = Math.round(item.gramsPerPersonDay * crewCount * totalCalculatedDays * climateMultiplier);
      const totalKg = (totalGrams / 1000).toFixed(2);
      const packagesCount = Math.ceil(totalGrams / item.packageSizeGrams);

      return {
        ...item,
        totalGrams,
        totalKg,
        packagesCount
      };
    });
  }, [crewCount, totalCalculatedDays, climateSeason]);

  const totalFoodWeightKg = useMemo(() => {
    const sum = calculatedProvisions.reduce((acc, curr) => acc + curr.totalGrams, 0);
    return (sum / 1000).toFixed(1);
  }, [calculatedProvisions]);

  const foodWeightPerPersonKg = useMemo(() => {
    return (Number(totalFoodWeightKg) / crewCount).toFixed(1);
  }, [totalFoodWeightKg, crewCount]);

  // ----------------------------------------------------
  // GEAR & REPAIR LIST
  // ----------------------------------------------------
  const gearItems: GearItem[] = useMemo(() => {
    return [
      // Жизнеобеспечение и сплавная безопасность
      {
        id: 'g-pfd',
        name: 'Сертифицированный спасательный жилет (ГОСТ Р 58108-2019, плавучесть от 100Н)',
        category: 'life_safety',
        requiredCount: `${crewCount} шт (по 1 на каждого)`,
        description: 'С паховыми ремнями, свистком и светоотражающими элементами. Надевать ДО посадки на судно.',
        isMandatory: true
      },
      {
        id: 'g-throw-rope',
        name: 'Спасательный конец Александрова / морковка (плавающий шнур 20–25 м)',
        category: 'life_safety',
        requiredCount: vesselType === 'kayak' ? `${Math.ceil(crewCount / 2)} шт` : '2 шт на судно',
        description: 'Для экстренной страховки при переворотах и чалки в сильное течение.',
        isMandatory: true
      },
      {
        id: 'g-spare-paddle',
        name: 'Запасное весло (разборное 2-3 секции)',
        category: 'life_safety',
        requiredCount: '1-2 запасных весла на группу',
        description: 'Закрепить резинками на деке судна на случай поломки или утери в шивере.',
        isMandatory: vesselType !== 'motorboat'
      },
      {
        id: 'g-helmet',
        name: 'Водный шлем защитный с отверстиями для слива воды',
        category: 'life_safety',
        requiredCount: `${crewCount} шт`,
        description: 'Обязательно для каменистых рек Полярного Урала (Собь, Щучья) с перекатами.',
        isMandatory: region === 'ЯНАО'
      },
      // Ремкомплект
      {
        id: 'rep-glue',
        name: 'Полиуретановый клей для ПВХ (Десмокол / Клейберг / Cosmofen) + отвердитель',
        category: 'repair_kit',
        requiredCount: '2-3 тюбика по 100 мл',
        description: 'Специальный влагостойкий клей для эластичных швов баллонов и дна.',
        isMandatory: true
      },
      {
        id: 'rep-pvc-patches',
        name: 'Набор заплат ПВХ разной плотности (650 г/м² и 950 г/м²)',
        category: 'repair_kit',
        requiredCount: 'Комплект 10 заплат',
        description: 'Тонкие для бортов, армированные утолщенные для днища и штевней.',
        isMandatory: true
      },
      {
        id: 'rep-tape',
        name: 'Армированный сантехнический скотч (Duct Tape TPL)',
        category: 'repair_kit',
        requiredCount: '1 рулон 50 м',
        description: 'Аварийный быстрый ремонт весел, герм, каркаса прямо на воде.',
        isMandatory: true
      },
      {
        id: 'rep-tools',
        name: 'Инструмент для ремонта (наждачка P120, ножницы, прикаточный валик, ацетон)',
        category: 'repair_kit',
        requiredCount: '1 комплект',
        description: 'Для зачистки, обезжиривания и прикатки заплаты.',
        isMandatory: true
      },
      {
        id: 'rep-valve',
        name: 'Запасной клапан Bravo/Голубева + ключ для клапанов + насос',
        category: 'repair_kit',
        requiredCount: '1 ключ + 1 клапан + 1 насос',
        description: 'Позволяет за 5 минут заменить травящий клапан на реке.',
        isMandatory: true
      },
      // Лагерное и костровое
      {
        id: 'g-tents',
        name: 'Палатки штормовые ветроустойчивые с дугами из авиационного дюраля',
        category: 'drybags_camp',
        requiredCount: `${Math.ceil(crewCount / 2.5)} шт (по 2-3 чел в палатке)`,
        description: 'Водостойкость тента от 4000 мм, дна от 6000 мм. Юбка от ветра для Ямала.',
        isMandatory: true
      },
      {
        id: 'g-camp-tarp',
        name: 'Тент лагерный групповой (4х6 м) с прочными люверсами и паракордом (40 м)',
        category: 'camp_kitchen',
        requiredCount: '1 тент на группу',
        description: 'Создает сухую кают-компанию и укрытие для готовки в многодневный дождь.',
        isMandatory: true
      },
      {
        id: 'g-pots',
        name: `Котлы костровые из нержавейки / анодированного алюминия (объем ${(crewCount * 0.8).toFixed(0)} л + чайник ${(crewCount * 0.5).toFixed(0)} л)`,
        category: 'camp_kitchen',
        requiredCount: '2 котла + 1 чайник',
        description: 'Расчет: 0.8 л на человека для супа/каши + отдельный котел под чай.',
        isMandatory: true
      },
      // Безопасность и защита от диких животных
      {
        id: 'g-bear-spray',
        name: 'Антимедвежий перцовый спрей (Контроль-АС / Anti-Bear 225-400 мл)',
        category: 'wildlife_mchs',
        requiredCount: crewCount > 4 ? '2 баллона' : '1 баллон',
        description: 'Дальность факела до 6-8 метров. Держать в быстром доступе при выходе на берег.',
        isMandatory: true
      },
      {
        id: 'g-flares',
        name: 'Сигнал охотника (пусковое устройство + ракеты) + Фальшфейеры',
        category: 'wildlife_mchs',
        requiredCount: '1 пусковое + 15 патронов + 2 фальшфейера',
        description: 'Для отпугивания хищников и подачи сигналов спасателям МЧС.',
        isMandatory: true
      },
      {
        id: 'g-satellite-radio',
        name: 'Связь: Спутниковый трекер / УКВ рации (Baofeng UV-5R)',
        category: 'wildlife_mchs',
        requiredCount: '1 трекер + по 1 рации на экипаж',
        description: 'Для связи между судами и экстренного вызова спасателей вне зоны сотовой связи.',
        isMandatory: autonomy === 'full_wilderness'
      },
      {
        id: 'g-first-aid',
        name: 'Групповая расширенная сплавная аптечка (в герметичном ударопрочном боксе)',
        category: 'first_aid',
        requiredCount: '1 большая аптечка',
        description: 'Гемостатики (Celox), турникеты, эластичные бинты, антибиотики, НПВС, антигистаминные, регидрон, крем Пантенол.',
        isMandatory: true
      }
    ];
  }, [crewCount, vesselType, region, autonomy]);

  // ----------------------------------------------------
  // WEIGHT & CARGO DISTRIBUTION
  // ----------------------------------------------------
  const weightStats = useMemo(() => {
    const foodWeight = Number(totalFoodWeightKg);
    const personalGearWeight = crewCount * 14;
    const groupCampWeight = 20 + (crewCount > 4 ? 8 : 0);
    const vesselsOwnWeight = vesselType === 'kayak' ? (Math.ceil(crewCount / 2) * 22) :
                             vesselType === 'sup' ? (crewCount * 12) :
                             vesselType === 'catamaran' ? 45 : 
                             vesselType === 'motorboat' ? 120 : 50;

    const totalCargoWeight = Math.round(foodWeight + personalGearWeight + groupCampWeight);
    const totalExpeditionWeight = totalCargoWeight + vesselsOwnWeight + (crewCount * 75);

    const maxVesselCapacity = vesselType === 'kayak' ? (Math.ceil(crewCount / 2) * 280) :
                             vesselType === 'sup' ? (crewCount * 150) :
                             vesselType === 'catamaran' ? 900 : 
                             vesselType === 'motorboat' ? 800 : 1200;

    const payloadPercentage = Math.min(100, Math.round((totalExpeditionWeight / maxVesselCapacity) * 100));

    return {
      foodWeight,
      personalGearWeight,
      groupCampWeight,
      vesselsOwnWeight,
      totalCargoWeight,
      totalExpeditionWeight,
      maxVesselCapacity,
      payloadPercentage
    };
  }, [totalFoodWeightKg, crewCount, vesselType]);

  // ----------------------------------------------------
  // EXPORT GPX NAVIGATION FILE FOR OSMAND+ / LOCUS / GARMIN
  // ----------------------------------------------------
  const handleExportOsmAndGpx = () => {
    const activePreset = dynamicRiverPresets.find(p => p.name === selectedPresetName);
    const nowIso = new Date().toISOString();

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="Splav86 River Navigation Planner" xmlns="http://www.topografix.com/GPX/1/1" xmlns:osmand="https://osmand.net">\n`;
    gpx += `  <metadata>\n`;
    gpx += `    <name>${riverName} - Сплав (${distanceKm} км, ${tripDays} дн)</name>\n`;
    gpx += `    <desc>План навигации OsmAnd+. Дистанция: ${distanceKm} км, Экипаж: ${crewCount} чел, Судно: ${vesselType}</desc>\n`;
    gpx += `    <time>${nowIso}</time>\n`;
    gpx += `  </metadata>\n\n`;

    // Add Waypoints for OsmAnd+
    calculatedStages.forEach((st) => {
      gpx += `  <wpt lat="61.000" lon="69.000">\n`;
      gpx += `    <name>День ${st.dayNumber}: ${st.kmEnd} км</name>\n`;
      gpx += `    <desc>${st.title}. Ночлег: ${st.campType}. Время перехода: ${st.durationFormatted}</desc>\n`;
      gpx += `    <sym>camp</sym>\n`;
      gpx += `    <type>Стоянка / Лагерь</type>\n`;
      gpx += `  </wpt>\n`;
    });

    gpx += `</gpx>\n`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osmand_nav_${riverName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    showCopied('GPX-файл для OsmAnd+ / Locus Map успешно сохранен!');
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  // Export Text Roadbook
  const handleExportTextRoadbook = () => {
    let text = `=================================================================\n`;
    text += `   SPLAV86 • НАВИГАЦИОННЫЙ ПЛАНШЕТ И РОАДБУК (OSMAND+)\n`;
    text += `=================================================================\n\n`;
    text += `Маршрут: ${riverName} (${region})\n`;
    text += `Общая дистанция: ${distanceKm} км (с учетом меандрирования: ~${navStats.effectiveRiverKm} км)\n`;
    text += `Длительность: ${tripDays} ходовых дней (+${extraReserveDays} рез.)\n`;
    text += `Экипаж: ${crewCount} чел. • Плавсредство: ${vesselType.toUpperCase()}\n`;
    text += `Скорость течения реки: ${flowSpeedKmh} км/ч\n`;
    text += `Путевая скорость (по течению): ${navStats.effectiveGroundSpeedKmh} км/ч\n`;
    text += `Средний дневной переход: ${navStats.dailyDistanceKm} км/день (~${navStats.dailyHoursInt} ч ${navStats.dailyMinutesInt} мин на воде)\n\n`;

    text += `-----------------------------------------------------------------\n`;
    text += `ПОДНЕВНЫЙ ГРАФИК ПЕРЕХОДОВ И ТОЧКИ НОЧЛЕГОВ (OSMAND+ ROADBOOK):\n`;
    text += `-----------------------------------------------------------------\n`;
    calculatedStages.forEach(st => {
      text += `[ДЕНЬ ${st.dayNumber}] ${st.title}\n`;
      text += `  • Дистанция этапа: ${st.stageDist} км (${st.kmStart} км -> ${st.kmEnd} км от старта)\n`;
      text += `  • Расчетное время на воде: ${st.durationFormatted}\n`;
      text += `  • Тайминг: Старт ${st.startEta} | Перекус ${st.lunchEta} | Чалка/Лагерь ${st.finishCampEta}\n`;
      text += `  • Характер русла: ${st.terrain}\n`;
      text += `  • Ночлег: ${st.campType}\n\n`;
    });

    if (vesselType === 'motorboat') {
      text += `-----------------------------------------------------------------\n`;
      text += `РАСЧЕТ ГСМ ДЛЯ МОТОРА (${motorHp} л.с., ${motorStroke}):\n`;
      text += `-----------------------------------------------------------------\n`;
      text += `• Чистое моторное время: ${navStats.totalWaterTravelHours} ч\n`;
      text += `• Расход топлива: ${navStats.litersPerHour} л/час\n`;
      text += `• Необходимый запас бензина АИ-92: ${navStats.fuelWithSafetyReserveLiters} л (с запасом 30%)\n`;
      if (motorStroke === '2T') {
        text += `• Масло для 2-тактного мотора (TC-W3): ${navStats.twoStrokeOilLiters} л (пропорция 1:50)\n`;
      }
      text += `\n`;
    }

    text += `-----------------------------------------------------------------\n`;
    text += `ПРОДУКТОВАЯ РАСКЛАДКА (${totalFoodWeightKg} кг всего, ${foodWeightPerPersonKg} кг/чел):\n`;
    text += `-----------------------------------------------------------------\n`;
    calculatedProvisions.forEach((p, idx) => {
      text += `${idx + 1}. ${p.name}: ${p.totalKg} кг (${p.packagesCount} ${p.packageUnit})\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_roadbook_${riverName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showCopied('Роадбук успешно скачан!');
  };

  const handleCopyShoppingList = () => {
    let text = `🛒 СПИСОК ПОКУПОК ДЛЯ СПЛАВА (${riverName}, ${crewCount} чел, ${totalCalculatedDays} дн):\n\n`;
    calculatedProvisions.forEach(p => {
      text += `• ${p.name} — ${p.totalKg} кг (${p.packagesCount} ${p.packageUnit})\n`;
    });
    text += `\nОбщий сухой вес провизии: ${totalFoodWeightKg} кг (${foodWeightPerPersonKg} кг на человека).`;

    navigator.clipboard.writeText(text);
    showCopied('Список покупок скопирован в буфер для Telegram/WhatsApp!');
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-br from-[#1A2E1A] via-[#244222] to-[#1E3B20] text-white rounded-[32px] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-emerald-300 border border-white/10">
              <Compass className="w-3.5 h-3.5" />
              <span>Экспедиционный навигатор & расчет сборов</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Навигация и сборы на сплав
            </h1>
            <p className="text-sm text-[#C8DFC5] leading-relaxed">
              Точный расчет путевой скорости, подневного графика переходов и ETA по стандартам OsmAnd+, раскладки провизии в граммах и ремкомплекта судна.
            </p>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportOsmAndGpx}
              className="px-4 py-2.5 bg-[#3D7136] hover:bg-[#4D8C44] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2"
              title="Экспорт в формате GPX для OsmAnd+, Locus Map, Garmin"
            >
              <Navigation className="w-4 h-4" />
              Экспорт в OsmAnd (GPX)
            </button>
            <button
              onClick={handleExportTextRoadbook}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl backdrop-blur-md border border-white/15 transition-all flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Скачать роадбук
            </button>
          </div>
        </div>

        {copiedNotification && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-xs font-medium text-emerald-200 flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-300 shrink-0" />
            {copiedNotification}
          </div>
        )}
      </div>

      {/* Preset River Selector Carousel */}
      <div className="bg-white p-4 sm:p-5 rounded-[28px] border border-[#E5E0D8] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2D5A27]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#4A443E]">Быстрый выбор реки и маршрута:</span>
          </div>
          <span className="text-xs text-[#8B7E6D]">Доступно {dynamicRiverPresets.length} рек</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {dynamicRiverPresets.map((preset) => {
            const isSelected = selectedPresetName === preset.name;
            return (
              <button
                key={preset.name}
                onClick={() => handleSelectPreset(preset)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                    : 'bg-[#F9F7F4] text-[#4A443E] border-[#E5E0D8] hover:border-[#2D5A27]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${preset.region === 'ЯНАО' ? 'bg-blue-400' : 'bg-emerald-400'}`}></span>
                {preset.name} ({preset.distanceKm} км)
              </button>
            );
          })}
        </div>
      </div>

      {/* EXPEDITION PARAMETERS CONTROLLER */}
      <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1F1A] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#2D5A27]" />
            Параметры маршрута и плавсредства
          </h2>
          <span className="text-xs text-[#6B665F]">
            {vesselType === 'kayak' ? '🚣 Байдарка' : vesselType === 'sup' ? '🏄 SUP-борд' : vesselType === 'catamaran' ? '⛵ Катамаран' : vesselType === 'motorboat' ? '🚤 Моторка' : '🛶 Рафт'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          {/* River Distance & Flow */}
          <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
            <label className="font-bold text-[#1A1F1A] flex items-center justify-between">
              <span>Дистанция по реке</span>
              <span className="text-[#2D5A27] font-black text-sm">{distanceKm} км</span>
            </label>
            <input
              type="range"
              min={20}
              max={400}
              step={5}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full accent-[#2D5A27]"
            />
            <div className="flex items-center justify-between text-[11px] text-[#6B665F]">
              <span>Течение:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={flowSpeedKmh}
                  onChange={(e) => setFlowSpeedKmh(Number(e.target.value))}
                  className="w-12 bg-white border border-[#DDD] rounded px-1 text-center font-bold"
                />
                <span>км/ч</span>
              </div>
            </div>
          </div>

          {/* Days & Reserve */}
          <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
            <label className="font-bold text-[#1A1F1A] flex items-center justify-between">
              <span>Ходовые дни</span>
              <span className="text-[#2D5A27] font-black text-sm">{tripDays} дн.</span>
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={tripDays}
              onChange={(e) => setTripDays(Number(e.target.value))}
              className="w-full accent-[#2D5A27]"
            />
            <div className="flex items-center justify-between text-[11px] text-[#6B665F]">
              <span>Резервные дни (шторм/днёвки):</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExtraReserveDays(Math.max(0, extraReserveDays - 1))}
                  className="w-5 h-5 bg-white border border-[#DDD] rounded font-bold"
                >-</button>
                <span className="font-bold text-[#1A1F1A] w-4 text-center">{extraReserveDays}</span>
                <button
                  onClick={() => setExtraReserveDays(extraReserveDays + 1)}
                  className="w-5 h-5 bg-white border border-[#DDD] rounded font-bold"
                >+</button>
              </div>
            </div>
          </div>

          {/* Crew Members */}
          <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
            <label className="font-bold text-[#1A1F1A] flex items-center justify-between">
              <span>Состав группы</span>
              <span className="text-[#2D5A27] font-black text-sm">{crewCount} чел.</span>
            </label>
            <input
              type="range"
              min={1}
              max={16}
              value={crewCount}
              onChange={(e) => setCrewCount(Number(e.target.value))}
              className="w-full accent-[#2D5A27]"
            />
            <div className="flex items-center justify-between text-[11px] text-[#6B665F]">
              <span>Всего человеко-дней:</span>
              <span className="font-bold text-[#2B4C7E]">{crewCount * totalCalculatedDays} ч/дн</span>
            </div>
          </div>

          {/* Vessel Selector */}
          <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2">
            <label className="font-bold text-[#1A1F1A] block">Тип плавсредства</label>
            <select
              value={vesselType}
              onChange={(e) => setVesselType(e.target.value as VesselType)}
              className="w-full bg-white border border-[#E5E0D8] rounded-xl p-2 font-bold text-[#2D332D]"
            >
              <option value="kayak">🚣 Байдарка / Каяк (~4.8 км/ч)</option>
              <option value="sup">🏄 SUP-борд экспедиционный (~3.8 км/ч)</option>
              <option value="catamaran">⛵ Катамаран спортивный (~4.2 км/ч)</option>
              <option value="raft">🛶 Рафт туристический (~3.0 км/ч)</option>
              <option value="motorboat">🚤 Моторная лодка ПЛМ (глиссер)</option>
            </select>

            {vesselType === 'motorboat' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-[#6B665F]">Мощность:</span>
                  <select
                    value={motorHp}
                    onChange={(e) => setMotorHp(Number(e.target.value))}
                    className="w-full bg-white border border-[#DDD] rounded p-1 text-xs"
                  >
                    <option value={3.5}>3.5 л.с.</option>
                    <option value={5}>5 л.с.</option>
                    <option value={9.9}>9.9 / 15 л.с.</option>
                    <option value={20}>20 л.с.</option>
                    <option value={30}>30 л.с.</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B665F]">Тактность:</span>
                  <select
                    value={motorStroke}
                    onChange={(e) => setMotorStroke(e.target.value as '2T' | '4T')}
                    className="w-full bg-white border border-[#DDD] rounded p-1 text-xs"
                  >
                    <option value="2T">2-тактный</option>
                    <option value="4T">4-тактный</option>
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E5E0D8] pb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('navigation')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'navigation'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'bg-white text-[#6B665F] hover:text-[#1A1F1A] border border-[#E5E0D8]'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Навигация и этапы (OsmAnd+)</span>
        </button>

        <button
          onClick={() => setActiveTab('provisions')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'provisions'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'bg-white text-[#6B665F] hover:text-[#1A1F1A] border border-[#E5E0D8]'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Раскладка провизии ({totalFoodWeightKg} кг)</span>
        </button>

        <button
          onClick={() => setActiveTab('gear')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'gear'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'bg-white text-[#6B665F] hover:text-[#1A1F1A] border border-[#E5E0D8]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Снаряжение и ремкомплект</span>
        </button>

        <button
          onClick={() => setActiveTab('weight_safety')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'weight_safety'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'bg-white text-[#6B665F] hover:text-[#1A1F1A] border border-[#E5E0D8]'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Развесовка и безопасность</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. TAB: OSMAND+ STYLE NAVIGATION & STAGE ROADBOOK */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'navigation' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-sm">
              <span className="text-[11px] font-bold text-[#8B7E6D] uppercase block">Путевая скорость (SOG)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-[#2D5A27]">{navStats.effectiveGroundSpeedKmh}</span>
                <span className="text-xs text-[#6B665F]">км/ч</span>
              </div>
              <span className="text-[10px] text-[#6B665F] block mt-0.5">Гребля {navStats.baseVesselSpeed} + Река {flowSpeedKmh} км/ч</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-sm">
              <span className="text-[11px] font-bold text-[#8B7E6D] uppercase block">Дневной переход</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-[#2B4C7E]">{navStats.dailyDistanceKm}</span>
                <span className="text-xs text-[#6B665F]">км/день</span>
              </div>
              <span className="text-[10px] text-[#6B665F] block mt-0.5">Всего по реке: {distanceKm} км</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-sm">
              <span className="text-[11px] font-bold text-[#8B7E6D] uppercase block">Чистое время гребли</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-[#1A1F1A]">{navStats.dailyHoursInt}ч {navStats.dailyMinutesInt}м</span>
              </div>
              <span className="text-[10px] text-[#6B665F] block mt-0.5">В день на воде</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-sm">
              <span className="text-[11px] font-bold text-[#8B7E6D] uppercase block">Меандрирование (извилистость)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-[#93541A]">~{navStats.effectiveRiverKm}</span>
                <span className="text-xs text-[#6B665F]">км русла</span>
              </div>
              <span className="text-[10px] text-[#6B665F] block mt-0.5">Коэффициент изгибов x1.15</span>
            </div>
          </div>

          {/* Motor Fuel Box if motorboat */}
          {vesselType === 'motorboat' && (
            <div className="bg-[#FFF9F2] p-5 rounded-[28px] border border-[#FAD7B5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#E88C30] text-white rounded-2xl shadow-sm">
                  <Fuel className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1F1A]">Расчет топлива для мотора ({motorHp} л.с., {motorStroke})</h3>
                  <p className="text-xs text-[#6B665F] mt-0.5">
                    Расход: ~{navStats.litersPerHour} л/час • Моточасы: ~{navStats.totalWaterTravelHours} ч
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="bg-white px-3.5 py-2 rounded-xl border border-[#FAD7B5]">
                  <span className="text-[#8B7E6D] block text-[10px]">Бензин АИ-92 (+30% резерв):</span>
                  <span className="text-base text-[#93541A] font-black">{navStats.fuelWithSafetyReserveLiters} литров</span>
                </div>
                {motorStroke === '2T' && (
                  <div className="bg-white px-3.5 py-2 rounded-xl border border-[#FAD7B5]">
                    <span className="text-[#8B7E6D] block text-[10px]">Масло 2Т TC-W3 (1:50):</span>
                    <span className="text-base text-[#2D5A27] font-black">{navStats.twoStrokeOilLiters} л</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Daily Schedule Timeline */}
          <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1A1F1A] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2D5A27]" />
                  Тайминг ходового дня (Режим экспедиции)
                </h3>
                <p className="text-xs text-[#6B665F] mt-0.5">Оптимальный распорядок дня для северных рек</p>
              </div>
              <span className="text-xs font-bold text-[#2D5A27] bg-[#E8F1E7] px-2.5 py-1 rounded-full">
                Старт в 09:30
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <div className="flex items-center gap-1.5 text-[#2D5A27] font-bold mb-1">
                  <Sunrise className="w-4 h-4" />
                  08:00 — 09:30
                </div>
                <div className="font-bold text-[#1A1F1A]">Подъем и сборы лагеря</div>
                <p className="text-[11px] text-[#6B665F] mt-0.5">Завтрак, упаковка гермомешков, проверка судов</p>
              </div>

              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <div className="flex items-center gap-1.5 text-[#2B4C7E] font-bold mb-1">
                  <Navigation className="w-4 h-4" />
                  09:30 — 13:30
                </div>
                <div className="font-bold text-[#1A1F1A]">Первая половина хода</div>
                <p className="text-[11px] text-[#6B665F] mt-0.5">4 часа на воде, короткая техническая чалка 15 мин</p>
              </div>

              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <div className="flex items-center gap-1.5 text-[#93541A] font-bold mb-1">
                  <Flame className="w-4 h-4" />
                  13:30 — 14:30
                </div>
                <div className="font-bold text-[#1A1F1A]">Обед / Перекус на воде</div>
                <p className="text-[11px] text-[#6B665F] mt-0.5">Сало, сыр, галеты, горячий чай из термосов</p>
              </div>

              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <div className="flex items-center gap-1.5 text-[#7C3AED] font-bold mb-1">
                  <Sunset className="w-4 h-4" />
                  17:30 — 21:00
                </div>
                <div className="font-bold text-[#1A1F1A]">Антистапель дня / Ужин</div>
                <p className="text-[11px] text-[#6B665F] mt-0.5">Чалка, установка палаток, рыбалка, костер</p>
              </div>
            </div>
          </div>

          {/* OsmAnd+ Stages Breakdown */}
          <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1A1F1A] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2D5A27]" />
                  Подневный роадбук этапов (OsmAnd+ Roadbook)
                </h3>
                <p className="text-xs text-[#6B665F] mt-0.5">
                  Поэтапная разбивка реки на дневные переходы со стоянками и ориентирами
                </p>
              </div>
              <button
                onClick={handleExportOsmAndGpx}
                className="text-xs text-[#2D5A27] font-bold hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать GPX трек
              </button>
            </div>

            <div className="space-y-3">
              {calculatedStages.map((stage) => (
                <div
                  key={stage.dayNumber}
                  className="bg-[#F9F7F4] rounded-2xl p-4 border border-[#EEEBE6] hover:border-[#2D5A27] transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#2D5A27] text-white font-black text-xs flex items-center justify-center shrink-0">
                        {stage.dayNumber}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1F1A]">{stage.title}</h4>
                        <span className="text-[11px] text-[#6B665F]">
                          Дистанция: <strong className="text-[#2D5A27]">{stage.stageDist} км</strong> (км {stage.kmStart} → км {stage.kmEnd})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-white px-2.5 py-1 rounded-lg border border-[#DDD] flex items-center gap-1 font-bold text-[#2B4C7E]">
                        <Timer className="w-3.5 h-3.5" />
                        {stage.durationFormatted}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-[#EAE7E2]">
                    <div className="flex items-start gap-1.5 text-[#4A443E]">
                      <Compass className="w-3.5 h-3.5 text-[#8B7E6D] shrink-0 mt-0.5" />
                      <span><strong>Русло:</strong> {stage.terrain}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[#4A443E]">
                      <Anchor className="w-3.5 h-3.5 text-[#2D5A27] shrink-0 mt-0.5" />
                      <span><strong>Лагерь / Ночлег:</strong> {stage.campType}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. TAB: PROVISIONS CALCULATOR */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'provisions' && (
        <div className="space-y-6">
          
          {/* Food Metrics Card */}
          <div className="bg-white p-5 rounded-[28px] border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1A1F1A]">
                Раскладка провизии на {crewCount} чел. ({totalCalculatedDays} дней)
              </h3>
              <p className="text-xs text-[#6B665F] mt-1">
                Общий вес сухой провизии: <strong className="text-[#2D5A27]">{totalFoodWeightKg} кг</strong> ({foodWeightPerPersonKg} кг на 1 человека).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyShoppingList}
                className="px-4 py-2.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#3D7136] transition-all flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Скопировать для магазина
              </button>
            </div>
          </div>

          {/* Provisions Table with Checkboxes */}
          <div className="bg-white rounded-[28px] border border-[#E5E0D8] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E5E0D8] bg-[#F9F7F4] flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A443E]">Наименование продукта</span>
              <span className="text-xs font-bold text-[#4A443E]">Общий вес и фасовка</span>
            </div>

            <div className="divide-y divide-[#EEEBE6]">
              {calculatedProvisions.map((item) => {
                const isChecked = checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAF8F5] transition-colors ${
                      isChecked ? 'bg-[#F4F9F4] opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-[#2D5A27] border-[#2D5A27] text-white' : 'border-[#CBD5E1] bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isChecked ? 'line-through text-[#8B7E6D]' : 'text-[#1A1F1A]'}`}>
                          {item.name}
                        </span>
                        <span className="text-[11px] text-[#6B665F]">{item.notes}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-[#2D5A27] block">{item.totalKg} кг</span>
                      <span className="text-[10px] text-[#8B7E6D]">{item.packagesCount} {item.packageUnit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. TAB: GEAR & REPAIR CHECKLIST */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'gear' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-[28px] border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1A1F1A]">Снаряжение и обязательный ремкомплект</h3>
              <p className="text-xs text-[#6B665F] mt-1">
                Чек-лист безопасности для плавсредства: <strong className="text-[#2D5A27]">{vesselType}</strong>
              </p>
            </div>
            <span className="text-xs font-bold text-[#2D5A27] bg-[#E8F1E7] px-3 py-1.5 rounded-full">
              {Object.keys(checkedItems).filter(k => k.startsWith('g-') || k.startsWith('rep-')).length} / {gearItems.length} проверено
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gearItems.map((gear) => {
              const isChecked = checkedItems[gear.id];
              return (
                <div
                  key={gear.id}
                  onClick={() => toggleCheck(gear.id)}
                  className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isChecked
                      ? 'bg-[#F4F9F4] border-[#A7D7A2] opacity-75'
                      : 'border-[#E5E0D8] hover:border-[#2D5A27]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    isChecked ? 'bg-[#2D5A27] border-[#2D5A27] text-white' : 'border-[#CBD5E1] bg-white'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold ${isChecked ? 'line-through text-[#8B7E6D]' : 'text-[#1A1F1A]'}`}>
                        {gear.name}
                      </h4>
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-[#F9F7F4] text-[#2D5A27] rounded text-[10px] font-bold border border-[#EEEBE6]">
                      {gear.requiredCount}
                    </span>
                    <p className="text-[11px] text-[#6B665F] leading-snug">{gear.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. TAB: WEIGHT & SAFETY */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'weight_safety' && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2D5A27]" />
              Развесовка и грузоподъемность судна
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <span className="text-[#8B7E6D] block text-[10px]">Вес провизии:</span>
                <span className="text-base font-black text-[#1A1F1A]">{weightStats.foodWeight} кг</span>
              </div>
              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <span className="text-[#8B7E6D] block text-[10px]">Личные гермомешки:</span>
                <span className="text-base font-black text-[#1A1F1A]">{weightStats.personalGearWeight} кг</span>
              </div>
              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <span className="text-[#8B7E6D] block text-[10px]">Лагерное бивуачное:</span>
                <span className="text-base font-black text-[#1A1F1A]">{weightStats.groupCampWeight} кг</span>
              </div>
              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6]">
                <span className="text-[#8B7E6D] block text-[10px]">Загрузка судна:</span>
                <span className="text-base font-black text-[#2D5A27]">{weightStats.payloadPercentage}%</span>
              </div>
            </div>

            <div className="p-4 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-2 text-xs text-[#4A443E]">
              <h4 className="font-bold text-[#1A1F1A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2D5A27]" />
                Золотые правила укладки груза на воде:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[#6B665F]">
                <li>Тяжелые гермы с консервами и продуктами размещаются строго по центру днища для остойчивости.</li>
                <li>Спальные мешки и сухие вещи первой необходимости упаковываются в 2 слоя гермомешков.</li>
                <li>Ремкомплект, аптечка и антимедвежий спрей фиксируются в быстром доступе под рукой.</li>
                <li>Никаких тяжелых предметов на носу или высоко на деке — это исключает переворот на волнах.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
