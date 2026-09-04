import React, { useState, useMemo } from 'react';
import {
  AppUser,
  VesselType,
  CrewReview,
  LogbookTrip,
  CompanionTrip,
  RiverRoute
} from '../types';
import {
  X,
  User,
  MapPin,
  Compass,
  Award,
  ShieldCheck,
  Send,
  Phone,
  Calendar,
  CheckCircle2,
  Anchor,
  Flame,
  Star,
  Sparkles,
  Heart,
  Navigation,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Plus,
  ThumbsUp,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UserProfileModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  crewReviews?: CrewReview[];
  trips?: CompanionTrip[];
  logbookTrips?: LogbookTrip[];
  routes?: RiverRoute[];
  onSelectRoute?: (route: RiverRoute) => void;
  onOpenInviteModal?: (user: AppUser) => void;
  onAddCrewReview?: (review: CrewReview) => void;
  onDeleteCrewReview?: (reviewId: string) => void;
  onOpenAuth?: () => void;
}

const VESSEL_LABELS: Record<VesselType, { name: string; emoji: string; desc: string }> = {
  catamaran: { name: 'Катамаран', emoji: '⛵', desc: 'Сплавной 4/6-местный катамаран' },
  kayak: { name: 'Байдарка / Каяк', emoji: '🛶', desc: 'Каркасная или надувная байдарка' },
  packraft: { name: 'Пакрафт', emoji: '🎒', desc: 'Легкий экспедиционный пакрафт' },
  sup: { name: 'SUP-борд', emoji: '🏄', desc: 'Надувная САП-доска для гладкой воды' },
  motorboat: { name: 'Лодка ПВХ / Мотор', emoji: '🚤', desc: 'Моторная лодка или водомет' },
  raft: { name: 'Рафт', emoji: '🛟', desc: 'Многоместный надувной рафт' }
};

const DEFAULT_BADGES_MAP: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  '🔥 Мастер костра': { label: 'Мастер костра', icon: '🔥', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', desc: 'Разведет костер в любой дождь и мороз' },
  '🧭 Надежный штурман': { label: 'Надежный штурман', icon: '🧭', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', desc: 'Безупречное чтение лоции и карты' },
  '🍲 Шеф-повар сплава': { label: 'Шеф-повар', icon: '🍲', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', desc: 'Вкусно накормит экипаж в тайге' },
  '⚓ Капитан судна': { label: 'Капитан судна', icon: '⚓', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', desc: 'Опыт руководства экипажем на воде' },
  '💪 Мощный гребец': { label: 'Мощный гребец', icon: '💪', color: 'bg-red-500/10 text-red-600 border-red-500/30', desc: 'Вынослив на многокилометровых переходах' },
  '⛺ Знаток стоянок': { label: 'Знаток стоянок', icon: '⛺', color: 'bg-teal-500/10 text-teal-600 border-teal-500/30', desc: 'Найдет сухую и укрытую поляну' },
  '🐟 Рыбак Севера': { label: 'Рыбак Севера', icon: '🐟', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30', desc: 'Ловит хариуса, щуку и окуня' },
  '📸 Летописец экспедиций': { label: 'Летописец', icon: '📸', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', desc: 'Создает красивые фото и видеоотчеты' },
  '⚡ Первая помощь': { label: 'Первая помощь', icon: '⚡', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30', desc: 'Навыки полевой медицины и спасения' },
  '🏔 Полярный Урал': { label: 'Полярный Урал', icon: '🏔', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30', desc: 'Пройдены сложные горные реки ЯНАО' }
};

const AVAILABLE_REVIEW_TAGS = [
  '💪 Мощный гребец',
  '🔥 Мастер костра',
  '🍲 Шеф-повар сплава',
  '🧭 Надежный штурман',
  '🎸 Душа компании',
  '⛺ Быстро ставит лагерь',
  '🪓 Отличный дровосек',
  '🩺 Надежная опора',
  '⚓ Четкий капитан'
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  currentUser,
  crewReviews = [],
  trips = [],
  logbookTrips = [],
  routes = [],
  onSelectRoute,
  onOpenInviteModal,
  onAddCrewReview,
  onDeleteCrewReview,
  onOpenAuth
}) => {
  if (!isOpen || !user) return null;

  // Local state for leaving a review directly from the modal
  const [isReviewFormOpen, setIsReviewFormOpen] = useState<boolean>(false);
  const [reviewTripTitle, setReviewTripTitle] = useState<string>('');
  const [ratingOverall, setRatingOverall] = useState<number>(5);
  const [ratingPaddling, setRatingPaddling] = useState<number>(5);
  const [ratingCampSkills, setRatingCampSkills] = useState<number>(5);
  const [ratingTeamwork, setRatingTeamwork] = useState<number>(5);
  const [ratingPunctuality, setRatingPunctuality] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['💪 Мощный гребец', '🔥 Мастер костра']);
  const [reviewSavedSuccess, setReviewSavedSuccess] = useState<boolean>(false);

  // Effective reviews combining passed prop and local storage fallback
  const allCrewReviews = useMemo(() => {
    const map = new Map<string, CrewReview>();
    (crewReviews || []).forEach((r) => {
      if (!r.isDeleted) {
        map.set(r.id, r);
      }
    });
    try {
      const stored = localStorage.getItem('splav86_crew_reviews_v2');
      if (stored) {
        const list: CrewReview[] = JSON.parse(stored);
        if (Array.isArray(list)) {
          list.forEach((r) => {
            if (r.isDeleted) {
              map.delete(r.id);
            } else {
              map.set(r.id, r);
            }
          });
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return Array.from(map.values()).filter(r => !r.isDeleted);
  }, [crewReviews]);

  // Reviews targeting this user (robust matching by ID, Email, Name, Callsign)
  const userReviews = useMemo(() => {
    return allCrewReviews.filter((r) => {
      if (!user) return false;
      const targetId = (r.targetUserId || '').trim().toLowerCase();
      const userId = (user.id || '').trim().toLowerCase();
      const userEmail = (user.email || '').trim().toLowerCase();
      const targetName = (r.targetUserName || '').trim().toLowerCase();
      const userName = (user.name || '').trim().toLowerCase();
      const userCallsign = (user.callsign || '').trim().toLowerCase();

      if (targetId && targetId === userId) return true;
      if (targetId && userEmail && targetId === userEmail) return true;
      if (targetName && userName && (targetName === userName || userName.includes(targetName) || targetName.includes(userName))) return true;
      if (targetName && userCallsign && (targetName === userCallsign || targetName.includes(userCallsign))) return true;
      if (targetId && userCallsign && targetId === userCallsign) return true;
      return false;
    });
  }, [allCrewReviews, user]);

  const averageRating =
    userReviews.length > 0
      ? (userReviews.reduce((acc, r) => acc + r.ratingOverall, 0) / userReviews.length).toFixed(1)
      : null;

  // Trips organized or joined by this user
  const userOrganizedTrips = trips.filter(
    (t) =>
      (t.organizer.userId && t.organizer.userId === user.id) ||
      (t.organizer.name && user.name && t.organizer.name.toLowerCase() === user.name.toLowerCase())
  );

  const userJoinedTrips = trips.filter((t) =>
    t.participants.some(
      (p) =>
        (p.userId && p.userId === user.id) ||
        (p.name && user.name && p.name.toLowerCase() === user.name.toLowerCase())
    )
  );

  // Clean Telegram link
  const cleanTelegram = user.telegram
    ? user.telegram.replace('@', '').replace('https://t.me/', '').trim()
    : null;

  const isSelf = currentUser?.id === user.id || (currentUser?.name && user.name && currentUser.name.toLowerCase() === user.name.toLowerCase());
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin';
  const canSeePhone = isSelf || isAdmin || user.showContactsPublicly;

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!reviewComment.trim()) {
      alert('Пожалуйста, напишите пару слов о совместном сплаве с туристом.');
      return;
    }

    const calculatedOverall = Math.round(
      (ratingOverall + ratingPaddling + ratingCampSkills + ratingTeamwork + ratingPunctuality) / 5
    );

    const newReview: CrewReview = {
      id: `rev-c-${Date.now()}`,
      tripTitle: reviewTripTitle.trim() || 'Совместный сплав по рекам Севера',
      targetUserId: user.id,
      targetUserName: user.name,
      targetUserAvatar: user.avatar,
      authorUserId: currentUser.id,
      authorUserName: currentUser.name || 'Товарищ по веслу',
      authorAvatar: currentUser.avatar,
      date: new Date().toISOString().split('T')[0],
      ratingOverall: calculatedOverall,
      ratingPaddling: ratingPaddling,
      ratingCampSkills: ratingCampSkills,
      ratingTeamwork: ratingTeamwork,
      ratingPunctuality: ratingPunctuality,
      tags: selectedTags,
      comment: reviewComment.trim()
    };

    if (onAddCrewReview) {
      onAddCrewReview(newReview);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.log('Confetti error:', err);
    }

    setReviewSavedSuccess(true);
    setIsReviewFormOpen(false);
    setReviewComment('');
  };

  const handleDeleteReviewClick = (rev: CrewReview) => {
    if (onDeleteCrewReview) {
      onDeleteCrewReview(rev.id);
    }
  };

  // Determine if currentUser can delete a specific review:
  // Allowed: Author of review, recipient (target user), or club admin
  const canDeleteSpecificReview = (rev: CrewReview): boolean => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    if (currentUser.id === rev.authorUserId) return true;
    if (currentUser.name && rev.authorUserName && currentUser.name.toLowerCase() === rev.authorUserName.toLowerCase()) return true;
    if (currentUser.id === user.id) return true;
    if (currentUser.id === rev.targetUserId) return true;
    if (currentUser.name && rev.targetUserName && currentUser.name.toLowerCase() === rev.targetUserName.toLowerCase()) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-[3300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white border-t sm:border border-[#E5E0D8] rounded-t-[28px] sm:rounded-[32px] max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col h-[92dvh] sm:h-auto sm:max-h-[88vh] my-0 sm:my-auto text-[#2D332D] relative animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
        
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 p-2 bg-black/40 hover:bg-black/70 active:scale-95 text-white rounded-full transition-all shadow-md backdrop-blur-xs cursor-pointer"
          title="Закрыть визитку"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HERO COVER HEADER (COMPACT ON MOBILE) */}
        <div className="relative bg-gradient-to-br from-[#1E3B1B] via-[#2D5A27] to-[#173014] text-white px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-6 shrink-0 overflow-hidden">
          {/* Topographic river lines decor */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#86efac_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6 text-center sm:text-left">
            {/* User Avatar with Border & Status Dot */}
            <div className="relative shrink-0">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={user.name}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover border-3 border-white/80 shadow-xl"
              />
              {user.isReadyForExpeditions !== false ? (
                <span
                  className="absolute -bottom-1.5 -right-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] sm:text-[10px] shadow-md border-2 border-white flex items-center gap-1"
                  title="Готов к участию в сплавах и экспедициях"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Готов к сплаву
                </span>
              ) : (
                <span
                  className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-gray-600 text-white font-bold text-[9px] sm:text-[10px] shadow-md border-2 border-white"
                  title="Временно занят"
                >
                  Вне сезона
                </span>
              )}
            </div>

            {/* Name, Callsign, City & Ranks */}
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                  {user.name}
                </h2>
                {user.callsign && (
                  <span className="px-2 py-0.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] sm:text-xs font-bold font-mono">
                    «{user.callsign}»
                  </span>
                )}
              </div>

              {/* Role & FSTR Rank Badge */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs">
                {user.role === 'superadmin' ? (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-black font-black text-[10px] sm:text-[11px] flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3" />
                    Администратор клуба
                  </span>
                ) : user.role === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-400 text-black font-black text-[10px] sm:text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Модератор
                  </span>
                ) : null}

                {user.fstrRank ? (
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white font-bold text-[10px] sm:text-[11px] flex items-center gap-1 border border-white/20">
                    <Award className="w-3 h-3 text-amber-300" />
                    {user.fstrRank}
                  </span>
                ) : null}

                <span className="text-emerald-200 text-xs flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  {user.city || 'ХМАО / ЯНАО'}
                </span>
              </div>

              {/* Experience subtitle */}
              <p className="text-[11px] sm:text-xs text-white/80 font-medium line-clamp-1">
                {user.experienceLevel || 'Любитель водных сплавов'} • В сообществе с {user.registeredAt || '2026 г.'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="mt-3.5 sm:mt-5 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
            <div className="bg-black/30 backdrop-blur-xs rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-white/10">
              <span className="block text-[9px] sm:text-[10px] text-white/70 font-semibold truncate">Организовал сплавов</span>
              <strong className="text-xs sm:text-base font-black text-white">{userOrganizedTrips.length}</strong>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-white/10">
              <span className="block text-[9px] sm:text-[10px] text-white/70 font-semibold truncate">В экипажах</span>
              <strong className="text-xs sm:text-base font-black text-white">{userJoinedTrips.length}</strong>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-white/10">
              <span className="block text-[9px] sm:text-[10px] text-white/70 font-semibold truncate">Рейтинг экипажа</span>
              <strong className="text-xs sm:text-base font-black text-amber-300 flex items-center justify-center gap-1">
                {averageRating ? (
                  <>
                    <Star className="w-3 h-3 fill-amber-300" />
                    <span>{averageRating}</span>
                    <span className="text-[9px] sm:text-[10px] text-white/60 font-normal">({userReviews.length})</span>
                  </>
                ) : (
                  <span className="text-[10px] sm:text-xs text-white/70 font-normal">Новый турист</span>
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* SCROLLABLE BODY CONTENT (FLUID MOBILE SCROLL) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5 divide-y divide-[#E5E0D8] touch-pan-y">
          
          {/* SECTION 1: BIO & EXPEDITION STYLE */}
          <div className="space-y-2 pt-1 first:pt-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#2D5A27]" />
              О себе и стиле сплавов
            </h3>
            {user.bio ? (
              <p className="text-xs sm:text-sm text-[#2D332D] leading-relaxed bg-[#F9F7F4] p-3 sm:p-3.5 rounded-2xl border border-[#EEEBE6] whitespace-pre-line">
                {user.bio}
              </p>
            ) : (
              <p className="text-xs text-[#8B7E6D] italic bg-[#F9F7F4] p-3 rounded-2xl border border-[#EEEBE6]">
                Турист еще не заполнил подробное описание своего опыта сплавов.
              </p>
            )}
          </div>

          {/* SECTION 2: BADGES & SPECIALIZATIONS */}
          {((user.badges && user.badges.length > 0) || (user.experienceLevel && user.experienceLevel.includes('Инструктор'))) && (
            <div className="space-y-2 pt-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Знаки отличия и сплавные навыки
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(user.badges || []).map((badgeKey, idx) => {
                  const badgeInfo = DEFAULT_BADGES_MAP[badgeKey] || {
                    label: badgeKey,
                    icon: '🎖',
                    color: 'bg-emerald-500/10 text-[#2D5A27] border-emerald-500/30',
                    desc: 'Подтвержденный навык'
                  };
                  return (
                    <div
                      key={idx}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-2xs ${badgeInfo.color}`}
                      title={badgeInfo.desc}
                    >
                      <span className="text-sm">{badgeInfo.icon}</span>
                      <span>{badgeInfo.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: PERSONAL FLEET (VESSELS) */}
          <div className="space-y-2 pt-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-[#2D5A27]" />
              Личный флот и средства сплава
            </h3>
            {user.vesselsOwned && user.vesselsOwned.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {user.vesselsOwned.map((vesselType) => {
                  const info = VESSEL_LABELS[vesselType] || { name: vesselType, emoji: '🛶', desc: 'Плавсредство' };
                  return (
                    <div
                      key={vesselType}
                      className="flex items-center gap-2.5 p-2 sm:p-2.5 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6]"
                    >
                      <span className="text-lg sm:text-xl p-1.5 bg-white rounded-xl border border-[#E5E0D8] shrink-0">
                        {info.emoji}
                      </span>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-[#1A1F1A] truncate">{info.name}</h4>
                        <p className="text-[10px] text-[#6B665F] truncate">{info.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#8B7E6D] bg-[#F9F7F4] p-3 rounded-2xl border border-[#EEEBE6]">
                Плавсредства не указаны (ходит на судах организаторов или арендованном снаряжении).
              </p>
            )}
          </div>

          {/* SECTION 4: GEAR ARSENAL */}
          {user.gearInventory && user.gearInventory.length > 0 && (
            <div className="space-y-2 pt-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27]" />
                Личный сплавной арсенал & Снаряжение
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {user.gearInventory.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 sm:px-2.5 py-1 bg-[#E8F1E7] text-[#2D5A27] text-[11px] sm:text-xs font-medium rounded-xl border border-[#CDE0CC] flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#2D5A27]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: FAVORITE RIVERS */}
          {user.favoriteRivers && user.favoriteRivers.length > 0 && (
            <div className="space-y-2 pt-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Любимые реки Севера
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {user.favoriteRivers.map((riv, idx) => {
                  const matchedRoute = routes.find(
                    (r) => r.riverName.toLowerCase() === riv.toLowerCase() || r.name.toLowerCase().includes(riv.toLowerCase())
                  );
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (matchedRoute && onSelectRoute) {
                          onClose();
                          onSelectRoute(matchedRoute);
                        }
                      }}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        matchedRoute
                          ? 'bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] border border-[#CDE0CC] cursor-pointer shadow-2xs'
                          : 'bg-[#F9F7F4] text-[#4A443E] border border-[#E5E0D8]'
                      }`}
                    >
                      <Navigation className="w-3 h-3 text-[#2D5A27]" />
                      <span>р. {riv}</span>
                      {matchedRoute && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 6: CREW REVIEWS (CLEAN TITLE WITHOUT STAR) */}
          <div className="space-y-3 pt-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                Отзывы экипажа и соратников ({userReviews.length})
              </h3>

              {!isSelf && (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      if (onOpenAuth) onOpenAuth();
                      return;
                    }
                    setIsReviewFormOpen((prev) => !prev);
                  }}
                  className="px-2.5 py-1 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isReviewFormOpen ? 'Скрыть форму' : 'Оставить отзыв'}</span>
                </button>
              )}
            </div>

            {/* NOTIFICATION ON SUCCESSFUL REVIEW */}
            {reviewSavedSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Спасибо! Ваш отзыв опубликован и учтен в рейтинге туриста.</span>
              </div>
            )}

            {/* INLINE REVIEW SUBMISSION FORM (ONLY AUTHENTICATED USERS) */}
            {isReviewFormOpen && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-[#F4EFE6]/80 p-4 rounded-2xl border border-[#DCD5C9] space-y-3.5 text-xs animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-[#DCD5C9] pb-2">
                  <span className="font-bold text-[#1A1F1A] flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-[#2D5A27]" />
                    Оценка туриста: {user.name}
                  </span>
                  <span className="text-[10px] text-[#8B7E6D]">Автор: {currentUser?.name || 'Вы'}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4A443E] mb-1">
                    Сплав / Река (необязательно)
                  </label>
                  <input
                    type="text"
                    value={reviewTripTitle}
                    onChange={(e) => setReviewTripTitle(e.target.value)}
                    placeholder="Например: Сплав по реке Собь 2026"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#DCD5C9] text-xs focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
                  />
                </div>

                {/* Rating Criteria Sliders / Stars */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-[#DCD5C9]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#2D332D]">Гребля и техника воды:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRatingPaddling(star)}
                          className="p-0.5 focus:outline-none"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              star <= ratingPaddling
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#2D332D]">Обустройство лагеря & костер:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRatingCampSkills(star)}
                          className="p-0.5 focus:outline-none"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              star <= ratingCampSkills
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#2D332D]">Командность и атмосфера:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRatingTeamwork(star)}
                          className="p-0.5 focus:outline-none"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              star <= ratingTeamwork
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#2D332D]">Пунктуальность и сборы:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRatingPunctuality(star)}
                          className="p-0.5 focus:outline-none"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              star <= ratingPunctuality
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Badge Tags Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-[#4A443E] mb-1.5">
                    Отметить сильные стороны соратника:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_REVIEW_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-[#2D5A27] text-white shadow-xs'
                              : 'bg-white text-[#4A443E] border border-[#DCD5C9] hover:bg-[#EAE7E2]'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Review text */}
                <div>
                  <label className="block text-[11px] font-bold text-[#4A443E] mb-1">
                    Ваш отзыв и впечатления о совместном сплаве:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Например: Надежный товарищ на порогах, отлично управляется с веслом и всегда готов поддержать команду..."
                    required
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#DCD5C9] text-xs focus:ring-2 focus:ring-[#2D5A27] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReviewFormOpen(false)}
                    className="px-3 py-1.5 bg-white text-[#4A443E] font-bold rounded-xl border border-[#DCD5C9]"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Опубликовать отзыв</span>
                  </button>
                </div>
              </form>
            )}

            {/* REVIEWS LIST WITH DELETION PERMISSIONS */}
            {userReviews.length === 0 ? (
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] text-center text-xs text-[#8B7E6D] space-y-1.5">
                <p>О туристе пока нет публичных отзывов от соратников по сплавам.</p>
                <p className="text-[11px]">
                  Участники совместных сплавов могут оставить отзыв прямо здесь или в модуле «Заметки и отзывы».
                </p>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        if (onOpenAuth) onOpenAuth();
                        return;
                      }
                      setIsReviewFormOpen(true);
                    }}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D4E8D2] text-[#2D5A27] font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Будьте первым, кто оставит отзыв</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {userReviews.map((rev) => {
                  const canDelete = canDeleteSpecificReview(rev);
                  return (
                    <div key={rev.id} className="bg-[#F9F7F4] p-3 sm:p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2 text-xs relative group">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <img
                            src={rev.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                            alt={rev.authorUserName}
                            className="w-6 h-6 rounded-full object-cover border border-[#CDE0CC]"
                          />
                          <span className="font-bold text-[#1A1F1A]">{rev.authorUserName}</span>
                          <span className="text-[10px] text-[#8B7E6D]">• {rev.date}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-amber-500 font-black">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{rev.ratingOverall}.0</span>
                          </div>

                          {/* Delete button: Visible for author, recipient or admin */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReviewClick(rev)}
                              className="p-1 text-[#8B7E6D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Удалить отзыв (доступно автору, получателю и администратору)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[#2D332D] italic">«{rev.comment}»</p>

                      {rev.tags && rev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {rev.tags.map((t, tidx) => (
                            <span key={tidx} className="px-2 py-0.5 bg-white text-[10px] font-bold text-[#2D5A27] rounded-md border border-[#CDE0CC]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER ACTIONS BAR (CONNECT & INVITE) */}
        <div className="bg-[#F9F7F4] p-3.5 sm:p-4 border-t border-[#E5E0D8] flex flex-wrap items-center justify-between gap-2 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          {/* Direct Contacts */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {cleanTelegram && (
              <a
                href={`https://t.me/${cleanTelegram}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>@{cleanTelegram}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}

            {user.vk && (
              <a
                href={user.vk.startsWith('http') ? user.vk : `https://vk.com/${user.vk}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 sm:py-2 bg-[#4c75a3] hover:bg-[#436792] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>VK</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}

            {canSeePhone && user.phone && (
              <a
                href={`tel:${user.phone.replace(/[^0-9+]/g, '')}`}
                className="px-3 py-1.5 sm:py-2 bg-white hover:bg-[#EAE7E2] text-[#2D5A27] text-xs font-bold rounded-xl border border-[#CDE0CC] transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{user.phone}</span>
              </a>
            )}
          </div>

          {/* Close & Action button */}
          <div className="flex items-center gap-2 ml-auto">
            {onOpenInviteModal && !isSelf && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInviteModal(user);
                }}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Пригласить</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-white hover:bg-[#EAE7E2] text-[#2D332D] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
