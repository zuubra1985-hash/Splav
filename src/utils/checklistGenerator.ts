import { RiverRoute, MyTripChecklistSection } from '../types';

export function generateContextualChecklist(route?: RiverRoute | null): MyTripChecklistSection[] {
  const isHighWater = route ? /II|III|IV|2|3|4/i.test(route.fstrCategory || '') : false;
  const isNorth = route ? route.region === 'ЯНАО' || /Полярный|Урал/i.test(route.name) : false;
  const days = route?.durationDays || 3;

  return [
    {
      id: 'sec-route-gpx',
      title: 'МАРШРУТ И GPX',
      items: [
        { id: 'item-gpx-check', text: 'Загрузить и проверить GPX трек в навигатор / OsmAnd / Guru Maps', completed: false, required: true },
        { id: 'item-start-finish', text: `Проверить точки старта (${route?.startPoint.name || 'Стапель'}) и финиша (${route?.endPoint.name || 'Антистапель'})`, completed: false, required: true },
        { id: 'item-offline-maps', text: 'Скачать офлайн спутниковые снимки и топокарты 1:50 000', completed: false, required: true },
        { id: 'item-landmarks', text: 'Отметить опасные шиверы, завалы и прижимы по лоции', completed: false }
      ]
    },
    {
      id: 'sec-comms',
      title: 'СВЯЗЬ И НАВИГАЦИЯ',
      items: [
        { id: 'item-sat-terminal', text: 'Проверить спутниковый трекер / телефон (Iridium, Garmin inReach)', completed: false, required: isNorth },
        { id: 'item-powerbank', text: `Резервное питание: Powerbank (мин. 20000 mAh на ${days} дн.) + солнечная панель`, completed: false, required: true },
        { id: 'item-radio', text: 'Рации диапазона LPD/PMR/VHF (145.500 МГц) и гермочехлы для них', completed: false },
        { id: 'item-checkin-plan', text: 'Утвердить график контрольных сеансов связи с дежурным на Большой земле', completed: false, required: true }
      ]
    },
    {
      id: 'sec-safety',
      title: 'БЕЗОПАСНОСТЬ И СПАСРАБОТЫ',
      items: [
        { id: 'item-lifejackets', text: 'Индивидуальные сертифицированные спасжилеты с паховыми ремнями на каждого', completed: false, required: true },
        { id: 'item-helmets', text: 'Водные каски (обязательно для II+ к.с. и каменистых рек)', completed: false, required: isHighWater },
        { id: 'item-throwline', text: 'Спасательный конец Александрова (морковка) 15-25 м', completed: false, required: true },
        { id: 'item-firstaid', text: 'Сплавная герметичная групповая аптечка (жгуты, гемостатики, противошоковое, шины)', completed: false, required: true },
        { id: 'item-repair-kit', text: 'Ремкомплект для судна (клей ПУ/ПВХ, заплаты, ацетон, армированный скотч, нитки)', completed: false, required: true },
        { id: 'item-bear-defense', text: 'Средства защиты от медведей (фальшфейеры, сигнал охотника, перцовый спрей)', completed: false, required: isNorth }
      ]
    },
    {
      id: 'sec-logistics',
      title: 'ЛОГИСТИКА И ТРАНСПОРТ',
      items: [
        { id: 'item-transfer-in', text: `Согласовать заброску к точке старта: ${route?.logisticsTransfer?.accessIn || 'Уточнить транспорт'}`, completed: false, required: true },
        { id: 'item-transfer-out', text: `Согласовать выброску с точки финиша: ${route?.logisticsTransfer?.accessOut || 'Уточнить расписание'}`, completed: false, required: true },
        { id: 'item-tickets', text: 'Билеты на поезд / вездеход / вертолет туда и обратно', completed: false },
        { id: 'item-driver-contacts', text: 'Сохранить контакты местных перевозчиков и экстренных служб района', completed: false }
      ]
    },
    {
      id: 'sec-documents',
      title: 'ДОКУМЕНТЫ И РЕГИСТРАЦИЯ',
      items: [
        { id: 'item-mchs-reg', text: 'Подать заявку на онлайн-регистрацию группы в ГУ МЧС за 10 дней до старта', completed: false, required: true },
        { id: 'item-emergency-contact', text: 'Заполнить карточку экстренного доверенного лица (имя, телефон, план действий)', completed: false, required: true },
        { id: 'item-passports-waterproof', text: 'Паспорта, полисы ОМС и разрешения КМНС в гермопакете', completed: false, required: true },
        { id: 'item-route-sheet', text: 'Распечатать маршрутный лист и графический профиль реки', completed: false }
      ]
    }
  ];
}
