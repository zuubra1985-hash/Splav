import { WeatherPoint } from '../types';

export const WEATHER_POINTS_DATA: WeatherPoint[] = [
  {
    id: 'weather-sob',
    locationName: 'Харп / Собь (Полярный Урал)',
    region: 'ЯНАО',
    lat: 66.8042,
    lng: 65.8012,
    tempC: 14,
    feelsLikeC: 12,
    condition: 'Переменная облачность',
    icon: 'cloud-sun',
    windSpeedMs: 4.8,
    windDirectionDeg: 315, // NW
    windDirectionText: 'СЗ (Северо-Западный)',
    windGustMs: 8.5,
    pressureMmHg: 752,
    humidityPercent: 68,
    precipitationMm: 0.2,
    waterTempC: 9.4,
    uvIndex: 3,
    polarDayInfo: {
      isPolarDay: false,
      isPolarNight: false,
      isWhiteNights: true,
      sunrise: '04:12',
      sunset: '21:58',
      daylightHours: '17 ч 46 мин',
      nightHours: '6 ч 14 мин (белые ночи)',
      paddlingWindow: '05:00 — 22:30 (отличная видимость)'
    },
    forecast5Days: [
      { day: 'Ср', date: '19 авг', tempDay: 15, tempNight: 8, condition: 'Ясно, слабый ветер', windSpeedMs: 3.2, precipProb: 10 },
      { day: 'Чт', date: '20 авг', tempDay: 13, tempNight: 7, condition: 'Кратковременный дождь', windSpeedMs: 5.5, precipProb: 65 },
      { day: 'Пт', date: '21 авг', tempDay: 11, tempNight: 5, condition: 'Облачно с прояснениями', windSpeedMs: 6.2, precipProb: 30 },
      { day: 'Сб', date: '22 авг', tempDay: 14, tempNight: 6, condition: 'Солнечно, штиль', windSpeedMs: 2.5, precipProb: 5 },
      { day: 'Вс', date: '23 авг', tempDay: 16, tempNight: 9, condition: 'Малооблачно', windSpeedMs: 3.8, precipProb: 15 }
    ]
  },
  {
    id: 'weather-surgut',
    locationName: 'Сургут / Тромъёган / Обь',
    region: 'ХМАО',
    lat: 61.2400,
    lng: 73.4000,
    tempC: 21,
    feelsLikeC: 22,
    condition: 'Солнечно, тепло',
    icon: 'sun',
    windSpeedMs: 3.1,
    windDirectionDeg: 180, // S
    windDirectionText: 'Ю (Южный, попутный)',
    windGustMs: 5.0,
    pressureMmHg: 758,
    humidityPercent: 54,
    precipitationMm: 0.0,
    waterTempC: 18.2,
    uvIndex: 5,
    polarDayInfo: {
      isPolarDay: false,
      isPolarNight: false,
      isWhiteNights: false,
      sunrise: '04:52',
      sunset: '20:45',
      daylightHours: '15 ч 53 мин',
      nightHours: '8 ч 07 мин',
      paddlingWindow: '06:00 — 21:00'
    },
    forecast5Days: [
      { day: 'Ср', date: '19 авг', tempDay: 22, tempNight: 13, condition: 'Ясно, тепло', windSpeedMs: 3.0, precipProb: 0 },
      { day: 'Чт', date: '20 авг', tempDay: 23, tempNight: 14, condition: 'Малооблачно', windSpeedMs: 4.1, precipProb: 10 },
      { day: 'Пт', date: '21 авг', tempDay: 20, tempNight: 12, condition: 'Гроза во второй половине', windSpeedMs: 7.0, precipProb: 70 },
      { day: 'Сб', date: '22 авг', tempDay: 19, tempNight: 11, condition: 'Переменная облачность', windSpeedMs: 3.5, precipProb: 20 },
      { day: 'Вс', date: '23 авг', tempDay: 21, tempNight: 12, condition: 'Солнечно', windSpeedMs: 2.8, precipProb: 5 }
    ]
  },
  {
    id: 'weather-khm',
    locationName: 'Ханты-Мансийск / Слияние Оби и Иртыша',
    region: 'ХМАО',
    lat: 61.0040,
    lng: 69.0280,
    tempC: 22,
    feelsLikeC: 22,
    condition: 'Ясно',
    icon: 'sun',
    windSpeedMs: 2.8,
    windDirectionDeg: 225, // SW
    windDirectionText: 'ЮЗ (Юго-Западный)',
    windGustMs: 4.5,
    pressureMmHg: 760,
    humidityPercent: 50,
    precipitationMm: 0.0,
    waterTempC: 19.1,
    uvIndex: 5,
    polarDayInfo: {
      isPolarDay: false,
      isPolarNight: false,
      isWhiteNights: false,
      sunrise: '05:04',
      sunset: '21:02',
      daylightHours: '15 ч 58 мин',
      nightHours: '8 ч 02 мин',
      paddlingWindow: '06:00 — 21:30'
    },
    forecast5Days: [
      { day: 'Ср', date: '19 авг', tempDay: 23, tempNight: 14, condition: 'Ясно', windSpeedMs: 2.5, precipProb: 0 },
      { day: 'Чт', date: '20 авг', tempDay: 24, tempNight: 15, condition: 'Тепло, солнце', windSpeedMs: 3.2, precipProb: 5 },
      { day: 'Пт', date: '21 авг', tempDay: 21, tempNight: 13, condition: 'Возможен дождь', windSpeedMs: 4.8, precipProb: 45 },
      { day: 'Сб', date: '22 авг', tempDay: 20, tempNight: 11, condition: 'Ясно', windSpeedMs: 3.0, precipProb: 10 },
      { day: 'Вс', date: '23 авг', tempDay: 22, tempNight: 13, condition: 'Отличная погода', windSpeedMs: 2.2, precipProb: 0 }
    ]
  },
  {
    id: 'weather-saranpaul',
    locationName: 'Саранпауль / Ляпин / Сев. Сосьва',
    region: 'ХМАО',
    lat: 64.2580,
    lng: 60.9150,
    tempC: 17,
    feelsLikeC: 16,
    condition: 'Облачно с прояснениями',
    icon: 'cloud-sun',
    windSpeedMs: 3.6,
    windDirectionDeg: 270, // W
    windDirectionText: 'З (Западный)',
    windGustMs: 6.2,
    pressureMmHg: 755,
    humidityPercent: 62,
    precipitationMm: 0.1,
    waterTempC: 16.8,
    uvIndex: 4,
    polarDayInfo: {
      isPolarDay: false,
      isPolarNight: false,
      isWhiteNights: true,
      sunrise: '04:30',
      sunset: '21:35',
      daylightHours: '17 ч 05 мин',
      nightHours: '6 ч 55 мин',
      paddlingWindow: '05:30 — 22:00'
    },
    forecast5Days: [
      { day: 'Ср', date: '19 авг', tempDay: 18, tempNight: 10, condition: 'Переменная облачность', windSpeedMs: 3.5, precipProb: 15 },
      { day: 'Чт', date: '20 авг', tempDay: 16, tempNight: 8, condition: 'Дождь, усиление ветра', windSpeedMs: 6.0, precipProb: 80 },
      { day: 'Пт', date: '21 авг', tempDay: 14, tempNight: 7, condition: 'Кратковременные дожди', windSpeedMs: 5.0, precipProb: 40 },
      { day: 'Сб', date: '22 авг', tempDay: 17, tempNight: 8, condition: 'Ясно, слабый ветер', windSpeedMs: 2.8, precipProb: 10 },
      { day: 'Вс', date: '23 авг', tempDay: 19, tempNight: 10, condition: 'Солнечно', windSpeedMs: 3.0, precipProb: 5 }
    ]
  }
];
