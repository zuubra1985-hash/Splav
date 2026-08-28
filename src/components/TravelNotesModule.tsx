import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Star,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Tent,
  Fish,
  Shield,
  LifeBuoy,
  Flame,
  Share2,
  ChevronRight,
  Info,
  Users,
  Eye,
  RefreshCw,
  FileText,
  ShieldCheck,
  Globe,
  User,
  Heart,
  Image as ImageIcon,
  Droplets,
  Navigation,
  Check,
  MessageSquare
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
import { CentralSyncManager } from '../services/centralSyncManager';
import {
  mergeTravelNotes,
  mergeChecklistItems,
  mergeLogbookTrips,
  mergeRiverReviews,
  mergeCrewReviews,
  filterActiveEntities
} from '../utils/syncMerge';

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

  // Confirmation Modal
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

  // --- TRAVEL NOTES DERIVED STATE ---
  const allNotesList: TravelNote[] = useMemo(() => {
    if (notesConfig?.notes && notesConfig.notes.length > 0) {
      return filterActiveEntities<TravelNote>(notesConfig.notes);
    }
    try {
      const stored = localStorage.getItem('splav86_travel_notes_v3');
      return stored ? filterActiveEntities<TravelNote>(JSON.parse(stored)) : filterActiveEntities<TravelNote>(INITIAL_TRAVEL_NOTES);
    } catch {
      return filterActiveEntities<TravelNote>(INITIAL_TRAVEL_NOTES);
    }
  }, [notesConfig?.notes]);

  // Modals & Active items
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TravelNote | null>(null);
  const [viewingNote, setViewingNote] = useState<TravelNote | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Note Form Fields
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
  const [noteFormAuthorName, setNoteFormAuthorName] = useState('');
  const [noteFormPhotos, setNoteFormPhotos] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [noteFormPinned, setNoteFormPinned] = useState(false);

  // Sync with Firestore, CloudSQL & LocalStorage
  const syncUpdatedConfig = (updatedPartial: Partial<TravelNotesConfig>) => {
    const timestamp = new Date().toISOString();

    const fullNotes = updatedPartial.notes !== undefined
      ? mergeTravelNotes(notesConfig?.notes || [], updatedPartial.notes)
      : (notesConfig?.notes || allNotesList);

    const newConfig: TravelNotesConfig = {
      id: notesConfig?.id || 'splav86_travel_notes_main',
      notes: fullNotes,
      checklist: notesConfig?.checklist || INITIAL_CHECKLIST_ITEMS,
      logbookTrips: notesConfig?.logbookTrips || INITIAL_LOGBOOK_TRIPS,
      riverReviews: notesConfig?.riverReviews || INITIAL_RIVER_REVIEWS,
      crewReviews: notesConfig?.crewReviews || INITIAL_CREW_REVIEWS,
      updatedAt: timestamp,
      updatedBy: currentUser?.name || 'Турист'
    };

    if (setNotesConfig) {
      setNotesConfig(newConfig);
    }

    try {
      localStorage.setItem('splav86_travel_notes_config_v1', JSON.stringify(newConfig));
      if (updatedPartial.notes) {
        localStorage.setItem('splav86_travel_notes_v3', JSON.stringify(filterActiveEntities(fullNotes)));
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    CentralSyncManager.saveTravelNotes(newConfig).catch((err) => {
      console.warn('CentralSyncManager TravelNotes save error:', err);
    });
  };

  // Open creation modal
  const handleOpenNewNoteModal = (noteToEdit?: TravelNote) => {
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
      setNoteFormAuthorName(noteToEdit.authorName || currentUser?.name || 'Турист-исследователь');
      setNoteFormPhotos(noteToEdit.photos || []);
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
      setNoteFormAuthorName(currentUser?.name || 'Турист-исследователь');
      setNoteFormPhotos([]);
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

    const nowIso = new Date().toISOString();
    const tagsArray = noteFormTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const authorDisplayName = noteFormAuthorName.trim() || currentUser?.name || 'Турист-исследователь';

    if (editingNote) {
      const allNotes = notesConfig?.notes || allNotesList;
      const updatedNotes = allNotes.map((n) =>
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
              authorName: authorDisplayName,
              photos: noteFormPhotos,
              isPublic: true,
              isPinned: noteFormPinned,
              isDeleted: false,
              updatedAt: nowIso
            }
          : n
      );
      syncUpdatedConfig({ notes: updatedNotes });
    } else {
      const newNote: TravelNote = {
        id: `note-${Date.now()}`,
        userId: currentUser?.id || 'guest-user',
        authorName: authorDisplayName,
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
        isPublic: true,
        isPinned: noteFormPinned,
        isDeleted: false,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      const allNotes = notesConfig?.notes || allNotesList;
      const updatedNotes = [newNote, ...allNotes];
      syncUpdatedConfig({ notes: updatedNotes });
    }

    setIsNewNoteModalOpen(false);
    setEditingNote(null);
  };

  const handleToggleLikeNote = (noteId: string) => {
    const userId = currentUser?.id || 'guest-device';
    const nowIso = new Date().toISOString();
    const allNotes = notesConfig?.notes || allNotesList;
    const updatedNotes = allNotes.map((n) => {
      if (n.id === noteId) {
        const liked = (n.likedByUserIds || []).includes(userId);
        const newLikedList = liked
          ? (n.likedByUserIds || []).filter((id) => id !== userId)
          : [...(n.likedByUserIds || []), userId];
        return {
          ...n,
          likesCount: newLikedList.length,
          likedByUserIds: newLikedList,
          updatedAt: nowIso
        };
      }
      return n;
    });
    syncUpdatedConfig({ notes: updatedNotes });

    if (viewingNote && viewingNote.id === noteId) {
      setViewingNote((prev) => {
        if (!prev) return null;
        const liked = (prev.likedByUserIds || []).includes(userId);
        const newLikedList = liked
          ? (prev.likedByUserIds || []).filter((id) => id !== userId)
          : [...(prev.likedByUserIds || []), userId];
        return {
          ...prev,
          likesCount: newLikedList.length,
          likedByUserIds: newLikedList,
          updatedAt: nowIso
        };
      });
    }
  };

  const handleTogglePinNote = (noteId: string) => {
    const nowIso = new Date().toISOString();
    const allNotes = notesConfig?.notes || allNotesList;
    const updatedNotes = allNotes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          isPinned: !n.isPinned,
          updatedAt: nowIso
        };
      }
      return n;
    });
    syncUpdatedConfig({ notes: updatedNotes });
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = allNotesList.find((n) => n.id === noteId);
    askConfirmation({
      title: 'Удалить путевую заметку?',
      message: `Вы действительно хотите удалить заметку «${noteToDelete?.title || 'Без названия'}»? Запись будет перемещена в корзину.`,
      confirmText: 'Удалить заметку',
      confirmVariant: 'danger',
      onConfirm: () => {
        const nowIso = new Date().toISOString();
        const allNotes = notesConfig?.notes || allNotesList;
        const updatedNotes = allNotes.map((n) =>
          n.id === noteId ? { ...n, isDeleted: true, updatedAt: nowIso } : n
        );
        syncUpdatedConfig({ notes: updatedNotes });
        if (viewingNote?.id === noteId) {
          setViewingNote(null);
        }
      }
    });
  };

  const handleCopyNoteLink = (noteId: string) => {
    const url = `${window.location.origin}/#notes?id=${noteId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedNoteId(noteId);
      setTimeout(() => setCopiedNoteId(null), 2500);
    });
  };

  // Category Badges & Info
  const NOTE_CATEGORY_INFO: Record<
    TravelNote['category'],
    { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
  > = {
    expedition_report: { label: 'Путевой отчет', icon: BookOpen, color: 'text-sky-800', bg: 'bg-sky-50 border-sky-200' },
    trip_impressions: { label: 'Путевой очерк', icon: FileText, color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
    secret_camp: { label: 'Стоянка и бивак', icon: Tent, color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
    fishing_spots: { label: 'Рыбалка и места', icon: Fish, color: 'text-cyan-800', bg: 'bg-cyan-50 border-cyan-200' },
    gear_lessons: { label: 'Снаряжение и опыт', icon: AlertTriangle, color: 'text-rose-800', bg: 'bg-rose-50 border-rose-200' },
    safety_warning: { label: 'Безопасность и завалы', icon: Shield, color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200' },
    future_idea: { label: 'Идея маршрута', icon: Lightbulb, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    river_log: { label: 'Бортовой лог', icon: MapPin, color: 'text-indigo-800', bg: 'bg-indigo-50 border-indigo-200' }
  };

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

  // Displayed Notes: ALL active notes available to EVERY user (pinned first, then newest)
  const displayedNotes = useMemo(() => {
    return [...allNotesList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allNotesList]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      
      {/* =========================================================
          HERO HEADER & CREATE NOTE ACTION
          ========================================================= */}
      <div className="relative overflow-hidden bg-linear-to-r from-[#1A3816] via-[#2D5A27] to-[#1E431B] text-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-[#3D7136]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/20">
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              <span>Летописи и путевые отчеты рек Югры и Ямала</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Путевые заметки & отчеты о сплавах
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Живой опыт первопроходцев и походные отчеты: актуальный уровень воды, завалы, стоянки, рыбалка. Все заметки открыты для всех туристов и синхронизируются в реальном времени.
            </p>
          </div>

          {/* Primary Create Note Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              id="create-note-button"
              onClick={() => handleOpenNewNoteModal()}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Создать заметку</span>
            </button>
          </div>
        </div>

        {/* Decorative background icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
          <BookOpen className="w-56 h-56 text-white" />
        </div>
      </div>

      {/* =========================================================
          NOTES CARDS FEED (VISIBLE & SYNCED FOR EVERY USER)
          ========================================================= */}
      {displayedNotes.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-[#DDD7CE] space-y-3">
          <BookOpen className="w-12 h-12 text-[#8B7E6D] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#1A1F1A]">
            Пока нет опубликованных заметок
          </h3>
          <p className="text-xs text-[#8B7E6D] max-w-md mx-auto">
            Станьте первым, кто опубликует путевой отчет о сплаве или полезный совет для водников Севера!
          </p>
          <button
            onClick={() => handleOpenNewNoteModal()}
            className="px-5 py-2.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#3D7136] transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Создать первую заметку</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedNotes.map((note) => {
            const catInfo = NOTE_CATEGORY_INFO[note.category] || NOTE_CATEGORY_INFO.expedition_report;
            const CatIcon = catInfo.icon;
            const isAuthor = Boolean(currentUser && (currentUser.id === note.userId || currentUser.name === note.authorName));
            const canManage = isAuthor || isAdmin;
            const isLiked = Boolean(note.likedByUserIds && currentUser && note.likedByUserIds.includes(currentUser.id));
            const formattedDate = note.date || (note.createdAt ? note.createdAt.split('T')[0] : '2026');

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
                  
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catInfo.bg} ${catInfo.color}`}
                    >
                      <CatIcon className="w-3.5 h-3.5" />
                      <span>{catInfo.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {note.isPinned && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          📌 Закреплено
                        </span>
                      )}

                      {/* Pin / Edit / Delete for author or admin */}
                      {canManage && (
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
                      className="relative h-32 w-full rounded-xl overflow-hidden cursor-pointer group bg-stone-100"
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

                  {/* Stats Pills (Distance, Days, Vessel) */}
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
                  <p className="text-xs text-[#4A443E] leading-relaxed whitespace-pre-line line-clamp-3">
                    {note.content}
                  </p>

                  {/* Practical Tips Box if present */}
                  {note.practicalTips && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-[#1E431B] flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        <strong>Совет:</strong> {note.practicalTips}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: Author, Date, Likes, Share & Details */}
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
                      <span className="font-medium text-[#1A1F1A] truncate max-w-[130px]">
                        {note.authorName || 'Турист-исследователь'}
                      </span>
                    </div>

                    {/* Date */}
                    <span className="text-[10px] text-[#8B7E6D] shrink-0">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Bottom Row Actions */}
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

      {/* =========================================================
          MODAL: VIEW FULL TRAVEL NOTE
          ========================================================= */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#F4F1EA] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                    {NOTE_CATEGORY_INFO[viewingNote.category]?.label || 'Путевая заметка'}
                  </span>
                  {viewingNote.region && (
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F1EA] text-[#6B665F] text-xs font-bold">
                      {viewingNote.region}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#1A1F1A]">
                  {viewingNote.title}
                </h2>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1 rounded-lg hover:bg-[#F4F1EA]"
              >
                ✕
              </button>
            </div>

            {/* Author and River meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B665F] bg-[#F9F7F4] p-3 rounded-xl border border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-xs font-bold">
                  {(viewingNote.authorName || 'Т').charAt(0)}
                </div>
                <span className="font-bold text-[#1A1F1A]">
                  {viewingNote.authorName || 'Турист-исследователь'}
                </span>
                <span>•</span>
                <span>{viewingNote.date || (viewingNote.createdAt ? viewingNote.createdAt.split('T')[0] : '2026')}</span>
              </div>

              {viewingNote.riverName && (
                <div className="flex items-center gap-1 text-[#2D5A27] font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{viewingNote.riverName}</span>
                </div>
              )}
            </div>

            {/* Photos Gallery */}
            {viewingNote.photos && viewingNote.photos.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewingNote.photos.map((ph, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden h-48 border border-[#E5E0D8] bg-stone-100">
                      <img
                        src={ph}
                        alt="Photo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Content */}
            <div className="space-y-2 text-xs sm:text-sm text-[#1A1F1A] leading-relaxed">
              <span className="font-bold text-xs uppercase tracking-wider text-[#8B7E6D] block">
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
          MODAL: CREATE / EDIT TRAVEL NOTE (PUBLIC TO ALL)
          ========================================================= */}
      {isNewNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#E5E0D8] max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
              <h3 className="text-base font-black text-[#1A1F1A] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2D5A27]" />
                <span>{editingNote ? 'Редактировать путевую заметку' : 'Создать путевую заметку'}</span>
              </h3>
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="text-[#8B7E6D] hover:text-[#1A1F1A] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
              <Globe className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Заметка будет сохранена и сразу доступна всем пользователям с мгновенной синхронизацией.</span>
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
                    <option value="secret_camp">⛺ Стоянка и бивак</option>
                    <option value="fishing_spots">🎣 Рыбалка и приманки</option>
                    <option value="gear_lessons">⚠️ Снаряжение и опыт</option>
                    <option value="safety_warning">🛡️ Безопасность и завалы</option>
                    <option value="future_idea">💡 Идея маршрута</option>
                  </select>
                </div>
              </div>

              {/* Author name */}
              <div>
                <label className="block font-bold text-[#1A1F1A] mb-1">Автор заметки</label>
                <input
                  type="text"
                  placeholder="Ваше имя или позывной"
                  value={noteFormAuthorName}
                  onChange={(e) => setNoteFormAuthorName(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#1A1F1A] outline-none"
                />
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
                    className="px-3.5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#3D7136] cursor-pointer"
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
                          className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center cursor-pointer"
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
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl hover:bg-[#E5E0D8] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Опубликовать заметку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          CONFIRMATION MODAL
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
                className="px-4 py-2 bg-[#F4F1EA] text-[#6B665F] text-xs font-bold rounded-xl hover:bg-[#E5E0D8] cursor-pointer"
              >
                {confirmModal.cancelText || 'Отмена'}
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer ${
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
