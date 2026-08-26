import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  Star,
  Compass,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Tent,
  Fish,
  Wrench,
  Shield,
  LifeBuoy,
  Flame,
  UserCheck,
  Award,
  Share2,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
  Info,
  Users,
  Anchor,
  ThumbsUp,
  MessageSquare,
  Tag,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
  Radio,
  FileText,
  ShieldCheck,
  Crown,
  Lock,
  User
} from 'lucide-react';
import {
  TravelNote,
  ChecklistItem,
  LogbookTrip,
  RiverReview,
  CrewReview,
  RiverRoute,
  AppUser,
  VesselType,
  TravelNotesConfig
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

interface TravelNotesModuleProps {
  routes: RiverRoute[];
  currentUser: AppUser | null;
  registeredUsers?: AppUser[];
  onOpenAuth?: () => void;
  isAdmin?: boolean;
  notesConfig?: TravelNotesConfig;
  setNotesConfig?: React.Dispatch<React.SetStateAction<TravelNotesConfig>>;
  onOpenAdminNotesManager?: () => void;
}

type TabType = 'notes' | 'checklist' | 'my_trips' | 'river_reviews' | 'crew_reviews';

export const TravelNotesModule: React.FC<TravelNotesModuleProps> = ({
  routes,
  currentUser,
  registeredUsers = [],
  onOpenAuth,
  isAdmin: isAdminProp,
  notesConfig,
  setNotesConfig,
  onOpenAdminNotesManager
}) => {
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = Boolean(isAdminProp || isSuperAdmin || currentUser?.role === 'admin');

  // Active Tab
  const [activeSubTab, setActiveSubTabState] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('splav86_travel_notes_subtab');
      if (saved && ['notes', 'checklist', 'my_trips', 'river_reviews', 'crew_reviews'].includes(saved)) {
        return saved as TabType;
      }
    } catch (e) {}
    return 'notes';
  });

  const setActiveSubTab = (tab: TabType) => {
    setActiveSubTabState(tab);
    try {
      localStorage.setItem('splav86_travel_notes_subtab', tab);
    } catch (e) {}
  };

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

  // --- STATE 1: TRAVEL NOTES ---
  const [notes, setNotes] = useState<TravelNote[]>(() => {
    if (notesConfig?.notes && notesConfig.notes.length > 0) {
      return notesConfig.notes;
    }
    try {
      const stored = localStorage.getItem('splav86_travel_notes_v2');
      return stored ? JSON.parse(stored) : INITIAL_TRAVEL_NOTES;
    } catch {
      return INITIAL_TRAVEL_NOTES;
    }
  });

  useEffect(() => {
    if (notesConfig?.notes) {
      setNotes(notesConfig.notes);
    }
  }, [notesConfig?.notes]);

  const [notesSearch, setNotesSearch] = useState('');
  const [notesCategoryFilter, setNotesCategoryFilter] = useState<string>('ALL');
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TravelNote | null>(null);

  // New Note Form State
  const [noteFormTitle, setNoteFormTitle] = useState('');
  const [noteFormRiver, setNoteFormRiver] = useState('');
  const [noteFormCategory, setNoteFormCategory] = useState<TravelNote['category']>('gear_lessons');
  const [noteFormSeason, setNoteFormSeason] = useState<TravelNote['season']>('summer_warm');
  const [noteFormContent, setNoteFormContent] = useState('');
  const [noteFormTags, setNoteFormTags] = useState('');
  const [noteFormPinned, setNoteFormPinned] = useState(false);

  // --- STATE 2: CHECKLIST ---
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (notesConfig?.checklist && notesConfig.checklist.length > 0) {
      return notesConfig.checklist;
    }
    try {
      const stored = localStorage.getItem('splav86_custom_checklist_v2');
      return stored ? JSON.parse(stored) : INITIAL_CHECKLIST_ITEMS;
    } catch {
      return INITIAL_CHECKLIST_ITEMS;
    }
  });

  useEffect(() => {
    if (notesConfig?.checklist) {
      setChecklist(notesConfig.checklist);
    }
  }, [notesConfig?.checklist]);

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState<ChecklistItem['category']>('camp_bivouac');
  const [newChecklistQty, setNewChecklistQty] = useState('');
  const [checklistFilterCategory, setChecklistFilterCategory] = useState<string>('ALL');
  const [checklistSearch, setChecklistSearch] = useState('');

  // --- STATE 3: MY TRIPS & LOGBOOK ---
  const [myTrips, setMyTrips] = useState<LogbookTrip[]>(() => {
    if (notesConfig?.logbookTrips && notesConfig.logbookTrips.length > 0) {
      return notesConfig.logbookTrips;
    }
    try {
      const stored = localStorage.getItem('splav86_my_trips_log_v2');
      return stored ? JSON.parse(stored) : INITIAL_LOGBOOK_TRIPS;
    } catch {
      return INITIAL_LOGBOOK_TRIPS;
    }
  });

  useEffect(() => {
    if (notesConfig?.logbookTrips) {
      setMyTrips(notesConfig.logbookTrips);
    }
  }, [notesConfig?.logbookTrips]);

  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [tripFormRiver, setTripFormRiver] = useState('р. Собь (Полярный Урал)');
  const [tripFormRegion, setTripFormRegion] = useState<'ХМАО' | 'ЯНАО'>('ЯНАО');
  const [tripFormYear, setTripFormYear] = useState<number>(2026);
  const [tripFormMonth, setTripFormMonth] = useState('Июль');
  const [tripFormDays, setTripFormDays] = useState<number>(5);
  const [tripFormDistance, setTripFormDistance] = useState<number>(100);
  const [tripFormVessel, setTripFormVessel] = useState<VesselType>('catamaran');
  const [tripFormRole, setTripFormRole] = useState<LogbookTrip['role']>('Матрос / Гребец');
  const [tripFormDifficulty, setTripFormDifficulty] = useState('II к.с.');
  const [tripFormRating, setTripFormRating] = useState<number>(5);
  const [tripFormNotes, setTripFormNotes] = useState('');

  // --- STATE 4: RIVER REVIEWS (5 STARS) ---
  const [riverReviews, setRiverReviews] = useState<RiverReview[]>(() => {
    if (notesConfig?.riverReviews && notesConfig.riverReviews.length > 0) {
      return notesConfig.riverReviews;
    }
    try {
      const stored = localStorage.getItem('splav86_river_reviews_v2');
      return stored ? JSON.parse(stored) : INITIAL_RIVER_REVIEWS;
    } catch {
      return INITIAL_RIVER_REVIEWS;
    }
  });

  useEffect(() => {
    if (notesConfig?.riverReviews) {
      setRiverReviews(notesConfig.riverReviews);
    }
  }, [notesConfig?.riverReviews]);

  const [isRiverReviewModalOpen, setIsRiverReviewModalOpen] = useState(false);
  const [selectedRiverForReview, setSelectedRiverForReview] = useState<string>('р. Собь');
  const [riverReviewScenery, setRiverReviewScenery] = useState(5);
  const [riverReviewRapids, setRiverReviewRapids] = useState(4);
  const [riverReviewCamps, setRiverReviewCamps] = useState(5);
  const [riverReviewFishing, setRiverReviewFishing] = useState(5);
  const [riverReviewVessel, setRiverReviewVessel] = useState<VesselType>('catamaran');
  const [riverReviewComment, setRiverReviewComment] = useState('');
  const [riverReviewAdvice, setRiverReviewAdvice] = useState('');

  // --- STATE 5: CREW REVIEWS (5 STARS) ---
  const [crewReviews, setCrewReviews] = useState<CrewReview[]>(() => {
    if (notesConfig?.crewReviews && notesConfig.crewReviews.length > 0) {
      return notesConfig.crewReviews;
    }
    try {
      const stored = localStorage.getItem('splav86_crew_reviews_v2');
      return stored ? JSON.parse(stored) : INITIAL_CREW_REVIEWS;
    } catch {
      return INITIAL_CREW_REVIEWS;
    }
  });

  // Keep in sync when notesConfig changes from parent/Firebase
  useEffect(() => {
    if (notesConfig?.crewReviews && notesConfig.crewReviews.length > 0) {
      setCrewReviews(notesConfig.crewReviews);
    }
  }, [notesConfig?.crewReviews]);

  const [isCrewReviewModalOpen, setIsCrewReviewModalOpen] = useState(false);
  const [crewTargetUserId, setCrewTargetUserId] = useState<string>('');
  const [crewTripTitle, setCrewTripTitle] = useState('Совместный поход');
  const [crewRatingPaddling, setCrewRatingPaddling] = useState(5);
  const [crewRatingCampSkills, setCrewRatingCampSkills] = useState(5);
  const [crewRatingTeamwork, setCrewRatingTeamwork] = useState(5);
  const [crewRatingPunctuality, setCrewRatingPunctuality] = useState(5);
  const [crewSelectedTags, setCrewSelectedTags] = useState<string[]>([
    '🔥 Мастер костра',
    '💪 Мощный гребец'
  ]);
  const [crewReviewComment, setCrewReviewComment] = useState('');

  // Global Sync Helper to broadcast any change to parent, localStorage, Firestore Realtime and CloudSQL
  const syncUpdatedConfig = (partial: Partial<TravelNotesConfig>) => {
    const currentCfg: TravelNotesConfig = notesConfig || {
      id: 'notes_main_config',
      notes,
      checklist,
      logbookTrips: myTrips,
      riverReviews,
      crewReviews,
      updatedAt: new Date().toISOString()
    };
    const newConfig: TravelNotesConfig = {
      ...currentCfg,
      ...partial,
      updatedAt: new Date().toISOString()
    };

    if (setNotesConfig) {
      setNotesConfig(newConfig);
    }

    try {
      localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
      if (newConfig.notes) localStorage.setItem('splav86_travel_notes_v2', JSON.stringify(newConfig.notes));
      if (newConfig.checklist) localStorage.setItem('splav86_custom_checklist_v2', JSON.stringify(newConfig.checklist));
      if (newConfig.logbookTrips) localStorage.setItem('splav86_my_trips_log_v2', JSON.stringify(newConfig.logbookTrips));
      if (newConfig.riverReviews) localStorage.setItem('splav86_river_reviews_v2', JSON.stringify(newConfig.riverReviews));
      if (newConfig.crewReviews) localStorage.setItem('splav86_crew_reviews_v2', JSON.stringify(newConfig.crewReviews));
    } catch (e) {
      console.warn(e);
    }

    // Save to Firestore Real-Time Cloud DB
    TravelNotesSyncService.saveNotesConfig(newConfig).catch((err) => {
      console.warn('Failed to sync travel notes config to Firestore:', err);
    });

    // Also sync to CloudSQL
    CloudSqlDbService.saveTravelNotes(newConfig).catch((err) => {
      console.warn('Failed to sync travel notes config to CloudSQL:', err);
    });
  };

  // Save to LocalStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem('splav86_travel_notes_v2', JSON.stringify(notes));
    } catch (e) {
      console.error(e);
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_custom_checklist_v2', JSON.stringify(checklist));
    } catch (e) {
      console.error(e);
    }
  }, [checklist]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_my_trips_log_v2', JSON.stringify(myTrips));
    } catch (e) {
      console.error(e);
    }
  }, [myTrips]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_river_reviews_v2', JSON.stringify(riverReviews));
    } catch (e) {
      console.error(e);
    }
  }, [riverReviews]);

  useEffect(() => {
    try {
      localStorage.setItem('splav86_crew_reviews_v2', JSON.stringify(crewReviews));
    } catch (e) {
      console.error(e);
    }
  }, [crewReviews]);

  // CATEGORY HELPERS
  const getVesselLabel = (vessel: VesselType | string) => {
    switch (vessel) {
      case 'catamaran': return 'Катамаран';
      case 'kayak': return 'Байдарка / Каяк';
      case 'packraft': return 'Паккрафт';
      case 'raft': return 'Рафт';
      case 'sup': return 'SUP-борд';
      case 'motorboat': return 'Моторная лодка / ПВХ';
      default: return vessel;
    }
  };

  const NOTE_CATEGORY_INFO: Record<
    TravelNote['category'],
    { label: string; icon: any; color: string; bg: string }
  > = {
    future_idea: {
      label: 'План / Идея',
      icon: Lightbulb,
      color: 'text-amber-700',
      bg: 'bg-amber-100/70 border-amber-300'
    },
    gear_lessons: {
      label: 'Снаряжение и уроки',
      icon: AlertTriangle,
      color: 'text-rose-700',
      bg: 'bg-rose-100/70 border-rose-300'
    },
    secret_camp: {
      label: 'Стоянка и координаты',
      icon: Tent,
      color: 'text-emerald-700',
      bg: 'bg-emerald-100/70 border-emerald-300'
    },
    fishing_spots: {
      label: 'Рыбалка и приманки',
      icon: Fish,
      color: 'text-sky-700',
      bg: 'bg-sky-100/70 border-sky-300'
    },
    safety_warning: {
      label: 'Безопасность и связь',
      icon: Shield,
      color: 'text-indigo-700',
      bg: 'bg-indigo-100/70 border-indigo-300'
    },
    trip_impressions: {
      label: 'Путевой очерк',
      icon: FileText,
      color: 'text-purple-700',
      bg: 'bg-purple-100/70 border-purple-300'
    }
  };

  const CHECKLIST_CATEGORIES: {
    id: ChecklistItem['category'];
    name: string;
    icon: any;
    color: string;
  }[] = [
    { id: 'life_safety', name: 'Безопасность на воде', icon: LifeBuoy, color: 'text-rose-600' },
    { id: 'camp_bivouac', name: 'Бивак и лагерь', icon: Tent, color: 'text-emerald-700' },
    { id: 'kitchen_fire', name: 'Костёр и кухня', icon: Flame, color: 'text-amber-600' },
    { id: 'repair_vessel', name: 'Ремкомплект судна', icon: Wrench, color: 'text-blue-600' },
    { id: 'firstaid_hygiene', name: 'Аптечка и гигиена', icon: Shield, color: 'text-red-600' },
    { id: 'wildlife_bear', name: 'Связь и защита от зверей', icon: Radio, color: 'text-purple-600' },
    { id: 'hydro_clothes', name: 'Гидроснаряжение и одежда', icon: Sparkles, color: 'text-teal-600' },
    { id: 'custom', name: 'Личные вещи и другое', icon: BookmarkCheck, color: 'text-[#2D5A27]' }
  ];

  // Helper to ensure user is authenticated before performing actions
  const requireAuth = (callback: () => void) => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth();
      } else {
        alert('Для добавления записей, заметок, походов и отзывов необходимо войти в аккаунт.');
      }
      return false;
    }
    callback();
    return true;
  };

  // --- ACTIONS: NOTES ---
  const handleOpenNewNoteModal = (noteToEdit?: TravelNote) => {
    requireAuth(() => {
      if (noteToEdit) {
        setEditingNote(noteToEdit);
        setNoteFormTitle(noteToEdit.title);
        setNoteFormRiver(noteToEdit.riverName || '');
        setNoteFormCategory(noteToEdit.category);
        setNoteFormSeason(noteToEdit.season || 'summer_warm');
        setNoteFormContent(noteToEdit.content);
        setNoteFormTags((noteToEdit.tags || []).join(', '));
        setNoteFormPinned(!!noteToEdit.isPinned);
      } else {
        setEditingNote(null);
        setNoteFormTitle('');
        setNoteFormRiver(routes[0]?.name || 'р. Собь');
        setNoteFormCategory('gear_lessons');
        setNoteFormSeason('summer_warm');
        setNoteFormContent('');
        setNoteFormTags('');
        setNoteFormPinned(false);
      }
      setIsNewNoteModalOpen(true);
    });
  };

  const handleSaveNote = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!noteFormTitle.trim() || !noteFormContent.trim()) {
      alert('Пожалуйста, заполните заголовок и текст путевой заметки.');
      return;
    }

    const tagsArray = noteFormTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNote) {
      const updatedNotes = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: noteFormTitle.trim(),
              riverName: noteFormRiver.trim() || undefined,
              category: noteFormCategory,
              season: noteFormSeason,
              content: noteFormContent.trim(),
              tags: tagsArray,
              isPinned: noteFormPinned,
              updatedAt: new Date().toISOString().split('T')[0]
            }
          : n
      );
      setNotes(updatedNotes);
      syncUpdatedConfig({ notes: updatedNotes });
    } else {
      const newNote: TravelNote = {
        id: `note-${Date.now()}`,
        userId: currentUser?.id || 'guest',
        authorName: currentUser?.name || 'Турист-исследователь',
        title: noteFormTitle.trim(),
        riverName: noteFormRiver.trim() || undefined,
        category: noteFormCategory,
        season: noteFormSeason,
        content: noteFormContent.trim(),
        tags: tagsArray,
        isPinned: noteFormPinned,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      syncUpdatedConfig({ notes: updatedNotes });
    }

    setIsNewNoteModalOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = (id: string) => {
    askConfirmation({
      title: 'Удалить заметку?',
      message: 'Вы уверены, что хотите удалить эту путевую заметку?',
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: () => {
        const updatedNotes = notes.filter((n) => n.id !== id);
        setNotes(updatedNotes);
        syncUpdatedConfig({ notes: updatedNotes });
      }
    });
  };

  const handleTogglePinNote = (id: string) => {
    const updatedNotes = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    setNotes(updatedNotes);
    syncUpdatedConfig({ notes: updatedNotes });
  };

  // --- ACTIONS: CHECKLIST ---
  const handleToggleCheckItem = (id: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    );
    setChecklist(updatedChecklist);
    syncUpdatedConfig({ checklist: updatedChecklist });
  };

  const handleAddCustomCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    requireAuth(() => {
      const newItem: ChecklistItem = {
        id: `custom-check-${Date.now()}`,
        text: newChecklistText.trim(),
        category: newChecklistCategory,
        isChecked: false,
        isCustom: true,
        quantity: newChecklistQty.trim() || undefined
      };

      const updatedChecklist = [...checklist, newItem];
      setChecklist(updatedChecklist);
      syncUpdatedConfig({ checklist: updatedChecklist });
      setNewChecklistText('');
      setNewChecklistQty('');
    });
  };

  const handleDeleteCheckItem = (id: string) => {
    const updatedChecklist = checklist.filter((item) => item.id !== id);
    setChecklist(updatedChecklist);
    syncUpdatedConfig({ checklist: updatedChecklist });
  };

  const handleCheckAll = (checked: boolean) => {
    const updatedChecklist = checklist.map((item) => ({ ...item, isChecked: checked }));
    setChecklist(updatedChecklist);
    syncUpdatedConfig({ checklist: updatedChecklist });
  };

  const handleResetChecklistToDefaults = () => {
    askConfirmation({
      title: 'Сбросить чек-лист?',
      message: 'Сбросить чек-лист снаряжения к стандартному экспедиционному списку?',
      confirmText: 'Сбросить',
      confirmVariant: 'danger',
      onConfirm: () => {
        setChecklist(INITIAL_CHECKLIST_ITEMS);
        syncUpdatedConfig({ checklist: INITIAL_CHECKLIST_ITEMS });
      }
    });
  };

  // Checklist Stats
  const checklistCheckedCount = checklist.filter((i) => i.isChecked).length;
  const checklistTotalCount = checklist.length;
  const checklistPercent = checklistTotalCount > 0
    ? Math.round((checklistCheckedCount / checklistTotalCount) * 100)
    : 0;

  // --- ACTIONS: MY TRIPS ---
  const handleOpenNewTripModal = () => {
    requireAuth(() => {
      setIsNewTripModalOpen(true);
    });
  };

  const handleAddLogbookTrip = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!tripFormRiver.trim()) {
      alert('Укажите название пройденной реки.');
      return;
    }

    const newTrip: LogbookTrip = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      riverName: tripFormRiver.trim(),
      region: tripFormRegion,
      year: tripFormYear,
      month: tripFormMonth,
      durationDays: Number(tripFormDays) || 1,
      distanceKm: Number(tripFormDistance) || 0,
      vessel: tripFormVessel,
      role: tripFormRole,
      status: 'completed',
      personalNotes: tripFormNotes.trim(),
      difficultyRating: tripFormDifficulty,
      riverRating: tripFormRating,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedTrips = [newTrip, ...myTrips];
    setMyTrips(updatedTrips);
    syncUpdatedConfig({ logbookTrips: updatedTrips });
    setIsNewTripModalOpen(false);
    setTripFormNotes('');
  };

  const handleDeleteLogbookTrip = (id: string) => {
    askConfirmation({
      title: 'Удалить поход из журнала?',
      message: 'Удалить эту запись о походе из вашего бортового журнала?',
      confirmText: 'Удалить',
      confirmVariant: 'danger',
      onConfirm: () => {
        const updatedTrips = myTrips.filter((t) => t.id !== id);
        setMyTrips(updatedTrips);
        syncUpdatedConfig({ logbookTrips: updatedTrips });
      }
    });
  };

  // User-scoped trips calculation (Strict personal data isolation)
  const userTrips = useMemo(() => {
    if (!currentUser) return [];
    return myTrips.filter((t) => t.userId === currentUser.id);
  }, [myTrips, currentUser]);

  const userKmTravelled = useMemo(() => {
    return userTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
  }, [userTrips]);

  const userDaysOnWater = useMemo(() => {
    return userTrips.reduce((sum, t) => sum + (t.durationDays || 0), 0);
  }, [userTrips]);

  // Overall database totals (for admin purposes if needed)
  const totalKmTravelled = userKmTravelled;
  const totalDaysOnWater = userDaysOnWater;

  // --- ACTIONS: RIVER REVIEWS ---
  const handleOpenRiverReviewModal = () => {
    requireAuth(() => {
      setIsRiverReviewModalOpen(true);
    });
  };

  const handleSaveRiverReview = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!riverReviewComment.trim()) {
      alert('Пожалуйста, напишите ваши впечатления и отзыв о реке.');
      return;
    }

    const overall = Math.round(
      (riverReviewScenery + riverReviewRapids + riverReviewCamps + riverReviewFishing) / 4
    );

    const newReview: RiverReview = {
      id: `rev-r-${Date.now()}`,
      riverName: selectedRiverForReview,
      userId: currentUser.id,
      userName: currentUser.name || 'Турист-исследователь',
      userAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      date: new Date().toISOString().split('T')[0],
      ratingOverall: overall,
      ratingScenery: riverReviewScenery,
      ratingRapids: riverReviewRapids,
      ratingCamps: riverReviewCamps,
      ratingFishing: riverReviewFishing,
      vesselUsed: riverReviewVessel,
      comment: riverReviewComment.trim(),
      adviceForOthers: riverReviewAdvice.trim() || undefined
    };

    const updatedReviews = [newReview, ...riverReviews];
    setRiverReviews(updatedReviews);
    syncUpdatedConfig({ riverReviews: updatedReviews });
    setIsRiverReviewModalOpen(false);
    setRiverReviewComment('');
    setRiverReviewAdvice('');
  };

  // --- ACTIONS: CREW REVIEWS ---
  const handleOpenCrewReviewModal = () => {
    requireAuth(() => {
      if (registeredUsers.length > 0) {
        setCrewTargetUserId(registeredUsers[0].id);
      }
      setIsCrewReviewModalOpen(true);
    });
  };

  const handleSaveCrewReview = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!crewTargetUserId) {
      alert('Выберите участника похода для оценки.');
      return;
    }
    if (!crewReviewComment.trim()) {
      alert('Пожалуйста, напишите отзыв о совместном сплаве.');
      return;
    }

    const targetUser = registeredUsers.find((u) => u.id === crewTargetUserId);
    const overall = Math.round(
      (crewRatingPaddling +
        crewRatingCampSkills +
        crewRatingTeamwork +
        crewRatingPunctuality) /
        4
    );

    const newReview: CrewReview = {
      id: `rev-c-${Date.now()}`,
      tripTitle: crewTripTitle.trim(),
      targetUserId: crewTargetUserId,
      targetUserName: targetUser ? targetUser.name : 'Участник экипажа',
      targetUserAvatar: targetUser?.avatar,
      authorUserId: currentUser.id,
      authorUserName: currentUser.name || 'Товарищ по веслу',
      authorAvatar: currentUser.avatar,
      date: new Date().toISOString().split('T')[0],
      ratingOverall: overall,
      ratingPaddling: crewRatingPaddling,
      ratingCampSkills: crewRatingCampSkills,
      ratingTeamwork: crewRatingTeamwork,
      ratingPunctuality: crewRatingPunctuality,
      tags: crewSelectedTags,
      comment: crewReviewComment.trim()
    };

    const updated = [newReview, ...crewReviews];
    setCrewReviews(updated);
    syncUpdatedConfig({ crewReviews: updated });

    setIsCrewReviewModalOpen(false);
    setCrewReviewComment('');
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        if (notesCategoryFilter !== 'ALL' && note.category !== notesCategoryFilter) {
          return false;
        }
        if (!notesSearch.trim()) return true;
        const q = notesSearch.toLowerCase();
        return (
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          (note.riverName && note.riverName.toLowerCase().includes(q)) ||
          (note.tags && note.tags.some((t) => t.toLowerCase().includes(q)))
        );
      })
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [notes, notesCategoryFilter, notesSearch]);

  // Star Rating Component
  const renderStarRating = (
    value: number,
    onChange?: (val: number) => void,
    size: string = 'w-4 h-4'
  ) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!onChange}
            onClick={() => onChange && onChange(star)}
            className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`${size} ${
                star <= value
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-[#DDD7CE] fill-transparent'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  // Export Notes or Checklist to Print/Text
  const handlePrintChecklist = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-hidden">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1E3B1A] via-[#2D5A27] to-[#152B13] rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-2 sm:space-y-2.5">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">
            <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-300" />
            <span>Бортовой дневник & Заметки</span>
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Путевые заметки & Бортовой журнал
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Персональное пространство водного туриста: фиксируйте ценные уроки и стоянки, сверяйте снаряжение по чек-листу, ведите историю походов по рекам Севера и оценивайте маршруты и экипаж.
          </p>

          {/* Quick Metrics Bar (Personalized for logged-in user) */}
          <div className="pt-2 sm:pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs text-white/90 font-medium">
            <div className="flex items-center gap-2 bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <Compass className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                Пройдено рек: <strong className="text-white font-bold">{currentUser ? userTrips.length : 0}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                Всего по воде: <strong className="text-white font-bold">{currentUser ? userKmTravelled : 0} км</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <CheckSquare className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                Сборы снаряжения: <strong className="text-white font-bold">{currentUser ? checklistPercent : 0}%</strong>
              </span>
            </div>
          </div>

          {/* User Profile Info or Guest Login Prompt */}
          {!currentUser ? (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-black/35 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-amber-400/30 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Личный бортовой журнал и пройденный километраж рассчитываются индивидуально для каждого туриста.</span>
              </div>
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="self-start sm:self-auto px-3.5 py-1 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Войти в профиль</span>
                </button>
              )}
            </div>
          ) : (
            <div className="pt-1.5 flex items-center gap-2 text-xs text-emerald-200">
              <User className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Личный журнал туриста: <strong className="text-white font-bold">{currentUser.name}</strong> ({currentUser.experienceLevel || 'Водный турист'})</span>
            </div>
          )}
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-64 sm:w-96 opacity-10 pointer-events-none flex items-center justify-center">
          <Anchor className="w-48 h-48 sm:w-80 sm:h-80 text-white" />
        </div>
      </div>

      {/* TOP NAVIGATION TABS (Vertical list on mobile, responsive row on desktop) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'notes', label: 'Заметки и уроки', icon: Edit3, count: notes.length },
            { id: 'checklist', label: 'Чек-лист сборов', icon: CheckSquare, badge: currentUser ? `${checklistPercent}%` : 'Личный' },
            { id: 'my_trips', label: 'Мои пройденные реки', icon: Compass, count: currentUser ? userTrips.length : 0 },
            { id: 'river_reviews', label: 'Рейтинг рек 5★', icon: Star, count: riverReviews.length },
            { id: 'crew_reviews', label: 'Рейтинг экипажа 5★', icon: Award, count: crewReviews.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as TabType)}
                className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto cursor-pointer ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-white text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F4F1EA] border border-[#E5E0D8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#F4F1EA] text-[#2D5A27]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ADMIN MODE INDICATOR & OPEN FULL ADMIN CONTROL BUTTON */}
        {isAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Режим администратора активен</span>
            </div>
            {onOpenAdminNotesManager && (
              <button
                onClick={onOpenAdminNotesManager}
                className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Открыть панель полного контроля над Заметками в Личном кабинете"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Панель контроля</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          TAB 1: TRAVEL NOTES & LESSONS LEARNED
          ========================================================= */}
      {activeSubTab === 'notes' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#E5E0D8] shadow-xs">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по заметкам, рекам, стоянкам..."
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
              />
            </div>

            {/* Category Filter & New Note Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <select
                value={notesCategoryFilter}
                onChange={(e) => setNotesCategoryFilter(e.target.value)}
                className="w-full sm:w-auto py-2 sm:py-2.5 px-3 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
              >
                <option value="ALL">Все категории заметок</option>
                <option value="gear_lessons">⚠️ Снаряжение и ошибки</option>
                <option value="secret_camp">⛺ Стоянки и родники</option>
                <option value="future_idea">💡 Планы на будущее</option>
                <option value="fishing_spots">🎣 Рыбалка и приманки</option>
                <option value="safety_warning">🛡️ Безопасность и связь</option>
                <option value="trip_impressions">📝 Путевой очерк</option>
              </select>

              <button
                onClick={() => handleOpenNewNoteModal()}
                className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Новая заметка</span>
              </button>
            </div>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-[#DDD7CE] space-y-3">
              <BookOpen className="w-12 h-12 text-[#8B7E6D] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#1A1F1A]">Заметок пока нет</h3>
              <p className="text-xs text-[#8B7E6D] max-w-md mx-auto">
                Запишите полезные наблюдения, координаты хороших стоянок или советы себе на будущие сплавы по рекам Югры и Ямала.
              </p>
              <button
                onClick={() => handleOpenNewNoteModal()}
                className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#3D7136] transition-colors"
              >
                Создать первую запись
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredNotes.map((note) => {
                const catInfo = NOTE_CATEGORY_INFO[note.category] || NOTE_CATEGORY_INFO.gear_lessons;
                const CatIcon = catInfo.icon;
                return (
                  <div
                    key={note.id}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between p-5 relative ${
                      note.isPinned
                        ? 'border-[#2D5A27] ring-2 ring-[#2D5A27]/20 shadow-xs'
                        : 'border-[#E5E0D8]'
                    }`}
                  >
                    {/* Note Top Bar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catInfo.bg} ${catInfo.color}`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{catInfo.label}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePinNote(note.id)}
                            title={note.isPinned ? 'Открепить' : 'Закрепить вверху'}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              note.isPinned
                                ? 'bg-amber-100 text-amber-700 font-bold'
                                : 'text-[#8B7E6D] hover:bg-[#F4F1EA]'
                            }`}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => handleOpenNewNoteModal(note)}
                            className="p-1.5 text-[#8B7E6D] hover:text-[#2D5A27] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* River & Date */}
                      {note.riverName && (
                        <div className="flex items-center gap-1.5 text-xs text-[#2D5A27] font-bold">
                          <MapPin className="w-3.5 h-3.5 text-[#2D5A27]" />
                          <span>{note.riverName}</span>
                        </div>
                      )}

                      {/* Note Title */}
                      <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A] leading-snug">
                        {note.title}
                      </h3>

                      {/* Note Text */}
                      <p className="text-xs text-[#4A443E] leading-relaxed whitespace-pre-line line-clamp-6">
                        {note.content}
                      </p>
                    </div>

                    {/* Footer / Tags */}
                    <div className="pt-4 mt-4 border-t border-[#F4F1EA] flex items-center justify-between text-[11px] text-[#8B7E6D]">
                      <div className="flex flex-wrap gap-1">
                        {(note.tags || []).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-[#F4F1EA] text-[#6B665F] px-2 py-0.5 rounded-md font-medium text-[10px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="shrink-0">{note.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: INTERACTIVE CHECKLIST
          ========================================================= */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Progress Summary Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5E0D8] p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D5A27] shrink-0" />
                  <span>Чек-лист экспедиционного снаряжения</span>
                </h3>
                <p className="text-xs text-[#6B665F] mt-0.5">
                  Собрано <strong>{checklistCheckedCount}</strong> из <strong>{checklistTotalCount}</strong> ({checklistPercent}%)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                <button
                  onClick={() => handleCheckAll(true)}
                  className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EAE7E2] text-xs font-bold text-[#1A1F1A] rounded-xl transition-colors text-center"
                >
                  Отметить все
                </button>
                <button
                  onClick={() => handleCheckAll(false)}
                  className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EAE7E2] text-xs font-bold text-[#1A1F1A] rounded-xl transition-colors text-center"
                >
                  Сбросить
                </button>
                <button
                  onClick={handlePrintChecklist}
                  className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D6E6D4] text-xs font-bold text-[#2D5A27] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Печать</span>
                </button>
                <button
                  onClick={handleResetChecklistToDefaults}
                  className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EAE7E2] text-xs font-bold text-[#8B7E6D] hover:text-[#2D5A27] rounded-xl flex items-center justify-center gap-1 transition-colors"
                  title="Восстановить заводской список"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="sm:hidden">Сброс</span>
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-[#F4F1EA] h-2.5 sm:h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#2D5A27] to-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>

          {/* Add Custom Item Form */}
          <form
            onSubmit={handleAddCustomCheckItem}
            className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E0D8] flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-xs"
          >
            <input
              type="text"
              placeholder="Добавить свой предмет в снаряжение..."
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              className="w-full md:flex-1 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2 sm:py-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white"
            />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={newChecklistCategory}
                onChange={(e) => setNewChecklistCategory(e.target.value as ChecklistItem['category'])}
                className="flex-1 md:w-auto py-2 sm:py-2.5 px-3 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
              >
                {CHECKLIST_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Кол-во"
                value={newChecklistQty}
                onChange={(e) => setNewChecklistQty(e.target.value)}
                className="w-20 sm:w-24 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 sm:py-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={!newChecklistText.trim()}
              className="w-full md:w-auto px-4 py-2 sm:py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </form>

          {/* Checklist Categories & Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {CHECKLIST_CATEGORIES.map((cat) => {
              const itemsInCat = checklist.filter((item) => item.category === cat.id);
              if (itemsInCat.length === 0) return null;

              const CatIcon = cat.icon;
              const catChecked = itemsInCat.filter((i) => i.isChecked).length;
              const isAllCatChecked = catChecked === itemsInCat.length;

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-[#E5E0D8] p-5 shadow-xs space-y-3"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#F4F1EA]">
                    <div className="flex items-center gap-2">
                      <CatIcon className={`w-4 h-4 ${cat.color}`} />
                      <h4 className="text-xs sm:text-sm font-black text-[#1A1F1A]">
                        {cat.name}
                      </h4>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        isAllCatChecked
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#F4F1EA] text-[#6B665F]'
                      }`}
                    >
                      {catChecked}/{itemsInCat.length}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    {itemsInCat.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheckItem(item.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          item.isChecked
                            ? 'bg-[#F2F7F1] border-[#D6E6D4] text-[#2D5A27]'
                            : 'bg-[#F9F7F4] hover:bg-[#F4F1EA] border-transparent text-[#2D332D]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          <button
                            type="button"
                            className="shrink-0 focus:outline-none"
                          >
                            {item.isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-[#2D5A27]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#8B7E6D]" />
                            )}
                          </button>
                          <span
                            className={`text-xs font-medium leading-tight ${
                              item.isChecked ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.quantity && (
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#E5E0D8] text-[#6B665F] font-bold">
                              {item.quantity}
                            </span>
                          )}
                          {(item.isCustom || isAdmin) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCheckItem(item.id);
                              }}
                              className="text-[#8B7E6D] hover:text-rose-600 p-1 transition-colors"
                              title="Удалить предмет"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: MY COMPLETED TRIPS & LOGBOOK
          ========================================================= */}
      {activeSubTab === 'my_trips' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Summary Banner */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-sm sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D5A27] shrink-0" />
                <span>Бортовой журнал пройденных рек</span>
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Личный реестр водных экспедиций: добавляйте пройденные маршруты и сохраняйте историю походов.
              </p>
            </div>

            <button
              onClick={handleOpenNewTripModal}
              className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Записать поход</span>
            </button>
          </div>

          {/* Trips List (Strictly personal to logged-in user) */}
          {!currentUser ? (
            <div className="py-12 sm:py-16 text-center bg-white rounded-2xl sm:rounded-3xl border border-[#E5E0D8] p-6 space-y-4 shadow-sm max-w-xl mx-auto">
              <div className="w-16 h-16 bg-[#E8F1E7] rounded-2xl flex items-center justify-center mx-auto text-[#2D5A27] shadow-inner">
                <Compass className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-black text-[#1A1F1A]">Личный бортовой журнал туриста</h3>
                <p className="text-xs sm:text-sm text-[#6B665F] leading-relaxed">
                  Здесь отображаются только ваши персональные пройденные маршруты, даты, судно, роль в экипаже и километраж.
                  Войдите в свой профиль, чтобы вести личную историю рек и экспедиций.
                </p>
              </div>
              {onOpenAuth && (
                <div className="pt-2">
                  <button
                    onClick={onOpenAuth}
                    className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Войти в профиль</span>
                  </button>
                </div>
              )}
            </div>
          ) : userTrips.length === 0 ? (
            <div className="py-12 sm:py-16 text-center bg-white rounded-2xl sm:rounded-3xl border border-dashed border-[#DDD7CE] p-6 space-y-3">
              <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-[#8B7E6D] mx-auto opacity-50" />
              <h3 className="text-sm sm:text-base font-bold text-[#1A1F1A]">В вашем личном журнале пока нет походов</h3>
              <p className="text-xs text-[#8B7E6D] max-w-md mx-auto">
                {currentUser.name}, добавьте свой первый пройденный сплав по рекам Севера, чтобы рассчитать персональный километраж и сохранить впечатления!
              </p>
              <button
                onClick={handleOpenNewTripModal}
                className="px-5 py-2.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#3D7136] transition-colors inline-flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Записать первый поход</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {userTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl border border-[#E5E0D8] p-4 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-3 sm:space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded bg-[#E8F1E7] text-[#2D5A27]">
                          {trip.region}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-[#F4F1EA] text-[#6B665F]">
                          {trip.difficultyRating}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-[#8B7E6D]">
                          {trip.month} {trip.year} г.
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-lg font-black text-[#1A1F1A]">
                        {trip.riverName}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                      {trip.riverRating && (
                        <div className="flex items-center gap-1 bg-[#F9F7F4] px-2.5 py-1 rounded-xl border border-[#E5E0D8]">
                          {renderStarRating(trip.riverRating)}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteLogbookTrip(trip.id)}
                        className="p-1.5 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Удалить поход"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Trip Stats Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-[#F9F7F4] p-2 sm:p-2.5 rounded-xl border border-[#E5E0D8]/60">
                      <span className="text-[10px] text-[#8B7E6D] block">Протяженность</span>
                      <strong className="text-[#1A1F1A] font-bold text-xs sm:text-sm">{trip.distanceKm} км</strong>
                    </div>
                    <div className="bg-[#F9F7F4] p-2 sm:p-2.5 rounded-xl border border-[#E5E0D8]/60">
                      <span className="text-[10px] text-[#8B7E6D] block">Длительность</span>
                      <strong className="text-[#1A1F1A] font-bold text-xs sm:text-sm">{trip.durationDays} дн.</strong>
                    </div>
                    <div className="bg-[#F9F7F4] p-2 sm:p-2.5 rounded-xl border border-[#E5E0D8]/60">
                      <span className="text-[10px] text-[#8B7E6D] block">Судно</span>
                      <strong className="text-[#1A1F1A] font-bold text-xs sm:text-sm truncate block">{getVesselLabel(trip.vessel)}</strong>
                    </div>
                    <div className="bg-[#F9F7F4] p-2 sm:p-2.5 rounded-xl border border-[#E5E0D8]/60">
                      <span className="text-[10px] text-[#8B7E6D] block">Роль</span>
                      <strong className="text-[#2D5A27] font-bold text-xs sm:text-sm truncate block">{trip.role}</strong>
                    </div>
                  </div>

                  {/* Personal Review / Notes */}
                  {trip.personalNotes && (
                    <div className="bg-[#F4F1EA]/60 p-3 sm:p-3.5 rounded-xl border border-[#E5E0D8] text-xs text-[#2D332D] space-y-1">
                      <span className="text-[10px] font-bold text-[#8B7E6D] uppercase tracking-wider block">
                        Личные впечатления и заметка:
                      </span>
                      <p className="leading-relaxed whitespace-pre-line text-xs">{trip.personalNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: RIVER REVIEWS (5 STARS)
          ========================================================= */}
      {activeSubTab === 'river_reviews' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Action Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-sm sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500 shrink-0" />
                <span>5-звёздочный рейтинг рек</span>
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Оценки и отзывы реальных участников сплавов по красоте, порогам, стоянкам и рыбалке.
              </p>
            </div>

            <button
              onClick={handleOpenRiverReviewModal}
              className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Оценить реку</span>
            </button>
          </div>

          {/* River Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {riverReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-[#E5E0D8] p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                        alt={rev.userName}
                        className="w-8 h-8 rounded-full object-cover border border-[#CDE0CC] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1A1F1A] truncate">{rev.userName}</div>
                        <div className="text-[10px] text-[#8B7E6D]">{rev.date} • {rev.vesselUsed}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 sm:px-2.5 py-1 rounded-xl shrink-0">
                        {renderStarRating(rev.ratingOverall)}
                      </div>
                      {(isAdmin || (currentUser && currentUser.id === rev.userId)) && (
                        <button
                          type="button"
                          onClick={() => {
                            askConfirmation({
                              title: 'Удалить отзыв?',
                              message: `Удалить отзыв о реке ${rev.riverName}?`,
                              confirmText: 'Да, удалить',
                              confirmVariant: 'danger',
                              onConfirm: () => {
                                const updated = riverReviews.filter((r) => r.id !== rev.id);
                                setRiverReviews(updated);
                                syncUpdatedConfig({ riverReviews: updated });
                              }
                            });
                          }}
                          className="p-1.5 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Удалить отзыв (Права администратора / автора)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm font-black text-[#2D5A27] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#2D5A27] shrink-0" />
                    <span>{rev.riverName}</span>
                  </div>

                  {/* Detailed Criterion Ratings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] bg-[#F9F7F4] p-2.5 sm:p-3 rounded-xl border border-[#E5E0D8]/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">🌲 Природа:</span>
                      {renderStarRating(rev.ratingScenery, undefined, 'w-3 h-3')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">⚡ Пороги:</span>
                      {renderStarRating(rev.ratingRapids, undefined, 'w-3 h-3')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">⛺ Стоянки:</span>
                      {renderStarRating(rev.ratingCamps, undefined, 'w-3 h-3')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">🎣 Рыбалка:</span>
                      {renderStarRating(rev.ratingFishing, undefined, 'w-3 h-3')}
                    </div>
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-[#2D332D] leading-relaxed">
                    {rev.comment}
                  </p>
                </div>

                {rev.adviceForOthers && (
                  <div className="pt-2.5 border-t border-[#F4F1EA] text-[11px] text-[#2D5A27] bg-[#E8F1E7]/50 p-2.5 rounded-xl">
                    <strong>Совет на сплав:</strong> {rev.adviceForOthers}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: CREW REVIEWS (5 STARS)
          ========================================================= */}
      {activeSubTab === 'crew_reviews' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Action Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-sm sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span>Взаимная оценка экипажа</span>
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Оценивайте надежность, слаженность гребли и командный дух товарищей по походу.
              </p>
            </div>

            <button
              onClick={handleOpenCrewReviewModal}
              className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Оценить участника</span>
            </button>
          </div>

          {/* Crew Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {crewReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-[#E5E0D8] p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={rev.targetUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                        alt={rev.targetUserName}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#2D5A27] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#1A1F1A] truncate">{rev.targetUserName}</div>
                        <div className="text-[10px] text-[#8B7E6D] truncate">
                          Поход: <span className="font-semibold text-[#2D5A27]">{rev.tripTitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="bg-amber-50 border border-amber-200 px-2 sm:px-2.5 py-1 rounded-xl shrink-0">
                        {renderStarRating(rev.ratingOverall)}
                      </div>
                      {Boolean(
                        currentUser && (
                          isAdmin ||
                          currentUser.id === rev.authorUserId ||
                          (currentUser.name && rev.authorUserName && currentUser.name.toLowerCase() === rev.authorUserName.toLowerCase()) ||
                          currentUser.id === rev.targetUserId ||
                          (currentUser.name && rev.targetUserName && currentUser.name.toLowerCase() === rev.targetUserName.toLowerCase())
                        )
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = crewReviews.filter((r) => r.id !== rev.id);
                            setCrewReviews(updated);
                            syncUpdatedConfig({ crewReviews: updated });
                          }}
                          className="p-1.5 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Удалить отзыв (доступно автору, получателю отзыва и администратору)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges / Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {rev.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-[#2D332D] leading-relaxed italic bg-[#F9F7F4] p-2.5 sm:p-3 rounded-xl border border-[#E5E0D8]/60">
                    «{rev.comment}»
                  </p>
                </div>

                {/* Author footer */}
                <div className="pt-2.5 border-t border-[#F4F1EA] flex items-center justify-between text-[11px] text-[#8B7E6D]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] truncate">Автор: <strong>{rev.authorUserName}</strong></span>
                  </div>
                  <span className="text-[10px] shrink-0">{rev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 1: NEW / EDIT TRAVEL NOTE
          ========================================================= */}
      {isNewNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#2D5A27]" />
                <span>{editingNote ? 'Редактировать путевую заметку' : 'Новая путевая заметка'}</span>
              </h3>
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Заголовок заметки *</label>
                <input
                  type="text"
                  placeholder="Например: Секретная стоянка на 45 км Соби или Ошибки при выборе топора"
                  value={noteFormTitle}
                  onChange={(e) => setNoteFormTitle(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река / Локация</label>
                  <input
                    type="text"
                    placeholder="р. Собь, р. Казым, р. Лямин..."
                    value={noteFormRiver}
                    onChange={(e) => setNoteFormRiver(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Категория записи *</label>
                  <select
                    value={noteFormCategory}
                    onChange={(e) => setNoteFormCategory(e.target.value as TravelNote['category'])}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="gear_lessons">⚠️ Снаряжение и уроки (что не сработало)</option>
                    <option value="secret_camp">⛺ Стоянка, родник и координаты</option>
                    <option value="future_idea">💡 План и идея на будущее</option>
                    <option value="fishing_spots">🎣 Рыбалка и приманки</option>
                    <option value="safety_warning">🛡️ Безопасность и связь</option>
                    <option value="trip_impressions">📝 Путевой очерк / Впечатления</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Текст заметки / Советы самому себе *</label>
                <textarea
                  rows={6}
                  placeholder="Опишите подробно: где стоянка, ориентиры, что взять в следующий раз, какие были ошибки..."
                  value={noteFormContent}
                  onChange={(e) => setNoteFormContent(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Теги (через запятую)</label>
                  <input
                    type="text"
                    placeholder="Стоянка, Дрова, Полярный Урал"
                    value={noteFormTags}
                    onChange={(e) => setNoteFormTags(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-[#1A1F1A]">
                    <input
                      type="checkbox"
                      checked={noteFormPinned}
                      onChange={(e) => setNoteFormPinned(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2D5A27] focus:ring-[#2D5A27]"
                    />
                    <span>📌 Закрепить вверху журнала</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] hover:text-[#1A1F1A] text-xs font-bold rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Сохранить заметку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: ADD LOGBOOK COMPLETED TRIP
          ========================================================= */}
      {isNewTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#2D5A27]" />
                <span>Записать пройденный поход</span>
              </h3>
              <button
                onClick={() => setIsNewTripModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 sm:space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река / Маршрут *</label>
                  <input
                    type="text"
                    placeholder="р. Собь, р. Казым, р. Лямин..."
                    value={tripFormRiver}
                    onChange={(e) => setTripFormRiver(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Регион *</label>
                  <select
                    value={tripFormRegion}
                    onChange={(e) => setTripFormRegion(e.target.value as 'ХМАО' | 'ЯНАО')}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="ХМАО">ХМАО — Югра</option>
                    <option value="ЯНАО">ЯНАО — Ямал</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Год</label>
                  <input
                    type="number"
                    value={tripFormYear}
                    onChange={(e) => setTripFormYear(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Месяц</label>
                  <select
                    value={tripFormMonth}
                    onChange={(e) => setTripFormMonth(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    {['Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Дней</label>
                  <input
                    type="number"
                    value={tripFormDays}
                    onChange={(e) => setTripFormDays(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Км по воде</label>
                  <input
                    type="number"
                    value={tripFormDistance}
                    onChange={(e) => setTripFormDistance(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Судно</label>
                  <select
                    value={tripFormVessel}
                    onChange={(e) => setTripFormVessel(e.target.value as VesselType)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="catamaran">Катамаран</option>
                    <option value="kayak">Байдарка / Каяк</option>
                    <option value="packraft">Паккрафт</option>
                    <option value="raft">Рафт</option>
                    <option value="sup">SUP-борд</option>
                    <option value="motorboat">Моторная лодка / ПВХ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Ваша роль</label>
                  <select
                    value={tripFormRole}
                    onChange={(e) => setTripFormRole(e.target.value as LogbookTrip['role'])}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="Капитан / Организатор">Капитан / Организатор</option>
                    <option value="Матрос / Гребец">Матрос / Гребец</option>
                    <option value="Штурман">Штурман</option>
                    <option value="Костровой / Завпит">Костровой / Завпит</option>
                    <option value="Фотограф / Летописец">Фотограф / Летописец</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Сложность</label>
                  <select
                    value={tripFormDifficulty}
                    onChange={(e) => setTripFormDifficulty(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="I к.с.">I к.с. (Равнинная)</option>
                    <option value="II к.с.">II к.с. (Перекаты/шиверы)</option>
                    <option value="III к.с.">III к.с. (Пороги/камни)</option>
                    <option value="IV к.с.">IV к.с. (Сложные пороги)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">
                  Ваша оценка реки (1-5 звезд)
                </label>
                <div className="flex items-center gap-2">
                  {renderStarRating(tripFormRating, (val) => setTripFormRating(val), 'w-6 h-6')}
                  <span className="text-xs font-bold text-[#2D5A27]">
                    {tripFormRating} из 5 звёзд
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">
                  Личные комментарии и воспоминания
                </label>
                <textarea
                  rows={4}
                  placeholder="Как река, как вел себя экипаж, какие были сложные места, как ловилась рыба..."
                  value={tripFormNotes}
                  onChange={(e) => setTripFormNotes(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsNewTripModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] hover:text-[#1A1F1A] text-xs font-bold rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddLogbookTrip}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Записать в журнал
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: ADD RIVER REVIEW
          ========================================================= */}
      {isRiverReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>Оценить реку и оставить отзыв</span>
              </h3>
              <button
                onClick={() => setIsRiverReviewModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 sm:space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река *</label>
                  <select
                    value={selectedRiverForReview}
                    onChange={(e) => setSelectedRiverForReview(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} ({r.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Тип плавсредства</label>
                  <select
                    value={riverReviewVessel}
                    onChange={(e) => setRiverReviewVessel(e.target.value as VesselType)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="catamaran">Катамаран</option>
                    <option value="kayak">Байдарка / Каяк</option>
                    <option value="packraft">Паккрафт</option>
                    <option value="raft">Рафт</option>
                    <option value="sup">SUP-борд</option>
                    <option value="motorboat">Моторная лодка / ПВХ</option>
                  </select>
                </div>
              </div>

              {/* 5-Star Sliders / Clickers */}
              <div className="space-y-2.5 bg-[#F9F7F4] p-3.5 sm:p-4 rounded-2xl border border-[#E5E0D8]">
                <span className="font-bold text-[#1A1F1A] block">Критерии оценки:</span>
                
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">🌲 Красота природы:</span>
                  {renderStarRating(riverReviewScenery, setRiverReviewScenery, 'w-5 h-5')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">⚡ Пороги и спорт:</span>
                  {renderStarRating(riverReviewRapids, setRiverReviewRapids, 'w-5 h-5')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">⛺ Удобство стоянок:</span>
                  {renderStarRating(riverReviewCamps, setRiverReviewCamps, 'w-5 h-5')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">🎣 Рыбалка:</span>
                  {renderStarRating(riverReviewFishing, setRiverReviewFishing, 'w-5 h-5')}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">
                  Ваш отзыв о маршруте *
                </label>
                <textarea
                  rows={4}
                  placeholder="Опишите ваши впечатления от реки: вода, течение, заломы, природа..."
                  value={riverReviewComment}
                  onChange={(e) => setRiverReviewComment(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">
                  Совет последователям (необязательно)
                </label>
                <input
                  type="text"
                  placeholder="Например: Обязательно берите накомарники в июне и неопрен"
                  value={riverReviewAdvice}
                  onChange={(e) => setRiverReviewAdvice(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsRiverReviewModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] hover:text-[#1A1F1A] text-xs font-bold rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveRiverReview}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Опубликовать отзыв
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: ADD CREW REVIEW
          ========================================================= */}
      {isCrewReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Оценка участника экипажа</span>
              </h3>
              <button
                onClick={() => setIsCrewReviewModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 sm:space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Кого оцениваем *</label>
                <select
                  value={crewTargetUserId}
                  onChange={(e) => setCrewTargetUserId(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                >
                  {registeredUsers
                    .filter((u) => u.id !== currentUser?.id)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role === 'superadmin' ? 'Главный капитан' : user.experienceLevel})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Название совместного похода</label>
                <input
                  type="text"
                  placeholder="Например: Сплав по Соби 2026 или ПВД на Тромъёган"
                  value={crewTripTitle}
                  onChange={(e) => setCrewTripTitle(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>

              {/* Ratings */}
              <div className="space-y-2.5 bg-[#F9F7F4] p-3.5 sm:p-4 rounded-2xl border border-[#E5E0D8]">
                <span className="font-bold text-[#1A1F1A] block">Походные качества:</span>
                
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">🚣 Гребля и техника:</span>
                  {renderStarRating(crewRatingPaddling, setCrewRatingPaddling, 'w-5 h-5')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">⛺ Лагерь и кухня:</span>
                  {renderStarRating(crewRatingCampSkills, setCrewRatingCampSkills, 'w-5 h-5')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">🤝 Командный дух:</span>
                  {renderStarRating(crewRatingTeamwork, setCrewRatingTeamwork, 'w-5 h-5')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4A443E]">⏰ Дисциплина:</span>
                  {renderStarRating(crewRatingPunctuality, setCrewRatingPunctuality, 'w-5 h-5')}
                </div>
              </div>

              {/* Tag Badges Selection */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1.5">
                  Почетные звания и бейджи:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '💪 Мощный гребец',
                    '🔥 Мастер костра',
                    '🍲 Шеф-повар лагеря',
                    '🧭 Надежный штурман',
                    '🎸 Душа компании',
                    '🛡️ Безопасность на 100%',
                    '⚡ Быстрая постановка лагеря'
                  ].map((tag) => {
                    const isSelected = crewSelectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCrewSelectedTags((prev) => prev.filter((t) => t !== tag));
                          } else {
                            setCrewSelectedTags((prev) => [...prev, tag]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27]'
                            : 'bg-[#F9F7F4] text-[#6B665F] border-[#E5E0D8] hover:border-[#2D5A27]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">
                  Текстовый отзыв о товарище *
                </label>
                <textarea
                  rows={4}
                  placeholder="Напишите, как человек проявил себя в походе, готовность помочь, позитив..."
                  value={crewReviewComment}
                  onChange={(e) => setCrewReviewComment(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsCrewReviewModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] hover:text-[#1A1F1A] text-xs font-bold rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveCrewReview}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Сохранить оценку
              </button>
            </div>
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
