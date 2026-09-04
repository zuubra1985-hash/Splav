import {
  TravelNote,
  ChecklistItem,
  LogbookTrip,
  RiverReview,
  CrewReview,
  TravelNotesConfig,
  RiverRoute,
  CompanionTrip,
  ArticleReport,
  AppUser,
  FaqDataConfig
} from '../types';

/**
 * Parses timestamps safely from ISO strings, YYYY-MM-DD, numbers or fallback.
 */
export function parseTimestamp(val?: string | number | null): number {
  if (!val) return 0;
  if (typeof val === 'number') {
    return val > 1e11 ? val : val * 1000; // detect seconds vs ms
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return parsed;
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) return num > 1e11 ? num : num * 1000;
  }
  return 0;
}

/**
 * Extracts the most accurate revision timestamp of an entity.
 */
export function getItemTimestamp(item: Record<string, any>): number {
  if (!item) return 0;
  return (
    parseTimestamp(item.updatedAt) ||
    parseTimestamp(item.lastPassportRevision) ||
    parseTimestamp(item.date) ||
    parseTimestamp(item.appliedAt) ||
    parseTimestamp(item.registeredAt) ||
    parseTimestamp(item.createdAt) ||
    parseTimestamp(item.timestamp) ||
    0
  );
}

/**
 * Generic LWW (Last-Write-Wins) per-item merger.
 * Prevents resurrection of soft-deleted items (isDeleted: true) when a newer deletion exists.
 * Compares exact timestamps for each element rather than overwriting entire arrays.
 */
export function mergeEntityList<
  T extends { id: string; isDeleted?: boolean; updatedAt?: string; createdAt?: string | number; [key: string]: any }
>(localItems: T[] = [], incomingItems: T[] = []): T[] {
  const mergedMap = new Map<string, T>();

  // 1. Populate with local items
  for (const item of localItems) {
    if (item && item.id) {
      mergedMap.set(item.id, { ...item });
    }
  }

  // 2. Reconcile with incoming items using precise per-item timestamp comparison
  for (const inc of incomingItems) {
    if (!inc || !inc.id) continue;

    const existing = mergedMap.get(inc.id);
    if (!existing) {
      mergedMap.set(inc.id, { ...inc });
      continue;
    }

    const localTime = getItemTimestamp(existing);
    const incTime = getItemTimestamp(inc);

    if (incTime > localTime) {
      // Incoming is strictly fresher
      mergedMap.set(inc.id, {
        ...existing,
        ...inc,
        // If incoming explicitly marked isDeleted, it wins
        isDeleted: inc.isDeleted === true ? true : (existing.isDeleted && inc.isDeleted === undefined ? existing.isDeleted : inc.isDeleted)
      });
    } else if (localTime > incTime) {
      // Local is strictly fresher - keep local modifications
      mergedMap.set(inc.id, {
        ...inc,
        ...existing,
        isDeleted: existing.isDeleted === true ? true : (inc.isDeleted && existing.isDeleted === undefined ? inc.isDeleted : existing.isDeleted)
      });
    } else {
      // Identical timestamps: Merge properties without losing soft-deletion status
      const isDeleted = existing.isDeleted === true || inc.isDeleted === true;
      mergedMap.set(inc.id, {
        ...existing,
        ...inc,
        isDeleted
      });
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Filters out soft-deleted entities for UI rendering.
 */
export function filterActiveEntities<T extends { isDeleted?: boolean }>(items: T[] = []): T[] {
  return items.filter((item) => !item || item.isDeleted !== true);
}

/**
 * Filters and returns only soft-deleted entities for Recycle Bin / recovery.
 */
export function filterDeletedEntities<T extends { isDeleted?: boolean }>(items: T[] = []): T[] {
  return items.filter((item) => item && item.isDeleted === true);
}

/**
 * Merges TravelNotes item-by-item with timestamp comparison.
 */
export function mergeTravelNotes(local: TravelNote[] = [], incoming: TravelNote[] = []): TravelNote[] {
  return mergeEntityList(local, incoming);
}

/**
 * Merges ChecklistItems item-by-item with timestamp comparison.
 */
export function mergeChecklistItems(local: ChecklistItem[] = [], incoming: ChecklistItem[] = []): ChecklistItem[] {
  return mergeEntityList(local, incoming);
}

/**
 * Merges LogbookTrips item-by-item with timestamp comparison.
 */
export function mergeLogbookTrips(local: LogbookTrip[] = [], incoming: LogbookTrip[] = []): LogbookTrip[] {
  return mergeEntityList(local, incoming);
}

/**
 * Merges RiverReviews item-by-item with timestamp comparison.
 */
export function mergeRiverReviews(local: RiverReview[] = [], incoming: RiverReview[] = []): RiverReview[] {
  return mergeEntityList(local, incoming);
}

/**
 * Merges CrewReviews item-by-item with timestamp comparison.
 */
export function mergeCrewReviews(local: CrewReview[] = [], incoming: CrewReview[] = []): CrewReview[] {
  return mergeEntityList(local, incoming);
}

/**
 * Deep merge of TravelNotesConfig comparing individual element timestamps.
 */
export function mergeTravelNotesConfigs(
  local?: TravelNotesConfig | null,
  incoming?: TravelNotesConfig | null
): TravelNotesConfig {
  if (!local && !incoming) {
    return {
      id: 'splav86_travel_notes_main',
      notes: [],
      checklist: [],
      logbookTrips: [],
      riverReviews: [],
      crewReviews: [],
      updatedAt: new Date().toISOString()
    };
  }
  if (!local) return incoming!;
  if (!incoming) return local;

  const mergedNotes = mergeTravelNotes(local.notes || [], incoming.notes || []);
  const mergedChecklist = mergeChecklistItems(local.checklist || [], incoming.checklist || []);
  const mergedLogbook = mergeLogbookTrips(local.logbookTrips || [], incoming.logbookTrips || []);
  const mergedRiverReviews = mergeRiverReviews(local.riverReviews || [], incoming.riverReviews || []);
  const mergedCrewReviews = mergeCrewReviews(local.crewReviews || [], incoming.crewReviews || []);

  const localTime = parseTimestamp(local.updatedAt);
  const incTime = parseTimestamp(incoming.updatedAt);
  const freshestUpdated = incTime >= localTime ? (incoming.updatedAt || local.updatedAt) : (local.updatedAt || incoming.updatedAt);

  return {
    id: incoming.id || local.id || 'splav86_travel_notes_main',
    notes: mergedNotes,
    checklist: mergedChecklist,
    logbookTrips: mergedLogbook,
    riverReviews: mergedRiverReviews,
    crewReviews: mergedCrewReviews,
    updatedAt: freshestUpdated || new Date().toISOString(),
    updatedBy: incoming.updatedBy || local.updatedBy,
    isDeleted: incoming.isDeleted ?? local.isDeleted
  };
}

/**
 * Merges RiverRoutes item-by-item comparing exact timestamps and preserving soft-deletions.
 */
export function mergeRoutes(local: RiverRoute[] = [], incoming: RiverRoute[] = []): RiverRoute[] {
  return mergeEntityList(local, incoming);
}

/**
 * Merges CompanionTrips item-by-item, including applications & chat messages with timestamp checking.
 */
export function mergeTrips(local: CompanionTrip[] = [], incoming: CompanionTrip[] = []): CompanionTrip[] {
  const mergedTrips = mergeEntityList(local, incoming);

  return mergedTrips.map((trip) => {
    const localMatch = local.find((t) => t.id === trip.id);
    const incMatch = incoming.find((t) => t.id === trip.id);

    const mergedApplications = mergeEntityList(
      localMatch?.applications || [],
      incMatch?.applications || []
    );

    const mergedChat = mergeEntityList(
      localMatch?.chatMessages || [],
      incMatch?.chatMessages || []
    );

    return {
      ...trip,
      applications: mergedApplications.length > 0 ? mergedApplications : trip.applications,
      chatMessages: mergedChat.length > 0 ? mergedChat : trip.chatMessages
    };
  });
}

/**
 * Merges Articles item-by-item.
 */
export function mergeArticles(local: ArticleReport[] = [], incoming: ArticleReport[] = []): ArticleReport[] {
  return mergeEntityList(local, incoming);
}

/**
 * Deduplicates and consolidates users by ID, Email, and Telegram ID with timestamp checking.
 * Guarantees that every user in the returned array has a strictly unique ID.
 */
export function deduplicateUsers(users: AppUser[] = []): AppUser[] {
  const result: AppUser[] = [];
  const idMap = new Map<string, AppUser>();
  const emailMap = new Map<string, AppUser>();
  const tgMap = new Map<string, AppUser>();

  for (const user of users) {
    if (!user) continue;
    const rawId = (user.id || '').trim();
    const idKey = rawId.toLowerCase();
    const emailKey = (user.email || '').trim().toLowerCase();
    const tgKey = (user.telegram || '').trim().toLowerCase().replace('@', '');
    const tgIdKey = user.telegramId ? String(user.telegramId).trim() : '';

    if (!idKey && !emailKey) continue;

    // Find any existing record matched by ID, Email, or Telegram
    const existing =
      (idKey ? idMap.get(idKey) : undefined) ||
      (emailKey ? emailMap.get(emailKey) : undefined) ||
      (tgKey ? tgMap.get(tgKey) : undefined) ||
      (tgIdKey ? tgMap.get(tgIdKey) : undefined);

    if (!existing) {
      const canonicalUser: AppUser = {
        ...user,
        id: user.id || (emailKey ? `user-${emailKey.replace(/[^a-z0-9]/g, '-')}` : `user-${Date.now()}`)
      };
      const cIdKey = canonicalUser.id.trim().toLowerCase();
      idMap.set(cIdKey, canonicalUser);
      if (emailKey) emailMap.set(emailKey, canonicalUser);
      if (tgKey) tgMap.set(tgKey, canonicalUser);
      if (tgIdKey) tgMap.set(tgIdKey, canonicalUser);
      result.push(canonicalUser);
    } else {
      const existingTime = getItemTimestamp(existing);
      const newTime = getItemTimestamp(user);

      const targetId = existing.id || user.id;
      const isDeleted =
        user.isDeleted === true
          ? true
          : existing.isDeleted && user.isDeleted === undefined
          ? existing.isDeleted
          : (user.isDeleted ?? existing.isDeleted ?? false);

      const merged: AppUser =
        newTime >= existingTime
          ? {
              ...existing,
              ...user,
              id: targetId,
              email: user.email || existing.email,
              avatar: user.avatar || existing.avatar,
              name: user.name || existing.name,
              role: user.role || existing.role,
              isDeleted
            }
          : {
              ...user,
              ...existing,
              id: targetId,
              email: existing.email || user.email,
              avatar: existing.avatar || user.avatar,
              name: existing.name || user.name,
              role: existing.role || user.role,
              isDeleted
            };

      const idx = result.indexOf(existing);
      if (idx !== -1) {
        result[idx] = merged;
      }

      const mIdKey = (merged.id || '').trim().toLowerCase();
      if (mIdKey) idMap.set(mIdKey, merged);
      if (idKey) idMap.set(idKey, merged);
      if (emailKey) emailMap.set(emailKey, merged);
      if (existing.email) emailMap.set(existing.email.trim().toLowerCase(), merged);
      if (tgKey) tgMap.set(tgKey, merged);
      if (tgIdKey) tgMap.set(tgIdKey, merged);
    }
  }

  // Strict final guarantee: enforce unique IDs across the output list
  const finalUsers: AppUser[] = [];
  const seenIds = new Set<string>();

  for (const u of result) {
    if (!u) continue;
    const finalId = (u.id || '').trim().toLowerCase();
    if (!finalId || seenIds.has(finalId)) {
      continue;
    }
    seenIds.add(finalId);
    finalUsers.push(u);
  }

  return finalUsers;
}

/**
 * Merges Users by ID and normalized Email with timestamp checking.
 */
export function mergeUsers(local: AppUser[] = [], incoming: AppUser[] = []): AppUser[] {
  return deduplicateUsers([...local, ...incoming]);
}

/**
 * Merges FaqDataConfig item-by-item with timestamp comparison.
 */
export function mergeFaqConfigs(
  local?: FaqDataConfig | null,
  incoming?: FaqDataConfig | null
): FaqDataConfig {
  if (!local && !incoming) {
    return {
      id: 'splav86_faq_safety_main',
      title: 'Безопасность и регламенты',
      subtitle: '',
      warningTitle: '',
      warningText: '',
      sosTemplateText: '',
      cheatSheetContent: '',
      emergencyContacts: [],
      radioFrequencies: [],
      visualSignals: [],
      safetyGuides: [],
      faqQuestions: []
    };
  }
  if (!local) return incoming!;
  if (!incoming) return local;

  const mergedContacts = mergeEntityList(local.emergencyContacts || [], incoming.emergencyContacts || []);
  const mergedFrequencies = mergeEntityList(local.radioFrequencies || [], incoming.radioFrequencies || []);
  const mergedSignals = mergeEntityList(local.visualSignals || [], incoming.visualSignals || []);
  const mergedGuides = mergeEntityList(local.safetyGuides || [], incoming.safetyGuides || []);
  const mergedQuestions = mergeEntityList(local.faqQuestions || [], incoming.faqQuestions || []);

  const localTime = parseTimestamp(local.updatedAt);
  const incTime = parseTimestamp(incoming.updatedAt);
  const freshestUpdated = incTime >= localTime ? (incoming.updatedAt || local.updatedAt) : (local.updatedAt || incoming.updatedAt);

  return {
    id: incoming.id || local.id || 'splav86_faq_safety_main',
    title: incoming.title || local.title,
    subtitle: incoming.subtitle || local.subtitle,
    warningTitle: incoming.warningTitle || local.warningTitle,
    warningText: incoming.warningText || local.warningText,
    sosTemplateText: incoming.sosTemplateText || local.sosTemplateText,
    cheatSheetContent: incoming.cheatSheetContent || local.cheatSheetContent,
    emergencyContacts: mergedContacts,
    radioFrequencies: mergedFrequencies,
    visualSignals: mergedSignals,
    safetyGuides: mergedGuides,
    faqQuestions: mergedQuestions,
    updatedAt: freshestUpdated || new Date().toISOString(),
    updatedBy: incoming.updatedBy || local.updatedBy,
    isDeleted: incoming.isDeleted ?? local.isDeleted
  };
}

