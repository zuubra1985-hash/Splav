import React, { useState } from 'react';
import { MchsFormState, RiverRoute, SafetyGuide } from '../types';
import { 
  RadioTower, 
  Radio, 
  AlertTriangle, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Clock, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  HeartPulse, 
  Satellite, 
  WifiOff, 
  Volume2, 
  HelpCircle, 
  ExternalLink,
  Flame,
  Plane
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MchsModuleProps {
  routes: RiverRoute[];
  safetyGuides: SafetyGuide[];
  initialRoute?: RiverRoute | null;
  onOpenQuickSos?: () => void;
}

export const MchsModule: React.FC<MchsModuleProps> = ({
  routes,
  safetyGuides,
  initialRoute
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'satellite_comms' | 'mchs_form' | 'handbook' | 'checkin_timer'>('satellite_comms');

  // Form State for MCHS Registration
  const [formData, setFormData] = useState<MchsFormState>({
    leaderFullName: 'Иванов Иван Алексеевич',
    leaderPhone: '+7 (922) 123-45-67',
    leaderEmail: 'leader.splav86@mail.ru',
    leaderPassport: 'Серия 7114 № 892341, выдан МВД ХМАО',
    deputyFullName: 'Петров Сергей Николаевич',
    deputyPhone: '+7 (922) 987-65-43',
    participantsCount: 6,
    participantsList: '1. Иванов И.А. (Руководитель, 1988 г.р.)\n2. Петров С.Н. (Зам, 1990 г.р.)\n3. Сидоров А.В. (1995 г.р.)\n4. Кузнецова Е.М. (1993 г.р.)\n5. Морозов Д.И. (1987 г.р.)\n6. Васильев К.П. (1992 г.р.)',
    riverName: initialRoute ? initialRoute.riverName : 'Собь',
    region: initialRoute ? initialRoute.region : 'ЯНАО',
    startLocation: initialRoute ? initialRoute.startPoint.name : 'ст. Полярный Урал (ж/д ветка Чум-Лабытнанги)',
    endLocation: initialRoute ? initialRoute.endPoint.name : 'пос. Харп (ст. Харп-Северное Сияние)',
    startDate: '2026-08-25',
    endDate: '2026-08-29',
    vesselTypes: '2 байдарки Хатанга-3, 2 надувных сапборда Red Paddle 13.2',
    satellitePhone: '+8816 315 48920 (Iridium)',
    satelliteMessenger: 'Garmin inReach Explorer #30023406891234',
    radioFrequencyMhz: '145.500 МГц (УКВ), Канал 16 VHF (156.800 МГц)',
    beaconImei: '30023406891234',
    checkInPoints: '1. 25.08 18:00 - Старт у моста ст. Полярный Урал\n2. 27.08 19:00 - Устье ручья Нырдвомен-Шор\n3. 29.08 16:00 - Финиш в пос. Харп (Контрольный звонок)',
    emergencyContactName: 'Иванова Анна Сергеевна (супруга)',
    emergencyContactPhone: '+7 (922) 111-22-33',
    notes: 'Все участники в сертифицированных спасжилетах, гидрокостюмах 5мм, навигация по Garmin GPSMAP 66sr.'
  });

  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [copiedSosText, setCopiedSosText] = useState<boolean>(false);

  // Auto-fill from route selector
  const handleRoutePreset = (routeId: string) => {
    const r = routes.find((x) => x.id === routeId);
    if (!r) return;
    setFormData((prev) => ({
      ...prev,
      riverName: r.riverName,
      region: r.region,
      startLocation: r.startPoint.name,
      endLocation: r.endPoint.name
    }));
  };

  // Generate formatted official text for MCHS
  const generateOfficialText = () => {
    return `ЗАЯВЛЕНИЕ О РЕГИСТРАЦИИ ТУРИСТСКОЙ ГРУППЫ
В Главное управление МЧС России по ${formData.region === 'ХМАО' ? 'Ханты-Мансийскому автономному округу - Югре' : 'Ямало-Ненецкому автономному округу'}
(в соответствии с Приказом МЧС России № 42 и ст. 12 ФЗ «Об основах туристской деятельности в РФ»)

1. СВЕДЕНИЯ О РУКОВОДИТЕЛЕ И ГРУППЕ:
- Руководитель: ${formData.leaderFullName}
- Телефон / Email: ${formData.leaderPhone} / ${formData.leaderEmail}
- Паспортные данные: ${formData.leaderPassport}
- Заместитель руководителя: ${formData.deputyFullName} (тел: ${formData.deputyPhone})
- Количество участников: ${formData.participantsCount} чел.
- Список группы:
${formData.participantsList}

2. МАРШРУТ И СРОКИ:
- Водный маршрут: река ${formData.riverName} (${formData.region})
- Начальная точка (стапель): ${formData.startLocation}
- Конечная точка (антистапель): ${formData.endLocation}
- Сроки похода: с ${formData.startDate} по ${formData.endDate}
- Плавсредства: ${formData.vesselTypes}

3. СРЕДСТВА СВЯЗИ И СИГНАЛИЗАЦИИ:
- Спутниковый телефон: ${formData.satellitePhone}
- Трекер / Мессенджер: ${formData.satelliteMessenger}
- Радиочастоты связи группы: ${formData.radioFrequencyMhz}
- Аварийный маяк (IMEI): ${formData.beaconImei}

4. КОНТРОЛЬНЫЕ СРОКИ И ТОЧКИ СВЯЗИ:
${formData.checkInPoints}

5. КОНТАКТНОЕ ЛИЦО ДЛЯ ЭКСТРЕННОЙ СВЯЗИ В ГОРОДЕ:
- ФИО: ${formData.emergencyContactName}
- Телефон: ${formData.emergencyContactPhone}

6. ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
${formData.notes}`;
  };

  const handleCopyForm = () => {
    navigator.clipboard.writeText(generateOfficialText());
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handleDownloadFormFile = () => {
    const text = generateOfficialText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zayavlenie_mchs_${formData.riverName.toLowerCase()}_${formData.startDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleDownloadCommsCheatSheet = () => {
    const text = `ПРАКТИЧЕСКАЯ ПАМЯТКА СВЯЗИ И ЭКСТРЕННЫХ СЛУЖБ (ЮГРА И ЯМАЛ)
============================================================
Сохраните этот файл в память телефона и запишите номера в спутниковый телефон (Iridium / Thuraya / InReach).

1. ПРЯМЫЕ ТЕЛЕФОНЫ ДЕЖУРНЫХ ЧАСТЕЙ СПАСАТЕЛЕЙ:
------------------------------------------------------------
• ГКУ «Ямалспас» (Салехард, ЯНАО): +7 (34922) 4-44-44
• ЦУКС МЧС России по ХМАО-Югре (Ханты-Мансийск): +7 (3467) 39-77-77
• Арктический аварийно-спасательный центр (Воркута / Полярный Урал): +7 (82151) 3-11-22
• Единая служба спасения (при наличии сотовой сети): 112

2. АВАРИЙНЫЕ РАДИОЧАСТОТЫ (УКВ / VHF / РЕЧНЫЕ):
------------------------------------------------------------
• 121.500 МГц — Международная аварийная авиационная частота (мониторится бортами).
• 156.800 МГц (Канал 16 VHF) — Международный бедственный канал речного и морского флота.
• 145.500 МГц (FM) — Вызывная частота радиолюбителей (2 метра).
• 433.075 МГц (Канал 1 LPD) — Стандартный внутригрупповой канал на сплаве.

3. ЗНАКИ СИГНАЛИЗАЦИИ «ЗЕМЛЯ - ВОЗДУХ» ДЛЯ ПОИСКОВЫХ ВЕРТОЛЕТОВ:
------------------------------------------------------------
(Выкладываются на песчаной косе или снежнике из весел, ярких гермомешков и тентов, длина полосы не менее 3 метров)
• [ V ] — Требуется помощь (Require Assistance)
• [ X ] — Требуется медицинская помощь (Require Medical Assistance)
• [ N ] — Нет / Отрицательно (No)
• [ Y ] — Да / Положительно (Yes)
• [ ↑ ] — Двигаемся в этом направлении (Proceeding in this direction)

4. ТРЕХОГНЕВОЙ СИГНАЛ БЕДСТВИЯ:
------------------------------------------------------------
Три костра, расположенные треугольником или на одной линии на расстоянии 20-30 метров друг от друга.

Сплав86 — Исследуем Север там, куда не ведут дороги.`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_pamyatka_svyazi_mchs.txt`;
    a.click();
    URL.revokeObjectURL(url);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
              <RadioTower className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
                Единый центр: Связь и МЧС
              </h1>
              <p className="text-xs sm:text-sm text-[#6B665F] mt-0.5">
                Спутниковые каналы, аварийные радиочастоты, спасательные службы и регистрация тургрупп.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Download CheatSheet */}
        <button
          onClick={handleDownloadCommsCheatSheet}
          className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Скачать шпаргалку в .TXT</span>
        </button>
      </div>

      {/* Subtabs Selector: Vertical list on mobile, horizontal row on desktop */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-1.5 bg-white p-2.5 md:p-1.5 rounded-2xl border border-[#E5E0D8] shadow-xs">
        <button
          onClick={() => setActiveSubTab('satellite_comms')}
          className={`px-4 py-3 md:py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-start md:justify-center gap-2.5 w-full md:w-auto md:shrink-0 text-left md:text-center ${
            activeSubTab === 'satellite_comms'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <Satellite className="w-4 h-4 shrink-0" />
          <span>Спутник, Радио и Телефоны спасателей</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mchs_form')}
          className={`px-4 py-3 md:py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-start md:justify-center gap-2.5 w-full md:w-auto md:shrink-0 text-left md:text-center ${
            activeSubTab === 'mchs_form'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Регистрация группы в МЧС (Приказ № 42)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('handbook')}
          className={`px-4 py-3 md:py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-start md:justify-center gap-2.5 w-full md:w-auto md:shrink-0 text-left md:text-center ${
            activeSubTab === 'handbook'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Правила выживания и безопасности в тайге</span>
        </button>

        <button
          onClick={() => setActiveSubTab('checkin_timer')}
          className={`px-4 py-3 md:py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-start md:justify-center gap-2.5 w-full md:w-auto md:shrink-0 text-left md:text-center ${
            activeSubTab === 'checkin_timer'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Контрольные сроки связи</span>
        </button>
      </div>

      {/* 1. SATELLITE COMMS, RADIO & RESCUE HOTLINES TAB */}
      {activeSubTab === 'satellite_comms' && (
        <div className="space-y-6">
          
          {/* Important Reality Banner */}
          <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-[24px] p-5 flex items-start gap-4 shadow-xs">
            <div className="p-2.5 bg-[#F59E0B] text-white rounded-2xl shrink-0 mt-0.5">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#92400E]">
                Внимание: На 95% рек Югры и Полярного Урала сотовая связь отсутствует
              </h3>
              <p className="text-xs text-[#78350F] mt-1 leading-relaxed">
                В экстремальной ситуации у вас не будет доступа к интернету. Все контакты спасателей, радиочастоты и сигналы бедствия необходимо <strong>заранее переписать в блокнот или сохранить в спутниковый телефон</strong> до отправления на маршрут.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Direct Rescue Hotlines Directory */}
            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
              <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#2D5A27]" />
                Прямые номера оперативных дежурных ПСО
              </h2>

              <div className="space-y-3">
                {/* 112 */}
                <div className="bg-[#FDF2F2] border border-[#F8B4B4] p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-[#E54B4B] block">112 (Единая служба спасения)</span>
                    <p className="text-[11px] text-[#7F1D1D]">Работает при наличии хотя бы одной сотовой вышки любого оператора</p>
                  </div>
                  <a
                    href="tel:112"
                    className="px-3.5 py-1.5 bg-[#E54B4B] hover:bg-[#D43A3A] text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
                  >
                    112
                  </a>
                </div>

                {/* Yamalspas */}
                <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1A1F1A] block">ГКУ «Ямалспас» (Полярный Урал / Салехард)</span>
                    <span className="text-sm font-black text-[#2B4C7E]">+7 (34922) 4-44-44</span>
                    <p className="text-[10px] text-[#8B7E6D]">Круглосуточный оперативный дежурный ПСО</p>
                  </div>
                  <a
                    href="tel:+73492244444"
                    className="px-3.5 py-1.5 bg-[#2B4C7E] hover:bg-[#1E365B] text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
                  >
                    Вызов
                  </a>
                </div>

                {/* KhMAO */}
                <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1A1F1A] block">ЦУКС МЧС России по ХМАО-Югре (Ханты-Мансийск)</span>
                    <span className="text-sm font-black text-[#2D5A27]">+7 (3467) 39-77-77</span>
                    <p className="text-[10px] text-[#8B7E6D]">Центр управления в кризисных ситуациях</p>
                  </div>
                  <a
                    href="tel:+73467397777"
                    className="px-3.5 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
                  >
                    Вызов
                  </a>
                </div>

                {/* Vorkuta Rescue */}
                <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1A1F1A] block">Арктический АКАСЦ МЧС (Воркута / горы)</span>
                    <span className="text-sm font-black text-[#D97706]">+7 (82151) 3-11-22</span>
                    <p className="text-[10px] text-[#8B7E6D]">Горно-спасательный отряд Полярного Урала</p>
                  </div>
                  <a
                    href="tel:+78215131122"
                    className="px-3.5 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
                  >
                    Вызов
                  </a>
                </div>
              </div>

              {/* Ready SOS Template Generator */}
              <div className="pt-2">
                <span className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider block mb-2">
                  Формат сообщения для спутникового трекера (SMS / InReach):
                </span>
                <div className="bg-[#FDF2F2] border border-[#F8B4B4] p-3.5 rounded-2xl space-y-2">
                  <p className="text-xs text-[#7F1D1D] font-mono bg-white p-2.5 rounded-xl border border-[#F8B4B4] leading-relaxed">
                    SOS! Группа Сплав86 на р. Собь. Требуется помощь. Коорд: 67.0423 N, 65.4121 E. 6 чел. Рация: 145.500 МГц.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('SOS! Группа Сплав86 на р. Собь. Требуется помощь. Коорд: 67.0423 N, 65.4121 E. 6 чел. Рация: 145.500 МГц.');
                      setCopiedSosText(true);
                      setTimeout(() => setCopiedSosText(false), 2500);
                    }}
                    className="w-full py-2 bg-[#E54B4B] hover:bg-[#D43A3A] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedSosText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSosText ? 'Скопировано!' : 'Скопировать шаблон SOS'}
                  </button>
                </div>
              </div>

            </div>

            {/* Radio Frequencies & Visual Helicopter Signals */}
            <div className="space-y-6">
              
              {/* Frequencies Card */}
              <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
                <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[#2B4C7E]" />
                  Аварийные радиочастоты (УКВ / VHF)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <span className="text-[10px] font-extrabold uppercase text-[#E54B4B] block">Авиационный бедственный</span>
                    <strong className="text-base text-[#1A1F1A] font-black font-mono">121.500 МГц</strong>
                    <p className="text-[10px] text-[#6B665F] mt-0.5">Слушают все пролетающие гражданские и военные борта</p>
                  </div>

                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <span className="text-[10px] font-extrabold uppercase text-[#2B4C7E] block">Речной / Морской флот</span>
                    <strong className="text-base text-[#1A1F1A] font-black font-mono">156.800 МГц</strong>
                    <p className="text-[10px] text-[#6B665F] mt-0.5">16 канал VHF. Международный канал бедствия на реках</p>
                  </div>

                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <span className="text-[10px] font-extrabold uppercase text-[#2D5A27] block">Радиолюбительский вызов</span>
                    <strong className="text-base text-[#1A1F1A] font-black font-mono">145.500 МГц</strong>
                    <p className="text-[10px] text-[#6B665F] mt-0.5">Вызывная частота 2-метрового диапазона радиолюбителей</p>
                  </div>

                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <span className="text-[10px] font-extrabold uppercase text-[#8B7E6D] block">Связь экипажей на воде</span>
                    <strong className="text-base text-[#1A1F1A] font-black font-mono">433.075 МГц</strong>
                    <p className="text-[10px] text-[#6B665F] mt-0.5">Канал 1 LPD для раций Baofeng / Motorola между судами</p>
                  </div>
                </div>
              </div>

              {/* Ground-to-Air Visual Rescue Signs */}
              <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
                <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                  <Plane className="w-5 h-5 text-[#D97706]" />
                  Международные визуальные знаки «Земля — Воздух»
                </h2>
                <p className="text-xs text-[#6B665F]">
                  Выкладываются на песчаной косе, открытом яру или снежнике из весел, ярких гермомешков и оранжевых тентов (длина полос не менее 3 метров):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
                  <div className="p-3 rounded-2xl bg-[#FDF2F2] border border-[#F8B4B4]">
                    <span className="text-2xl font-black text-[#E54B4B] block font-sans">V</span>
                    <span className="text-[11px] font-bold text-[#7F1D1D] block mt-1">Требуется помощь</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FDF2F2] border border-[#F8B4B4]">
                    <span className="text-2xl font-black text-[#E54B4B] block font-sans">X</span>
                    <span className="text-[11px] font-bold text-[#7F1D1D] block mt-1">Нужен врач</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#E8F1E7] border border-[#CDE0CC]">
                    <span className="text-2xl font-black text-[#2D5A27] block font-sans">Y</span>
                    <span className="text-[11px] font-bold text-[#2D5A27] block mt-1">Да / Согласен</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F9F7F4] border border-[#E5E0D8]">
                    <span className="text-2xl font-black text-[#6B665F] block font-sans">N</span>
                    <span className="text-[11px] font-bold text-[#6B665F] block mt-1">Нет / Отказ</span>
                  </div>
                </div>

                <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6] text-[11px] text-[#6B665F] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span><strong>Сигнальные костры:</strong> 3 костра в форме треугольника с интервалом 25–30 метров — международный сигнал бедствия.</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 2. MCHS OFFICIAL REGISTRATION FORM TAB */}
      {activeSubTab === 'mchs_form' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Interactive Form (Left) */}
            <div className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-6 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#2D5A27]" />
                  Параметры туристской группы
                </h2>

                {/* Preset Picker */}
                <select
                  onChange={(e) => handleRoutePreset(e.target.value)}
                  className="bg-[#F9F7F4] border border-[#E5E0D8] text-xs font-bold text-[#2D5A27] rounded-xl px-3 py-1.5 outline-none focus:border-[#2D5A27]"
                >
                  <option value="">Заполнить по реке...</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.riverName} ({r.region})
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCopyForm(); }} className="space-y-4 text-xs">
                
                {/* 1. Leader */}
                <div className="space-y-2">
                  <span className="font-bold text-[#8B7E6D] block uppercase tracking-wider text-[10px]">
                    1. Руководитель группы
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ФИО руководителя"
                      value={formData.leaderFullName}
                      onChange={(e) => setFormData({ ...formData, leaderFullName: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                    <input
                      type="tel"
                      placeholder="Телефон руководителя"
                      value={formData.leaderPhone}
                      onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Паспортные данные"
                    value={formData.leaderPassport}
                    onChange={(e) => setFormData({ ...formData, leaderPassport: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                {/* 2. Group members */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#8B7E6D] block uppercase tracking-wider text-[10px]">
                      2. Состав группы ({formData.participantsCount} чел.)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Список участников с годами рождения..."
                    value={formData.participantsList}
                    onChange={(e) => setFormData({ ...formData, participantsList: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>

                {/* 3. Route */}
                <div className="space-y-2">
                  <span className="font-bold text-[#8B7E6D] block uppercase tracking-wider text-[10px]">
                    3. Водный маршрут
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Река"
                      value={formData.riverName}
                      onChange={(e) => setFormData({ ...formData, riverName: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    >
                      <option value="ХМАО">ХМАО-Югра</option>
                      <option value="ЯНАО">ЯНАО (Ямал)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Типы плавсредств (байдарки, сапы, лодки)"
                    value={formData.vesselTypes}
                    onChange={(e) => setFormData({ ...formData, vesselTypes: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                {/* 4. Satellite Comms */}
                <div className="space-y-2">
                  <span className="font-bold text-[#8B7E6D] block uppercase tracking-wider text-[10px]">
                    4. Средства связи и контрольные точки
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Спутниковый телефон (Иридиум)"
                      value={formData.satellitePhone}
                      onChange={(e) => setFormData({ ...formData, satellitePhone: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                    <input
                      type="text"
                      placeholder="Спутниковый трекер / IMEI"
                      value={formData.satelliteMessenger}
                      onChange={(e) => setFormData({ ...formData, satelliteMessenger: e.target.value })}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Контрольные точки с датами выхода на связь..."
                    value={formData.checkInPoints}
                    onChange={(e) => setFormData({ ...formData, checkInPoints: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Сформировать и скопировать пакет
                  </button>
                </div>

              </form>

            </div>

            {/* Live Output & Actions (Right) */}
            <div className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[#1A1F1A] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#2D5A27]" />
                    Сформированный документ
                  </h3>
                  <span className="text-[10px] text-[#2D5A27] font-bold bg-[#E8F1E7] px-2.5 py-0.5 rounded-full border border-[#CDE0CC]">
                    Готов к подаче
                  </span>
                </div>

                <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] max-h-[380px] overflow-y-auto font-mono text-[10px] text-[#2D332D] leading-relaxed whitespace-pre-wrap selection:bg-[#2D5A27] selection:text-white">
                  {generateOfficialText()}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyForm}
                    className="flex-1 py-2.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] font-bold text-xs rounded-xl border border-[#CDE0CC] transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedSuccess ? <Check className="w-4 h-4 text-[#2D5A27]" /> : <Copy className="w-4 h-4" />}
                    {copiedSuccess ? 'Скопировано в буфер!' : 'Копировать текст'}
                  </button>

                  <button
                    onClick={handleDownloadFormFile}
                    className="py-2.5 px-3 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] font-bold text-xs rounded-xl border border-[#E5E0D8] transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    .TXT
                  </button>
                </div>

                <a
                  href="https://forms.mchs.gov.ru"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  Перейти на forms.mchs.gov.ru для подачи
                </a>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* 3. WILDERNESS SAFETY & TAIGA SURVIVAL HANDBOOK */}
      {activeSubTab === 'handbook' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {safetyGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#2D5A27]/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1F1A]">
                    {guide.title}
                  </h3>
                </div>
                <p className="text-xs text-[#6B665F] mt-2 leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E5E0D8]/60">
                <span className="text-[10px] font-bold text-[#8B7E6D] uppercase tracking-wider block">
                  Ключевые правила:
                </span>
                <ul className="space-y-1.5 text-xs text-[#2D332D]">
                  {guide.points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#2D5A27] font-bold mt-0.5">•</span>
                      <span className="leading-tight">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. CHECKIN TIMER */}
      {activeSubTab === 'checkin_timer' && (
        <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 sm:p-8 max-w-2xl mx-auto shadow-sm space-y-5 text-center">
          <div className="w-14 h-14 bg-[#E8F1E7] text-[#2D5A27] rounded-3xl mx-auto flex items-center justify-center shadow-md">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1A1F1A]">
              Контрольные сеансы связи группы
            </h2>
            <p className="text-xs text-[#6B665F] mt-1 max-w-md mx-auto">
              По регламенту МЧС, если группа не выходит на связь в течение <strong>24 часов</strong> после контрольного срока, автоматически начинается спасательная операция с привлечением авиации.
            </p>
          </div>

          <div className="bg-[#F9F7F4] p-5 rounded-2xl border border-[#EEEBE6] space-y-3 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8B7E6D] font-bold">Следующий сеанс связи:</span>
              <strong className="text-[#2D5A27] font-black">27 августа, 19:00 (МСК+2)</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8B7E6D] font-bold">Контрольная точка:</span>
              <span className="text-[#1A1F1A]">Устье ручья Нырдвомен-Шор (р. Собь)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8B7E6D] font-bold">Основной канал:</span>
              <span className="text-[#2B4C7E] font-mono font-bold">Iridium / InReach SMS</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
