import React, { useState } from 'react';
import { RiverRoute, SafetyGuide, FaqDataConfig, AppUser, MchsFormState } from '../types';
import { INITIAL_FAQ_DATA } from '../data/faqData';
import { 
  CheckSquare, 
  ShieldCheck, 
  Radio, 
  FileText, 
  Compass, 
  HelpCircle, 
  Download, 
  Copy, 
  Check, 
  Phone, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  LifeBuoy, 
  Flame, 
  Plane, 
  ChevronRight, 
  ExternalLink,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { generateContextualChecklist } from '../utils/checklistGenerator';

interface PreparationModuleProps {
  routes: RiverRoute[];
  safetyGuides?: SafetyGuide[];
  initialRoute?: RiverRoute | null;
  faqData?: FaqDataConfig;
  currentUser?: AppUser | null;
  isAdmin?: boolean;
  onOpenMyTrip?: () => void;
  onSelectRouteForTrip?: (route: RiverRoute) => void;
}

export const PreparationModule: React.FC<PreparationModuleProps> = ({
  routes,
  safetyGuides: legacyGuides,
  initialRoute,
  faqData = INITIAL_FAQ_DATA,
  currentUser,
  isAdmin = false,
  onOpenMyTrip,
  onSelectRouteForTrip
}) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'safety' | 'comms' | 'mchs' | 'gear' | 'docs'>('checklist');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialRoute?.id || (routes.length > 0 ? routes[0].id : ''));
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string>('all');
  const [guideSearchQuery, setGuideSearchQuery] = useState<string>('');
  const [selectedGuide, setSelectedGuide] = useState<SafetyGuide | null>(null);

  // Selected route for checklist generation
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || (routes.length > 0 ? routes[0] : null);

  // General checklist items
  const [checklistSections, setChecklistSections] = useState(() => generateContextualChecklist(activeRoute));

  // Update checklist when route changes
  const handleRouteChange = (routeId: string) => {
    setSelectedRouteId(routeId);
    const r = routes.find((rt) => rt.id === routeId);
    setChecklistSections(generateContextualChecklist(r));
  };

  const handleToggleItem = (secId: string, itemId: string) => {
    setChecklistSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          items: sec.items.map((it) => it.id === itemId ? { ...it, completed: !it.completed } : it)
        };
      })
    );
  };

  // MCHS Form State (Cleaned of hardcoded demo personal data: requirement P0-12)
  const [mchsForm, setMchsForm] = useState<MchsFormState>({
    leaderFullName: currentUser?.name || '',
    leaderPhone: currentUser?.phone || '',
    leaderEmail: currentUser?.email || '',
    leaderPassport: '',
    deputyFullName: '',
    deputyPhone: '',
    participantsCount: 4,
    participantsList: '',
    riverName: activeRoute ? activeRoute.riverName : '',
    region: activeRoute ? activeRoute.region : 'ХМАО',
    startLocation: activeRoute ? activeRoute.startPoint.name : '',
    endLocation: activeRoute ? activeRoute.endPoint.name : '',
    startDate: '',
    endDate: '',
    vesselTypes: activeRoute?.recommendedVessels?.join(', ') || 'Байдарка, катамаран',
    satellitePhone: '',
    satelliteMessenger: '',
    radioFrequencyMhz: '145.500 МГц (УКВ)',
    beaconImei: '',
    checkInPoints: '',
    emergencyContactName: currentUser?.emergencyContact?.name || '',
    emergencyContactPhone: currentUser?.emergencyContact?.phone || '',
    notes: ''
  });

  const [formCopied, setFormCopied] = useState<boolean>(false);
  const [formSaved, setFormSaved] = useState<boolean>(false);

  // Copy MCHS summary text for submission
  const handleCopyMchsText = () => {
    const text = `ЗАЯВКА НА РЕГИСТРАЦИЮ ТУРИСТИЧЕСКОЙ ГРУППЫ В ГУ МЧС
--------------------------------------------------
Регион: ${mchsForm.region}
Водный объект: р. ${mchsForm.riverName}
Маршрут: ${mchsForm.startLocation} -> ${mchsForm.endLocation}
Сроки: ${mchsForm.startDate || '—'} по ${mchsForm.endDate || '—'}
Количество участников: ${mchsForm.participantsCount} чел.

РУКОВОДИТЕЛЬ ГРУППЫ:
ФИО: ${mchsForm.leaderFullName || 'Не указано'}
Телефон: ${mchsForm.leaderPhone || 'Не указано'}
Email: ${mchsForm.leaderEmail || 'Не указано'}
Паспортные данные: ${mchsForm.leaderPassport || 'Не указано'}

ЗАМЕСТИТЕЛЬ РУКОВОДИТЕЛЯ:
ФИО: ${mchsForm.deputyFullName || 'Не указано'}
Телефон: ${mchsForm.deputyPhone || 'Не указано'}

СВЯЗЬ И ОБОРУДОВАНИЕ:
Спутниковый телефон/трекер: ${mchsForm.satellitePhone || mchsForm.satelliteMessenger || 'Отсутствует'}
Радиочастота: ${mchsForm.radioFrequencyMhz}
IMEI маяка: ${mchsForm.beaconImei || 'Нет'}
Плавсредства: ${mchsForm.vesselTypes}

КОНТРОЛЬНЫЕ СРОКИ И СВЯЗЬ:
${mchsForm.checkInPoints || 'Ежедневно в 19:00 по спутниковому каналу'}

ДОВЕРЕННОЕ ЛИЦО:
${mchsForm.emergencyContactName}: ${mchsForm.emergencyContactPhone}
`;

    navigator.clipboard.writeText(text);
    setFormCopied(true);
    setTimeout(() => setFormCopied(false), 2500);
  };

  // Filter safety guides
  const safetyGuidesList = faqData.safetyGuides || legacyGuides || [];
  const filteredGuides = safetyGuidesList.filter((g) => {
    const matchesCat = selectedGuideCategory === 'all' || g.category === selectedGuideCategory;
    const matchesSearch = !guideSearchQuery || g.title.toLowerCase().includes(guideSearchQuery.toLowerCase()) || g.shortSummary.toLowerCase().includes(guideSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 text-[#2D332D]">
      
      {/* Module Title & Sub-tabs */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                Комплекс подготовки
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A] mt-1">
              Подготовка к водному походу
            </h1>
            <p className="text-xs sm:text-sm text-[#6B665F]">
              Чек-листы, безопасность на воде, радиосвязь, регистрация в МЧС и документы
            </p>
          </div>

          {onOpenMyTrip && (
            <button
              onClick={onOpenMyTrip}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all self-start sm:self-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Перейти в «Мой поход»</span>
            </button>
          )}
        </div>

        {/* 6 Core Sub-tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-[#EEEBE6] pt-3">
          {[
            { id: 'checklist', label: 'Чек-лист', icon: CheckSquare },
            { id: 'safety', label: 'Безопасность', icon: LifeBuoy },
            { id: 'comms', label: 'Связь и частоты', icon: Radio },
            { id: 'mchs', label: 'Регистрация МЧС', icon: ShieldAlert },
            { id: 'gear', label: 'Снаряжение', icon: Compass },
            { id: 'docs', label: 'Документы', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-2xs'
                    : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. ЧЕК-ЛИСТ */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          
          {/* Route selector banner for custom checklist generation */}
          {routes.length > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-[#8B7E6D] uppercase block">Маршрут для генерации чек-листа:</span>
                <span className="text-sm font-black text-[#1A1F1A]">{activeRoute?.name} ({activeRoute?.fstrCategory})</span>
              </div>

              <select
                value={selectedRouteId}
                onChange={(e) => handleRouteChange(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] text-[#1A1F1A]"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.region})</option>
                ))}
              </select>
            </div>
          )}

          {/* Checklist Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklistSections.map((sec) => (
              <div key={sec.id} className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#2D5A27] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#2D5A27]" />
                  {sec.title}
                </h3>

                <div className="space-y-2">
                  {sec.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(sec.id, item.id)}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        item.completed
                          ? 'bg-[#F4F8F3] border-[#CDE0CC] text-[#2D5A27]'
                          : 'bg-[#F9F7F4] border-[#EEEBE6] hover:bg-white text-[#2D332D]'
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-sm border border-[#8B7E6D] shrink-0 mt-0.5" />
                      )}
                      <span className={`text-xs ${item.completed ? 'line-through opacity-75' : 'font-medium'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 2. БЕЗОПАСНОСТЬ (Safety Guides) */}
      {activeTab === 'safety' && (
        <div className="space-y-5">
          
          {/* Search and Category Filter */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B7E6D]" />
              <input
                type="text"
                value={guideSearchQuery}
                onChange={(e) => setGuideSearchQuery(e.target.value)}
                placeholder="Поиск по памяткам безопасности (медведи, холодная вода, пороги)..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'Все' },
                { id: 'hypothermia', label: 'Холодная вода' },
                { id: 'bear', label: 'Медведи' },
                { id: 'rapids', label: 'Пороги' },
                { id: 'firstaid', label: 'Первая помощь' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedGuideCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedGuideCategory === c.id
                      ? 'bg-[#2D5A27] text-white'
                      : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guides Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-2xs space-y-3.5 hover:border-[#2D5A27] transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                      {guide.tag}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      guide.importance === 'Критически важно' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {guide.importance}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#1A1F1A]">{guide.title}</h3>
                  <p className="text-xs text-[#6B665F] leading-relaxed">{guide.shortSummary}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#EEEBE6]">
                  <div className="text-[11px] font-bold text-[#2D5A27]">Ключевые правила:</div>
                  <ul className="text-xs text-[#4A443E] space-y-1">
                    {guide.rules.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#2D5A27] font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 3. СВЯЗЬ И ЧАСТОТЫ (Comms & Radio Frequencies) */}
      {activeTab === 'comms' && (
        <div className="space-y-6">
          
          {/* Emergency Frequencies Reference */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#2D5A27]" />
              Таблица радиочастот и каналов экстренной связи
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(faqData.radioFrequencies || [
                { id: 'f1', name: 'УКВ / Радиолюбительский вызывной', frequency: '145.500 МГц', description: 'Основной вызывной канал в тайге', tag: 'VHF' },
                { id: 'f2', name: 'Канал 16 Морской / Речной', frequency: '156.800 МГц', description: 'Международный канал бедствия и вызова судов', tag: 'Marine VHF' },
                { id: 'f3', name: 'LPD Канал 18', frequency: '433.500 МГц', description: 'Общепринятый туристический вызывной канал', tag: 'LPD' },
                { id: 'f4', name: 'PMR Канал 8', frequency: '446.09375 МГц', description: 'Европейский безлицензионный канал вызова', tag: 'PMR' },
                { id: 'f5', name: 'Аварийный авиационный', frequency: '121.500 МГц', description: 'Международная частота спасения воздушных судов', tag: 'Air VHF' }
              ]).map((freq) => (
                <div key={freq.id} className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#2D5A27]">{freq.tag}</span>
                    <span className="text-xs font-mono font-bold text-[#1A1F1A] bg-white px-2 py-0.5 rounded border border-[#E5E0D8]">{freq.frequency}</span>
                  </div>
                  <div className="text-xs font-bold text-[#1A1F1A]">{freq.name}</div>
                  <p className="text-[11px] text-[#6B665F] leading-snug">{freq.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Air-to-Ground Signals */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider flex items-center gap-2">
              <Plane className="w-4 h-4 text-[#2B4C7E]" />
              Международные визуальные сигналы «Земля-Воздух»
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { code: 'V', label: 'Требуется помощь', desc: 'Выложить из весел/тентов' },
                { code: 'X', label: 'Требуется медпомощь', desc: 'Тяжелая травма/шок' },
                { code: 'Y', label: 'Да / Согласен', desc: 'Подтверждение' },
                { code: 'N', label: 'Нет / Не требуется', desc: 'Отказ' }
              ].map((sig) => (
                <div key={sig.code} className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
                  <div className="text-2xl font-mono font-black text-[#2D5A27]">{sig.code}</div>
                  <div className="text-xs font-bold text-[#1A1F1A]">{sig.label}</div>
                  <div className="text-[10px] text-[#8B7E6D]">{sig.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 4. РЕГИСТРАЦИЯ МЧС (MCHS Form & Guidelines) */}
      {activeTab === 'mchs' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-6">
          
          <div className="border-b border-[#EEEBE6] pb-4">
            <h2 className="text-base font-black text-[#1A1F1A]">
              Форма регистрации туристической группы в МЧС
            </h2>
            <p className="text-xs text-[#6B665F] mt-0.5">
              В соответствии с приказом МЧС России № 42, группы обязаны информировать ведомство не позднее чем за 10 дней до выхода на маршрут.
            </p>
          </div>

          {/* Clean MCHS Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#2D5A27] uppercase">Руководитель группы</h4>
              
              <div>
                <label className="text-[11px] font-bold text-[#4A443E] block mb-1">ФИО руководителя *</label>
                <input
                  type="text"
                  value={mchsForm.leaderFullName}
                  onChange={(e) => setMchsForm({ ...mchsForm, leaderFullName: e.target.value })}
                  placeholder="Введите ФИО"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Телефон *</label>
                  <input
                    type="text"
                    value={mchsForm.leaderPhone}
                    onChange={(e) => setMchsForm({ ...mchsForm, leaderPhone: e.target.value })}
                    placeholder="Введите телефон"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Email *</label>
                  <input
                    type="email"
                    value={mchsForm.leaderEmail}
                    onChange={(e) => setMchsForm({ ...mchsForm, leaderEmail: e.target.value })}
                    placeholder="Введите email"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Паспортные данные руководителя</label>
                <input
                  type="text"
                  value={mchsForm.leaderPassport}
                  onChange={(e) => setMchsForm({ ...mchsForm, leaderPassport: e.target.value })}
                  placeholder="Серия, номер, кем и когда выдан"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#2D5A27] uppercase">Маршрут и сроки</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Река / Водный объект</label>
                  <input
                    type="text"
                    value={mchsForm.riverName}
                    onChange={(e) => setMchsForm({ ...mchsForm, riverName: e.target.value })}
                    placeholder="р. Собь, р. Аган..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white focus:outline-hidden focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Регион</label>
                  <select
                    value={mchsForm.region}
                    onChange={(e) => setMchsForm({ ...mchsForm, region: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  >
                    <option value="ХМАО">ХМАО-Югра</option>
                    <option value="ЯНАО">ЯНАО</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Дата старта</label>
                  <input
                    type="date"
                    value={mchsForm.startDate}
                    onChange={(e) => setMchsForm({ ...mchsForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Дата финиша (контроль)</label>
                  <input
                    type="date"
                    value={mchsForm.endDate}
                    onChange={(e) => setMchsForm({ ...mchsForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Плавсредства и снаряжение</label>
                <input
                  type="text"
                  value={mchsForm.vesselTypes}
                  onChange={(e) => setMchsForm({ ...mchsForm, vesselTypes: e.target.value })}
                  placeholder="Байдарки, катамаран, спасжилеты..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                />
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EEEBE6]">
            <a
              href="https://forms.mchs.gov.ru/registration_tourist_groups"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#2D5A27] font-bold hover:underline flex items-center gap-1.5"
            >
              <span>Официальный портал регистрации МЧС РФ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMchsText}
                className="px-4 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                {formCopied ? <Check className="w-4 h-4 text-[#2D5A27]" /> : <Copy className="w-4 h-4 text-[#6B665F]" />}
                <span>{formCopied ? 'Скопировано!' : 'Скопировать текст заявки'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 5. СНАРЯЖЕНИЕ (Gear Matrix) */}
      {activeTab === 'gear' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Личное снаряжение водника',
              items: [
                'Сертифицированный спасжилет с паховым ремнем и свистком',
                'Водная каска (обязательно для II+ к.с.)',
                'Неопреновый гидрокостюм (3-5 мм) или сухой костюм (drysuit)',
                'Неопреновые ботинки или сплавные сандалии с закрытым носком',
                'Ветрозащитная куртка-брызговик',
                'Термобелье (синтетика / меринос, 2 комплекта)'
              ]
            },
            {
              title: 'Бивачное и экспедиционное снаряжение',
              items: [
                'Ветроустойчивая палатка с дугами из авиаалюминия',
                'Спальник с температурой комфорта -2°C / +4°C',
                'Надувной или самонадувающийся коврик (R-value ≥ 2.5)',
                'Гермомешки (гермобаулы 60-100 л для вещей)',
                'Костровое оборудование, тент 4х6 м, пила лучковая / топор'
              ]
            },
            {
              title: 'Аварийно-спасательное снаряжение',
              items: [
                'Спасательный конец Александрова (25 м)',
                'Герметичная групповая аптечка (жгут, ИПП, обезболивающее)',
                'Фальшфейеры и сигнал охотника для защиты от медведей',
                'Ремнабор для судов (клей ПУ, заплаты, нитки, скотч T-Rex)'
              ]
            },
            {
              title: 'Навигация и питание',
              items: [
                'Спутниковый трекер Garmin inReach / телефон Iridium',
                'Защищенный GPS-навигатор с загруженными картами и треками',
                'Powerbank 20000+ mAh в гермобоксе',
                'Запас сублимированного провианта на +2 резервных дня'
              ]
            }
          ].map((cat, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-2xs space-y-3">
              <h3 className="text-xs font-black text-[#2D5A27] uppercase tracking-wider">{cat.title}</h3>
              <ul className="text-xs text-[#4A443E] space-y-2">
                {cat.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#2D5A27] font-bold">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 6. ДОКУМЕНТЫ (Permits & Route Papers) */}
      {activeTab === 'docs' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <h2 className="text-base font-black text-[#1A1F1A]">
            Перечень необходимых документов группы
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#4A443E]">
            <div className="p-3.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
              <strong className="text-[#1A1F1A] block">1. Документы, удостоверяющие личность</strong>
              <p>Оригиналы паспортов РФ и полисов ОМС каждого участника в двойном гермопакете.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
              <strong className="text-[#1A1F1A] block">2. Маршрутный лист / Маршрутная книжка</strong>
              <p>Оформленная маршрутная документация в МКК (при прохождении категорийного спортивного похода).</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
              <strong className="text-[#1A1F1A] block">3. Подтверждение регистрации МЧС</strong>
              <p>Присвоенный идентификационный номер заявки в ГУ МЧС по субъекту РФ.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-1">
              <strong className="text-[#1A1F1A] block">4. Разрешения на посещение ООПТ и КМНС</strong>
              <p>Пропуска в природные парки (ПП Полярно-Уральский, Нумто) и родовые угодья коренных народов.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
