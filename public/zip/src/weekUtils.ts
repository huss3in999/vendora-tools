import { DayOfWeek, DAYS_MONDAY_START } from './types';

/** Read week start day from saved settings (localStorage) before React state hydrates. */
export function readSavedWeekStartDayFromStorage(): DayOfWeek {
  if (typeof window === 'undefined') return 'Monday';
  try {
    const raw = window.localStorage.getItem('rota_settings');
    if (!raw) return 'Monday';
    const s = JSON.parse(raw) as { weekStartDay?: string };
    const cand = s.weekStartDay as DayOfWeek;
    return DAYS_MONDAY_START.includes(cand) ? cand : 'Monday';
  } catch {
    return 'Monday';
  }
}

/** Calendar week order always Monday→Sunday; use `getWeekDaysInOrder` to rotate start. */
export function getWeekDaysInOrder(weekStartDay: DayOfWeek): DayOfWeek[] {
  const idx = DAYS_MONDAY_START.indexOf(weekStartDay);
  if (idx < 0) return [...DAYS_MONDAY_START];
  return [...DAYS_MONDAY_START.slice(idx), ...DAYS_MONDAY_START.slice(0, idx)];
}

/** Monday=0 … Sunday=6 (ISO-style week math from a Monday-based list). */
export function dayOfWeekToMondayIndex(d: DayOfWeek): number {
  const i = DAYS_MONDAY_START.indexOf(d);
  return i < 0 ? 0 : i;
}

/**
 * Local YYYY-MM-DD for the week-period start that contains `anchorYmd` and begins on `weekStartDay`.
 */
export function snapDateToWeekStart(anchorYmd: string, weekStartDay: DayOfWeek): string {
  const p = anchorYmd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!p) return anchorYmd;
  const y = Number(p[1]);
  const m = Number(p[2]);
  const d = Number(p[3]);
  const anchor = new Date(y, m - 1, d);
  const mondayIndex = (anchor.getDay() + 6) % 7;
  const targetIndex = dayOfWeekToMondayIndex(weekStartDay);
  const diff = (mondayIndex - targetIndex + 7) % 7;
  anchor.setDate(anchor.getDate() - diff);
  const yy = anchor.getFullYear();
  const mm = String(anchor.getMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
