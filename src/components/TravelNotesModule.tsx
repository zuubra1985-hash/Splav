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
  Globe,
  User,
  Heart,
  ExternalLink,
  Image as ImageIcon,
  Droplets,
  Navigation,
  Check,
  Copy
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
  Region,
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
  onOpenRouteDetails?: (route: RiverRoute) => void;
  onSelectRouteOnMap?: (route: RiverRoute) => void;
}

type TabType = 'community_notes' | 'my_notes' | 'checklist' | 'river_reviews' | 'my_trips' | 'crew_reviews';

export const TravelNotesModule: React.FC<TravelNotesModuleProps> = ({
  routes,
  currentUser,
  registeredUsers = [],
  onOpenAuth,
  isAdmin: isAdminProp,
  notesConfig,
  setNotesConfig,
  onOpenAdminNotesManager,
  onOpenRouteDetails,
  onSelectRouteOnMap
}) => {
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = Boolean(isAdminProp || isSuperAdmin || currentUser?.role === 'admin');

  // Active Tab
  const [activeSubTab, setActiveSubTabState] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('splav86_travel_notes_subtab_v3');
      if (saved && ['community_notes', 'my_notes', 'checklist', 'river_reviews', 'my_trips', 'crew_reviews'].includes(saved)) {
        return saved as TabType;
      }
    } catch (e) {}
    return 'community_notes';
  });

  const setActiveSubTab = (tab: TabType) => {
    setActiveSubTabState(tab);
    try {
      localStorage.setItem('splav86_travel_notes_subtab_v3', tab);
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

  // --- STATE 1: TRAVEL NOTES & DIARIES ---
  const [notes, setNotes] = useState<TravelNote[]>(() => {
    if (notesConfig?.notes && notesConfig.notes.length > 0) {
      return notesConfig.notes;
    }
    try {
      const stored = localStorage.getItem('splav86_travel_notes_v3');
      return stored ? JSON.parse(stored) : INITIAL_TRAVEL_NOTES;
    } catch {
      return INITIAL_TRAVEL_NOTES;
    }
  });

  useEffect(() => {
    if (notesConfig?.notes && Array.isArray(notesConfig.notes)) {
      setNotes((prevNotes) => {
        const map = new Map<string, TravelNote>();
        // Add notes from remote config
        notesConfig.notes.forEach((n) => {
          if (n && n.id) map.set(n.id, n);
        });
        // Retain any pending or locally created notes
        prevNotes.forEach((n) => {
          if (n && n.id) {
            if (!map.has(n.id)) {
              map.set(n.id, n);
            } else {
              const remote = map.get(n.id)!;
              const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
              const localTime = new Date(n.updatedAt || n.createdAt || 0).getTime();
              if (localTime > remoteTime || (n.likesCount || 0) > (remote.likesCount || 0)) {
                map.set(n.id, { ...remote, ...n });
              }
            }
          }
        });
        return Array.from(map.values());
      });
    }
  }, [notesConfig?.notes]);

  // Search, Category, Region & Vessel Filters
  const [notesSearch, setNotesSearch] = useState('');
  const [notesCategoryFilter, setNotesCategoryFilter] = useState<string>('ALL');
  const [notesRegionFilter, setNotesRegionFilter] = useState<string>('ALL');
  const [notesVesselFilter, setNotesVesselFilter] = useState<string>('ALL');
  const [notesSortBy, setNotesSortBy] = useState<'newest' | 'popular' | 'rating'>('newest');

  // Modals
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TravelNote | null>(null);
  const [viewingNote, setViewingNote] = useState<TravelNote | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // New Note Form State
  const [noteFormTitle, setNoteFormTitle] = useState('');
  const [noteFormRiver, setNoteFormRiver] = useState('');
  const [noteFormLocation, setNoteFormLocation] = useState('');
  const [noteFormRegion, setNoteFormRegion] = useState<Region>('ХМАО');
  const [noteFormCategory, setNoteFormCategory] = useState<TravelNote['category']>('expedition_report');
  const [noteFormSeason, setNoteFormSeason] = useState<TravelNote['season']>('summer_warm');
  const [noteFormVessel, setNoteFormVessel] = useState<VesselType>('kayak');
  const [noteFormDuration, setNoteFormDuration] = useState<number>(3);
  const [noteFormDistance, setNoteFormDistance] = useState<number>(75);
  const [noteFormWaterLevel, setNoteFormWaterLevel] = useState<'normal' | 'high' | 'low'>('normal');
  const [noteFormDifficulty, setNoteFormDifficulty] = useState<string>('I к.с.');
  const [noteFormRiverRating, setNoteFormRiverRating] = useState<number>(5);
  const [noteFormContent, setNoteFormContent] = useState('');
  const [noteFormTips, setNoteFormTips] = useState('');
  const [noteFormTags, setNoteFormTags] = useState('');
  const [noteFormPhotos, setNoteFormPhotos] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [noteFormIsPublic, setNoteFormIsPublic] = useState<boolean>(true);
  const [noteFormPinned, setNoteFormPinned] = useState(false);

  // --- STATE 2: CHECKLIST ---
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (notesConfig?.checklist && notesConfig.checklist.length > 0) {
      return notesConfig.checklist;
    }
    try {
      const stored = localStorage.getItem('splav86_custom_checklist_v3');
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
      const stored = localStorage.getItem('splav86_my_trips_log_v3');
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
      const stored = localStorage.getItem('splav86_river_reviews_v3');
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
  const [reviewRiverName, setReviewRiverName] = useState(routes[0]?.name || 'р. Собь');
  const [reviewVessel, setReviewVessel] = useState('Байдарка');
  const [reviewOverall, setReviewOverall] = useState(5);
  const [reviewScenery, setReviewScenery] = useState(5);
  const [reviewRapids, setReviewRapids] = useState(4);
  const [reviewCamps, setReviewCamps] = useState(5);
  const [reviewFishing, setReviewFishing] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAdvice, setReviewAdvice] = useState('');

  // --- STATE 5: CREW REVIEWS (5 STARS) ---
  const [crewReviews, setCrewReviews] = useState<CrewReview[]>(() => {
    if (notesConfig?.crewReviews && notesConfig.crewReviews.length > 0) {
      return notesConfig.crewReviews;
    }
    try {
      const stored = localStorage.getItem('splav86_crew_reviews_v3');
      return stored ? JSON.parse(stored) : INITIAL_CREW_REVIEWS;
    } catch {
      return INITIAL_CREW_REVIEWS;
    }
  });

  useEffect(() => {
    if (notesConfig?.crewReviews) {
      setCrewReviews(notesConfig.crewReviews);
    }
  }, [notesConfig?.crewReviews]);

  const [isCrewReviewModalOpen, setIsCrewReviewModalOpen] = useState(false);
  const [crewReviewTargetUserId, setCrewReviewTargetUserId] = useState('');
  const [crewReviewTripName, setCrewReviewTripName] = useState('');
  const [crewReviewReliability, setCrewReviewReliability] = useState(5);
  const [crewReviewRowing, setCrewReviewRowing] = useState(5);
  const [crewReviewCampCraft, setCrewReviewCampCraft] = useState(5);
  const [crewReviewPositivity, setCrewReviewPositivity] = useState(5);
  const [crewReviewComment, setCrewReviewComment] = useState('');

  // Sync with Firestore & LocalStorage
  const syncUpdatedConfig = (updatedPartial: Partial<TravelNotesConfig>) => {
    const newConfig: TravelNotesConfig = {
      id: notesConfig?.id || 'splav86_travel_notes_main',
      notes: updatedPartial.notes !== undefined ? updatedPartial.notes : notes,
      checklist: updatedPartial.checklist !== undefined ? updatedPartial.checklist : checklist,
      logbookTrips: updatedPartial.logbookTrips !== undefined ? updatedPartial.logbookTrips : myTrips,
      riverReviews: updatedPartial.riverReviews !== undefined ? updatedPartial.riverReviews : riverReviews,
      crewReviews: updatedPartial.crewReviews !== undefined ? updatedPartial.crewReviews : crewReviews,
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: currentUser?.name || 'Турист'
    };

    if (setNotesConfig) {
      setNotesConfig(newConfig);
    }

    try {
      localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
      if (updatedPartial.notes) localStorage.setItem('splav86_travel_notes_v3', JSON.stringify(updatedPartial.notes));
      if (updatedPartial.checklist) localStorage.setItem('splav86_custom_checklist_v3', JSON.stringify(updatedPartial.checklist));
      if (updatedPartial.logbookTrips) localStorage.setItem('splav86_my_trips_log_v3', JSON.stringify(updatedPartial.logbookTrips));
      if (updatedPartial.riverReviews) localStorage.setItem('splav86_river_reviews_v3', JSON.stringify(updatedPartial.riverReviews));
      if (updatedPartial.crewReviews) localStorage.setItem('splav86_crew_reviews_v3', JSON.stringify(updatedPartial.crewReviews));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    TravelNotesSyncService.saveNotesConfig(newConfig).catch((err) => {
      console.warn('Firestore TravelNotesConfig sync error:', err);
    });

    CloudSqlDbService.saveTravelNotes(newConfig).catch((err) => {
      console.warn('CloudSQL TravelNotesConfig sync error:', err);
    });
  };

  // Helper to ensure user is authenticated before performing actions
  const requireAuth = (callback: () => void) => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth();
      } else {
        alert('Для добавления отчетов, заметок и отзывов необходимо войти в аккаунт.');
      }
      return false;
    }
    callback();
    return true;
  };

  // --- ACTIONS: NOTES ---
  const handleOpenNewNoteModal = (noteToEdit?: TravelNote, forcePrivate = false) => {
    if (noteToEdit) {
      setEditingNote(noteToEdit);
      setNoteFormTitle(noteToEdit.title);
      setNoteFormRiver(noteToEdit.riverName || '');
      setNoteFormLocation(noteToEdit.locationName || '');
      setNoteFormRegion(noteToEdit.region || 'ХМАО');
      setNoteFormCategory(noteToEdit.category);
      setNoteFormSeason(noteToEdit.season || 'summer_warm');
      setNoteFormVessel(noteToEdit.vesselType || 'kayak');
      setNoteFormDuration(noteToEdit.durationDays || 3);
      setNoteFormDistance(noteToEdit.distanceKm || 75);
      setNoteFormWaterLevel(noteToEdit.waterLevel || 'normal');
      setNoteFormDifficulty(noteToEdit.riverDifficulty || 'I к.с.');
      setNoteFormRiverRating(noteToEdit.riverRating || 5);
      setNoteFormContent(noteToEdit.content);
      setNoteFormTips(noteToEdit.practicalTips || '');
      setNoteFormTags((noteToEdit.tags || []).join(', '));
      setNoteFormPhotos(noteToEdit.photos || []);
      setNoteFormIsPublic(noteToEdit.isPublic !== false);
      setNoteFormPinned(!!noteToEdit.isPinned);
    } else {
      setEditingNote(null);
      setNoteFormTitle('');
      setNoteFormRiver(routes[0]?.name || 'р. Собь');
      setNoteFormLocation('');
      setNoteFormRegion('ХМАО');
      setNoteFormCategory('expedition_report');
      setNoteFormSeason('summer_warm');
      setNoteFormVessel('kayak');
      setNoteFormDuration(3);
      setNoteFormDistance(75);
      setNoteFormWaterLevel('normal');
      setNoteFormDifficulty('I к.с.');
      setNoteFormRiverRating(5);
      setNoteFormContent('');
      setNoteFormTips('');
      setNoteFormTags('');
      setNoteFormPhotos([]);
      setNoteFormIsPublic(!forcePrivate);
      setNoteFormPinned(false);
    }
    setPhotoInputUrl('');
    setIsNewNoteModalOpen(true);
  };

  const handleAddPhotoUrl = () => {
    if (!photoInputUrl.trim()) return;
    if (!photoInputUrl.startsWith('http://') && !photoInputUrl.startsWith('https://')) {
      alert('Пожалуйста, укажите корректную ссылку на изображение (начиная с https://)');
      return;
    }
    setNoteFormPhotos((prev) => [...prev, photoInputUrl.trim()]);
    setPhotoInputUrl('');
  };

  const handleRemovePhotoUrl = (idx: number) => {
    setNoteFormPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNote = () => {
    if (!noteFormTitle.trim() || !noteFormContent.trim()) {
      alert('Пожалуйста, заполните заголовок и текст отчета/заметки.');
      return;
    }

    const tagsArray = noteFormTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingNote) {
      const updatedNotes = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: noteFormTitle.trim(),
              riverName: noteFormRiver.trim() || undefined,
              locationName: noteFormLocation.trim() || undefined,
              region: noteFormRegion,
              category: noteFormCategory,
              season: noteFormSeason,
              vesselType: noteFormVessel,
              durationDays: noteFormDuration,
              distanceKm: noteFormDistance,
              waterLevel: noteFormWaterLevel,
              riverDifficulty: noteFormDifficulty,
              riverRating: noteFormRiverRating,
              content: noteFormContent.trim(),
              practicalTips: noteFormTips.trim() || undefined,
              tags: tagsArray,
              photos: noteFormPhotos,
              isPublic: noteFormIsPublic,
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
        userId: currentUser?.id || 'guest-local',
        authorName: currentUser?.name || 'Турист-исследователь',
        authorAvatar: currentUser?.avatar || undefined,
        title: noteFormTitle.trim(),
        riverName: noteFormRiver.trim() || undefined,
        locationName: noteFormLocation.trim() || undefined,
        region: noteFormRegion,
        category: noteFormCategory,
        season: noteFormSeason,
        vesselType: noteFormVessel,
        durationDays: noteFormDuration,
        distanceKm: noteFormDistance,
        waterLevel: noteFormWaterLevel,
        riverDifficulty: noteFormDifficulty,
        riverRating: noteFormRiverRating,
        content: noteFormContent.trim(),
        practicalTips: noteFormTips.trim() || undefined,
        tags: tagsArray,
        photos: noteFormPhotos,
        likesCount: 0,
        likedByUserIds: [],
        isPublic: noteFormIsPublic,
        isPinned: noteFormPinned,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      syncUpdatedConfig({ notes: updatedNotes });

      // Automatically switch to the appropriate view so the author immediately sees their note
      setActiveSubTab(noteFormIsPublic ? 'community_notes' : 'my_notes');
      // Clear filters so the new note is visible right away
      setNotesSearch('');
      setNotesCategoryFilter('ALL');
      setNotesRegionFilter('ALL');
      setNotesVesselFilter('ALL');
    }

    setIsNewNoteModalOpen(false);
    setEditingNote(null);
  };

  const handleToggleLikeNote = (noteId: string) => {
    const userId = currentUser?.id || 'guest-device';
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        const liked = (n.likedByUserIds || []).includes(userId);
        const newLikedList = liked
          ? (n.likedByUserIds || []).filter((id) => id !== userId)
          : [...(n.likedByUserIds || []), userId];
        return {
          ...n,
          likesCount: newLikedList.length,
          likedByUserIds: newLikedList
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    syncUpdatedConfig({ notes: updatedNotes });
  };

  const handleToggleNoteVisibility = (noteId: string) => {
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        const newIsPublic = !n.isPublic;
        return {
          ...n,
          isPublic: newIsPublic,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    syncUpdatedConfig({ notes: updatedNotes });
  };

  const handleDeleteNote = (id: string) => {
    askConfirmation({
      title: 'Удалить запись?',
      message: 'Вы уверены, что хотите удалить этот отчет / заметку? Действие необратимо.',
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: () => {
        const updatedNotes = notes.filter((n) => n.id !== id);
        setNotes(updatedNotes);
        syncUpdatedConfig({ notes: updatedNotes });
        if (viewingNote?.id === id) setViewingNote(null);
      }
    });
  };

  const handleTogglePinNote = (id: string) => {
    const updatedNotes = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    setNotes(updatedNotes);
    syncUpdatedConfig({ notes: updatedNotes });
  };

  const handleCopyNoteLink = (noteId: string) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#notes?noteId=${noteId}`;
      navigator.clipboard.writeText(url);
      setCopiedNoteId(noteId);
      setTimeout(() => setCopiedNoteId(null), 2500);
    } catch (e) {
      console.warn(e);
    }
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
  };

  const handleDeleteCheckItem = (id: string) => {
    const updatedChecklist = checklist.filter((item) => item.id !== id);
    setChecklist(updatedChecklist);
    syncUpdatedConfig({ checklist: updatedChecklist });
  };

  const handleResetChecklist = () => {
    askConfirmation({
      title: 'Сбросить чек-лист?',
      message: 'Все галочки будут сняты, список вернется к исходному состоянию подготовки к новому сплаву.',
      confirmText: 'Да, сбросить',
      confirmVariant: 'primary',
      onConfirm: () => {
        const resetItems = checklist.map((item) => ({ ...item, isChecked: false }));
        setChecklist(resetItems);
        syncUpdatedConfig({ checklist: resetItems });
      }
    });
  };

  // --- ACTIONS: MY TRIPS LOGBOOK ---
  const handleSaveLogbookTrip = () => {
    requireAuth(() => {
      if (!tripFormRiver.trim()) {
        alert('Пожалуйста, укажите реку или маршрут сплава.');
        return;
      }

      const newTrip: LogbookTrip = {
        id: `trip-log-${Date.now()}`,
        userId: currentUser?.id || 'guest',
        riverName: tripFormRiver.trim(),
        region: tripFormRegion,
        year: tripFormYear,
        month: tripFormMonth,
        durationDays: tripFormDays,
        distanceKm: tripFormDistance,
        vessel: tripFormVessel,
        role: tripFormRole,
        status: 'completed',
        difficultyRating: tripFormDifficulty,
        riverRating: tripFormRating,
        personalNotes: tripFormNotes.trim() || '',
        createdAt: new Date().toISOString().split('T')[0]
      };

      const updatedTrips = [newTrip, ...myTrips];
      setMyTrips(updatedTrips);
      syncUpdatedConfig({ logbookTrips: updatedTrips });

      setIsNewTripModalOpen(false);
      setTripFormRiver('р. Собь (Полярный Урал)');
      setTripFormNotes('');
    });
  };

  const handleDeleteLogbookTrip = (id: string) => {
    askConfirmation({
      title: 'Удалить пройденный сплав?',
      message: 'Вы уверены, что хотите удалить эту запись из личной истории походов?',
      confirmText: 'Да, удалить',
      confirmVariant: 'danger',
      onConfirm: () => {
        const updated = myTrips.filter((t) => t.id !== id);
        setMyTrips(updated);
        syncUpdatedConfig({ logbookTrips: updated });
      }
    });
  };

  // --- ACTIONS: RIVER REVIEWS ---
  const handleOpenRiverReviewModal = () => {
    requireAuth(() => {
      setReviewRiverName(routes[0]?.name || 'р. Собь');
      setReviewVessel('kayak');
      setReviewOverall(5);
      setReviewScenery(5);
      setReviewRapids(4);
      setReviewCamps(5);
      setReviewFishing(5);
      setReviewComment('');
      setReviewAdvice('');
      setIsRiverReviewModalOpen(true);
    });
  };

  const handleSaveRiverReview = () => {
    if (!currentUser) return;
    if (!reviewComment.trim()) {
      alert('Пожалуйста, напишите краткий комментарий о реке.');
      return;
    }

    const newRev: RiverReview = {
      id: `rev-${Date.now()}`,
      riverName: reviewRiverName,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      ratingOverall: reviewOverall,
      ratingScenery: reviewScenery,
      ratingRapids: reviewRapids,
      ratingCamps: reviewCamps,
      ratingFishing: reviewFishing,
      comment: reviewComment.trim(),
      adviceForOthers: reviewAdvice.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      vesselUsed: (reviewVessel as VesselType) || 'kayak'
    };

    const updated = [newRev, ...riverReviews];
    setRiverReviews(updated);
    syncUpdatedConfig({ riverReviews: updated });
    setIsRiverReviewModalOpen(false);
  };

  // --- ACTIONS: CREW REVIEWS ---
  const handleOpenCrewReviewModal = () => {
    requireAuth(() => {
      setCrewReviewTargetUserId(registeredUsers[0]?.id || '');
      setCrewReviewTripName(routes[0]?.name || 'Сплав по р. Собь');
      setCrewReviewReliability(5);
      setCrewReviewRowing(5);
      setCrewReviewCampCraft(5);
      setCrewReviewPositivity(5);
      setCrewReviewComment('');
      setIsCrewReviewModalOpen(true);
    });
  };

  const handleSaveCrewReview = () => {
    if (!currentUser) return;
    const targetUser = registeredUsers.find((u) => u.id === crewReviewTargetUserId);
    if (!targetUser) {
      alert('Пожалуйста, выберите участника для отзыва.');
      return;
    }

    const newRev: CrewReview = {
      id: `crew-rev-${Date.now()}`,
      authorUserId: currentUser.id,
      authorUserName: currentUser.name,
      authorAvatar: currentUser.avatar,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserAvatar: targetUser.avatar,
      tripTitle: crewReviewTripName || 'Водный поход',
      ratingOverall: 5,
      ratingPaddling: crewReviewRowing,
      ratingCampSkills: crewReviewCampCraft,
      ratingTeamwork: crewReviewReliability,
      ratingPunctuality: crewReviewPositivity,
      tags: ['💪 Надежный гребец', '⛺ Отличный бивак'],
      comment: crewReviewComment.trim() || '',
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [newRev, ...crewReviews];
    setCrewReviews(updated);
    syncUpdatedConfig({ crewReviews: updated });
    setIsCrewReviewModalOpen(false);
  };

  // --- FILTERED NOTES LOGIC ---
  const publicCommunityNotes = useMemo(() => {
    return notes.filter((n) => n.isPublic !== false);
  }, [notes]);

  const userPersonalNotes = useMemo(() => {
    if (!currentUser) {
      return notes.filter((n) => n.userId === 'guest-local' || n.isPublic === false);
    }
    return notes.filter((n) => n.userId === currentUser.id);
  }, [notes, currentUser]);

  const activeNotesList = activeSubTab === 'my_notes' ? userPersonalNotes : publicCommunityNotes;

  const filteredNotes = useMemo(() => {
    let result = activeNotesList.filter((note) => {
      const matchSearch =
        notesSearch.trim() === '' ||
        note.title.toLowerCase().includes(notesSearch.toLowerCase()) ||
        note.content.toLowerCase().includes(notesSearch.toLowerCase()) ||
        (note.riverName && note.riverName.toLowerCase().includes(notesSearch.toLowerCase())) ||
        (note.authorName && note.authorName.toLowerCase().includes(notesSearch.toLowerCase())) ||
        (note.tags && note.tags.some((t) => t.toLowerCase().includes(notesSearch.toLowerCase())));

      const matchCategory =
        notesCategoryFilter === 'ALL' || note.category === notesCategoryFilter;

      const matchRegion =
        notesRegionFilter === 'ALL' || note.region === notesRegionFilter;

      const matchVessel =
        notesVesselFilter === 'ALL' || note.vesselType === notesVesselFilter;

      return matchSearch && matchCategory && matchRegion && matchVessel;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      // Pinned notes always first in current view
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (notesSortBy === 'popular') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      if (notesSortBy === 'rating') {
        return (b.riverRating || 0) - (a.riverRating || 0);
      }
      // Default: newest date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [activeNotesList, notesSearch, notesCategoryFilter, notesRegionFilter, notesVesselFilter, notesSortBy]);

  // Category Badges & Info
  const NOTE_CATEGORY_INFO: Record<
    TravelNote['category'],
    { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
  > = {
    expedition_report: { label: 'Путевой отчет / Дневник', icon: BookOpen, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
    trip_impressions: { label: 'Путевой очерк', icon: FileText, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    secret_camp: { label: 'Стоянка и координаты', icon: Tent, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    fishing_spots: { label: 'Рыбалка и приманки', icon: Fish, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
    gear_lessons: { label: 'Снаряжение и ошибки', icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
    safety_warning: { label: 'Безопасность и связь', icon: Shield, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    future_idea: { label: 'Идея на будущее', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    river_log: { label: 'Бортовой лог реки', icon: Compass, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' }
  };

  // Helper Labels
  const getVesselLabel = (v?: VesselType) => {
    switch (v) {
      case 'catamaran': return 'Катамаран';
      case 'kayak': return 'Байдарка / Каяк';
      case 'packraft': return 'Паккрафт';
      case 'raft': return 'Рафт';
      case 'sup': return 'SUP-борд';
      case 'motorboat': return 'Моторная лодка';
      default: return 'Байдарка';
    }
  };

  const getWaterLevelLabel = (lvl?: string) => {
    switch (lvl) {
      case 'high': return 'Высокая вода (паводок)';
      case 'low': return 'Межень (маловодье)';
      default: return 'Средний рабочий уровень';
    }
  };

  const renderStarRating = (score: number, max = 5, size = 'w-4 h-4') => (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`${size} ${i < score ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
        />
      ))}
    </div>
  );

  // User Checklist Progress
  const totalCheckItems = checklist.length;
  const checkedItemsCount = checklist.filter((i) => i.isChecked).length;
  const checklistPercent = totalCheckItems > 0 ? Math.round((checkedItemsCount / totalCheckItems) * 100) : 0;

  // Personal user stats
  const userTrips = useMemo(() => {
    if (!currentUser) return myTrips;
    return myTrips.filter((t) => t.userId === currentUser.id);
  }, [myTrips, currentUser]);

  const userKmTravelled = useMemo(() => {
    return userTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
  }, [userTrips]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      
      {/* =========================================================
          HERO BANNER & PERSONAL STATS
          ========================================================= */}
      <div className="relative overflow-hidden bg-linear-to-r from-[#1A3816] via-[#2D5A27] to-[#1E431B] text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-[#3D7136]">
        <div className="relative z-10 max-w-3xl space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/20">
            <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
            <span>Летописи и путевые отчеты рек Югры и Ямала</span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Путевые заметки & отчеты о сплавах
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            Живой опыт первопроходцев и походные отчеты: актуальный уровень воды, завалы, стоянки, рыбалка, личные путевые заметки и интерактивный чек-лист сборов.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 sm:pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-white/90 font-medium">
            <div className="bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-300 uppercase block font-bold">Отчетов в базе</span>
              <strong className="text-white font-bold text-sm sm:text-base">{publicCommunityNotes.length}</strong>
            </div>
            <div className="bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-300 uppercase block font-bold">Мои заметки</span>
              <strong className="text-white font-bold text-sm sm:text-base">{userPersonalNotes.length} записей</strong>
            </div>
            <div className="bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-300 uppercase block font-bold">Пройдено по воде</span>
              <strong className="text-white font-bold text-sm sm:text-base">{currentUser ? userKmTravelled : 0} км</strong>
            </div>
            <div className="bg-black/25 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-300 uppercase block font-bold">Сборы снаряжения</span>
              <strong className="text-white font-bold text-sm sm:text-base">{checklistPercent}%</strong>
            </div>
          </div>
        </div>

        {/* Decorative background icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
          <BookOpen className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* =========================================================
          TOP NAVIGATION TABS
          ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { 
              id: 'community_notes', 
              label: 'Отчеты сообщества', 
              icon: Globe, 
              count: publicCommunityNotes.length 
            },
            { 
              id: 'my_notes', 
              label: 'Мои заметки', 
              icon: Lock, 
              count: userPersonalNotes.length,
              badge: currentUser ? 'Личный' : 'Гость'
            },
            { 
              id: 'checklist', 
              label: 'Чек-лист сборов', 
              icon: CheckSquare, 
              badge: `${checklistPercent}%` 
            },
            { 
              id: 'river_reviews', 
              label: 'Рейтинг рек 5★', 
              icon: Star, 
              count: riverReviews.length 
            },
            { 
              id: 'my_trips', 
              label: 'Бортовой журнал', 
              icon: Compass, 
              count: userTrips.length 
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id as TabType)}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between sm:justify-start gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-white text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F4F1EA] border border-[#E5E0D8]'
                }`}
              >
                <div className="flex items-center gap-1.5">
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

        {/* Quick Action Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isAdmin && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Админ-режим</span>
            </div>
          )}

          <button
            onClick={() => handleOpenNewNoteModal(undefined, activeSubTab === 'my_notes')}
            className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{activeSubTab === 'my_notes' ? 'Новая личная заметка' : 'Опубликовать отчет'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          TAB 1 & 2: COMMUNITY REPORTS / MY DIARY
          ========================================================= */}
      {(activeSubTab === 'community_notes' || activeSubTab === 'my_notes') && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Subtab Description / Banner */}
          {activeSubTab === 'my_notes' && (
            <div className="bg-[#FAF7F2] border border-[#E5E0D8] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1F1A]">Личный путевой дневник</h3>
                  <p className="text-xs text-[#6B665F]">
                    Здесь хранятся ваши скрытые записи «Только для меня» и черновики. Вы можете опубликовать любую запись для сообщества в один клик.
                  </p>
                </div>
              </div>
              {!currentUser && (
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-1.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  Войти для синхронизации
                </button>
              )}
            </div>
          )}

          {/* Action & Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E5E0D8] shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8B7E6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск по отчетам, рекам, авторам, стоянкам, рыбе..."
                  value={notesSearch}
                  onChange={(e) => setNotesSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Region Filter */}
                <select
                  value={notesRegionFilter}
                  onChange={(e) => setNotesRegionFilter(e.target.value)}
                  className="py-2 px-3 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                >
                  <option value="ALL">Все регионы</option>
                  <option value="ХМАО">ХМАО — Югра</option>
                  <option value="ЯНАО">ЯНАО — Ямал</option>
                </select>

                {/* Category Filter */}
                <select
                  value={notesCategoryFilter}
                  onChange={(e) => setNotesCategoryFilter(e.target.value)}
                  className="py-2 px-3 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                >
                  <option value="ALL">Все типы записей</option>
                  <option value="expedition_report">📖 Путевые отчеты экспедиций</option>
                  <option value="trip_impressions">📝 Путевые очерки</option>
                  <option value="secret_camp">⛺ Стоянки, родники, координаты</option>
                  <option value="fishing_spots">🎣 Рыбалка и приманки</option>
                  <option value="gear_lessons">⚠️ Снаряжение и ошибки</option>
                  <option value="safety_warning">🛡️ Безопасность и связь</option>
                  <option value="future_idea">💡 Идеи и планы</option>
                </select>

                {/* Vessel Filter */}
                <select
                  value={notesVesselFilter}
                  onChange={(e) => setNotesVesselFilter(e.target.value)}
                  className="py-2 px-3 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                >
                  <option value="ALL">Все суда</option>
                  <option value="catamaran">Катамаран</option>
                  <option value="kayak">Байдарка / Каяк</option>
                  <option value="packraft">Паккрафт</option>
                  <option value="sup">SUP-борд</option>
                  <option value="raft">Рафт</option>
                  <option value="motorboat">Моторная лодка</option>
                </select>

                {/* Sort Filter */}
                <select
                  value={notesSortBy}
                  onChange={(e) => setNotesSortBy(e.target.value as any)}
                  className="py-2 px-3 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#2D5A27] outline-none focus:border-[#2D5A27]"
                >
                  <option value="newest">Сначала свежие</option>
                  <option value="popular">По популярности (лайки)</option>
                  <option value="rating">По оценке реки (★)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-[#DDD7CE] space-y-3">
              <BookOpen className="w-12 h-12 text-[#8B7E6D] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#1A1F1A]">
                {activeSubTab === 'my_notes' ? 'В личном дневнике пока нет записей' : 'Отчетов по заданным фильтрам не найдено'}
              </h3>
              <p className="text-xs text-[#8B7E6D] max-w-md mx-auto">
                {activeSubTab === 'my_notes'
                  ? 'Запишите координаты стоянок, впечатления о воде, ошибки снаряжения или составьте путевой очерк.'
                  : 'Станьте первым, кто опубликует путевой отчет о сплаве по рекам Севера!'}
              </p>
              <button
                onClick={() => handleOpenNewNoteModal(undefined, activeSubTab === 'my_notes')}
                className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#3D7136] transition-colors"
              >
                {activeSubTab === 'my_notes' ? 'Создать личную запись' : 'Опубликовать отчет'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredNotes.map((note) => {
                const catInfo = NOTE_CATEGORY_INFO[note.category] || NOTE_CATEGORY_INFO.expedition_report;
                const CatIcon = catInfo.icon;
                const isAuthor = Boolean(currentUser && currentUser.id === note.userId);
                const isLiked = Boolean(note.likedByUserIds && currentUser && note.likedByUserIds.includes(currentUser.id));
                const routeMatch = routes.find(
                  (r) => note.riverName && r.name.toLowerCase().includes(note.riverName.toLowerCase())
                );

                return (
                  <div
                    key={note.id}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between p-4 sm:p-5 relative ${
                      note.isPinned
                        ? 'border-[#2D5A27] ring-2 ring-[#2D5A27]/20 shadow-xs'
                        : 'border-[#E5E0D8]'
                    }`}
                  >
                    <div className="space-y-3">
                      
                      {/* Top Badges & Privacy Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catInfo.bg} ${catInfo.color}`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{catInfo.label}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Privacy Badge / Toggle for author */}
                          {isAuthor ? (
                            <button
                              onClick={() => handleToggleNoteVisibility(note.id)}
                              title={note.isPublic ? 'Заметка публична. Нажмите, чтобы скрыть в личный дневник' : 'Заметка скрыта. Нажмите, чтобы опубликовать для всех'}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 border ${
                                note.isPublic
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {note.isPublic ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
                              <span>{note.isPublic ? 'Публично' : 'Только мне'}</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-emerald-600" />
                              <span>Отчет</span>
                            </span>
                          )}

                          {/* Pin / Edit / Delete */}
                          {(isAuthor || isAdmin) && (
                            <>
                              <button
                                onClick={() => handleTogglePinNote(note.id)}
                                title={note.isPinned ? 'Открепить' : 'Закрепить вверху'}
                                className={`p-1 rounded-lg text-xs transition-colors ${
                                  note.isPinned
                                    ? 'bg-amber-100 text-amber-700 font-bold'
                                    : 'text-[#8B7E6D] hover:bg-[#F4F1EA]'
                                }`}
                              >
                                📌
                              </button>
                              <button
                                onClick={() => handleOpenNewNoteModal(note)}
                                className="p-1 text-[#8B7E6D] hover:text-[#2D5A27] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* River, Location & Region */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {note.riverName && (
                          <div className="flex items-center gap-1 text-[#2D5A27] font-bold">
                            <MapPin className="w-3.5 h-3.5 text-[#2D5A27]" />
                            <span>{note.riverName}</span>
                          </div>
                        )}
                        {note.region && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F4F1EA] text-[#6B665F] text-[10px] font-bold">
                            {note.region}
                          </span>
                        )}
                        {note.riverRating && (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span className="text-[11px] font-bold text-[#1A1F1A]">{note.riverRating}</span>
                          </div>
                        )}
                      </div>

                      {/* Note Title */}
                      <h3
                        onClick={() => setViewingNote(note)}
                        className="text-sm sm:text-base font-bold text-[#1A1F1A] leading-snug hover:text-[#2D5A27] cursor-pointer transition-colors"
                      >
                        {note.title}
                      </h3>

                      {/* Photo Thumbnail if available */}
                      {note.photos && note.photos.length > 0 && (
                        <div
                          onClick={() => setViewingNote(note)}
                          className="relative h-32 w-full rounded-xl overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={note.photos[0]}
                            alt={note.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {note.photos.length > 1 && (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>+{note.photos.length - 1} фото</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stats Pills (Distance, Days, Vessel, Water Level) */}
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {note.distanceKm && (
                          <span className="bg-[#F9F7F4] border border-[#E5E0D8] px-2 py-0.5 rounded-md text-[#4A443E]">
                            💧 {note.distanceKm} км
                          </span>
                        )}
                        {note.durationDays && (
                          <span className="bg-[#F9F7F4] border border-[#E5E0D8] px-2 py-0.5 rounded-md text-[#4A443E]">
                            ⏱️ {note.durationDays} дн.
                          </span>
                        )}
                        {note.vesselType && (
                          <span className="bg-[#F9F7F4] border border-[#E5E0D8] px-2 py-0.5 rounded-md text-[#4A443E]">
                            🛶 {getVesselLabel(note.vesselType)}
                          </span>
                        )}
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs text-[#4A443E] leading-relaxed whitespace-pre-line line-clamp-4">
                        {note.content}
                      </p>
                    </div>

                    {/* Footer: Author info, Likes, Share & Details */}
                    <div className="pt-3 mt-3 border-t border-[#F4F1EA] space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#8B7E6D]">
                        
                        {/* Author */}
                        <div className="flex items-center gap-1.5 truncate">
                          {note.authorAvatar ? (
                            <img
                              src={note.authorAvatar}
                              alt={note.authorName}
                              className="w-5 h-5 rounded-full object-cover border border-[#E5E0D8]"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-[9px] font-bold">
                              {(note.authorName || 'Т').charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-[#1A1F1A] truncate max-w-[110px]">
                            {note.authorName || 'Турист'}
                          </span>
                        </div>

                        {/* Date */}
                        <span className="text-[10px] text-[#8B7E6D] shrink-0">
                          {note.date || note.createdAt}
                        </span>
                      </div>

                      {/* Actions Bottom Row */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          {/* Like Button */}
                          <button
                            onClick={() => handleToggleLikeNote(note.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isLiked
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-[#F9F7F4] text-[#6B665F] hover:text-rose-600 border border-[#E5E0D8]'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                            <span>{note.likesCount || 0}</span>
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => handleCopyNoteLink(note.id)}
                            title="Скопировать ссылку на отчет"
                            className="p-1 text-[#8B7E6D] hover:text-[#2D5A27] rounded-lg hover:bg-[#F4F1EA] transition-colors"
                          >
                            {copiedNoteId === note.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Read Full Button */}
                        <button
                          onClick={() => setViewingNote(note)}
                          className="px-3 py-1 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>Читать</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: CHECKLIST MODULE
          ========================================================= */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Checklist Top Stats & Progress Bar */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E0D8] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#2D5A27]" />
                  <span>Чек-лист экипировки и сборов на сплав</span>
                </h3>
                <p className="text-xs text-[#6B665F] mt-0.5">
                  Собрано: <strong className="text-[#2D5A27]">{checkedItemsCount}</strong> из <strong>{totalCheckItems}</strong> позиций ({checklistPercent}%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetChecklist}
                  className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-colors"
                >
                  Сбросить отметки
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#E8F1E7] text-[#2D5A27] hover:bg-[#D5E6D3] text-xs font-bold rounded-xl border border-[#CDE0CC] transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Распечатать</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#F4F1EA] rounded-full h-3 overflow-hidden border border-[#E5E0D8]">
              <div
                className="bg-linear-to-r from-[#2D5A27] to-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>

          {/* Add Custom Item Form */}
          <form
            onSubmit={handleAddCustomCheckItem}
            className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              type="text"
              placeholder="Добавить свой предмет в чек-лист (напр. Спутниковый трекер Иридиум)..."
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              className="flex-1 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
            />
            <select
              value={newChecklistCategory}
              onChange={(e) => setNewChecklistCategory(e.target.value as any)}
              className="bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1F1A] outline-none"
            >
              <option value="life_safety">🦺 Безопасность на воде</option>
              <option value="camp_bivouac">⛺ Лагерь и бивак</option>
              <option value="kitchen_fire">🔥 Костер и кухня</option>
              <option value="repair_vessel">🔧 Ремнабор судна</option>
              <option value="firstaid_hygiene">🩹 Аптечка и гигиена</option>
              <option value="wildlife_bear">🐻 Защита от зверей</option>
              <option value="hydro_clothes">🧥 Одежда и гидро</option>
            </select>
            <input
              type="text"
              placeholder="Кол-во"
              value={newChecklistQty}
              onChange={(e) => setNewChecklistQty(e.target.value)}
              className="w-24 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#3D7136] transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </form>

          {/* Checklist Items Grouped by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'life_safety', title: 'Безопасность на воде', icon: LifeBuoy, color: 'text-rose-700 bg-rose-50 border-rose-200' },
              { id: 'camp_bivouac', title: 'Лагерь и бивак', icon: Tent, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { id: 'kitchen_fire', title: 'Костер, кухня и инструмент', icon: Flame, color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { id: 'repair_vessel', title: 'Ремкомплект для судна', icon: Wrench, color: 'text-sky-700 bg-sky-50 border-sky-200' },
              { id: 'firstaid_hygiene', title: 'Аптечка, репелленты и гигиена', icon: Shield, color: 'text-purple-700 bg-purple-50 border-purple-200' },
              { id: 'wildlife_bear', title: 'Защита от медведей и связь', icon: AlertTriangle, color: 'text-orange-700 bg-orange-50 border-orange-200' },
              { id: 'hydro_clothes', title: 'Одежда, обувь и гидроснаряжение', icon: Compass, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' }
            ].map((cat) => {
              const items = checklist.filter((i) => i.category === cat.id);
              const CatIcon = cat.icon;
              const completedCount = items.filter((i) => i.isChecked).length;

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-[#E5E0D8] p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#F4F1EA]">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg border ${cat.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-[#1A1F1A]">{cat.title}</h4>
                    </div>
                    <span className="text-xs font-bold text-[#6B665F]">
                      {completedCount} / {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheckItem(item.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          item.isChecked
                            ? 'bg-[#F4F8F3] border-[#CDE0CC] text-[#2D5A27]'
                            : 'bg-[#F9F7F4] border-[#E5E0D8] text-[#1A1F1A] hover:bg-[#F4F1EA]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            item.isChecked ? 'bg-[#2D5A27] border-[#2D5A27] text-white' : 'border-[#DDD7CE] bg-white'
                          }`}>
                            {item.isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`text-xs ${item.isChecked ? 'line-through opacity-70' : 'font-medium'}`}>
                            {item.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.quantity && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E5E0D8] text-[#6B665F]">
                              {item.quantity}
                            </span>
                          )}
                          {item.isCustom && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCheckItem(item.id);
                              }}
                              className="p-1 text-[#8B7E6D] hover:text-rose-600 rounded"
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
          TAB 4: RIVER REVIEWS (5 STARS)
          ========================================================= */}
      {activeSubTab === 'river_reviews' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                <span>5-звёздочный народный рейтинг рек Югры и Ямала</span>
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Оценки и отзывы участников сплавов по природе, порогам, стоянкам и рыбалке.
              </p>
            </div>

            <button
              onClick={handleOpenRiverReviewModal}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Оценить реку</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {riverReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-[#E5E0D8] p-4 sm:p-5 shadow-xs space-y-3 hover:shadow-md transition-all flex flex-col justify-between"
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
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                        {renderStarRating(rev.ratingOverall)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm font-black text-[#2D5A27] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#2D5A27] shrink-0" />
                    <span>{rev.riverName}</span>
                  </div>

                  {/* Detailed Criterion Ratings */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-[#F9F7F4] p-2.5 rounded-xl border border-[#E5E0D8]/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">🌲 Природа:</span>
                      {renderStarRating(rev.ratingScenery, 5, 'w-3 h-3')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">⚡ Пороги:</span>
                      {renderStarRating(rev.ratingRapids, 5, 'w-3 h-3')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">⛺ Стоянки:</span>
                      {renderStarRating(rev.ratingCamps, 5, 'w-3 h-3')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B665F]">🎣 Рыбалка:</span>
                      {renderStarRating(rev.ratingFishing, 5, 'w-3 h-3')}
                    </div>
                  </div>

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
          TAB 5: LOGBOOK (MY TRIPS HISTORY)
          ========================================================= */}
      {activeSubTab === 'my_trips' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1A1F1A] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#2D5A27] shrink-0" />
                <span>Личный бортовой журнал пройденных рек</span>
              </h3>
              <p className="text-xs text-[#6B665F] mt-0.5">
                Хроника ваших водных походов, километраж, судно и личные заметки.
              </p>
            </div>

            <button
              onClick={() => {
                requireAuth(() => {
                  setTripFormRiver(routes[0]?.name || 'р. Собь');
                  setIsNewTripModalOpen(true);
                });
              }}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Записать сплав</span>
            </button>
          </div>

          {userTrips.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-[#DDD7CE] space-y-3">
              <Compass className="w-12 h-12 text-[#8B7E6D] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#1A1F1A]">История походов пока пуста</h3>
              <p className="text-xs text-[#8B7E6D] max-w-md mx-auto">
                Занесите пройденные реки в бортовой журнал, чтобы вести статистику километража и помнить каждый порог.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl border border-[#E5E0D8] p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F1E7] text-[#2D5A27]">
                        {trip.month} {trip.year} • {trip.region}
                      </span>
                      <h4 className="text-base font-bold text-[#1A1F1A] mt-1">{trip.riverName}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteLogbookTrip(trip.id)}
                      className="p-1 text-[#8B7E6D] hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#F9F7F4] p-2.5 rounded-xl border border-[#E5E0D8]/60">
                    <div>
                      <span className="text-[10px] text-[#8B7E6D] block">Дистанция</span>
                      <strong className="text-[#1A1F1A]">{trip.distanceKm} км</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8B7E6D] block">Дней</span>
                      <strong className="text-[#1A1F1A]">{trip.durationDays} дн.</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8B7E6D] block">Судно</span>
                      <strong className="text-[#1A1F1A] truncate block">{getVesselLabel(trip.vessel)}</strong>
                    </div>
                  </div>

                  {trip.personalNotes && (
                    <p className="text-xs text-[#4A443E] leading-relaxed italic">
                      "{trip.personalNotes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          MODAL: FULL NOTE READER & GALLERY
          ========================================================= */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#F4F1EA] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#E8F1E7] text-[#2D5A27]">
                    {NOTE_CATEGORY_INFO[viewingNote.category]?.label || 'Путевой отчет'}
                  </span>
                  {viewingNote.isPublic ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>Публичный отчет</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Личный дневник</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#1A1F1A] leading-snug">
                  {viewingNote.title}
                </h2>
              </div>

              <button
                onClick={() => setViewingNote(null)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Author & River Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#F9F7F4] p-3 rounded-xl border border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                {viewingNote.authorAvatar ? (
                  <img
                    src={viewingNote.authorAvatar}
                    alt={viewingNote.authorName}
                    className="w-7 h-7 rounded-full object-cover border border-[#CDE0CC]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-xs font-bold">
                    {(viewingNote.authorName || 'Т').charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-[#1A1F1A]">{viewingNote.authorName || 'Турист'}</div>
                  <div className="text-[10px] text-[#8B7E6D]">{viewingNote.date || viewingNote.createdAt}</div>
                </div>
              </div>

              {viewingNote.riverName && (
                <div className="flex items-center gap-1.5 text-[#2D5A27] font-bold">
                  <MapPin className="w-4 h-4 text-[#2D5A27]" />
                  <span>{viewingNote.riverName} ({viewingNote.region || 'Север'})</span>
                </div>
              )}
            </div>

            {/* Key Expedition Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5E0D8]">
                <span className="text-[10px] text-[#8B7E6D] block">Дистанция</span>
                <strong className="text-[#1A1F1A] font-bold">{viewingNote.distanceKm || '—'} км</strong>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5E0D8]">
                <span className="text-[10px] text-[#8B7E6D] block">Длительность</span>
                <strong className="text-[#1A1F1A] font-bold">{viewingNote.durationDays || '—'} дн.</strong>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5E0D8]">
                <span className="text-[10px] text-[#8B7E6D] block">Судно</span>
                <strong className="text-[#1A1F1A] font-bold">{getVesselLabel(viewingNote.vesselType)}</strong>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5E0D8]">
                <span className="text-[10px] text-[#8B7E6D] block">Уровень воды</span>
                <strong className="text-[#2D5A27] font-bold">{getWaterLevelLabel(viewingNote.waterLevel)}</strong>
              </div>
            </div>

            {/* Photo Gallery in modal */}
            {viewingNote.photos && viewingNote.photos.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#8B7E6D] uppercase tracking-wider block">
                  Фотографии из похода ({viewingNote.photos.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewingNote.photos.map((ph, idx) => (
                    <img
                      key={idx}
                      src={ph}
                      alt={`${viewingNote.title} - фото ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-cover rounded-xl border border-[#E5E0D8]"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Main Narrative */}
            <div className="space-y-2 text-xs sm:text-sm text-[#2D332D] leading-relaxed">
              <span className="text-[11px] font-bold text-[#8B7E6D] uppercase tracking-wider block">
                Отчет и путевой рассказ:
              </span>
              <p className="whitespace-pre-line bg-[#FAF7F2] p-4 rounded-xl border border-[#E5E0D8]">
                {viewingNote.content}
              </p>
            </div>

            {/* Practical Advice */}
            {viewingNote.practicalTips && (
              <div className="bg-[#E8F1E7]/70 p-4 rounded-xl border border-[#CDE0CC] text-xs text-[#1E431B] space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Полезные советы и координаты последователям:</span>
                </div>
                <p className="whitespace-pre-line leading-relaxed">
                  {viewingNote.practicalTips}
                </p>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#F4F1EA]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleLikeNote(viewingNote.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs border border-rose-200"
                >
                  <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                  <span>Полезно ({viewingNote.likesCount || 0})</span>
                </button>
                <button
                  onClick={() => handleCopyNoteLink(viewingNote.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F9F7F4] text-[#6B665F] hover:text-[#2D5A27] font-bold text-xs border border-[#E5E0D8]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Поделиться</span>
                </button>
              </div>

              {onOpenRouteDetails && viewingNote.riverName && (
                <button
                  onClick={() => {
                    const match = routes.find(
                      (r) => viewingNote.riverName && r.name.toLowerCase().includes(viewingNote.riverName.toLowerCase())
                    );
                    if (match) {
                      setViewingNote(null);
                      onOpenRouteDetails(match);
                    } else {
                      alert(`Маршрут ${viewingNote.riverName} в каталоге рек.`);
                    }
                  }}
                  className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Посмотреть реку в каталоге</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CREATE / EDIT TRAVEL NOTE OR DIARY ENTRY
          ========================================================= */}
      {isNewNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2D5A27]" />
                <span>{editingNote ? 'Редактировать отчет / запись' : 'Новый путевой отчет / дневник'}</span>
              </h3>
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* PRIVACY TOGGLE (CRITICAL FEATURE) */}
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E5E0D8] space-y-2">
              <span className="block text-xs font-bold text-[#1A1F1A]">
                Видимость записи (Публично или Лично):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNoteFormIsPublic(true)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    noteFormIsPublic
                      ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs'
                      : 'bg-white text-[#6B665F] border-[#E5E0D8] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>🌐 Опубликовать для всех</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNoteFormIsPublic(false)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !noteFormIsPublic
                      ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs'
                      : 'bg-white text-[#6B665F] border-[#E5E0D8] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>🔒 Только для меня (Личная заметка)</span>
                </button>
              </div>
              <p className="text-[11px] text-[#8B7E6D]">
                {noteFormIsPublic
                  ? 'Заметка будет опубликована в общей ленте сообщества SPLAV86 и поможет другим туристам.'
                  : 'Заметка сохранится в ваши личные закрытые заметки и будет видна только вам.'}
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              
              {/* Note Title */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Заголовок отчета / заметки *</label>
                <input
                  type="text"
                  placeholder="Например: Собь в июльскую воду: порог Опасный, стоянки и хариус"
                  value={noteFormTitle}
                  onChange={(e) => setNoteFormTitle(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>

              {/* River, Region & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река / Маршрут</label>
                  <input
                    type="text"
                    placeholder="р. Собь, р. Тромъёган..."
                    value={noteFormRiver}
                    onChange={(e) => setNoteFormRiver(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Регион</label>
                  <select
                    value={noteFormRegion}
                    onChange={(e) => setNoteFormRegion(e.target.value as Region)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2.5 py-2 text-xs font-bold text-[#1A1F1A] outline-none"
                  >
                    <option value="ХМАО">ХМАО — Югра</option>
                    <option value="ЯНАО">ЯНАО — Ямал</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Тип записи *</label>
                  <select
                    value={noteFormCategory}
                    onChange={(e) => setNoteFormCategory(e.target.value as any)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs font-bold text-[#1A1F1A] outline-none"
                  >
                    <option value="expedition_report">📖 Путевой отчет</option>
                    <option value="trip_impressions">📝 Путевой очерк</option>
                    <option value="secret_camp">⛺ Стоянки и координаты</option>
                    <option value="fishing_spots">🎣 Рыбалка и снасти</option>
                    <option value="gear_lessons">⚠️ Снаряжение и ошибки</option>
                    <option value="safety_warning">🛡️ Безопасность и связь</option>
                    <option value="future_idea">💡 Идея на будущее</option>
                  </select>
                </div>
              </div>

              {/* Vessel, Distance, Days, Water Level */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Судно</label>
                  <select
                    value={noteFormVessel}
                    onChange={(e) => setNoteFormVessel(e.target.value as VesselType)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs font-bold text-[#1A1F1A] outline-none"
                  >
                    <option value="kayak">Байдарка</option>
                    <option value="catamaran">Катамаран</option>
                    <option value="packraft">Паккрафт</option>
                    <option value="sup">SUP-борд</option>
                    <option value="raft">Рафт</option>
                    <option value="motorboat">Моторка</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Км по воде</label>
                  <input
                    type="number"
                    value={noteFormDistance}
                    onChange={(e) => setNoteFormDistance(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2.5 py-2 text-xs text-[#1A1F1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Дней</label>
                  <input
                    type="number"
                    value={noteFormDuration}
                    onChange={(e) => setNoteFormDuration(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2.5 py-2 text-xs text-[#1A1F1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Уровень воды</label>
                  <select
                    value={noteFormWaterLevel}
                    onChange={(e) => setNoteFormWaterLevel(e.target.value as any)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs font-bold text-[#1A1F1A] outline-none"
                  >
                    <option value="normal">Средняя вода</option>
                    <option value="high">Высокая вода</option>
                    <option value="low">Межень (низкая)</option>
                  </select>
                </div>
              </div>

              {/* Main Content */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Текст путевого отчета / впечатлений *</label>
                <textarea
                  rows={5}
                  placeholder="Опишите подробно прохождение маршрута, состояние реки, пороги, стоянки, погоду, рыбалку..."
                  value={noteFormContent}
                  onChange={(e) => setNoteFormContent(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white resize-none"
                />
              </div>

              {/* Practical Tips */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Практические советы и координаты (для последователей)</label>
                <textarea
                  rows={2}
                  placeholder="Где брать чистую воду, контакты заброски, опасные завалы, где ловит связь..."
                  value={noteFormTips}
                  onChange={(e) => setNoteFormTips(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27] focus:bg-white resize-none"
                />
              </div>

              {/* Photos URL Input */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Фотографии похода (URL)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={photoInputUrl}
                    onChange={(e) => setPhotoInputUrl(e.target.value)}
                    className="flex-1 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="px-3.5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl"
                  >
                    + Фото
                  </button>
                </div>

                {noteFormPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {noteFormPhotos.map((ph, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#E5E0D8]">
                        <img src={ph} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoUrl(i)}
                          className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Теги (через запятую)</label>
                <input
                  type="text"
                  placeholder="Собь, ПолярныйУрал, Хариус, Катамаран"
                  value={noteFormTags}
                  onChange={(e) => setNoteFormTags(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {noteFormIsPublic ? 'Опубликовать для всех' : 'Сохранить в личный дневник'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ADD RIVER REVIEW
          ========================================================= */}
      {isRiverReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#E5E0D8]">
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

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Река / Маршрут *</label>
                <input
                  type="text"
                  placeholder="р. Собь, р. Казым, р. Лямин..."
                  value={reviewRiverName}
                  onChange={(e) => setReviewRiverName(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Общая оценка (от 1 до 5 звёзд) *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewOverall(st)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${st <= reviewOverall ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">🌲 Природа (1-5)</label>
                  <select
                    value={reviewScenery}
                    onChange={(e) => setReviewScenery(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-1.5 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} звёзд
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">⚡ Пороги (1-5)</label>
                  <select
                    value={reviewRapids}
                    onChange={(e) => setReviewRapids(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-1.5 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} звёзд
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">⛺ Стоянки (1-5)</label>
                  <select
                    value={reviewCamps}
                    onChange={(e) => setReviewCamps(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-1.5 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} звёзд
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">🎣 Рыбалка (1-5)</label>
                  <select
                    value={reviewFishing}
                    onChange={(e) => setReviewFishing(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-1.5 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} звёзд
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Текст отзыва о реке *</label>
                <textarea
                  rows={3}
                  placeholder="Опишите характер реки, течение, дно, чистоту берегов..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#1A1F1A] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Совет туристам</label>
                <input
                  type="text"
                  placeholder="Например: Брать репелленты от мошки и запасные лопасти весел"
                  value={reviewAdvice}
                  onChange={(e) => setReviewAdvice(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsRiverReviewModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveRiverReview}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl"
              >
                Опубликовать оценку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ADD LOGBOOK COMPLETED TRIP
          ========================================================= */}
      {isNewTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#2D5A27]" />
                <span>Записать пройденный сплав</span>
              </h3>
              <button
                onClick={() => setIsNewTripModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Река *</label>
                  <input
                    type="text"
                    value={tripFormRiver}
                    onChange={(e) => setTripFormRiver(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Регион</label>
                  <select
                    value={tripFormRegion}
                    onChange={(e) => setTripFormRegion(e.target.value as any)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs font-bold"
                  >
                    <option value="ХМАО">ХМАО — Югра</option>
                    <option value="ЯНАО">ЯНАО — Ямал</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Год</label>
                  <input
                    type="number"
                    value={tripFormYear}
                    onChange={(e) => setTripFormYear(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Месяц</label>
                  <select
                    value={tripFormMonth}
                    onChange={(e) => setTripFormMonth(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-1.5 py-2 text-xs font-bold"
                  >
                    {['Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Дней</label>
                  <input
                    type="number"
                    value={tripFormDays}
                    onChange={(e) => setTripFormDays(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1F1A] mb-1">Км</label>
                  <input
                    type="number"
                    value={tripFormDistance}
                    onChange={(e) => setTripFormDistance(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-2 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Личные заметки к сплаву</label>
                <textarea
                  rows={3}
                  value={tripFormNotes}
                  onChange={(e) => setTripFormNotes(e.target.value)}
                  placeholder="Впечатления, состав экипажа, погода..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#1A1F1A] outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
              <button
                onClick={() => setIsNewTripModalOpen(false)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveLogbookTrip}
                className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl"
              >
                Сохранить в журнал
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          CONFIRMATION DIALOG MODAL
          ========================================================= */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-[#E5E0D8] text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-[#1A1F1A]">{confirmModal.title}</h3>
            <p className="text-xs text-[#6B665F] leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl"
              >
                {confirmModal.cancelText || 'Отмена'}
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-colors ${
                  confirmModal.confirmVariant === 'primary' ? 'bg-[#2D5A27] hover:bg-[#3D7136]' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.confirmText || 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
