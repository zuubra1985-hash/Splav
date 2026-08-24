import { TravelNote, ChecklistItem, LogbookTrip, RiverReview, CrewReview, TravelNotesConfig } from '../types';

export const INITIAL_TRAVEL_NOTES: TravelNote[] = [];

export const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  // 1. Безопасность на воде
  { id: 'c-1', text: 'Спасжилет с сертификатом ГОСТ и паховыми ремнями (на каждого)', category: 'life_safety', isChecked: true, quantity: '1 на чел.' },
  { id: 'c-2', text: 'Свисток без шарика и стропорез (закреплены на жилете)', category: 'life_safety', isChecked: true, quantity: '1 комплект' },
  { id: 'c-3', text: 'Спасательный конец Александрова (25 м плавающий шнур)', category: 'life_safety', isChecked: true, quantity: '1-2 шт на судно' },
  { id: 'c-4', text: 'Запасное разборное весло', category: 'life_safety', isChecked: false, quantity: '1 шт' },
  { id: 'c-5', text: 'Гермочехол IPX8 для телефона/рации на шею', category: 'life_safety', isChecked: true, quantity: '1 шт' },
  { id: 'c-6', text: 'Водный шлем (каска) для порогов и бурной воды', category: 'life_safety', isChecked: false, quantity: 'По к.с. реки' },

  // 2. Лагерь и бивак
  { id: 'c-7', text: 'Штормовая палатка с алюминиевыми дугами и юбкой', category: 'camp_bivouac', isChecked: true, quantity: '1 на 2-3 чел.' },
  { id: 'c-8', text: 'Тент лагерный 4х6 м усиленный люверсами + шнур паракорд 30м', category: 'camp_bivouac', isChecked: true, quantity: '1 шт' },
  { id: 'c-9', text: 'Спальный мешок (комфорт -2°C...+5°C в компрессионнике)', category: 'camp_bivouac', isChecked: true, quantity: '1 шт' },
  { id: 'c-10', text: 'Коврик-пенка (R-value от 2.5) или самонадувающийся матрас', category: 'camp_bivouac', isChecked: true, quantity: '1 шт' },
  { id: 'c-11', text: 'Налобный фонарь с красным светом + запасные аккумуляторы', category: 'camp_bivouac', isChecked: false, quantity: '1 шт' },

  // 3. Костер и кухня
  { id: 'c-12', text: 'Котлы из нержавейки (для супа и чая) в чехле', category: 'kitchen_fire', isChecked: true, quantity: '2 шт' },
  { id: 'c-13', text: 'Таганок складной или тросик для подвеса котлов', category: 'kitchen_fire', isChecked: true, quantity: '1 шт' },
  { id: 'c-14', text: 'Газовая горелка + баллоны (резерв на случай дождя и тундры)', category: 'kitchen_fire', isChecked: true, quantity: '1 горелка + 3 баллона' },
  { id: 'c-15', text: 'Спички охотничьи в герметичном контейнере + огниво', category: 'kitchen_fire', isChecked: true, quantity: '3 набора' },
  { id: 'c-16', text: 'Личная посуда КЛМН (кружка, ложка, миска, складной нож)', category: 'kitchen_fire', isChecked: true, quantity: '1 компл.' },
  { id: 'c-17', text: 'Пила лучковая складная (длина полотна 53-60 см)', category: 'kitchen_fire', isChecked: true, quantity: '1 шт' },
  { id: 'c-18', text: 'Топор плотницкий легкий с чехлом', category: 'kitchen_fire', isChecked: false, quantity: '1 шт' },

  // 4. Ремкомплект судна
  { id: 'c-19', text: 'Клей для ПВХ (десмоколл / полиуретановый двухкомпонентный)', category: 'repair_vessel', isChecked: true, quantity: '2 тюбика' },
  { id: 'c-20', text: 'Отрезы армированной ткани ПВХ плотностью 750-900 г/м²', category: 'repair_vessel', isChecked: true, quantity: '1 рулон' },
  { id: 'c-21', text: 'Ацетон или обезжиривающие салфетки в герме', category: 'repair_vessel', isChecked: true, quantity: '100 мл' },
  { id: 'c-22', text: 'Армированный сантехнический скотч Duct Tape (T-Rex/Gorilla)', category: 'repair_vessel', isChecked: true, quantity: '1 рулон' },
  { id: 'c-23', text: 'Ключ для воздушного клапана Bravo/Голубева + запасной клапан', category: 'repair_vessel', isChecked: false, quantity: '1 компл.' },
  { id: 'c-24', text: 'Насос ножной/ручной с переходниками и манометром', category: 'repair_vessel', isChecked: true, quantity: '1 шт' },
  { id: 'c-25', text: 'Шило, капроновая нить, люверсы, отвертка и пассатижи (мультитул)', category: 'repair_vessel', isChecked: false, quantity: '1 набор' },

  // 5. Аптечка и гигиена
  { id: 'c-26', text: 'Гемостатический бинт/порошок (Гепоглос/Целокс) и турникет', category: 'firstaid_hygiene', isChecked: true, quantity: '2 шт' },
  { id: 'c-27', text: 'Стерильные и эластичные бинты, пластыри влагостойкие', category: 'firstaid_hygiene', isChecked: true, quantity: '1 комплект' },
  { id: 'c-28', text: 'Обезболивающие, жаропонижающие и антибиотики широкого спектра', category: 'firstaid_hygiene', isChecked: true, quantity: 'По списку' },
  { id: 'c-29', text: 'Средства от кишечных инфекций (сорбенты, лоперамид, регидрон)', category: 'firstaid_hygiene', isChecked: true, quantity: '1 комплект' },
  { id: 'c-30', text: 'Репелленты с ДЭТА 30-50% от мошки и комаров + накомарник', category: 'firstaid_hygiene', isChecked: true, quantity: '3 баллона' },
  { id: 'c-31', text: 'Крем от ожогов (Д-Пантенол), крем солнцезащитный SPF 50', category: 'firstaid_hygiene', isChecked: false, quantity: '1 тюбик' },

  // 6. Защита от медведей и связь
  { id: 'c-32', text: 'Сигнал охотника (двуствольный пусковик + 15 патронов красные/зеленые)', category: 'wildlife_bear', isChecked: true, quantity: '2 комплекта' },
  { id: 'c-33', text: 'Фальшфейер красного огня (судовой пластиковый влагостойкий)', category: 'wildlife_bear', isChecked: true, quantity: '3 шт' },
  { id: 'c-34', text: 'Аэрозольный спрей против медведей (Bear Spray Anti-Зверь)', category: 'wildlife_bear', isChecked: false, quantity: '1 баллон' },
  { id: 'c-35', text: 'Портативные рации VHF/UHF (Baofeng UV-5R) настроенные на 433.075 МГц', category: 'wildlife_bear', isChecked: true, quantity: '2 шт' },
  { id: 'c-36', text: 'Спутниковый трекер/телефон Iridium или резервный PowerBank 30000 mAh', category: 'wildlife_bear', isChecked: true, quantity: '1 шт' },

  // 7. Одежда и гидроснаряжение
  { id: 'c-37', text: 'Драйтоп / сухой гидрокостюм или неопреновый комбинезон 3-5 мм', category: 'hydro_clothes', isChecked: true, quantity: '1 компл.' },
  { id: 'c-38', text: 'Неопреновые водные ботинки с толстой нескользящей подошвой', category: 'hydro_clothes', isChecked: true, quantity: '1 пара' },
  { id: 'c-39', text: 'Ветрозащитная мембранная штормовка 15000/15000 и штаны', category: 'hydro_clothes', isChecked: true, quantity: '1 компл.' },
  { id: 'c-40', text: 'Термобелье влагоотводящее (первый слой) + теплый флис 200-300 г/м²', category: 'hydro_clothes', isChecked: true, quantity: '2 комплекта' },
  { id: 'c-41', text: 'Сухой лагерный комплект одежды и обуви (в 100% герме)', category: 'hydro_clothes', isChecked: true, quantity: '1 гермомешок' }
];

export const INITIAL_LOGBOOK_TRIPS: LogbookTrip[] = [];

export const INITIAL_RIVER_REVIEWS: RiverReview[] = [];

export const INITIAL_CREW_REVIEWS: CrewReview[] = [];

export const INITIAL_TRAVEL_NOTES_CONFIG: TravelNotesConfig = {
  id: 'splav86_travel_notes_main',
  notes: INITIAL_TRAVEL_NOTES,
  checklist: INITIAL_CHECKLIST_ITEMS,
  logbookTrips: INITIAL_LOGBOOK_TRIPS,
  riverReviews: INITIAL_RIVER_REVIEWS,
  crewReviews: [],
  updatedAt: new Date().toISOString().split('T')[0],
  updatedBy: 'Система'
};
