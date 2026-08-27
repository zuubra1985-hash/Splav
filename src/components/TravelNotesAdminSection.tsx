import React, { useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  Compass,
  Star,
  Award,
  Trash2,
  Edit3,
  Plus,
  Save,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  UserCheck,
  ShieldCheck,
  Tag,
  MessageSquare
} from 'lucide-react';
import {
  TravelNotesConfig,
  TravelNote,
  ChecklistItem,
  LogbookTrip,
  RiverReview,
  CrewReview,
  AppUser,
  RiverRoute,
  VesselType
} from '../types';
import {
  INITIAL_TRAVEL_NOTES,
  INITIAL_CHECKLIST_ITEMS,
  INITIAL_LOGBOOK_TRIPS,
  INITIAL_RIVER_REVIEWS,
  INITIAL_CREW_REVIEWS
} from '../data/logbookData';
import { TravelNotesSyncService } from '../firebase';
import { CloudSqlDbService } from '../services/cloudSqlDb';
import confetti from 'canvas-confetti';

interface TravelNotesAdminSectionProps {
  notesConfig: TravelNotesConfig;
  setNotesConfig: React.Dispatch<React.SetStateAction<TravelNotesConfig>>;
  currentUser: AppUser | null;
  routes: RiverRoute[];
  registeredUsers: AppUser[];
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

export const TravelNotesAdminSection: React.FC<TravelNotesAdminSectionProps> = ({
  notesConfig,
  setNotesConfig,
  currentUser,
  routes,
  registeredUsers,
  showNotification
}) => {
  const [subTab, setSubTab] = useState<'notes' | 'checklist' | 'trips' | 'river_reviews' | 'crew_reviews' | 'backup'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. NOTES ADMIN STATE
  const [editingNote, setEditingNote] = useState<TravelNote | null>(null);
  const [isNewNote, setIsNewNote] = useState(false);

  // 2. CHECKLIST ADMIN STATE
  const [editingCheckItem, setEditingCheckItem] = useState<ChecklistItem | null>(null);
  const [isNewCheckItem, setIsNewCheckItem] = useState(false);

  // 3. LOGBOOK TRIPS ADMIN STATE
  const [editingTrip, setEditingTrip] = useState<LogbookTrip | null>(null);
  const [isNewTrip, setIsNewTrip] = useState(false);

  // 4. RIVER REVIEWS ADMIN STATE
  const [editingRiverReview, setEditingRiverReview] = useState<RiverReview | null>(null);
  const [isNewRiverReview, setIsNewRiverReview] = useState(false);

  // 5. CREW REVIEWS ADMIN STATE
  const [editingCrewReview, setEditingCrewReview] = useState<CrewReview | null>(null);
  const [isNewCrewReview, setIsNewCrewReview] = useState(false);

  // Persistence helper
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

  const commitConfig = (newConfig: TravelNotesConfig, message: string) => {
    setNotesConfig(newConfig);
    try {
      localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
      localStorage.setItem('splav86_travel_notes_v2', JSON.stringify(newConfig.notes));
      localStorage.setItem('splav86_custom_checklist_v2', JSON.stringify(newConfig.checklist));
      localStorage.setItem('splav86_my_trips_log_v2', JSON.stringify(newConfig.logbookTrips));
      localStorage.setItem('splav86_river_reviews_v2', JSON.stringify(newConfig.riverReviews));
      localStorage.setItem('splav86_crew_reviews_v2', JSON.stringify(newConfig.crewReviews));
    } catch (e) {
      console.warn('Storage sync:', e);
    }

    CloudSqlDbService.saveTravelNotes(newConfig).catch(console.warn);

    TravelNotesSyncService.saveNotesConfig(newConfig)
      .then(() => {
        showNotification(message);
      })
      .catch((err) => {
        console.warn('Firestore sync notes error:', err);
        showNotification(`${message} (сохранено локально)`);
      });
  };

  // --- 1. TRAVEL NOTES HANDLERS ---
  const handleOpenEditNote = (note?: TravelNote) => {
    if (note) {
      setEditingNote({ ...note });
      setIsNewNote(false);
    } else {
      setEditingNote({
        id: `note-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        authorName: currentUser?.name || 'Администратор Splav86',
        title: '',
        riverName: routes[0]?.name || 'р. Собь',
        category: 'gear_lessons',
        season: 'summer_warm',
        content: '',
        tags: ['Снаряжение', 'Уроки'],
        isPinned: false,
        isPublic: true,
        createdAt: new Date().toISOString().split('T')[0]
      });
      setIsNewNote(true);
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    if (!editingNote.title.trim() || !editingNote.content.trim()) {
      showNotification('Укажите заголовок и текст заметки', 'error');
      return;
    }

    let updatedNotes: TravelNote[];
    if (isNewNote) {
      updatedNotes = [editingNote, ...notesConfig.notes];
    } else {
      updatedNotes = notesConfig.notes.map((n) => (n.id === editingNote.id ? editingNote : n));
    }

    const updatedConfig = { ...notesConfig, notes: updatedNotes };
    commitConfig(updatedConfig, `Заметка "${editingNote.title}" сохранена`);
    setEditingNote(null);
  };

  const handleDeleteNote = (id: string, title: string) => {
    const updatedNotes = notesConfig.notes.filter((n) => n.id !== id);
    commitConfig({ ...notesConfig, notes: updatedNotes }, `Заметка "${title}" удалена`);
  };

  // --- 2. CHECKLIST HANDLERS ---
  const handleOpenEditCheckItem = (item?: ChecklistItem) => {
    if (item) {
      setEditingCheckItem({ ...item });
      setIsNewCheckItem(false);
    } else {
      setEditingCheckItem({
        id: `check-${Date.now()}`,
        text: '',
        category: 'camp_bivouac',
        isChecked: true,
        quantity: '1 шт'
      });
      setIsNewCheckItem(true);
    }
  };

  const handleSaveCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCheckItem) return;
    if (!editingCheckItem.text.trim()) {
      showNotification('Введите наименование предмета снаряжения', 'error');
      return;
    }

    let updatedList: ChecklistItem[];
    if (isNewCheckItem) {
      updatedList = [...notesConfig.checklist, editingCheckItem];
    } else {
      updatedList = notesConfig.checklist.map((i) => (i.id === editingCheckItem.id ? editingCheckItem : i));
    }

    commitConfig({ ...notesConfig, checklist: updatedList }, 'Пункт чек-листа сохранен');
    setEditingCheckItem(null);
  };

  const handleDeleteCheckItem = (id: string, _text: string) => {
    const updatedList = notesConfig.checklist.filter((i) => i.id !== id);
    commitConfig({ ...notesConfig, checklist: updatedList }, 'Предмет удален из чек-листа');
  };

  // --- 3. LOGBOOK TRIPS HANDLERS ---
  const handleOpenEditTrip = (trip?: LogbookTrip) => {
    if (trip) {
      setEditingTrip({ ...trip });
      setIsNewTrip(false);
    } else {
      setEditingTrip({
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        riverName: routes[0]?.name || 'р. Собь',
        region: 'ХМАО',
        year: 2026,
        month: 'Июль',
        durationDays: 5,
        distanceKm: 90,
        vessel: 'catamaran',
        role: 'Капитан / Организатор',
        status: 'completed',
        personalNotes: '',
        difficultyRating: 'II к.с.',
        riverRating: 5,
        createdAt: new Date().toISOString().split('T')[0]
      });
      setIsNewTrip(true);
    }
  };

  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    if (!editingTrip.riverName.trim()) {
      showNotification('Укажите название реки', 'error');
      return;
    }

    let updatedTrips: LogbookTrip[];
    if (isNewTrip) {
      updatedTrips = [editingTrip, ...notesConfig.logbookTrips];
    } else {
      updatedTrips = notesConfig.logbookTrips.map((t) => (t.id === editingTrip.id ? editingTrip : t));
    }

    commitConfig({ ...notesConfig, logbookTrips: updatedTrips }, 'Запись сплава сохранена');
    setEditingTrip(null);
  };

  const handleDeleteTrip = (id: string, _river: string) => {
    const updatedTrips = notesConfig.logbookTrips.filter((t) => t.id !== id);
    commitConfig({ ...notesConfig, logbookTrips: updatedTrips }, 'Запись о сплаве удалена');
  };

  // --- 4. RIVER REVIEWS HANDLERS ---
  const handleOpenEditRiverReview = (review?: RiverReview) => {
    if (review) {
      setEditingRiverReview({ ...review });
      setIsNewRiverReview(false);
    } else {
      setEditingRiverReview({
        id: `rev-r-${Date.now()}`,
        riverName: routes[0]?.name || 'р. Собь',
        userName: currentUser?.name || 'Администратор',
        userAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        date: new Date().toISOString().split('T')[0],
        ratingOverall: 5,
        ratingScenery: 5,
        ratingRapids: 4,
        ratingCamps: 5,
        ratingFishing: 5,
        vesselUsed: 'catamaran',
        comment: 'Отличная чистая река с красивейшими стоянками!',
        adviceForOthers: 'Возьмите надежные репелленты и спасжилеты'
      });
      setIsNewRiverReview(true);
    }
  };

  const handleSaveRiverReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRiverReview) return;
    if (!editingRiverReview.comment.trim()) {
      showNotification('Напишите текст отзыва', 'error');
      return;
    }

    let updatedReviews: RiverReview[];
    if (isNewRiverReview) {
      updatedReviews = [editingRiverReview, ...notesConfig.riverReviews];
    } else {
      updatedReviews = notesConfig.riverReviews.map((r) => (r.id === editingRiverReview.id ? editingRiverReview : r));
    }

    commitConfig({ ...notesConfig, riverReviews: updatedReviews }, 'Отзыв о реке сохранен');
    setEditingRiverReview(null);
  };

  const handleDeleteRiverReview = (id: string, river: string) => {
    const updatedReviews = notesConfig.riverReviews.filter((r) => r.id !== id);
    commitConfig({ ...notesConfig, riverReviews: updatedReviews }, `Отзыв о реке "${river}" удален`);
  };

  // --- 5. CREW REVIEWS HANDLERS ---
  const handleOpenEditCrewReview = (review?: CrewReview) => {
    if (review) {
      setEditingCrewReview({ ...review });
      setIsNewCrewReview(false);
    } else {
      setEditingCrewReview({
        id: `rev-c-${Date.now()}`,
        tripTitle: 'Экспедиция по рекам Севера',
        targetUserId: registeredUsers[0]?.id || 'user-1',
        targetUserName: registeredUsers[0]?.name || 'Участник сплава',
        authorUserId: currentUser?.id || 'admin',
        authorUserName: currentUser?.name || 'Администратор',
        date: new Date().toISOString().split('T')[0],
        ratingOverall: 5,
        ratingPaddling: 5,
        ratingCampSkills: 5,
        ratingTeamwork: 5,
        ratingPunctuality: 5,
        tags: ['🔥 Мастер костра', '💪 Мощий гребец'],
        comment: 'Надежный товарищ по веслу, отличная выдержка в сложных условиях.'
      });
      setIsNewCrewReview(true);
    }
  };

  const handleSaveCrewReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrewReview) return;
    if (!editingCrewReview.comment.trim()) {
      showNotification('Напишите отзыв об участнике', 'error');
      return;
    }

    let updatedReviews: CrewReview[];
    if (isNewCrewReview) {
      updatedReviews = [editingCrewReview, ...notesConfig.crewReviews];
    } else {
      updatedReviews = notesConfig.crewReviews.map((r) => (r.id === editingCrewReview.id ? editingCrewReview : r));
    }

    commitConfig({ ...notesConfig, crewReviews: updatedReviews }, 'Отзыв об участнике экипажа сохранен');
    setEditingCrewReview(null);
  };

  const handleDeleteCrewReview = (id: string, targetName: string) => {
    const updatedReviews = notesConfig.crewReviews.filter((r) => r.id !== id);
    commitConfig({ ...notesConfig, crewReviews: updatedReviews }, `Отзыв об участнике "${targetName}" удален`);
  };

  // --- 6. BACKUP & RESET HANDLERS ---
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(notesConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splav86_travel_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Бэкап заметок и отзывов сохранен в JSON');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.notes && parsed.checklist && parsed.riverReviews) {
          commitConfig(parsed, 'Контекст заметок и отзывов успешно импортирован!');
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } else {
          showNotification('Неверный формат JSON файла', 'error');
        }
      } catch (err) {
        showNotification('Ошибка чтения файла бэкапа', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefaults = () => {
    askConfirmation({
      title: 'Сброс заметок и отзывов?',
      message: 'Сбросить ВСЕ заметки, чек-листы, сплавы и отзывы к исходным эталонным данным? Все изменения будут перезаписаны.',
      confirmText: 'Да, сбросить к эталону',
      confirmVariant: 'danger',
      onConfirm: () => {
        const initial: TravelNotesConfig = {
          id: 'notes_main_config',
          notes: INITIAL_TRAVEL_NOTES,
          checklist: INITIAL_CHECKLIST_ITEMS,
          logbookTrips: INITIAL_LOGBOOK_TRIPS,
          riverReviews: INITIAL_RIVER_REVIEWS,
          crewReviews: INITIAL_CREW_REVIEWS,
          updatedAt: new Date().toISOString()
        };
        commitConfig(initial, 'Все заметки и отзывы сброшены к начальным данным');
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D5A27] to-[#1E3B1A] text-white p-5 sm:p-6 rounded-[24px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Панель Администратора</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Полный контроль над разделом «Заметки и Бортовой журнал»
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Редактируйте любые путевые заметки, эталонный чек-лист снаряжения, реестр сплавов, 5-звёздочные отзывы о реках и взаимные оценки участников экипажа.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт JSON</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs - Column on mobile, grid/flex on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-2 pb-2 border-b border-[#E5E0D8]">
        {[
          { id: 'notes', label: 'Путевые заметки', icon: BookOpen, count: notesConfig.notes.length },
          { id: 'checklist', label: 'Чек-лист сборов', icon: CheckSquare, count: notesConfig.checklist.length },
          { id: 'trips', label: 'Пройденные реки', icon: Compass, count: notesConfig.logbookTrips.length },
          { id: 'river_reviews', label: 'Отзывы о реках 5★', icon: Star, count: notesConfig.riverReviews.length },
          { id: 'crew_reviews', label: 'Отзывы об экипаже', icon: Award, count: notesConfig.crewReviews.length },
          { id: 'backup', label: 'Бэкап и сброс', icon: RefreshCw }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`w-full lg:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-between sm:justify-start gap-2 transition-all ${
                isActive
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'bg-white text-[#6B665F] hover:text-[#2D5A27] border border-[#E5E0D8]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </div>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[#F4F1EA] text-[#2D5A27]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================
          SUB-TAB 1: NOTES MANAGEMENT
          ========================================================= */}
      {subTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E0D8]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск заметок по названию, реке или тексту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
              />
            </div>
            <button
              onClick={() => handleOpenEditNote()}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Создать заметку</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notesConfig.notes
              .filter(
                (n) =>
                  !searchQuery ||
                  n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (n.riverName && n.riverName.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((note) => (
                <div key={note.id} className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-2.5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F1E7] text-[#2D5A27]">
                        {note.riverName || 'Река не указана'}
                      </span>
                      <div className="flex items-center gap-1">
                        {note.isPinned && <span className="text-xs">📌</span>}
                        <button
                          onClick={() => handleOpenEditNote(note)}
                          className="p-1 text-[#8B7E6D] hover:text-[#2D5A27] hover:bg-[#F4F1EA] rounded-md"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-1 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm text-[#1A1F1A]">{note.title}</h4>
                    <p className="text-xs text-[#4A443E] line-clamp-3 leading-relaxed">{note.content}</p>
                  </div>
                  <div className="pt-2 border-t border-[#F4F1EA] flex items-center justify-between text-[10px] text-[#8B7E6D]">
                    <span>Автор: <strong>{note.authorName || 'Турист'}</strong></span>
                    <span>{note.createdAt}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 2: CHECKLIST MANAGEMENT
          ========================================================= */}
      {subTab === 'checklist' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E0D8]">
            <div className="text-xs text-[#6B665F]">
              Всего позиций в эталонном чек-листе: <strong>{notesConfig.checklist.length}</strong>
            </div>
            <button
              onClick={() => handleOpenEditCheckItem()}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить предмет</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notesConfig.checklist.map((item) => (
              <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-[#E5E0D8] flex items-center justify-between gap-2 shadow-xs">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1A1F1A] truncate">{item.text}</div>
                  <div className="text-[10px] text-[#8B7E6D] mt-0.5">
                    Категория: {item.category} {item.quantity ? `• ${item.quantity}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditCheckItem(item)}
                    className="p-1 text-[#8B7E6D] hover:text-[#2D5A27] hover:bg-[#F4F1EA] rounded-md"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCheckItem(item.id, item.text)}
                    className="p-1 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 3: LOGBOOK TRIPS MANAGEMENT
          ========================================================= */}
      {subTab === 'trips' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E0D8]">
            <div className="text-xs text-[#6B665F]">
              Записано сплавов: <strong>{notesConfig.logbookTrips.length}</strong>
            </div>
            <button
              onClick={() => handleOpenEditTrip()}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить запись о сплаве</span>
            </button>
          </div>

          <div className="space-y-3">
            {notesConfig.logbookTrips.map((trip) => (
              <div key={trip.id} className="bg-white p-4 rounded-2xl border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F1E7] text-[#2D5A27]">
                      {trip.region}
                    </span>
                    <span className="text-xs font-bold text-[#1A1F1A]">{trip.riverName}</span>
                    <span className="text-[10px] text-[#8B7E6D]">({trip.month} {trip.year}, {trip.distanceKm} км, {trip.durationDays} дн.)</span>
                  </div>
                  {trip.personalNotes && (
                    <p className="text-xs text-[#4A443E] italic line-clamp-1">{trip.personalNotes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs font-bold text-amber-500">★ {trip.riverRating || 5}/5</span>
                  <button
                    onClick={() => handleOpenEditTrip(trip)}
                    className="p-1.5 text-[#8B7E6D] hover:text-[#2D5A27] hover:bg-[#F4F1EA] rounded-lg"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTrip(trip.id, trip.riverName)}
                    className="p-1.5 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 4: RIVER REVIEWS (5 STARS)
          ========================================================= */}
      {subTab === 'river_reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E0D8]">
            <div className="text-xs text-[#6B665F]">
              Всего 5-звёздочных отзывов о реках: <strong>{notesConfig.riverReviews.length}</strong>
            </div>
            <button
              onClick={() => handleOpenEditRiverReview()}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Создать отзыв о реке</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notesConfig.riverReviews.map((rev) => (
              <div key={rev.id} className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-3 flex flex-col justify-between shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-bold text-[#1A1F1A]">{rev.userName}</div>
                        <div className="text-[10px] text-[#8B7E6D]">{rev.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-amber-500">★ {rev.ratingOverall}/5</span>
                      <button
                        onClick={() => handleOpenEditRiverReview(rev)}
                        className="p-1 text-[#8B7E6D] hover:text-[#2D5A27] rounded-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRiverReview(rev.id, rev.riverName)}
                        className="p-1 text-[#8B7E6D] hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[#2D5A27]">{rev.riverName} ({rev.vesselUsed})</div>
                  <p className="text-xs text-[#4A443E] leading-relaxed">{rev.comment}</p>
                </div>
                {rev.adviceForOthers && (
                  <div className="text-[10px] bg-[#E8F1E7]/60 p-2 rounded-lg text-[#2D5A27]">
                    <strong>Совет:</strong> {rev.adviceForOthers}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 5: CREW REVIEWS (5 STARS)
          ========================================================= */}
      {subTab === 'crew_reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E0D8]">
            <div className="text-xs text-[#6B665F]">
              Взаимных отзывов об участниках: <strong>{notesConfig.crewReviews.length}</strong>
            </div>
            <button
              onClick={() => handleOpenEditCrewReview()}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Создать отзыв об участнике</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notesConfig.crewReviews.map((rev) => (
              <div key={rev.id} className="bg-white p-4 rounded-2xl border border-[#E5E0D8] space-y-3 flex flex-col justify-between shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-[#8B7E6D]">Оценка участника:</span>
                      <div className="text-xs font-black text-[#1A1F1A]">{rev.targetUserName}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-amber-500">★ {rev.ratingOverall}/5</span>
                      <button
                        onClick={() => handleOpenEditCrewReview(rev)}
                        className="p-1 text-[#8B7E6D] hover:text-[#2D5A27] rounded-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCrewReview(rev.id, rev.targetUserName)}
                        className="p-1 text-[#8B7E6D] hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rev.tags.map((t, idx) => (
                      <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E8F1E7] text-[#2D5A27]">
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#4A443E] italic">«{rev.comment}»</p>
                </div>
                <div className="pt-2 border-t border-[#F4F1EA] text-[10px] text-[#8B7E6D] flex justify-between">
                  <span>Автор: {rev.authorUserName}</span>
                  <span>{rev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 6: BACKUP & RESET
          ========================================================= */}
      {subTab === 'backup' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E0D8] space-y-6">
          <div>
            <h3 className="text-base font-black text-[#1A1F1A]">Резервное копирование и сброс заметок</h3>
            <p className="text-xs text-[#6B665F] mt-1">
              Экспортируйте все путевые заметки, чек-листы и отзывы в файл или восстановите эталонные заводские данные.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#E5E0D8] space-y-2">
              <h4 className="font-bold text-xs text-[#1A1F1A]">Экспорт в JSON</h4>
              <p className="text-[11px] text-[#6B665F]">Скачать полный снимок всех записей дневника и отзывов.</p>
              <button
                onClick={handleExportJson}
                className="w-full py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать JSON</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#E5E0D8] space-y-2">
              <h4 className="font-bold text-xs text-[#1A1F1A]">Импорт из JSON</h4>
              <p className="text-[11px] text-[#6B665F]">Загрузить данные из ранее сохраненного файла.</p>
              <label className="w-full py-2 bg-white text-[#2D5A27] border border-[#2D5A27] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#E8F1E7]">
                <Upload className="w-3.5 h-3.5" />
                <span>Выбрать файл</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <h4 className="font-bold text-xs text-rose-800">Заводской сброс</h4>
              <p className="text-[11px] text-rose-600">Восстановить базовый набор заметок, чек-листов и оценок.</p>
              <button
                onClick={handleResetToDefaults}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Сбросить к исходным</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDIT TRAVEL NOTE
          ========================================================= */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="font-black text-sm text-[#1A1F1A]">
                {isNewNote ? 'Создание путевой заметки' : 'Редактирование заметки'}
              </h3>
              <button onClick={() => setEditingNote(null)} className="text-[#8B7E6D] hover:text-[#1A1F1A]">✕</button>
            </div>
            <form onSubmit={handleSaveNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Заголовок *</label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река / Локация</label>
                  <input
                    type="text"
                    value={editingNote.riverName || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Автор</label>
                  <input
                    type="text"
                    value={editingNote.authorName || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, authorName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Текст заметки *</label>
                <textarea
                  rows={6}
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 outline-none focus:border-[#2D5A27] resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notePinned"
                  checked={!!editingNote.isPinned}
                  onChange={(e) => setEditingNote({ ...editingNote, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A27]"
                />
                <label htmlFor="notePinned" className="font-bold text-[#1A1F1A] cursor-pointer">
                  📌 Закрепить вверху журнала
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] rounded-xl font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold hover:bg-[#3D7136]"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDIT CHECKLIST ITEM
          ========================================================= */}
      {editingCheckItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="font-black text-sm text-[#1A1F1A]">
                {isNewCheckItem ? 'Новый предмет в чек-лист' : 'Редактировать предмет'}
              </h3>
              <button onClick={() => setEditingCheckItem(null)} className="text-[#8B7E6D]">✕</button>
            </div>
            <form onSubmit={handleSaveCheckItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Наименование *</label>
                <input
                  type="text"
                  value={editingCheckItem.text}
                  onChange={(e) => setEditingCheckItem({ ...editingCheckItem, text: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Категория</label>
                  <select
                    value={editingCheckItem.category}
                    onChange={(e) => setEditingCheckItem({ ...editingCheckItem, category: e.target.value as any })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 outline-none focus:border-[#2D5A27]"
                  >
                    <option value="life_safety">Безопасность на воде</option>
                    <option value="camp_bivouac">Бивак и лагерь</option>
                    <option value="kitchen_fire">Костёр и кухня</option>
                    <option value="repair_vessel">Ремкомплект судна</option>
                    <option value="firstaid_hygiene">Аптечка и гигиена</option>
                    <option value="wildlife_bear">Связь и звери</option>
                    <option value="hydro_clothes">Одежда и гидрокостюмы</option>
                    <option value="custom">Личные вещи</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Количество</label>
                  <input
                    type="text"
                    value={editingCheckItem.quantity || ''}
                    onChange={(e) => setEditingCheckItem({ ...editingCheckItem, quantity: e.target.value })}
                    placeholder="1 шт / 2 тюбика"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                <button
                  type="button"
                  onClick={() => setEditingCheckItem(null)}
                  className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] rounded-xl font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold hover:bg-[#3D7136]"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDIT RIVER REVIEW (5 STARS)
          ========================================================= */}
      {editingRiverReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="font-black text-sm text-[#1A1F1A]">
                {isNewRiverReview ? 'Создание отзыва о реке' : 'Редактирование отзыва о реке'}
              </h3>
              <button onClick={() => setEditingRiverReview(null)} className="text-[#8B7E6D]">✕</button>
            </div>
            <form onSubmit={handleSaveRiverReview} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река *</label>
                  <input
                    type="text"
                    value={editingRiverReview.riverName}
                    onChange={(e) => setEditingRiverReview({ ...editingRiverReview, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Имя автора *</label>
                  <input
                    type="text"
                    value={editingRiverReview.userName}
                    onChange={(e) => setEditingRiverReview({ ...editingRiverReview, userName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Природа (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingRiverReview.ratingScenery}
                    onChange={(e) => setEditingRiverReview({ ...editingRiverReview, ratingScenery: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Пороги (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingRiverReview.ratingRapids}
                    onChange={(e) => setEditingRiverReview({ ...editingRiverReview, ratingRapids: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Стоянки (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingRiverReview.ratingCamps}
                    onChange={(e) => setEditingRiverReview({ ...editingRiverReview, ratingCamps: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Рыбалка (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingRiverReview.ratingFishing}
                    onChange={(e) => setEditingRiverReview({ ...editingRiverReview, ratingFishing: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Текст отзыва *</label>
                <textarea
                  rows={4}
                  value={editingRiverReview.comment}
                  onChange={(e) => setEditingRiverReview({ ...editingRiverReview, comment: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 outline-none focus:border-[#2D5A27] resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Совет на сплав</label>
                <input
                  type="text"
                  value={editingRiverReview.adviceForOthers || ''}
                  onChange={(e) => setEditingRiverReview({ ...editingRiverReview, adviceForOthers: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                <button
                  type="button"
                  onClick={() => setEditingRiverReview(null)}
                  className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] rounded-xl font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold hover:bg-[#3D7136]"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDIT CREW REVIEW (5 STARS)
          ========================================================= */}
      {editingCrewReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="font-black text-sm text-[#1A1F1A]">
                {isNewCrewReview ? 'Создание отзыва об участнике' : 'Редактирование отзыва об участнике'}
              </h3>
              <button onClick={() => setEditingCrewReview(null)} className="text-[#8B7E6D]">✕</button>
            </div>
            <form onSubmit={handleSaveCrewReview} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Имя участника *</label>
                  <input
                    type="text"
                    value={editingCrewReview.targetUserName}
                    onChange={(e) => setEditingCrewReview({ ...editingCrewReview, targetUserName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Название сплава</label>
                  <input
                    type="text"
                    value={editingCrewReview.tripTitle || ''}
                    onChange={(e) => setEditingCrewReview({ ...editingCrewReview, tripTitle: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Автор отзыва</label>
                  <input
                    type="text"
                    value={editingCrewReview.authorUserName}
                    onChange={(e) => setEditingCrewReview({ ...editingCrewReview, authorUserName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Общая оценка (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingCrewReview.ratingOverall}
                    onChange={(e) => setEditingCrewReview({ ...editingCrewReview, ratingOverall: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Текст отзыва *</label>
                <textarea
                  rows={4}
                  value={editingCrewReview.comment}
                  onChange={(e) => setEditingCrewReview({ ...editingCrewReview, comment: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 outline-none focus:border-[#2D5A27] resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                <button
                  type="button"
                  onClick={() => setEditingCrewReview(null)}
                  className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] rounded-xl font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold hover:bg-[#3D7136]"
                >
                  Сохранить
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
