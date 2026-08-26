import React, { useState } from 'react';
import { MchsFormState, RiverRoute, SafetyGuide, FaqDataConfig, FaqQuestionItem } from '../types';
import { INITIAL_FAQ_DATA } from '../data/faqData';
import { 
  Radio, 
  AlertTriangle, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Clock, 
  Phone, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Satellite, 
  WifiOff, 
  HelpCircle, 
  Flame,
  Plane,
  Edit3,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LifeBuoy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MchsModuleProps {
  routes: RiverRoute[];
  safetyGuides?: SafetyGuide[];
  initialRoute?: RiverRoute | null;
  faqData?: FaqDataConfig;
  isAdmin?: boolean;
  onOpenFaqEditor?: (subSection?: 'guides' | 'questions' | 'hotlines' | 'frequencies' | 'signals' | 'texts') => void;
}

export const MchsModule: React.FC<MchsModuleProps> = ({
  routes,
  safetyGuides: legacyGuides,
  initialRoute,
  faqData = INITIAL_FAQ_DATA,
  isAdmin = false,
  onOpenFaqEditor
}) => {
  const [activeSubTab, setActiveSubTabState] = useState<'faq_questions' | 'satellite_comms' | 'handbook' | 'mchs_form' | 'checkin_timer'>(() => {
    try {
      const saved = localStorage.getItem('splav86_mchs_subtab');
      if (saved && ['faq_questions', 'satellite_comms', 'handbook', 'mchs_form', 'checkin_timer'].includes(saved)) {
        return saved as any;
      }
    } catch (e) {}
    return 'faq_questions';
  });

  const setActiveSubTab = (tab: 'faq_questions' | 'satellite_comms' | 'handbook' | 'mchs_form' | 'checkin_timer') => {
    setActiveSubTabState(tab);
    try {
      localStorage.setItem('splav86_mchs_subtab', tab);
    } catch (e) {}
  };
  const [selectedGuide, setSelectedGuide] = useState<SafetyGuide | null>(null);
  const [guideCopied, setGuideCopied] = useState<boolean>(false);

  // FAQ Search & Filter
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [expandedFaqIds, setExpandedFaqIds] = useState<Record<string, boolean>>({});

  // Safety Handbook Search & Filter
  const [guideSearchQuery, setGuideSearchQuery] = useState<string>('');
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string>('all');

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

  // Active guides list: either from faqData config or legacy fallback
  const guidesList: SafetyGuide[] = faqData?.safetyGuides && faqData.safetyGuides.length > 0 
    ? faqData.safetyGuides 
    : (legacyGuides && legacyGuides.length > 0 ? legacyGuides : INITIAL_FAQ_DATA.safetyGuides);

  const emergencyContacts = faqData?.emergencyContacts || INITIAL_FAQ_DATA.emergencyContacts;
  const radioFrequencies = faqData?.radioFrequencies || INITIAL_FAQ_DATA.radioFrequencies;
  const visualSignals = faqData?.visualSignals || INITIAL_FAQ_DATA.visualSignals;
  const faqQuestions = faqData?.faqQuestions || INITIAL_FAQ_DATA.faqQuestions;

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
- Сроки сплава: с ${formData.startDate} по ${formData.endDate}
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
    const text = faqData?.cheatSheetContent || INITIAL_FAQ_DATA.cheatSheetContent;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_pamyatka_svyazi_mchs.txt`;
    a.click();
    URL.revokeObjectURL(url);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const toggleFaqQuestion = (id: string) => {
    setExpandedFaqIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtered FAQ questions
  const filteredFaqQuestions = faqQuestions.filter(item => {
    const matchesCategory = selectedFaqCategory === 'all' || item.category === selectedFaqCategory;
    const query = faqSearchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      item.question.toLowerCase().includes(query) || 
      item.answer.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  // Filtered Safety Guides
  const filteredGuides = guidesList.filter(guide => {
    const matchesCategory = selectedGuideCategory === 'all' || guide.category === selectedGuideCategory;
    const query = guideSearchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      guide.title.toLowerCase().includes(query) || 
      guide.shortSummary.toLowerCase().includes(query) ||
      (guide.rules || []).some(r => r.toLowerCase().includes(query)) ||
      (guide.tag || '').toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">
                  {faqData?.title || 'FAQ: Связь, МЧС и Безопасность'}
                </h1>
                {isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[10px] font-black flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Режим Администратора
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#6B665F] mt-0.5">
                {faqData?.subtitle || 'Спутниковые каналы, аварийные радиочастоты, спасательные службы, регистрация групп и выживание в тайге.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Admin Edit Shortcut + Download CheatSheet */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
          {isAdmin && onOpenFaqEditor && (
            <button
              onClick={() => onOpenFaqEditor('questions')}
              className="px-3.5 py-2.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] font-bold text-xs rounded-2xl border border-[#CDE0CC] shadow-xs transition-all flex items-center gap-1.5"
              title="Открыть редактор контента FAQ в Личном кабинете"
            >
              <Edit3 className="w-4 h-4" />
              <span>Редактировать FAQ в ЛК</span>
            </button>
          )}

          <button
            onClick={handleDownloadCommsCheatSheet}
            className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Скачать шпаргалку в .TXT</span>
          </button>
        </div>
      </div>

      {/* Subtabs Selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-1.5 bg-white p-2.5 md:p-1.5 rounded-2xl border border-[#E5E0D8] shadow-xs">
        <button
          onClick={() => setActiveSubTab('faq_questions')}
          className={`px-4 py-3 md:py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-start md:justify-center gap-2.5 w-full md:w-auto md:shrink-0 text-left md:text-center ${
            activeSubTab === 'faq_questions'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Частые вопросы (FAQ) ({faqQuestions.length})</span>
        </button>

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
          onClick={() => setActiveSubTab('handbook')}
          className={`px-4 py-3 md:py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-start md:justify-center gap-2.5 w-full md:w-auto md:shrink-0 text-left md:text-center ${
            activeSubTab === 'handbook'
              ? 'bg-[#2D5A27] text-white shadow-xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Справочник выживания и безопасности ({guidesList.length})</span>
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

      {/* 1. FAQ QUESTIONS & ANSWERS ACCORDION */}
      {activeSubTab === 'faq_questions' && (
        <div className="space-y-6">
          
          {/* Header Card with Search & Categories */}
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-[#2D5A27]" />
                  База знаний и часто задаваемые вопросы туристу-воднику
                </h2>
                <p className="text-xs text-[#6B665F] mt-0.5">
                  Юридические нормы, ГИМС, пропуска КМНС и погранзоны, связь, экипировка и действия при ЧС.
                </p>
              </div>

              {isAdmin && onOpenFaqEditor && (
                <button
                  onClick={() => onOpenFaqEditor('questions')}
                  className="px-3 py-2 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1.5 shrink-0 self-start md:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Управление вопросами</span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по вопросам и ответам (ГИМС, пропуска, медведи, спутник, экипировка)..."
                value={faqSearchQuery}
                onChange={(e) => setFaqSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
              />
              {faqSearchQuery && (
                <button
                  onClick={() => setFaqSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B7E6D] hover:text-[#1A1F1A]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[
                { id: 'all', label: 'Все вопросы' },
                { id: 'permits_gims', label: '⚖️ ГИМС, Законы и Пропуска' },
                { id: 'satellite_sos', label: '📡 Спутниковая связь и SOS' },
                { id: 'wildlife', label: '🐻 Медведи и дикая природа' },
                { id: 'routes_logistics', label: '🧭 Логистика и Маршруты' },
                { id: 'general', label: '📋 Общие правила' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedFaqCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedFaqCategory === cat.id
                      ? 'bg-[#2D5A27] text-white shadow-2xs'
                      : 'bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#6B665F]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion List */}
          {filteredFaqQuestions.length === 0 ? (
            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-8 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-[#8B7E6D] mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-[#1A1F1A]">Вопросы по вашему запросу не найдены</h3>
              <p className="text-xs text-[#6B665F] max-w-sm mx-auto">
                Попробуйте изменить поисковый запрос или выберите другую категорию.
              </p>
              {isAdmin && onOpenFaqEditor && (
                <button
                  onClick={() => onOpenFaqEditor('questions')}
                  className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  + Добавить новый вопрос в FAQ
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqQuestions.map((faqItem, idx) => {
                const isExpanded = expandedFaqIds[faqItem.id] ?? (idx === 0 || faqItem.isPopular);
                const categoryLabels: Record<string, string> = {
                  permits_gims: 'ГИМС и законы',
                  satellite_sos: 'Связь и SOS',
                  wildlife: 'Дикая природа',
                  routes_logistics: 'Логистика',
                  general: 'Общий регламент'
                };

                return (
                  <div
                    key={faqItem.id}
                    className="bg-white border border-[#E5E0D8] rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-[#2D5A27]/50"
                  >
                    <button
                      onClick={() => toggleFaqQuestion(faqItem.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3 transition-colors hover:bg-[#F9F7F4]/60"
                    >
                      <div className="space-y-1.5 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] text-[10px] font-extrabold uppercase">
                            {categoryLabels[faqItem.category] || 'FAQ'}
                          </span>
                          {faqItem.isPopular && (
                            <span className="px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] text-[10px] font-extrabold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Популярный вопрос
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] leading-snug">
                          {faqItem.question}
                        </h3>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[#F9F7F4] text-[#2D5A27] shrink-0 mt-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#4A443E] leading-relaxed border-t border-[#F2EFEA] bg-[#FAFAF8]/50 space-y-3">
                        <p className="whitespace-pre-line font-normal">
                          {faqItem.answer}
                        </p>

                        {isAdmin && onOpenFaqEditor && (
                          <div className="pt-2 border-t border-[#E5E0D8]/40 flex justify-end">
                            <button
                              onClick={() => onOpenFaqEditor('questions')}
                              className="text-[11px] font-bold text-[#2D5A27] hover:underline flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Редактировать этот вопрос в кабинете</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* 2. SATELLITE COMMS, RADIO & RESCUE HOTLINES TAB */}
      {activeSubTab === 'satellite_comms' && (
        <div className="space-y-6">
          
          {/* Important Reality Banner */}
          <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-[24px] p-5 flex items-start gap-4 shadow-xs">
            <div className="p-2.5 bg-[#F59E0B] text-white rounded-2xl shrink-0 mt-0.5">
              <WifiOff className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#92400E]">
                {faqData?.warningTitle || 'Внимание: На 95% рек Югры и Полярного Урала сотовая связь отсутствует'}
              </h3>
              <p className="text-xs text-[#78350F] leading-relaxed">
                {faqData?.warningText || 'В экстремальной ситуации у вас не будет доступа к интернету. Все контакты спасателей, радиочастоты и сигналы бедствия необходимо заранее переписать в блокнот или сохранить в спутниковый телефон до отправления на маршрут.'}
              </p>
              {isAdmin && onOpenFaqEditor && (
                <button
                  onClick={() => onOpenFaqEditor('texts')}
                  className="text-[11px] text-[#92400E] font-black underline flex items-center gap-1 pt-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Редактировать текст предупреждения в кабинете</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Direct Rescue Hotlines Directory */}
            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#2D5A27]" />
                  Прямые номера оперативных дежурных ПСО
                </h2>
                {isAdmin && onOpenFaqEditor && (
                  <button
                    onClick={() => onOpenFaqEditor('hotlines')}
                    className="text-xs text-[#2D5A27] font-bold hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Править</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {emergencyContacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      contact.isCritical
                        ? 'bg-[#FDF2F2] border-[#F8B4B4]'
                        : 'bg-[#F9F7F4] border-[#EEEBE6]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${contact.isCritical ? 'text-[#E54B4B]' : 'text-[#1A1F1A]'}`}>
                          {contact.name}
                        </span>
                        {contact.badge && (
                          <span className="px-2 py-0.2 rounded-md bg-white/80 text-[10px] font-bold text-[#6B665F] border border-[#E5E0D8]">
                            {contact.badge}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-black block font-mono ${contact.isCritical ? 'text-[#E54B4B]' : 'text-[#2D5A27]'}`}>
                        {contact.phone}
                      </span>
                      <p className="text-[10px] text-[#6B665F] leading-tight">
                        {contact.description}
                      </p>
                    </div>

                    <a
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                      className={`px-3.5 py-1.5 font-bold text-xs rounded-xl shadow-xs shrink-0 ${
                        contact.isCritical
                          ? 'bg-[#E54B4B] hover:bg-[#D43A3A] text-white'
                          : 'bg-[#2D5A27] hover:bg-[#3D7136] text-white'
                      }`}
                    >
                      Вызов
                    </a>
                  </div>
                ))}
              </div>

              {/* Ready SOS Template Generator */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#8B7E6D] uppercase tracking-wider block">
                    Формат сообщения для спутникового трекера (SMS / InReach):
                  </span>
                  {isAdmin && onOpenFaqEditor && (
                    <button
                      onClick={() => onOpenFaqEditor('texts')}
                      className="text-[11px] text-[#2D5A27] font-bold hover:underline"
                    >
                      Изменить шаблон
                    </button>
                  )}
                </div>
                <div className="bg-[#FDF2F2] border border-[#F8B4B4] p-3.5 rounded-2xl space-y-2">
                  <p className="text-xs text-[#7F1D1D] font-mono bg-white p-2.5 rounded-xl border border-[#F8B4B4] leading-relaxed">
                    {faqData?.sosTemplateText || INITIAL_FAQ_DATA.sosTemplateText}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(faqData?.sosTemplateText || INITIAL_FAQ_DATA.sosTemplateText);
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
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                    <Radio className="w-5 h-5 text-[#2B4C7E]" />
                    Аварийные радиочастоты (УКВ / VHF)
                  </h2>
                  {isAdmin && onOpenFaqEditor && (
                    <button
                      onClick={() => onOpenFaqEditor('frequencies')}
                      className="text-xs text-[#2D5A27] font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Править</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {radioFrequencies.map((freq) => (
                    <div key={freq.id} className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-[#2B4C7E] block">{freq.tag || freq.name}</span>
                      <strong className="text-base text-[#1A1F1A] font-black font-mono block">{freq.frequency}</strong>
                      <p className="text-[10px] text-[#6B665F] mt-0.5 leading-tight">{freq.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ground-to-Air Visual Rescue Signs */}
              <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                    <Plane className="w-5 h-5 text-[#D97706]" />
                    Международные визуальные знаки «Земля — Воздух»
                  </h2>
                  {isAdmin && onOpenFaqEditor && (
                    <button
                      onClick={() => onOpenFaqEditor('signals')}
                      className="text-xs text-[#2D5A27] font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Править</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#6B665F]">
                  Выкладываются на песчаной косе, открытом яру или снежнике из весел, ярких гермомешков и оранжевых тентов (длина полос не менее 3 метров):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
                  {visualSignals.map((vis) => {
                    const isRed = vis.color === 'red';
                    const isGreen = vis.color === 'green';
                    return (
                      <div 
                        key={vis.id} 
                        className={`p-3 rounded-2xl border ${
                          isRed 
                            ? 'bg-[#FDF2F2] border-[#F8B4B4]' 
                            : isGreen 
                            ? 'bg-[#E8F1E7] border-[#CDE0CC]' 
                            : 'bg-[#F9F7F4] border-[#E5E0D8]'
                        }`}
                      >
                        <span className={`text-2xl font-black block font-sans ${
                          isRed ? 'text-[#E54B4B]' : isGreen ? 'text-[#2D5A27]' : 'text-[#6B665F]'
                        }`}>
                          {vis.code}
                        </span>
                        <span className={`text-[11px] font-bold block mt-1 leading-tight ${
                          isRed ? 'text-[#7F1D1D]' : isGreen ? 'text-[#2D5A27]' : 'text-[#6B665F]'
                        }`}>
                          {vis.meaning}
                        </span>
                      </div>
                    );
                  })}
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

      {/* 3. WILDERNESS SAFETY & TAIGA SURVIVAL HANDBOOK */}
      {activeSubTab === 'handbook' && (
        <div className="space-y-6">
          <div className="bg-[#E8F1E7]/60 border border-[#CDE0CC] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#2D5A27] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Справочник безопасности в тайге и на северных реках
              </h3>
              <p className="text-xs text-[#52784C] mt-0.5">
                Нажмите на любую карточку ниже, чтобы открыть полное иллюстрированное руководство, действия при ЧС и прямые телефоны спасателей.
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && onOpenFaqEditor && (
                <button
                  onClick={() => onOpenFaqEditor('guides')}
                  className="text-xs font-bold bg-[#2D5A27] text-white px-3 py-1.5 rounded-xl shadow-2xs hover:bg-[#3D7136] transition-all flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Управление статьями</span>
                </button>
              )}
              <span className="text-xs font-bold bg-white text-[#2D5A27] px-3 py-1.5 rounded-xl border border-[#CDE0CC]">
                {guidesList.length} руководств
              </span>
            </div>
          </div>

          {/* Guide Search & Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по статьям безопасности (медведи, заломы, оверкиль, аптечка)..."
                value={guideSearchQuery}
                onChange={(e) => setGuideSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
              {[
                { id: 'all', label: 'Все темы' },
                { id: 'bear', label: '🐻 Медведи' },
                { id: 'hypothermia', label: '❄️ Холодная вода' },
                { id: 'rapids', label: '🌊 Пороги и заломы' },
                { id: 'satellite', label: '📡 Спутник и SOS' },
                { id: 'firstaid', label: '🩹 Первая помощь' },
                { id: 'indigenous', label: '🏕️ Стойбища КМНС' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedGuideCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    selectedGuideCategory === cat.id
                      ? 'bg-[#2D5A27] text-white shadow-2xs'
                      : 'bg-white border border-[#E5E0D8] text-[#6B665F] hover:bg-[#F9F7F4]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredGuides.length === 0 ? (
            <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-8 text-center text-xs text-[#6B665F]">
              По запросу "{guideSearchQuery}" статей не найдено.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGuides.map((guide) => {
                const isCritical = guide.importance === 'Критически важно';
                return (
                  <div
                    key={guide.id}
                    onClick={() => setSelectedGuide(guide)}
                    className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#2D5A27] hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isCritical
                            ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                            : 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                        }`}>
                          {guide.importance}
                        </span>
                        <span className="text-[10px] text-[#8B7E6D] font-bold">
                          {guide.readTimeMin} мин чтения
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27] group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-[#1A1F1A] leading-snug group-hover:text-[#2D5A27] transition-colors">
                          {guide.title}
                        </h3>
                      </div>

                      <p className="text-xs text-[#6B665F] leading-relaxed line-clamp-2">
                        {guide.shortSummary}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#E5E0D8]/60">
                      <span className="text-[10px] font-bold text-[#8B7E6D] uppercase tracking-wider block">
                        Главные правила:
                      </span>
                      <ul className="space-y-1 text-xs text-[#2D332D]">
                        {(guide.rules || []).slice(0, 2).map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#2D5A27] font-bold mt-0.5">•</span>
                            <span className="leading-tight line-clamp-1">{rule}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGuide(guide);
                          }}
                          className="flex-1 py-2 bg-[#F9F7F4] hover:bg-[#E8F1E7] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#E5E0D8] group-hover:border-[#CDE0CC] transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>Читать правила</span>
                          <span>→</span>
                        </button>

                        {isAdmin && onOpenFaqEditor && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFaqEditor('guides');
                            }}
                            className="p-2 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] rounded-xl border border-[#CDE0CC] transition-all"
                            title="Редактировать статью в кабинете"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MCHS OFFICIAL REGISTRATION FORM TAB */}
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

      {/* 5. CHECKIN TIMER */}
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

      {/* SAFETY GUIDE DETAIL MODAL */}
      {selectedGuide && (
        <div className="fixed inset-0 z-[3500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto text-[#2D332D]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1A2E19] to-[#2D5A27] text-white rounded-t-[28px] flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    selectedGuide.importance === 'Критически важно'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    {selectedGuide.importance}
                  </span>
                  <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                    {selectedGuide.tag}
                  </span>
                  <span className="text-[10px] text-white/80 font-medium">
                    {selectedGuide.readTimeMin} мин чтения
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black leading-tight">
                  {selectedGuide.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedGuide(null)}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 sm:p-6 space-y-6">
              
              {/* Summary */}
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#E5E0D8]">
                <p className="text-xs sm:text-sm text-[#2D332D] leading-relaxed font-medium">
                  {selectedGuide.shortSummary}
                </p>
              </div>

              {/* Rules List */}
              {selectedGuide.rules && selectedGuide.rules.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#2D5A27] tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Базовые правила и регламент
                  </h3>
                  <div className="space-y-2">
                    {selectedGuide.rules.map((rule, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6]">
                        <span className="w-5 h-5 rounded-full bg-[#E8F1E7] text-[#2D5A27] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-[#2D332D] leading-relaxed">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DO / DONT GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DO List */}
                {selectedGuide.doList && selectedGuide.doList.length > 0 && (
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 space-y-2.5">
                    <h4 className="text-xs font-black uppercase text-[#166534] tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#166534]" />
                      Что ОБЯЗАТЕЛЬНО делать:
                    </h4>
                    <ul className="space-y-2">
                      {selectedGuide.doList.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#14532D]">
                          <span className="font-bold text-[#166534]">•</span>
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DONT List */}
                {selectedGuide.dontList && selectedGuide.dontList.length > 0 && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 space-y-2.5">
                    <h4 className="text-xs font-black uppercase text-[#991B1B] tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                      Что КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
                    </h4>
                    <ul className="space-y-2">
                      {selectedGuide.dontList.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#7F1D1D]">
                          <span className="font-bold text-[#DC2626]">✕</span>
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {/* Emergency Contacts if any */}
              {selectedGuide.emergencyContacts && selectedGuide.emergencyContacts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black uppercase text-[#92400E] tracking-wider flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Экстренные телефоны для этого случая
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedGuide.emergencyContacts.map((contact, i) => (
                      <div key={i} className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#92400E]">{contact.name}</div>
                          <div className="text-[11px] text-[#B45309] mt-0.5">{contact.note}</div>
                        </div>
                        <a
                          href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                          className="mt-2 text-xs font-black font-mono text-[#2D5A27] bg-white px-2.5 py-1 rounded-lg border border-[#FDE68A] hover:bg-[#E8F1E7] transition-colors inline-block w-fit"
                        >
                          📞 {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-[#F9F7F4] border-t border-[#E5E0D8] rounded-b-[28px] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  const guideText = `${selectedGuide.title.toUpperCase()}\n\n${selectedGuide.shortSummary}\n\nПРАВИЛА:\n${selectedGuide.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nЧТО ДЕЛАТЬ:\n${(selectedGuide.doList || []).map(d => `• ${d}`).join('\n')}\n\nЗАПРЕЩЕНО:\n${(selectedGuide.dontList || []).map(d => `✕ ${d}`).join('\n')}`;
                  navigator.clipboard.writeText(guideText);
                  setGuideCopied(true);
                  setTimeout(() => setGuideCopied(false), 2500);
                }}
                className="px-4 py-2.5 bg-white hover:bg-[#E8F1E7] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-all flex items-center gap-1.5 shadow-xs"
              >
                {guideCopied ? <Check className="w-4 h-4 text-[#2D5A27]" /> : <Copy className="w-4 h-4" />}
                <span>{guideCopied ? 'Скопировано в буфер!' : 'Скопировать памятку'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white text-[#2D332D] hover:bg-[#EAE7E2] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-all"
                >
                  Печать
                </button>
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  Понятно
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
