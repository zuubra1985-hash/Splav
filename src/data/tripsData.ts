import { CompanionTrip } from '../types';

// Real coordinates for rivers
const SOB_TRACK: [number, number][] = [
  [67.0423, 65.4121],
  [67.0310, 65.4520],
  [67.0185, 65.5120],
  [66.9950, 65.5840],
  [66.9720, 65.6420],
  [66.9380, 65.6980],
  [66.8920, 65.7350],
  [66.8450, 65.7720],
  [66.8021, 65.8015]
];

const TROM_TRACK: [number, number][] = [
  [62.2612, 74.4821],
  [62.1200, 74.3100],
  [61.9800, 74.1500],
  [61.8100, 73.9800],
  [61.6400, 73.8100],
  [61.4500, 73.6200],
  [61.2500, 73.4162]
];

const LYAPIN_TRACK: [number, number][] = [
  [64.5120, 60.1120],
  [64.2100, 60.5400],
  [63.9200, 61.1200],
  [63.6500, 61.8500],
  [63.4100, 62.1000]
];

export const COMPANION_TRIPS_DATA: CompanionTrip[] = [
  {
    id: 'trip-sob-august',
    title: 'Экспедиция по Полярному Уралу: река Собь на байдарках и сапах',
    riverName: 'Собь',
    routeId: 'sob-polar-ural',
    region: 'ЯНАО',
    startDate: '2026-08-25',
    endDate: '2026-08-29',
    durationDays: 5,
    vessels: ['kayak', 'sup', 'catamaran'],
    fstrCategory: 'II к.с.',
    totalSeats: 8,
    bookedSeats: 5,
    organizer: {
      name: 'Алексей Береговой',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      experienceYears: 11,
      completedTrips: 24,
      fstrRank: 'Инструктор-проводник спортивного туризма (водный)',
      phone: '+7 (922) 480-12-34',
      telegram: '@polar_sob_guide'
    },
    description: 'Ищем 3 человек в команду на легендарный сплав по реке Собь с выходом на радиальный пеший трек к леднику Романтиков и Нефритовому ущелью. Регистрация в МЧС ЯНАО оформлена. Есть спутниковый трекер Iridium InReach и спутниковый телефон.',
    requiredExperience: 'Средний (2-4 сплава)',
    gearProvided: [
      'Спутниковый трекер Iridium с кнопкой SOS и чатом',
      'Групповая аптечка первой помощи (с противошоковым набором)',
      'Костровое оборудование, тент 4х6м, бензопила',
      'Фальшфейеры и сигнал охотника (от диких животных)'
    ],
    requiredPersonalGear: [
      'Сухой гидрокостюм или неопреновый комбез 5мм + неопреновые боты',
      'Спасательный жилет с паховыми ремнями (сертификат ГИМС)',
      'Спальник с комфортом 0...+5°C, гермомешки (80л + 20л)',
      'Шлем водный (для прохождения шивер)'
    ],
    estimatedCostPerPersonRub: 14500,
    status: 'recruiting',
    participants: [
      { name: 'Алексей (Лидер)', role: 'Капитан / Инструктор', vessel: 'kayak', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', phone: '+7 (922) 480-12-34' },
      { name: 'Елена Смирнова', role: 'Медик / Фотограф', vessel: 'kayak', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', phone: '+7 (922) 111-22-33' },
      { name: 'Дмитрий Волков', role: 'Штурман', vessel: 'catamaran', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', phone: '+7 (922) 222-33-44' },
      { name: 'Мария К.', role: 'Завхоз', vessel: 'catamaran', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80', phone: '+7 (922) 333-44-55' },
      { name: 'Игорь Т.', role: 'Участник (SUP)', vessel: 'sup', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', phone: '+7 (922) 444-55-66' }
    ],
    applications: [
      {
        id: 'app-sob-1',
        tripId: 'trip-sob-august',
        applicantName: 'Владимир Павлов',
        applicantPhone: '+7 (912) 345-67-89',
        applicantEmail: 'pavlov.v@mail.ru',
        applicantAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
        experienceLevel: 'Любитель (1-2 к.с.)',
        vesselType: 'kayak',
        hasOwnGear: true,
        notes: 'Имеется двухместная каркасная байдарка Таймень-2, спасжилет и спутниковый навигатор Garmin. Готов взять на борт еще одного человека.',
        status: 'pending',
        appliedAt: '2026-08-18 14:30'
      }
    ],
    chatMessages: [
      {
        id: 'msg-1',
        tripId: 'trip-sob-august',
        authorName: 'Алексей Береговой',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        role: 'organizer',
        text: 'Приветствую экипаж! Заявка в МЧС ЯНАО зарегистрирована, номер группы #89-2026-88. Заброска на станцию Собь поездом Воркута — Лабытнанги.',
        timestamp: '18 авг, 10:15'
      },
      {
        id: 'msg-2',
        tripId: 'trip-sob-august',
        authorName: 'Елена Смирнова',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        role: 'participant',
        text: 'Алексей, походную аптечку собрала полностью: обезболивающие, шины, термоодеяла и противоаллергенное у меня.',
        timestamp: '18 авг, 12:40'
      },
      {
        id: 'msg-3',
        tripId: 'trip-sob-august',
        authorName: 'Дмитрий Волков',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        role: 'participant',
        text: 'Таймень и катамаран собраны. Рации Baofeng настроены на частоту 145.500 МГц.',
        timestamp: '18 авг, 16:02'
      }
    ],
    groupChatLink: 'https://t.me/splav86_polar_sob',
    commentsCount: 14,
    gpxTrack: {
      name: 'р. Собь: ст. Полярный Урал — пос. Харп',
      lengthKm: 75,
      coordinates: SOB_TRACK,
      startPoint: { name: 'ст. Полярный Урал (стапель)', lat: 67.0423, lng: 65.4121 },
      endPoint: { name: 'пос. Харп (антистапель)', lat: 66.8021, lng: 65.8015 },
      elevationGainM: 140,
      waypoints: [
        { id: 'wp-1', name: 'Стапель ст. Полярный Урал', type: 'camp', lat: 67.0423, lng: 65.4121, description: 'Удобная площадка у ж/д платформы', kmMark: 0 },
        { id: 'wp-2', name: 'Порог Нырдвомен-Шор', type: 'rapid', lat: 67.0185, lng: 65.5120, description: 'II к.с., просмотр по правому берегу', kmMark: 18 },
        { id: 'wp-3', name: 'Стоянка у массива Рай-Из', type: 'camp', lat: 66.9720, lng: 65.6420, description: 'Красивый вид на скалы, дрова есть', kmMark: 42 },
        { id: 'wp-4', name: 'Антистапель пос. Харп', type: 'camp', lat: 66.8021, lng: 65.8015, description: 'У моста, 400м до ж/д вокзала', kmMark: 75 }
      ]
    },
    gpxFileName: 'sob_route_full.gpx'
  },
  {
    id: 'trip-trom-sup',
    title: 'SUP-Weekend по Тромъёгану: Сосновые яры и релакс',
    riverName: 'Тромъёган',
    routeId: 'tromyogan-surgut',
    region: 'ХМАО',
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    durationDays: 2,
    vessels: ['sup', 'kayak'],
    fstrCategory: 'I к.с.',
    totalSeats: 12,
    bookedSeats: 8,
    organizer: {
      name: 'Югорский SUP-клуб (Сургут)',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
      experienceYears: 6,
      completedTrips: 45,
      fstrRank: 'Организатор водных походов ХМАО',
      phone: '+7 (3462) 55-86-86',
      telegram: '@surgut_sup_club'
    },
    description: 'Уютный двухдневный поход с одной ночевкой на огромной песчаной косе среди сосен. Вечерний костер, гитара, походная баня на берегу реки. Подходит новичкам и семьям!',
    requiredExperience: 'Начинающий (0-1 сплав)',
    gearProvided: [
      'Походная баня Мобиба на берегу',
      'Кемпинговые шатры, генератор для зарядки гаджетов',
      'Горячее 3-разовое питание (уха, каша с олениной, травяные чаи)'
    ],
    requiredPersonalGear: [
      'SUP-доска (или аренда в клубе), весло, лиш',
      'Палатка, спальник (+10°C), коврик',
      'Спасжилет, сменная теплая одежда'
    ],
    estimatedCostPerPersonRub: 5500,
    status: 'recruiting',
    participants: [
      { name: 'Денис (Инструктор)', role: 'Организатор', vessel: 'sup', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80', phone: '+7 (3462) 55-86-86' },
      { name: 'Ольга', role: 'Участник', vessel: 'sup', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
      { name: 'Артем и Анна', role: 'Участники', vessel: 'kayak', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80' }
    ],
    commentsCount: 22,
    gpxTrack: {
      name: 'р. Тромъёган: Ульт-Ягун — Сургутский гидроузел',
      lengthKm: 48,
      coordinates: TROM_TRACK,
      startPoint: { name: 'пос. Ульт-Ягун', lat: 61.6400, lng: 73.8100 },
      endPoint: { name: 'Сургутский мост', lat: 61.2500, lng: 73.4162 },
      elevationGainM: 25
    },
    gpxFileName: 'trom_sup_weekend.gpx'
  },
  {
    id: 'trip-lyapin-extreme',
    title: 'Спортивный поход III к.с.: Верховья Хулги и Ляпина',
    riverName: 'Ляпин',
    routeId: 'lyapin-pripolyarny',
    region: 'ХМАО',
    startDate: '2026-09-02',
    endDate: '2026-09-09',
    durationDays: 8,
    vessels: ['catamaran', 'kayak'],
    fstrCategory: 'III к.с.',
    totalSeats: 6,
    bookedSeats: 4,
    organizer: {
      name: 'Михаил "Югра-Тур" Казанцев',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      experienceYears: 18,
      completedTrips: 38,
      fstrRank: 'Мастер Спорта РФ по спортивному туризму',
      phone: '+7 (902) 814-77-99',
      telegram: '@kazantsev_water'
    },
    description: 'Спортивный категорийный поход с оформлением маршрутной книжки в МКК ХМАО. Заброска вездеходом в верховья Хулги. Прохождение порогов Труба, Щеки, Котел. Трофейная рыбалка.',
    requiredExperience: 'Опытный (5+ сплавов, пороги)',
    gearProvided: [
      'Катамаран 4-ка "Рафтмастер" с рамой',
      'Спутниковый терминал Иридиум + радиостанции Baofeng на VHF 145.500',
      'Ремнабор для судов, спасконцы морковки, стропорезы'
    ],
    requiredPersonalGear: [
      'Каска водная с сертификатом CE EN 1385',
      'Спасжилет сертифицированный объемом не менее 12 литров',
      'Сухой гидрокостюм со встроенными носками'
    ],
    estimatedCostPerPersonRub: 29000,
    status: 'recruiting',
    participants: [
      { name: 'Михаил (Капитан)', role: 'Руководитель похода', vessel: 'catamaran', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', phone: '+7 (902) 814-77-99' },
      { name: 'Сергей Р.', role: 'Матрос носовой', vessel: 'catamaran', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' },
      { name: 'Константин', role: 'Каякер', vessel: 'kayak', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80' }
    ],
    commentsCount: 9,
    gpxTrack: {
      name: 'р. Хулга — р. Ляпин',
      lengthKm: 165,
      coordinates: LYAPIN_TRACK,
      startPoint: { name: 'Урочище Хойла', lat: 64.5120, lng: 60.1120 },
      endPoint: { name: 'пос. Саранпауль', lat: 63.4100, lng: 62.1000 },
      elevationGainM: 190
    },
    gpxFileName: 'lyapin_expedition_sport.gpx'
  },
  {
    id: 'trip-kazym-past-archived',
    title: 'Июльская рыболовная экспедиция по реке Казым [Завершено]',
    riverName: 'Казым',
    routeId: 'kazym-beloyarsky',
    region: 'ХМАО',
    startDate: '2026-07-10',
    endDate: '2026-07-16',
    durationDays: 6,
    vessels: ['motorboat', 'kayak'],
    fstrCategory: 'I к.с.',
    totalSeats: 6,
    bookedSeats: 6,
    organizer: {
      name: 'Валерий Семёнов',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      experienceYears: 14,
      completedTrips: 29,
      fstrRank: 'Инструктор-проводник',
      phone: '+7 (908) 880-44-11',
      telegram: '@kazym_valera'
    },
    description: 'Успешно завершенная экспедиция. Маршрут пройден полностью без происшествий, группа снята с учета в МЧС.',
    requiredExperience: 'Средний (2-4 сплава)',
    gearProvided: ['Моторная лодка сопровождения', 'Лагерный тент', 'Групповая аптечка'],
    requiredPersonalGear: ['Спасжилет', 'Палатка', 'Спальник'],
    estimatedCostPerPersonRub: 12000,
    status: 'completed',
    isArchived: true,
    archivedAt: '10.07.2026 12:00',
    participants: [
      { name: 'Валерий Семёнов', role: 'Капитан', vessel: 'motorboat', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', phone: '+7 (908) 880-44-11' },
      { name: 'Андрей Ковалев', role: 'Штурман', vessel: 'kayak', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', phone: '+7 (908) 880-22-33' },
      { name: 'Николай З.', role: 'Участник', vessel: 'kayak', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', phone: '+7 (908) 880-55-66' }
    ],
    chatMessages: [
      {
        id: 'msg-k-1',
        tripId: 'trip-kazym-past-archived',
        authorName: 'Валерий Семёнов',
        role: 'organizer',
        text: 'Поход успешно завершен! Все 6 участников благополучно вернулись в Белоярский. Отчет в МЧС сдан.',
        timestamp: '16 июля 2026, 18:00'
      }
    ],
    commentsCount: 8
  }
];

