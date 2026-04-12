/**
 * Central definitions for rota app browser persistence (localStorage + sessionStorage).
 * Only keys matching the rota_ prefix (plus explicit legacy names) are touched by cleanup/clear.
 */

export const ROTA_STORAGE_PREFIX = 'rota_' as const;

/** Primary data keys — keep in sync with useLocalStorage keys in App.tsx */
export const ROTA_LOCALSTORAGE_DATA_KEYS = [
  'rota_settings',
  'rota_staff',
  'rota_templates',
  'rota_schedule',
  'rota_leaves',
  'rota_week_dayoffs',
] as const;

export type RotaDataStorageKey = (typeof ROTA_LOCALSTORAGE_DATA_KEYS)[number];

/** Metadata written on each persist (last save time, schema version). */
export const ROTA_STORAGE_META_KEY = 'rota_storage_meta';

/** Bump when stored shape changes in a way that should trigger one-time migration or docs. */
export const ROTA_STORAGE_SCHEMA_VERSION = 1;

/** Known legacy keys from older builds — removed on startup and when clearing. */
export const ROTA_LEGACY_STORAGE_KEYS = ['rota_shifts', 'rota_day_offs', 'rota_weekDayOffs'] as const;

const ALLOWED_ROTA_LOCAL_KEYS = new Set<string>([
  ...ROTA_LOCALSTORAGE_DATA_KEYS,
  ROTA_STORAGE_META_KEY,
]);

/** Session flash after clear — not under rota_ so it survives targeted clear + reload. */
export const ROTA_CLEAR_BANNER_SESSION_KEY = '__RotaApp_storageCleared';

export type RotaStorageMeta = {
  schemaVersion: number;
  lastSavedAt: string;
  /** Vite build id when available — helps spot stale bundles vs fresh storage */
  buildTag?: string;
};

function buildTag(): string | undefined {
  try {
    if (typeof import.meta.env !== 'undefined' && import.meta.env.MODE) {
      return String(import.meta.env.MODE);
    }
  } catch {
    /* non-Vite bundle */
  }
  return undefined;
}

export function readRotaStorageMeta(): RotaStorageMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ROTA_STORAGE_META_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as RotaStorageMeta;
    if (typeof o.lastSavedAt !== 'string') return null;
    return o;
  } catch {
    return null;
  }
}

/** Call after any rota data key is written — updates last-saved timestamp. */
export function touchRotaStorageMeta(): void {
  if (typeof window === 'undefined') return;
  try {
    const tag = buildTag();
    const payload: RotaStorageMeta = {
      schemaVersion: ROTA_STORAGE_SCHEMA_VERSION,
      lastSavedAt: new Date().toISOString(),
      ...(tag ? { buildTag: tag } : {}),
    };
    window.localStorage.setItem(ROTA_STORAGE_META_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function collectKeysMatching(store: Storage, predicate: (key: string) => boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && predicate(k)) out.push(k);
  }
  return out;
}

/** Remove rota_* keys that are not part of the current app whitelist, and explicit legacy keys. */
export function pruneOrphanRotaStorageKeys(): void {
  if (typeof window === 'undefined') return;
  const removeFrom = (store: Storage) => {
    const toRemove: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k) continue;
      if ((ROTA_LEGACY_STORAGE_KEYS as readonly string[]).includes(k)) {
        toRemove.push(k);
        continue;
      }
      if (k.startsWith(ROTA_STORAGE_PREFIX) && !ALLOWED_ROTA_LOCAL_KEYS.has(k)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => store.removeItem(k));
  };
  removeFrom(window.localStorage);
  removeFrom(window.sessionStorage);
}

/** All localStorage keys used by this app (data + meta) that currently exist. */
export function listPresentRotaLocalKeys(): string[] {
  if (typeof window === 'undefined') return [];
  const ordered = [...ROTA_LOCALSTORAGE_DATA_KEYS, ROTA_STORAGE_META_KEY];
  return ordered.filter((k) => window.localStorage.getItem(k) !== null);
}

/** Any sessionStorage keys starting with rota_ (for display / clear). */
export function listPresentRotaSessionKeys(): string[] {
  if (typeof window === 'undefined') return [];
  return collectKeysMatching(window.sessionStorage, (k) => k.startsWith(ROTA_STORAGE_PREFIX));
}

/** Remove every rota-prefixed key and legacy keys from localStorage and sessionStorage. */
export function clearAllRotaAppBrowserStorage(): void {
  if (typeof window === 'undefined') return;
  const wipe = (store: Storage) => {
    const keys = collectKeysMatching(
      store,
      (k) =>
        k.startsWith(ROTA_STORAGE_PREFIX) ||
        (ROTA_LEGACY_STORAGE_KEYS as readonly string[]).includes(k)
    );
    keys.forEach((k) => store.removeItem(k));
  };
  wipe(window.localStorage);
  wipe(window.sessionStorage);
}
