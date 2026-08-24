import React, { useState, useRef } from 'react';
import { 
  FaqDataConfig, 
  SafetyGuide, 
  FaqQuestionItem, 
  FaqEmergencyContact, 
  FaqRadioFrequency, 
  FaqVisualSignal 
} from '../types';
import { INITIAL_FAQ_DATA } from '../data/faqData';
import { FaqSyncService } from '../firebase';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Phone, 
  Radio, 
  Plane, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  Search, 
  Copy, 
  Check, 
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FaqAdminSectionProps {
  faqData: FaqDataConfig;
  setFaqData: React.Dispatch<React.SetStateAction<FaqDataConfig>>;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  initialSubTab?: 'guides' | 'questions' | 'hotlines' | 'frequencies' | 'signals' | 'texts';
}

export const FaqAdminSection: React.FC<FaqAdminSectionProps> = ({
  faqData,
  setFaqData,
  showNotification,
  initialSubTab = 'questions'
}) => {
  const [activeFaqSubTab, setActiveFaqSubTab] = useState<'guides' | 'questions' | 'hotlines' | 'frequencies' | 'signals' | 'texts'>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Safety Guide Editing State
  const [editingGuide, setEditingGuide] = useState<SafetyGuide | null>(null);
  const [isNewGuide, setIsNewGuide] = useState<boolean>(false);
  const [newRuleInput, setNewRuleInput] = useState<string>('');
  const [newDoInput, setNewDoInput] = useState<string>('');
  const [newDontInput, setNewDontInput] = useState<string>('');
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactNote, setNewContactNote] = useState<string>('');

  // 2. FAQ Questions Editing State
  const [editingQuestion, setEditingQuestion] = useState<FaqQuestionItem | null>(null);
  const [isNewQuestion, setIsNewQuestion] = useState<boolean>(false);

  // 3. Hotlines Editing State
  const [editingHotline, setEditingHotline] = useState<FaqEmergencyContact | null>(null);
  const [isNewHotline, setIsNewHotline] = useState<boolean>(false);

  // 4. Radio Frequencies Editing State
  const [editingFreq, setEditingFreq] = useState<FaqRadioFrequency | null>(null);
  const [isNewFreq, setIsNewFreq] = useState<boolean>(false);

  // 5. Visual Signals Editing State
  const [editingSignal, setEditingSignal] = useState<FaqVisualSignal | null>(null);
  const [isNewSignal, setIsNewSignal] = useState<boolean>(false);

  // 6. Texts & Cheat sheet form
  const [textsForm, setTextsForm] = useState({
    title: faqData?.title || INITIAL_FAQ_DATA.title,
    subtitle: faqData?.subtitle || INITIAL_FAQ_DATA.subtitle,
    warningTitle: faqData?.warningTitle || INITIAL_FAQ_DATA.warningTitle,
    warningText: faqData?.warningText || INITIAL_FAQ_DATA.warningText,
    sosTemplateText: faqData?.sosTemplateText || INITIAL_FAQ_DATA.sosTemplateText,
    cheatSheetContent: faqData?.cheatSheetContent || INITIAL_FAQ_DATA.cheatSheetContent
  });

  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [copiedPamyatka, setCopiedPamyatka] = useState<boolean>(false);
  const faqJsonInputRef = useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Удалить',
      cancelText: opts.cancelText || 'Отмена',
      confirmVariant: opts.confirmVariant || 'danger',
      onConfirm: opts.onConfirm
    });
  };

  // Synchronize entire FAQ state to parent, localStorage and Firestore
  const persistFaqData = async (updatedConfig: FaqDataConfig, successMessage?: string) => {
    setFaqData(updatedConfig);
    try {
      localStorage.setItem('splav86_faq_data_v1', JSON.stringify(updatedConfig));
    } catch (e) {
      console.warn('Local storage save warning:', e);
    }
    try {
      await FaqSyncService.saveFaq(updatedConfig);
      if (successMessage) showNotification(successMessage);
    } catch (err) {
      console.warn('Firestore save warning:', err);
      if (successMessage) showNotification(`${successMessage} (сохранено локально)`, 'success');
    }
  };

  // ==========================================
  // HANDLERS: SAFETY GUIDES
  // ==========================================
  const handleOpenNewGuide = () => {
    const template: SafetyGuide = {
      id: `guide-${Date.now()}`,
      category: 'bear',
      title: 'Новое руководство по безопасности',
      tag: 'Безопасность',
      readTimeMin: 5,
      importance: 'Критически важно',
      shortSummary: 'Краткое описание опасного фактора и условий в тайге.',
      rules: [
        'Базовое правило 1: подготовка снаряжения и соблюдение дистанции.',
        'Базовое правило 2: постоянный контроль обстановки на воде.'
      ],
      doList: [
        'Держите средства защиты в быстрой доступности.',
        'Сохраняйте спокойствие и действуйте по протоколу.'
      ],
      dontList: [
        'Не поддавайтесь панике.',
        'Не нарушайте установленный порядок лагеря.'
      ],
      emergencyContacts: [
        { name: 'Единая служба спасения', phone: '112', note: 'Круглосуточно' }
      ]
    };
    setEditingGuide(template);
    setIsNewGuide(true);
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuide) return;

    let updatedGuides: SafetyGuide[];
    if (isNewGuide) {
      updatedGuides = [editingGuide, ...(faqData.safetyGuides || [])];
    } else {
      updatedGuides = (faqData.safetyGuides || []).map(g => g.id === editingGuide.id ? editingGuide : g);
    }

    const updatedConfig: FaqDataConfig = {
      ...faqData,
      safetyGuides: updatedGuides
    };

    await persistFaqData(updatedConfig, `Руководство "${editingGuide.title}" успешно сохранено!`);
    setEditingGuide(null);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
  };

  const handleDeleteGuide = async (id: string, title: string) => {
    askConfirmation({
      title: 'Удалить руководство?',
      message: `Удалить руководство безопасности "${title}"?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const updatedGuides = (faqData.safetyGuides || []).filter(g => g.id !== id);
        const updatedConfig: FaqDataConfig = {
          ...faqData,
          safetyGuides: updatedGuides
        };
        await persistFaqData(updatedConfig, `Руководство "${title}" удалено.`);
      }
    });
  };

  // ==========================================
  // HANDLERS: FAQ QUESTIONS
  // ==========================================
  const handleOpenNewQuestion = () => {
    const template: FaqQuestionItem = {
      id: `faq-q-${Date.now()}`,
      question: 'Новый вопрос туристу-воднику?',
      answer: 'Подробный и развернутый ответ со ссылками на законы и практические рекомендации.',
      category: 'permits_gims',
      isPopular: false
    };
    setEditingQuestion(template);
    setIsNewQuestion(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    let updatedQuestions: FaqQuestionItem[];
    if (isNewQuestion) {
      updatedQuestions = [editingQuestion, ...(faqData.faqQuestions || [])];
    } else {
      updatedQuestions = (faqData.faqQuestions || []).map(q => q.id === editingQuestion.id ? editingQuestion : q);
    }

    const updatedConfig: FaqDataConfig = {
      ...faqData,
      faqQuestions: updatedQuestions
    };

    await persistFaqData(updatedConfig, `Вопрос успешно сохранен!`);
    setEditingQuestion(null);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
  };

  const handleDeleteQuestion = async (id: string, text: string) => {
    askConfirmation({
      title: 'Удалить вопрос?',
      message: `Удалить вопрос "${text.slice(0, 50)}..."?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const updatedQuestions = (faqData.faqQuestions || []).filter(q => q.id !== id);
        const updatedConfig: FaqDataConfig = {
          ...faqData,
          faqQuestions: updatedQuestions
        };
        await persistFaqData(updatedConfig, `Вопрос удален.`);
      }
    });
  };

  const handleTogglePopularQuestion = async (id: string) => {
    const updatedQuestions = (faqData.faqQuestions || []).map(q => 
      q.id === id ? { ...q, isPopular: !q.isPopular } : q
    );
    const updatedConfig: FaqDataConfig = {
      ...faqData,
      faqQuestions: updatedQuestions
    };
    await persistFaqData(updatedConfig);
  };

  // ==========================================
  // HANDLERS: HOTLINES
  // ==========================================
  const handleOpenNewHotline = () => {
    const template: FaqEmergencyContact = {
      id: `contact-${Date.now()}`,
      name: 'Дежурная часть ПСО',
      phone: '+7 (3467) 00-00-00',
      description: 'Круглосуточный телефон оперативного дежурного.',
      badge: 'ХМАО / Поисково-спасательная',
      isCritical: false
    };
    setEditingHotline(template);
    setIsNewHotline(true);
  };

  const handleSaveHotline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotline) return;

    let updatedContacts: FaqEmergencyContact[];
    if (isNewHotline) {
      updatedContacts = [...(faqData.emergencyContacts || []), editingHotline];
    } else {
      updatedContacts = (faqData.emergencyContacts || []).map(c => c.id === editingHotline.id ? editingHotline : c);
    }

    const updatedConfig: FaqDataConfig = {
      ...faqData,
      emergencyContacts: updatedContacts
    };

    await persistFaqData(updatedConfig, `Контакты службы "${editingHotline.name}" сохранены!`);
    setEditingHotline(null);
  };

  const handleDeleteHotline = async (id: string, name: string) => {
    askConfirmation({
      title: 'Удалить контакт?',
      message: `Удалить телефон службы "${name}"?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const updatedContacts = (faqData.emergencyContacts || []).filter(c => c.id !== id);
        const updatedConfig: FaqDataConfig = {
          ...faqData,
          emergencyContacts: updatedContacts
        };
        await persistFaqData(updatedConfig, `Телефон "${name}" удален.`);
      }
    });
  };

  // ==========================================
  // HANDLERS: RADIO FREQUENCIES
  // ==========================================
  const handleOpenNewFreq = () => {
    const template: FaqRadioFrequency = {
      id: `freq-${Date.now()}`,
      name: 'Новый аварийный канал',
      frequency: '145.500 МГц',
      description: 'Описание диапазона и правил выхода в эфир.',
      tag: 'УКВ / FM'
    };
    setEditingFreq(template);
    setIsNewFreq(true);
  };

  const handleSaveFreq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFreq) return;

    let updatedFreqs: FaqRadioFrequency[];
    if (isNewFreq) {
      updatedFreqs = [...(faqData.radioFrequencies || []), editingFreq];
    } else {
      updatedFreqs = (faqData.radioFrequencies || []).map(f => f.id === editingFreq.id ? editingFreq : f);
    }

    const updatedConfig: FaqDataConfig = {
      ...faqData,
      radioFrequencies: updatedFreqs
    };

    await persistFaqData(updatedConfig, `Радиочастота "${editingFreq.frequency}" сохранена!`);
    setEditingFreq(null);
  };

  const handleDeleteFreq = async (id: string, name: string) => {
    askConfirmation({
      title: 'Удалить частоту?',
      message: `Удалить частоту "${name}"?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const updatedFreqs = (faqData.radioFrequencies || []).filter(f => f.id !== id);
        const updatedConfig: FaqDataConfig = {
          ...faqData,
          radioFrequencies: updatedFreqs
        };
        await persistFaqData(updatedConfig, `Частота "${name}" удалена.`);
      }
    });
  };

  // ==========================================
  // HANDLERS: VISUAL SIGNALS
  // ==========================================
  const handleOpenNewSignal = () => {
    const template: FaqVisualSignal = {
      id: `vis-${Date.now()}`,
      code: 'V',
      meaning: 'Требуется помощь',
      description: 'Require assistance — базовый сигнал для вертолета.',
      color: 'red'
    };
    setEditingSignal(template);
    setIsNewSignal(true);
  };

  const handleSaveSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSignal) return;

    let updatedSignals: FaqVisualSignal[];
    if (isNewSignal) {
      updatedSignals = [...(faqData.visualSignals || []), editingSignal];
    } else {
      updatedSignals = (faqData.visualSignals || []).map(s => s.id === editingSignal.id ? editingSignal : s);
    }

    const updatedConfig: FaqDataConfig = {
      ...faqData,
      visualSignals: updatedSignals
    };

    await persistFaqData(updatedConfig, `Знак "${editingSignal.code}" сохранен!`);
    setEditingSignal(null);
  };

  const handleDeleteSignal = async (id: string, code: string) => {
    askConfirmation({
      title: 'Удалить знак?',
      message: `Удалить знак "${code}"?`,
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const updatedSignals = (faqData.visualSignals || []).filter(s => s.id !== id);
        const updatedConfig: FaqDataConfig = {
          ...faqData,
          visualSignals: updatedSignals
        };
        await persistFaqData(updatedConfig, `Знак "${code}" удален.`);
      }
    });
  };

  // ==========================================
  // HANDLERS: GENERAL TEXTS & CHEAT SHEET
  // ==========================================
  const handleSaveGeneralTexts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAll(true);
    try {
      const updatedConfig: FaqDataConfig = {
        ...faqData,
        title: textsForm.title,
        subtitle: textsForm.subtitle,
        warningTitle: textsForm.warningTitle,
        warningText: textsForm.warningText,
        sosTemplateText: textsForm.sosTemplateText,
        cheatSheetContent: textsForm.cheatSheetContent
      };
      await persistFaqData(updatedConfig, 'Все общие тексты FAQ и памятка успешно сохранены!');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      showNotification('Ошибка сохранения текстов', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  // ==========================================
  // HANDLERS: BACKUP & FACTORY RESET
  // ==========================================
  const handleExportFaqJson = () => {
    const blob = new Blob([JSON.stringify(faqData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_faq_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Конфигурация FAQ успешно экспортирована в JSON!');
  };

  const handleImportFaqJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as FaqDataConfig;
        if (parsed.safetyGuides && Array.isArray(parsed.safetyGuides)) {
          await persistFaqData(parsed, 'Конфигурация FAQ успешно импортирована!');
          setTextsForm({
            title: parsed.title || INITIAL_FAQ_DATA.title,
            subtitle: parsed.subtitle || INITIAL_FAQ_DATA.subtitle,
            warningTitle: parsed.warningTitle || INITIAL_FAQ_DATA.warningTitle,
            warningText: parsed.warningText || INITIAL_FAQ_DATA.warningText,
            sosTemplateText: parsed.sosTemplateText || INITIAL_FAQ_DATA.sosTemplateText,
            cheatSheetContent: parsed.cheatSheetContent || INITIAL_FAQ_DATA.cheatSheetContent
          });
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        } else {
          showNotification('Некорректная структура JSON файла FAQ', 'error');
        }
      } catch (err) {
        showNotification('Ошибка при разборе JSON файла', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetFaqToDefaults = async () => {
    askConfirmation({
      title: 'Сброс раздела FAQ?',
      message: 'Сбросить весь раздел FAQ и справочник безопасности к начальным заводским данным? Все пользовательские правки будут заменены эталоном.',
      confirmText: 'Да, сбросить к эталону',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await persistFaqData(INITIAL_FAQ_DATA, 'Раздел FAQ сброшен к заводским настройкам по умолчанию.');
        setTextsForm({
          title: INITIAL_FAQ_DATA.title,
          subtitle: INITIAL_FAQ_DATA.subtitle,
          warningTitle: INITIAL_FAQ_DATA.warningTitle,
          warningText: INITIAL_FAQ_DATA.warningText,
          sosTemplateText: INITIAL_FAQ_DATA.sosTemplateText,
          cheatSheetContent: INITIAL_FAQ_DATA.cheatSheetContent
        });
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for FAQ JSON Import */}
      <input
        type="file"
        ref={faqJsonInputRef}
        accept=".json"
        onChange={handleImportFaqJson}
        className="hidden"
      />

      {/* Top Banner with Stats & Global Actions */}
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1F1A]">
                Полный редактор раздела FAQ и Безопасности
              </h2>
              <p className="text-xs text-[#6B665F]">
                Управляйте базой знаний, справочником выживания в тайге, телефонами ПСО, частотами и памятками.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar: Export, Import, Reset */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
          <button
            onClick={handleExportFaqJson}
            className="px-3 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-all flex items-center gap-1.5"
            title="Экспорт FAQ в JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт JSON</span>
          </button>

          <button
            onClick={() => faqJsonInputRef.current?.click()}
            className="px-3 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-all flex items-center gap-1.5"
            title="Импорт FAQ из JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Импорт</span>
          </button>

          <button
            onClick={handleResetFaqToDefaults}
            className="px-3 py-2 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] text-xs font-bold rounded-xl border border-[#F8B4B4] transition-all flex items-center gap-1.5"
            title="Сбросить к исходным данным"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Сброс</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Selector inside FAQ Admin */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#E5E0D8] shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveFaqSubTab('questions')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeFaqSubTab === 'questions'
              ? 'bg-[#2D5A27] text-white shadow-2xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Вопросы и ответы ({(faqData.faqQuestions || []).length})</span>
        </button>

        <button
          onClick={() => setActiveFaqSubTab('guides')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeFaqSubTab === 'guides'
              ? 'bg-[#2D5A27] text-white shadow-2xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Справочник выживания ({(faqData.safetyGuides || []).length})</span>
        </button>

        <button
          onClick={() => setActiveFaqSubTab('hotlines')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeFaqSubTab === 'hotlines'
              ? 'bg-[#2D5A27] text-white shadow-2xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Телефоны ПСО ({(faqData.emergencyContacts || []).length})</span>
        </button>

        <button
          onClick={() => setActiveFaqSubTab('frequencies')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeFaqSubTab === 'frequencies'
              ? 'bg-[#2D5A27] text-white shadow-2xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Радиочастоты ({(faqData.radioFrequencies || []).length})</span>
        </button>

        <button
          onClick={() => setActiveFaqSubTab('signals')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeFaqSubTab === 'signals'
              ? 'bg-[#2D5A27] text-white shadow-2xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <Plane className="w-4 h-4" />
          <span>Знаки «Земля — Воздух» ({(faqData.visualSignals || []).length})</span>
        </button>

        <button
          onClick={() => setActiveFaqSubTab('texts')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeFaqSubTab === 'texts'
              ? 'bg-[#2D5A27] text-white shadow-2xs'
              : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Тексты и Памятка .TXT</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. SUBTAB: FAQ QUESTIONS & ANSWERS CRUD */}
      {/* ============================================================ */}
      {activeFaqSubTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#2D5A27]" />
                Вопросы и ответы в FAQ ({(faqData.faqQuestions || []).length})
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Добавляйте и редактируйте ответы по законам ГИМС, пропускам КМНС, спутниковой связи и экипировке.
              </p>
            </div>

            <button
              onClick={handleOpenNewQuestion}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить вопрос</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по вопросам и ответам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27]"
            />
          </div>

          <div className="space-y-3">
            {(faqData.faqQuestions || [])
              .filter(q => !searchQuery || q.question.toLowerCase().includes(searchQuery.toLowerCase()) || q.answer.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((qItem) => (
                <div
                  key={qItem.id}
                  className="bg-white border border-[#E5E0D8] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 hover:border-[#2D5A27]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] text-[10px] font-extrabold uppercase">
                          {qItem.category}
                        </span>
                        <button
                          onClick={() => handleTogglePopularQuestion(qItem.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                            qItem.isPopular 
                              ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]' 
                              : 'bg-[#F9F7F4] text-[#8B7E6D] hover:bg-[#EAE7E2]'
                          }`}
                          title="Переключить статус популярного"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{qItem.isPopular ? '★ Популярный' : 'Сделать популярным'}</span>
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-[#1A1F1A]">
                        {qItem.question}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingQuestion({ ...qItem });
                          setIsNewQuestion(false);
                        }}
                        className="p-2 bg-[#F9F7F4] hover:bg-[#E8F1E7] text-[#2D5A27] rounded-xl border border-[#E5E0D8] transition-all"
                        title="Редактировать"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(qItem.id, qItem.question)}
                        className="p-2 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-xl border border-[#F8B4B4] transition-all"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A443E] leading-relaxed bg-[#F9F7F4] p-3 rounded-xl border border-[#EEEBE6] whitespace-pre-line">
                    {qItem.answer}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUBTAB: SAFETY GUIDES CRUD */}
      {/* ============================================================ */}
      {activeFaqSubTab === 'guides' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2D5A27]" />
                Статьи справочника безопасности ({(faqData.safetyGuides || []).length})
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Медведи, холодная вода, заломы, пороги, спутниковая связь, первая помощь и стойбища КМНС.
              </p>
            </div>

            <button
              onClick={handleOpenNewGuide}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Создать руководство</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(faqData.safetyGuides || []).map((guide) => (
              <div
                key={guide.id}
                className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      guide.importance === 'Критически важно'
                        ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                        : 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                    }`}>
                      {guide.importance}
                    </span>
                    <span className="text-[10px] text-[#8B7E6D] font-bold">
                      {guide.readTimeMin} мин • {guide.tag}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-[#1A1F1A] leading-snug">
                    {guide.title}
                  </h4>

                  <p className="text-xs text-[#6B665F] line-clamp-2">
                    {guide.shortSummary}
                  </p>

                  <div className="text-[11px] text-[#4A443E] space-y-0.5 pt-1">
                    <p>📋 Правил: <strong>{(guide.rules || []).length}</strong></p>
                    <p>✅ Делать: <strong>{(guide.doList || []).length}</strong> | ❌ Запрещено: <strong>{(guide.dontList || []).length}</strong></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingGuide({ ...guide });
                      setIsNewGuide(false);
                    }}
                    className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Править</span>
                  </button>

                  <button
                    onClick={() => handleDeleteGuide(guide.id, guide.title)}
                    className="p-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-xl border border-[#F8B4B4] transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SUBTAB: HOTLINES CRUD */}
      {/* ============================================================ */}
      {activeFaqSubTab === 'hotlines' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#2D5A27]" />
                Прямые номера дежурных спасательных формирований ({(faqData.emergencyContacts || []).length})
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Номера телефонов, доступные туристам для экстренного вызова помощи и координации.
              </p>
            </div>

            <button
              onClick={handleOpenNewHotline}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить телефон</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(faqData.emergencyContacts || []).map((contact) => (
              <div
                key={contact.id}
                className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1A1F1A]">{contact.name}</span>
                    {contact.badge && (
                      <span className="px-2 py-0.5 rounded-md bg-[#F9F7F4] text-[#6B665F] text-[10px] font-bold border border-[#E5E0D8]">
                        {contact.badge}
                      </span>
                    )}
                  </div>
                  <strong className="text-sm text-[#2D5A27] font-mono block font-black">{contact.phone}</strong>
                  <p className="text-[11px] text-[#6B665F]">{contact.description}</p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setEditingHotline({ ...contact });
                      setIsNewHotline(false);
                    }}
                    className="p-1.5 bg-[#F9F7F4] hover:bg-[#E8F1E7] text-[#2D5A27] rounded-xl border border-[#E5E0D8]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteHotline(contact.id, contact.name)}
                    className="p-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-xl border border-[#F8B4B4]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. SUBTAB: RADIO FREQUENCIES CRUD */}
      {/* ============================================================ */}
      {activeFaqSubTab === 'frequencies' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#2B4C7E]" />
                Аварийные радиочастоты ({(faqData.radioFrequencies || []).length})
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Авиационный диапазон, 16 канал флота, радиолюбительские и внутригрупповые частоты.
              </p>
            </div>

            <button
              onClick={handleOpenNewFreq}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить частоту</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(faqData.radioFrequencies || []).map((freq) => (
              <div
                key={freq.id}
                className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-[#2B4C7E] block">{freq.tag || freq.name}</span>
                  <strong className="text-base text-[#1A1F1A] font-mono font-black block">{freq.frequency}</strong>
                  <p className="text-[11px] text-[#6B665F]">{freq.description}</p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setEditingFreq({ ...freq });
                      setIsNewFreq(false);
                    }}
                    className="p-1.5 bg-[#F9F7F4] hover:bg-[#E8F1E7] text-[#2D5A27] rounded-xl border border-[#E5E0D8]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFreq(freq.id, freq.frequency)}
                    className="p-1.5 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-xl border border-[#F8B4B4]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SUBTAB: VISUAL SIGNALS CRUD */}
      {/* ============================================================ */}
      {activeFaqSubTab === 'signals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-[24px] border border-[#E5E0D8]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#D97706]" />
                Международные визуальные знаки «Земля — Воздух» ({(faqData.visualSignals || []).length})
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Символы для спасательной авиации (V, X, Y, N, стрелки направления и костры).
              </p>
            </div>

            <button
              onClick={handleOpenNewSignal}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить знак</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(faqData.visualSignals || []).map((sig) => (
              <div
                key={sig.id}
                className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-2xs flex flex-col justify-between text-center space-y-2"
              >
                <div>
                  <span className="text-3xl font-black text-[#1A1F1A] block">{sig.code}</span>
                  <strong className="text-xs text-[#2D5A27] block mt-1">{sig.meaning}</strong>
                  <p className="text-[10px] text-[#6B665F] mt-0.5">{sig.description}</p>
                </div>

                <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingSignal({ ...sig });
                      setIsNewSignal(false);
                    }}
                    className="p-1 bg-[#F9F7F4] hover:bg-[#E8F1E7] text-[#2D5A27] rounded-lg"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSignal(sig.id, sig.code)}
                    className="p-1 bg-[#FDE8E8] text-[#E54B4B] rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. SUBTAB: GENERAL TEXTS & CHEAT SHEET */}
      {/* ============================================================ */}
      {activeFaqSubTab === 'texts' && (
        <form onSubmit={handleSaveGeneralTexts} className="bg-white border border-[#E5E0D8] rounded-[28px] p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
            <div>
              <h3 className="text-base font-black text-[#1A1F1A]">
                Общие тексты раздела FAQ, предупреждения и Памятка
              </h3>
              <p className="text-xs text-[#6B665F]">
                Эти заголовки, тексты предупреждений и файл памятки выводятся во всем интерфейсе сайта.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingAll}
              className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingAll ? 'Сохранение...' : 'Сохранить тексты'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#4A443E] font-bold mb-1">Главный заголовок раздела *</label>
              <input
                type="text"
                required
                value={textsForm.title}
                onChange={(e) => setTextsForm({ ...textsForm, title: e.target.value })}
                className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] font-bold outline-none focus:border-[#2D5A27]"
              />
            </div>

            <div>
              <label className="block text-[#4A443E] font-bold mb-1">Подзаголовок</label>
              <input
                type="text"
                value={textsForm.subtitle}
                onChange={(e) => setTextsForm({ ...textsForm, subtitle: e.target.value })}
                className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
              />
            </div>
          </div>

          <div className="space-y-3 bg-[#FEF3C7]/40 p-4 rounded-2xl border border-[#FCD34D] text-xs">
            <h4 className="font-bold text-[#92400E] uppercase text-[11px]">
              ⚠️ Текст главного предупреждающего баннера
            </h4>
            <input
              type="text"
              value={textsForm.warningTitle}
              onChange={(e) => setTextsForm({ ...textsForm, warningTitle: e.target.value })}
              className="w-full bg-white border border-[#FCD34D] rounded-xl p-2.5 text-[#92400E] font-bold outline-none"
            />
            <textarea
              rows={2}
              value={textsForm.warningText}
              onChange={(e) => setTextsForm({ ...textsForm, warningText: e.target.value })}
              className="w-full bg-white border border-[#FCD34D] rounded-xl p-2.5 text-[#78350F] outline-none"
            />
          </div>

          <div className="space-y-2 text-xs">
            <label className="block text-[#4A443E] font-bold">
              Шаблон быстрого SOS сообщения для спутникового трекера (SMS / InReach)
            </label>
            <input
              type="text"
              value={textsForm.sosTemplateText}
              onChange={(e) => setTextsForm({ ...textsForm, sosTemplateText: e.target.value })}
              className="w-full bg-[#FDF2F2] border border-[#F8B4B4] rounded-xl p-2.5 font-mono text-[#7F1D1D] outline-none"
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="block text-[#4A443E] font-bold">
                Полный текст скачиваемой памятки (.TXT)
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(textsForm.cheatSheetContent);
                  setCopiedPamyatka(true);
                  setTimeout(() => setCopiedPamyatka(false), 2000);
                }}
                className="text-[11px] text-[#2D5A27] font-bold hover:underline flex items-center gap-1"
              >
                {copiedPamyatka ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPamyatka ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
            <textarea
              rows={12}
              value={textsForm.cheatSheetContent}
              onChange={(e) => setTextsForm({ ...textsForm, cheatSheetContent: e.target.value })}
              className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-[#2D332D] font-mono text-[11px] leading-relaxed outline-none focus:border-[#2D5A27]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E0D8] flex justify-end">
            <button
              type="submit"
              disabled={isSavingAll}
              className="px-6 py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingAll ? 'Сохранение...' : 'Сохранить все изменения'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT / CREATE SAFETY GUIDE */}
      {/* ============================================================ */}
      {editingGuide && (
        <div className="fixed inset-0 z-[3200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1F1A]">
                    {isNewGuide ? 'Создание руководства по безопасности' : `Редактирование: ${editingGuide.title}`}
                  </h3>
                  <p className="text-[11px] text-[#6B665F]">
                    Настройте правила, списки действий и экстренные телефоны
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingGuide(null)}
                className="p-1.5 rounded-full hover:bg-[#F9F7F4] text-[#8B7E6D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuide} className="space-y-4 text-xs">
              
              {/* Title & Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#4A443E] font-bold mb-1">Заголовок статьи *</label>
                  <input
                    type="text"
                    required
                    value={editingGuide.title}
                    onChange={(e) => setEditingGuide({ ...editingGuide, title: e.target.value })}
                    placeholder="Например: Медвежья безопасность в тайге"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] font-bold outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Тег / Бейдж</label>
                  <input
                    type="text"
                    value={editingGuide.tag}
                    onChange={(e) => setEditingGuide({ ...editingGuide, tag: e.target.value })}
                    placeholder="Дикие животные"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Category, Read Time, Importance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Категория</label>
                  <select
                    value={editingGuide.category}
                    onChange={(e) => setEditingGuide({ ...editingGuide, category: e.target.value as any })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="bear">🐻 Медведи и дикие звери</option>
                    <option value="hypothermia">❄️ Холодная вода и оверкиль</option>
                    <option value="rapids">🌊 Пороги и заломы</option>
                    <option value="insects">🦟 Мошка и гнус</option>
                    <option value="firstaid">🩹 Первая помощь</option>
                    <option value="indigenous">🏕️ Территории КМНС</option>
                    <option value="satellite">📡 Спутниковая связь</option>
                    <option value="general">📋 Общие правила</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Важность</label>
                  <select
                    value={editingGuide.importance}
                    onChange={(e) => setEditingGuide({ ...editingGuide, importance: e.target.value as any })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="Критически важно">Критически важно</option>
                    <option value="Высокая важность">Высокая важность</option>
                    <option value="Рекомендация">Рекомендация</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Время чтения (мин)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={editingGuide.readTimeMin}
                    onChange={(e) => setEditingGuide({ ...editingGuide, readTimeMin: Number(e.target.value) || 5 })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Short Summary */}
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Краткая суть (анонс)</label>
                <textarea
                  rows={2}
                  value={editingGuide.shortSummary}
                  onChange={(e) => setEditingGuide({ ...editingGuide, shortSummary: e.target.value })}
                  placeholder="Короткий абзац о главном риске..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              {/* Rules List Editor */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D8] space-y-2.5">
                <label className="block text-[#2D5A27] font-black uppercase text-[11px]">
                  📋 Базовые правила ({editingGuide.rules?.length || 0})
                </label>
                <div className="space-y-1.5">
                  {(editingGuide.rules || []).map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#E8F1E7] text-[#2D5A27] font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => {
                          const updated = [...(editingGuide.rules || [])];
                          updated[idx] = e.target.value;
                          setEditingGuide({ ...editingGuide, rules: updated });
                        }}
                        className="flex-1 bg-white border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2D332D]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editingGuide.rules || []).filter((_, i) => i !== idx);
                          setEditingGuide({ ...editingGuide, rules: updated });
                        }}
                        className="p-1.5 text-[#E54B4B] hover:bg-[#FDE8E8] rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Добавить новый пункт правила..."
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRuleInput.trim()) {
                        e.preventDefault();
                        setEditingGuide({ ...editingGuide, rules: [...(editingGuide.rules || []), newRuleInput.trim()] });
                        setNewRuleInput('');
                      }
                    }}
                    className="flex-1 bg-white border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2D332D]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRuleInput.trim()) {
                        setEditingGuide({ ...editingGuide, rules: [...(editingGuide.rules || []), newRuleInput.trim()] });
                        setNewRuleInput('');
                      }
                    }}
                    className="px-3 py-2 bg-[#2D5A27] text-white font-bold rounded-xl text-xs"
                  >
                    + Добавить
                  </button>
                </div>
              </div>

              {/* DO / DONT Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DO */}
                <div className="bg-[#F0FDF4] p-3.5 rounded-2xl border border-[#BBF7D0] space-y-2">
                  <label className="block text-[#166534] font-black uppercase text-[11px]">
                    ✅ Что ОБЯЗАТЕЛЬНО делать:
                  </label>
                  <div className="space-y-1.5">
                    {(editingGuide.doList || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const updated = [...(editingGuide.doList || [])];
                            updated[idx] = e.target.value;
                            setEditingGuide({ ...editingGuide, doList: updated });
                          }}
                          className="flex-1 bg-white border border-[#BBF7D0] rounded-xl p-1.5 text-xs text-[#14532D]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingGuide.doList || []).filter((_, i) => i !== idx);
                            setEditingGuide({ ...editingGuide, doList: updated });
                          }}
                          className="text-[#E54B4B] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Новый пункт..."
                      value={newDoInput}
                      onChange={(e) => setNewDoInput(e.target.value)}
                      className="flex-1 bg-white border border-[#BBF7D0] rounded-xl p-1.5 text-xs text-[#14532D]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newDoInput.trim()) {
                          setEditingGuide({ ...editingGuide, doList: [...(editingGuide.doList || []), newDoInput.trim()] });
                          setNewDoInput('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-[#166534] text-white text-xs font-bold rounded-xl"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* DONT */}
                <div className="bg-[#FEF2F2] p-3.5 rounded-2xl border border-[#FECACA] space-y-2">
                  <label className="block text-[#991B1B] font-black uppercase text-[11px]">
                    ❌ Что КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
                  </label>
                  <div className="space-y-1.5">
                    {(editingGuide.dontList || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const updated = [...(editingGuide.dontList || [])];
                            updated[idx] = e.target.value;
                            setEditingGuide({ ...editingGuide, dontList: updated });
                          }}
                          className="flex-1 bg-white border border-[#FECACA] rounded-xl p-1.5 text-xs text-[#7F1D1D]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingGuide.dontList || []).filter((_, i) => i !== idx);
                            setEditingGuide({ ...editingGuide, dontList: updated });
                          }}
                          className="text-[#E54B4B] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Новый запрет..."
                      value={newDontInput}
                      onChange={(e) => setNewDontInput(e.target.value)}
                      className="flex-1 bg-white border border-[#FECACA] rounded-xl p-1.5 text-xs text-[#7F1D1D]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newDontInput.trim()) {
                          setEditingGuide({ ...editingGuide, dontList: [...(editingGuide.dontList || []), newDontInput.trim()] });
                          setNewDontInput('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-[#991B1B] text-white text-xs font-bold rounded-xl"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Guide Emergency Contacts */}
              <div className="bg-[#FFFBEB] p-3.5 rounded-2xl border border-[#FDE68A] space-y-2">
                <label className="block text-[#92400E] font-black uppercase text-[11px]">
                  📞 Экстренные телефоны для этого руководства:
                </label>
                <div className="space-y-1.5">
                  {(editingGuide.emergencyContacts || []).map((ec, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-[#FDE68A]">
                      <div className="flex-1 text-xs">
                        <strong className="text-[#92400E]">{ec.name}</strong> • <span className="font-mono">{ec.phone}</span> ({ec.note})
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editingGuide.emergencyContacts || []).filter((_, i) => i !== idx);
                          setEditingGuide({ ...editingGuide, emergencyContacts: updated });
                        }}
                        className="text-[#E54B4B] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Название службы"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="bg-white border border-[#FDE68A] rounded-xl p-1.5 text-xs text-[#2D332D]"
                  />
                  <input
                    type="text"
                    placeholder="Телефон"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="bg-white border border-[#FDE68A] rounded-xl p-1.5 text-xs text-[#2D332D]"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Примечание"
                      value={newContactNote}
                      onChange={(e) => setNewContactNote(e.target.value)}
                      className="flex-1 bg-white border border-[#FDE68A] rounded-xl p-1.5 text-xs text-[#2D332D]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newContactName && newContactPhone) {
                          setEditingGuide({
                            ...editingGuide,
                            emergencyContacts: [
                              ...(editingGuide.emergencyContacts || []),
                              { name: newContactName, phone: newContactPhone, note: newContactNote || 'Круглосуточно' }
                            ]
                          });
                          setNewContactName('');
                          setNewContactPhone('');
                          setNewContactNote('');
                        }
                      }}
                      className="px-3 bg-[#92400E] text-white font-bold text-xs rounded-xl"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGuide(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить руководство</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT / CREATE FAQ QUESTION */}
      {/* ============================================================ */}
      {editingQuestion && (
        <div className="fixed inset-0 z-[3200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A]">
                {isNewQuestion ? 'Новый вопрос в FAQ' : 'Редактирование вопроса'}
              </h3>
              <button onClick={() => setEditingQuestion(null)} className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Вопрос *</label>
                <input
                  type="text"
                  required
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  placeholder="Например: Нужно ли регистрировать сапборд в ГИМС?"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] font-bold outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Ответ (поддерживает переносы строк) *</label>
                <textarea
                  rows={6}
                  required
                  value={editingQuestion.answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                  placeholder="Развернутый ответ..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] leading-relaxed outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Категория</label>
                  <select
                    value={editingQuestion.category}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value as any })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="permits_gims">⚖️ ГИМС, Законы и Пропуска</option>
                    <option value="satellite_sos">📡 Спутниковая связь и SOS</option>
                    <option value="wildlife">🐻 Медведи и дикая природа</option>
                    <option value="routes_logistics">🧭 Логистика и Маршруты</option>
                    <option value="general">📋 Общие правила</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1A1F1A]">
                    <input
                      type="checkbox"
                      checked={editingQuestion.isPopular || false}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, isPopular: e.target.checked })}
                      className="w-4 h-4 rounded text-[#2D5A27] accent-[#2D5A27]"
                    />
                    <span>★ Популярный вопрос (раскрыт по умолчанию)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить вопрос</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT / CREATE HOTLINE */}
      {/* ============================================================ */}
      {editingHotline && (
        <div className="fixed inset-0 z-[3200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A]">
                {isNewHotline ? 'Добавление телефона службы' : 'Редактирование контакта'}
              </h3>
              <button onClick={() => setEditingHotline(null)} className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHotline} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Название службы / отряда *</label>
                <input
                  type="text"
                  required
                  value={editingHotline.name}
                  onChange={(e) => setEditingHotline({ ...editingHotline, name: e.target.value })}
                  placeholder="ГКУ «Ямалспас»"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Номер телефона *</label>
                <input
                  type="text"
                  required
                  value={editingHotline.phone}
                  onChange={(e) => setEditingHotline({ ...editingHotline, phone: e.target.value })}
                  placeholder="+7 (34922) 4-44-44"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] font-mono font-bold outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Бейдж / Регион</label>
                <input
                  type="text"
                  value={editingHotline.badge || ''}
                  onChange={(e) => setEditingHotline({ ...editingHotline, badge: e.target.value })}
                  placeholder="ЯНАО / Салехард"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Описание / График</label>
                <textarea
                  rows={2}
                  value={editingHotline.description}
                  onChange={(e) => setEditingHotline({ ...editingHotline, description: e.target.value })}
                  placeholder="Круглосуточный оперативный дежурный ПСО..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#E54B4B]">
                  <input
                    type="checkbox"
                    checked={editingHotline.isCritical || false}
                    onChange={(e) => setEditingHotline({ ...editingHotline, isCritical: e.target.checked })}
                    className="w-4 h-4 rounded text-[#E54B4B] accent-[#E54B4B]"
                  />
                  <span>Выделить красным (Критически важный номер)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHotline(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT / CREATE RADIO FREQUENCY */}
      {/* ============================================================ */}
      {editingFreq && (
        <div className="fixed inset-0 z-[3200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A]">
                {isNewFreq ? 'Добавление радиочастоты' : 'Редактирование частоты'}
              </h3>
              <button onClick={() => setEditingFreq(null)} className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFreq} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Название диапазона / Тег *</label>
                <input
                  type="text"
                  required
                  value={editingFreq.tag}
                  onChange={(e) => setEditingFreq({ ...editingFreq, tag: e.target.value, name: e.target.value })}
                  placeholder="Международный SOS / Канал 16 VHF"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Частота *</label>
                <input
                  type="text"
                  required
                  value={editingFreq.frequency}
                  onChange={(e) => setEditingFreq({ ...editingFreq, frequency: e.target.value })}
                  placeholder="121.500 МГц"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] font-mono font-bold outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Описание назначения</label>
                <textarea
                  rows={3}
                  value={editingFreq.description}
                  onChange={(e) => setEditingFreq({ ...editingFreq, description: e.target.value })}
                  placeholder="Слушают все пролетающие гражданские и вертолетные борта..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFreq(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT / CREATE VISUAL SIGNAL */}
      {/* ============================================================ */}
      {editingSignal && (
        <div className="fixed inset-0 z-[3200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A]">
                {isNewSignal ? 'Добавление визуального знака' : 'Редактирование знака'}
              </h3>
              <button onClick={() => setEditingSignal(null)} className="p-1 text-[#8B7E6D] hover:text-[#1A1F1A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSignal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Символ / Код (V, X, Y, N, ↑) *</label>
                <input
                  type="text"
                  required
                  value={editingSignal.code}
                  onChange={(e) => setEditingSignal({ ...editingSignal, code: e.target.value })}
                  placeholder="V"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] text-lg font-black font-mono outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Значение *</label>
                <input
                  type="text"
                  required
                  value={editingSignal.meaning}
                  onChange={(e) => setEditingSignal({ ...editingSignal, meaning: e.target.value })}
                  placeholder="Требуется помощь"
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Цветовое оформление</label>
                <select
                  value={editingSignal.color || 'red'}
                  onChange={(e) => setEditingSignal({ ...editingSignal, color: e.target.value as any })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                >
                  <option value="red">Красный (Бедствие / Медпомощь)</option>
                  <option value="green">Зеленый (Подтверждение / Да)</option>
                  <option value="gray">Серый (Отказ / Нет)</option>
                  <option value="amber">Оранжевый (Внимание)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Описание на английском / пояснение</label>
                <textarea
                  rows={2}
                  value={editingSignal.description}
                  onChange={(e) => setEditingSignal({ ...editingSignal, description: e.target.value })}
                  placeholder="Require assistance — базовый сигнал бедствия..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSignal(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIVERSAL CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-[#E5E0D8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
              confirmModal.confirmVariant === 'primary'
                ? 'bg-[#E8F1E7] text-[#2D5A27] border-[#CDE0CC]'
                : 'bg-[#FFF2F2] text-[#E54B4B] border-[#F8C8C8]'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-[#1A1F1A]">{confirmModal.title}</h3>
              <p className="text-xs text-[#6B665F] leading-relaxed whitespace-pre-line">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 px-4 bg-[#F2EFE9] hover:bg-[#E5E0D8] text-[#2D332D] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {confirmModal.cancelText || 'Отмена'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConfirmAction = confirmModal.onConfirm;
                  setConfirmModal(null);
                  onConfirmAction();
                }}
                className={`flex-1 py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  confirmModal.confirmVariant === 'primary'
                    ? 'bg-[#2D5A27] hover:bg-[#3D7136]'
                    : 'bg-[#E54B4B] hover:bg-[#D43F3F]'
                }`}
              >
                {confirmModal.confirmVariant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmModal.confirmText || 'Подтвердить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
