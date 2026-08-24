import { SectionSyncInfo, SyncLogEntry } from '../types';

const SYNC_STATE_KEY = 'splav86_sync_tracker_state_v2';
const SYNC_LOGS_KEY = 'splav86_sync_tracker_logs_v2';

const INITIAL_SECTIONS: SectionSyncInfo[] = [
  {
    id: 'routes',
    title: 'Речные маршруты & GPX-треки',
    description: 'Лоции рек ХМАО и ЯНАО, GPS-координаты, стоянки, пороги и паспорта рек',
    category: 'cloud',
    collectionOrTable: 'Firestore: /routes + CloudSQL routes',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  },
  {
    id: 'trips',
    title: 'Походы & экипажи (Поиск попутчиков)',
    description: 'Экспедиции, заявки участников, роли в экипаже, чаты и статусы набора',
    category: 'cloud',
    collectionOrTable: 'Firestore: /trips + CloudSQL trips',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  },
  {
    id: 'travel_notes',
    title: 'Путевые заметки & Бортовой журнал',
    description: 'Заметки, чек-листы сборов, журнал пройденных рек, 5★ оценки рек и экипажа',
    category: 'cloud',
    collectionOrTable: 'Firestore: /travel_notes + CloudSQL notes',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  },
  {
    id: 'articles',
    title: 'Статьи & Отчеты об экспедициях',
    description: 'Путевые очерки, фотогалереи, описания рек и практические советы',
    category: 'cloud',
    collectionOrTable: 'Firestore: /articles + CloudSQL articles',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  },
  {
    id: 'faq',
    title: 'Справочник безопасности & FAQ',
    description: 'Инструкции выживания, радиочастоты спасения 130.0 МГц, аварийные сигналы и контакты МЧС',
    category: 'cloud',
    collectionOrTable: 'Firestore: /faq + CloudSQL faq',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  },
  {
    id: 'users',
    title: 'Профиль & Карточки участников',
    description: 'Личные данные, снаряжение, опыт сплавов, избранные реки и журнал походов',
    category: 'cloud',
    collectionOrTable: 'Firestore: /users + CloudSQL users',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  },
  {
    id: 'cloudsql',
    title: 'Реляционная БД CloudSQL PostgreSQL',
    description: 'Основное высокопроизводительное SQL-хранилище реляционных данных и бэкапов',
    category: 'database',
    collectionOrTable: 'CloudSQL / Drizzle ORM (PostgreSQL)',
    lastUploadedAt: null,
    lastDownloadedAt: null,
    status: 'idle',
    itemCount: 0
  }
];

type SyncListener = () => void;

class SyncTrackerService {
  private sections: Map<string, SectionSyncInfo> = new Map();
  private logs: SyncLogEntry[] = [];
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    // Load sections
    try {
      const storedState = localStorage.getItem(SYNC_STATE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState) as SectionSyncInfo[];
        parsed.forEach((s) => {
          this.sections.set(s.id, s);
        });
      }
    } catch (e) {
      console.warn('SyncTracker: Failed to load state from localStorage', e);
    }

    // Ensure all initial sections are present
    INITIAL_SECTIONS.forEach((initSec) => {
      if (!this.sections.has(initSec.id)) {
        this.sections.set(initSec.id, { ...initSec });
      } else {
        const existing = this.sections.get(initSec.id)!;
        this.sections.set(initSec.id, {
          ...initSec,
          ...existing,
          title: initSec.title,
          description: initSec.description,
          collectionOrTable: initSec.collectionOrTable
        });
      }
    });

    // Load logs
    try {
      const storedLogs = localStorage.getItem(SYNC_LOGS_KEY);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs) as SyncLogEntry[];
      }
    } catch (e) {
      console.warn('SyncTracker: Failed to load logs', e);
    }
  }

  private saveState() {
    try {
      const array = Array.from(this.sections.values());
      localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(array));
      localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(this.logs.slice(0, 100)));
    } catch (e) {
      console.warn('SyncTracker: Failed to persist sync state', e);
    }
  }

  private notify() {
    this.saveState();
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('SyncTracker listener error:', err);
      }
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSections(): SectionSyncInfo[] {
    return Array.from(this.sections.values());
  }

  public getSection(id: string): SectionSyncInfo | undefined {
    return this.sections.get(id);
  }

  public getLogs(): SyncLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  /**
   * Record when user or background pushed/saved data to server
   */
  public recordUpload(
    sectionId: SectionSyncInfo['id'],
    details?: { count?: number; message?: string }
  ) {
    const now = new Date().toISOString();
    const section = this.sections.get(sectionId) || INITIAL_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const count = details?.count !== undefined ? details.count : section.itemCount;
    const msg = details?.message || `Успешная передача данных на сервер (${count} элементов)`;

    const updated: SectionSyncInfo = {
      ...section,
      lastUploadedAt: now,
      status: 'synced',
      itemCount: count,
      lastError: undefined
    };
    this.sections.set(sectionId, updated);

    // Add log
    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      sectionId,
      sectionTitle: section.title,
      direction: 'upload',
      message: msg,
      count
    });

    this.notify();
  }

  /**
   * Record when client received / fetched / listened data from server
   */
  public recordDownload(
    sectionId: SectionSyncInfo['id'],
    details?: { count?: number; message?: string }
  ) {
    const now = new Date().toISOString();
    const section = this.sections.get(sectionId) || INITIAL_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const count = details?.count !== undefined ? details.count : section.itemCount;
    const msg = details?.message || `Данные успешно получены с сервера (${count} элементов)`;

    const updated: SectionSyncInfo = {
      ...section,
      lastDownloadedAt: now,
      status: 'synced',
      itemCount: count,
      lastError: undefined
    };
    this.sections.set(sectionId, updated);

    // Add log
    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      sectionId,
      sectionTitle: section.title,
      direction: 'download',
      message: msg,
      count
    });

    this.notify();
  }

  /**
   * Record sync error
   */
  public recordError(sectionId: SectionSyncInfo['id'], error: string) {
    const now = new Date().toISOString();
    const section = this.sections.get(sectionId) || INITIAL_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const updated: SectionSyncInfo = {
      ...section,
      status: 'error',
      lastError: error
    };
    this.sections.set(sectionId, updated);

    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      sectionId,
      sectionTitle: section.title,
      direction: 'error',
      message: `Ошибка передачи данных: ${error}`
    });

    this.notify();
  }

  /**
   * Record that a sync operation is in progress
   */
  public recordSyncing(sectionId: SectionSyncInfo['id']) {
    const section = this.sections.get(sectionId);
    if (!section) return;
    this.sections.set(sectionId, { ...section, status: 'syncing' });
    this.notify();
  }
}

export const syncTracker = new SyncTrackerService();
