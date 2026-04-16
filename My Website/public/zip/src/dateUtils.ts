/** Stable local calendar dates as YYYY-MM-DD (no UTC midnight shifts). */

export function parseLocalYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function formatLocalYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function normalizeWeekDate(ymd: string): string {
  const p = parseLocalYmd(ymd);
  if (!p) return (ymd || '').trim();
  const dt = new Date(p.y, p.m - 1, p.d);
  return formatLocalYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function addDaysToWeekStart(weekStartYmd: string, dayIndex: number): string {
  const p = parseLocalYmd(weekStartYmd);
  if (!p) return weekStartYmd;
  const dt = new Date(p.y, p.m - 1, p.d + dayIndex);
  return formatLocalYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function weekDatesFromStart(weekStartYmd: string, days: readonly string[]): string[] {
  return days.map((_, i) => addDaysToWeekStart(weekStartYmd, i));
}

export function dateInInclusiveRange(dateYmd: string, startYmd: string, endYmd: string): boolean {
  const n = normalizeWeekDate(dateYmd);
  return n >= normalizeWeekDate(startYmd) && n <= normalizeWeekDate(endYmd);
}
