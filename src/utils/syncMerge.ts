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
 * Merges Users by ID and normalized Email with timestamp checking.
 */
export function mergeUsers(local: AppUser[] = [], incoming: AppUser[] = []): AppUser[] {
  const map = new Map<string, AppUser>();

  const getKey = (u: AppUser) => (u.email || '').trim().toLowerCase() || (u.id || '').trim().toLowerCase();

  for (const u of local) {
    if (!u) continue;
    const k = getKey(u);
    if (k) map.set(k, { ...u });
  }

  for (const inc of incoming) {
    if (!inc) continue;
    const k = getKey(inc);
    if (!k) continue;

    const existing = map.get(k);
    if (!existing) {
      map.set(k, { ...inc });
      continue;
    }

    const localTime = getItemTimestamp(existing);
    const incTime = getItemTimestamp(inc);

    if (incTime > localTime) {
      map.set(k, {
        ...existing,
        ...inc,
        isDeleted: inc.isDeleted === true ? true : (existing.isDeleted && inc.isDeleted === undefined ? existing.isDeleted : inc.isDeleted)
      });
    } else if (localTime > incTime) {
      map.set(k, {
        ...inc,
        ...existing,
        isDeleted: existing.isDeleted === true ? true : (inc.isDeleted && existing.isDeleted === undefined ? inc.isDeleted : existing.isDeleted)
      });
    } else {
      map.set(k, {
        ...existing,
        ...inc,
        isDeleted: existing.isDeleted === true || inc.isDeleted === true
      });
    }
  }

  return Array.from(map.values());
}
