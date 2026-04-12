import {
  DayOfWeek,
  BusinessSettings,
  Staff,
  ShiftTemplate,
  ScheduledShift,
  Leave,
  DailyHours,
} from './types';
import {addDaysToWeekStart, dateInInclusiveRange, normalizeWeekDate} from './dateUtils';
import {getWeekDaysInOrder} from './weekUtils';
import {getAvailabilityForDay} from './staffAvailability';
import {
  getRequiredSlotsForTemplate,
  mergeRoleAliases,
  normalizeRoleText,
  staffMatchesBackupInCharge,
  staffMatchesRoleSlot,
} from './roleUtils';

/**
 * Templates that only need "Any" staff are scheduled after role-specific templates.
 * Among equally constrained templates, fill Morning/open and Closing-type bands before
 * Mid/bridge shifts so overlapping mid shifts do not consume everyone and leave
 * Morning/Closing empty when staff count is tight.
 */
function templateRoleConstraintWeight(t: ShiftTemplate): number {
  const slots = getRequiredSlotsForTemplate(t);
  if (slots.length === 0) return 2;
  const allAny = slots.every((s) => s.roleKey === 'Any');
  return allAny ? 2 : 1;
}

/** Lower = earlier in the day loop (higher priority for the same constraint tier). */
function templateBandFillOrder(t: ShiftTemplate): number {
  const n = normalizeRoleText(t.name);
  const hasMorning =
    n.includes('morning') || n.includes('open') || n.includes('breakfast') || n.includes('early');
  const hasMidOnly = n.includes('mid') && !hasMorning;
  const hasClosing =
    n.includes('clos') || n.includes('closing') || n.includes('night') || n.includes('evening');
  if (hasMidOnly || n.includes('lunch') || (n.includes('swing') && !hasClosing)) return 40;
  if (hasMorning) return 0;
  if (hasClosing) return 10;
  return 20;
}

/** Same ordering as `generateSchedule` uses (for tests / diagnostics). */
export function sortTemplatesForAutoSchedule(templates: ShiftTemplate[]): ShiftTemplate[] {
  return [...templates].sort((a, b) => {
    const wa = templateRoleConstraintWeight(a);
    const wb = templateRoleConstraintWeight(b);
    if (wa !== wb) return wa - wb;
    const oa = templateBandFillOrder(a);
    const ob = templateBandFillOrder(b);
    if (oa !== ob) return oa - ob;
    return getMinutes(a.startTime) - getMinutes(b.startTime);
  });
}

/** UUID for entity ids; falls back when `crypto.randomUUID` is missing (non-secure contexts). */
export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function getDurationHours(start: string, end: string): number {
  let diff = getMinutes(end) - getMinutes(start);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

export function isOverlapping(
  shift1: { startTime: string; endTime: string },
  shift2: { startTime: string; endTime: string }
): boolean {
  const s1 = getMinutes(shift1.startTime);
  let e1 = getMinutes(shift1.endTime);
  const s2 = getMinutes(shift2.startTime);
  let e2 = getMinutes(shift2.endTime);

  if (e1 <= s1) e1 += 24 * 60;
  if (e2 <= s2) e2 += 24 * 60;

  return Math.max(s1, s2) < Math.min(e1, e2);
}

export function isStaffOnLeave(staffId: string, dateStr: string, leaves: Leave[]): boolean {
  if (!dateStr) return false;
  const d = normalizeWeekDate(dateStr);
  return leaves.some((l) => {
    if (l.staffId !== staffId) return false;
    return dateInInclusiveRange(d, l.startDate, l.endDate);
  });
}

function formatMinutesAsClock(total: number): string {
  const x = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(x / 60);
  const mm = x % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Minutes bounds used for auto-schedule and template timing checks.
 * If "earliest staff" / "latest staff" are still tighter than store open/close (common after
 * editing open/close without updating the staff window), we widen to store hours so Morning /
 * Closing templates are not skipped while Mid still fits.
 */
/** Persist staff window fields so they are at least as wide as store open/close (fixes Setup desync). */
export function normalizeHoursByDayStaffWindow(hb: Record<DayOfWeek, DailyHours>): Record<DayOfWeek, DailyHours> {
  const out = { ...hb };
  (Object.keys(out) as DayOfWeek[]).forEach((d) => {
    const h = out[d];
    if (!h?.isOpen) return;
    const openM = getMinutes(h.openTime);
    let closeM = getMinutes(h.closeTime);
    if (closeM <= openM) closeM += 24 * 60;
    let es = getMinutes(h.earliestStaffStart ?? h.openTime);
    let le = getMinutes(h.latestStaffEnd ?? h.closeTime);
    if (le < es) le += 24 * 60;
    const next = { ...h };
    if (es > openM) next.earliestStaffStart = h.openTime;
    if (le < closeM) next.latestStaffEnd = h.closeTime;
    out[d] = next;
  });
  return out;
}

export function getEffectiveStaffSchedulingBounds(
  day: DayOfWeek,
  settings: BusinessSettings
): { lo: number; hi: number } | null {
  const h = settings.hoursByDay[day];
  if (!h?.isOpen) return null;
  const openM = getMinutes(h.openTime);
  let closeM = getMinutes(h.closeTime);
  if (closeM <= openM) closeM += 24 * 60;
  let lo = getMinutes(h.earliestStaffStart || h.openTime);
  let hi = getMinutes(h.latestStaffEnd || h.closeTime);
  if (hi < lo) hi += 24 * 60;
  lo = Math.min(lo, openM);
  hi = Math.max(hi, closeM);
  return { lo, hi };
}

/** Shift must fall within the effective scheduling window for that day (see getEffectiveStaffSchedulingBounds). */
export function shiftFitsStaffDayWindow(
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  settings: BusinessSettings
): boolean {
  const bounds = getEffectiveStaffSchedulingBounds(day, settings);
  if (!bounds) return false;
  let s = getMinutes(startTime);
  let e = getMinutes(endTime);
  if (e <= s) e += 24 * 60;
  return s >= bounds.lo && e <= bounds.hi;
}

/** For setup/template warnings: same envelope as auto-schedule. */
export function shiftTimingNoteForDay(
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  settings: BusinessSettings
): string | null {
  const h = settings.hoursByDay[day];
  if (!h?.isOpen) return 'Business is closed this day.';
  const bounds = getEffectiveStaffSchedulingBounds(day, settings);
  if (!bounds) return 'Business is closed this day.';
  let s = getMinutes(startTime);
  let e = getMinutes(endTime);
  if (e <= s) e += 24 * 60;
  if (s < bounds.lo || e > bounds.hi) {
    return `Outside allowed scheduling window (${formatMinutesAsClock(bounds.lo)}–${formatMinutesAsClock(bounds.hi)}).`;
  }
  return null;
}

function managerLikeRoleKey(roleKey: string): boolean {
  const r = normalizeRoleText(roleKey);
  return r.includes('manager') || r.includes('lead') || r === 'gm';
}

function templateMatchesShiftPreference(
  tpl: ShiftTemplate,
  pref: '' | 'Morning' | 'Mid' | 'Closing'
): boolean {
  if (!pref) return true;
  const n = normalizeRoleText(tpl.name);
  const startH = getMinutes(tpl.startTime) / 60;
  if (pref === 'Morning') {
    return n.includes('morning') || n.includes('open') || startH < 11;
  }
  if (pref === 'Closing') {
    return n.includes('close') || n.includes('closing') || getMinutes(tpl.endTime) >= 19 * 60 || n.includes('night');
  }
  return n.includes('mid') || (startH >= 10 && startH <= 14);
}

function shiftRecordAsTemplate(
  sh: Pick<ScheduledShift, 'name' | 'startTime' | 'endTime' | 'templateId'>,
  templates: ShiftTemplate[]
): ShiftTemplate {
  const tpl = sh.templateId ? templates.find((t) => t.id === sh.templateId) : undefined;
  if (tpl) return tpl;
  return {
    id: '',
    name: sh.name,
    startTime: sh.startTime,
    endTime: sh.endTime,
    requiredStaffCount: 0,
    requiredRole: 'Any',
    colorTag: '',
  };
}

/** Band label for coverage UI and analytics (first matching rule wins). */
export type ShiftBandCategory = 'Morning' | 'Mid' | 'Closing' | 'Other';

export function classifyShiftBand(
  shift: Pick<ScheduledShift, 'name' | 'startTime' | 'endTime' | 'templateId'>,
  templates: ShiftTemplate[]
): ShiftBandCategory {
  const t = shiftRecordAsTemplate(shift, templates);
  if (templateMatchesShiftPreference(t, 'Morning')) return 'Morning';
  if (templateMatchesShiftPreference(t, 'Closing')) return 'Closing';
  if (templateMatchesShiftPreference(t, 'Mid')) return 'Mid';
  return 'Other';
}

function countMorningStyleDaysForStaff(
  assigned: ScheduledShift[],
  staffId: string,
  templates: ShiftTemplate[]
): number {
  const daySet = new Set<DayOfWeek>();
  for (const sh of assigned) {
    if (sh.staffId !== staffId) continue;
    const t = shiftRecordAsTemplate(sh, templates);
    if (templateMatchesShiftPreference(t, 'Morning')) daySet.add(sh.day);
  }
  return daySet.size;
}

/** Date-specific exception overrides weekday band; then weekday; then whole-week request. */
function effectivePreferredBandForDay(
  staff: Staff,
  day: DayOfWeek,
  dateStr: string
): '' | 'Morning' | 'Mid' | 'Closing' {
  const norm = normalizeWeekDate(dateStr);
  const ex = staff.preferredBandExceptions?.find((e) => normalizeWeekDate(e.date) === norm);
  if (ex?.band) return ex.band;
  const byDay = staff.preferredBandByDay?.[day];
  if (byDay) return byDay;
  return staff.staffScheduleRequestBand || '';
}

function countDistinctStaffByBandForDay(
  day: DayOfWeek,
  assigned: ScheduledShift[],
  templates: ShiftTemplate[],
  normWeek: string
): Record<'Morning' | 'Mid' | 'Closing' | 'Other', number> {
  const shifts = assigned.filter(
    (s) => s.day === day && normalizeWeekDate(s.weekStartDate || '') === normWeek
  );
  const sets = {
    Morning: new Set<string>(),
    Mid: new Set<string>(),
    Closing: new Set<string>(),
    Other: new Set<string>(),
  };
  shifts.forEach((s) => {
    const cat = classifyShiftBand(s, templates);
    sets[cat].add(s.staffId);
  });
  return {
    Morning: sets.Morning.size,
    Mid: sets.Mid.size,
    Closing: sets.Closing.size,
    Other: sets.Other.size,
  };
}

/** Effective minimum people per band for a weekday (optional scaling from store hours). */
export function effectiveBandTargetsForDay(
  day: DayOfWeek,
  settings: BusinessSettings
): { morningMin: number; midMin: number; closingMin: number } | null {
  if (!settings.enableBandCoverageTargets) return null;
  const raw = settings.bandCoverageTargetsByDay?.[day];
  if (!raw) return null;
  let m = Math.max(0, raw.morningMin ?? 0);
  let mid = Math.max(0, raw.midMin ?? 0);
  let c = Math.max(0, raw.closingMin ?? 0);
  if (m === 0 && mid === 0 && c === 0) return null;

  if (settings.scaleBandTargetsForLateOpen !== false) {
    const h = settings.hoursByDay[day];
    if (h?.isOpen) {
      const openM = getMinutes(h.openTime);
      if (openM >= 10 * 60 && m > 1) {
        m = Math.max(1, Math.ceil(m / 2));
      }
      let openStart = getMinutes(h.openTime);
      let closeM = getMinutes(h.closeTime);
      if (closeM <= openStart) closeM += 24 * 60;
      const hrsOpen = (closeM - openStart) / 60;
      if (hrsOpen > 0 && hrsOpen <= 6 && c > 1) {
        c = Math.max(1, c - 1);
      }
    }
  }
  return { morningMin: m, midMin: mid, closingMin: c };
}

function dayOffContext(
  staff: Staff,
  day: DayOfWeek,
  days: DayOfWeek[],
  weekDayOffs: Record<string, DayOfWeek[]>
): { beforeDayOff: boolean; afterDayOff: boolean } {
  const idx = days.indexOf(day);
  const len = days.length;
  if (idx < 0 || len === 0) {
    return { beforeDayOff: false, afterDayOff: false };
  }
  const offs = new Set<DayOfWeek>(weekDayOffs[staff.id] || []);
  for (const d of staff.fixedWeeklyDaysOff || []) {
    offs.add(d);
  }
  const nextD = days[(idx + 1) % len];
  const prevD = days[(idx - 1 + len) % len];
  return {
    beforeDayOff: offs.has(nextD),
    afterDayOff: offs.has(prevD),
  };
}

export type GenerateScheduleOptions = {
  weekStaffDayOffs?: Record<string, DayOfWeek[]>;
  debugLog?: string[];
  /** When true, logs each slot attempt to the browser console (same checks as eligibility filter). */
  consoleTrace?: boolean;
};

export function generateSchedule(
  staffList: Staff[],
  templates: ShiftTemplate[],
  settings: BusinessSettings,
  currentWeekStartDate: string,
  leaves: Leave[] = [],
  options: GenerateScheduleOptions = {}
): ScheduledShift[] {
  const schedule: ScheduledShift[] = [];
  const staffHours: Record<string, number> = {};
  const normWeek = normalizeWeekDate(currentWeekStartDate);
  const days = getWeekDaysInOrder(settings.weekStartDay);
  const aliases = mergeRoleAliases(settings.roleAliases);

  const templatesOrdered = sortTemplatesForAutoSchedule(templates);
  const weekOffs = options.weekStaffDayOffs || {};
  const log = options.debugLog;
  const consoleTrace = options.consoleTrace === true;
  const backups = settings.inChargeBackupRoles || [];
  const strictPrefs = settings.dayOffRulesEnabled && settings.dayOffPreferenceMode === 'Strict';

  const pushDebug = (line: string) => {
    if (log) log.push(line);
  };

  if (consoleTrace) {
    console.info('[AutoSchedule] start', {
      weekStart: normWeek,
      templateOrder: templatesOrdered.map((t) => t.name),
    });
  }

  days.forEach((day, dayIndex) => {
    const dateStr = addDaysToWeekStart(normWeek, dayIndex);
    const dayHours = settings.hoursByDay[day];
    if (!dayHours?.isOpen) return;

    templatesOrdered.forEach((template) => {
      if (!shiftFitsStaffDayWindow(day, template.startTime, template.endTime, settings)) {
        pushDebug(
          `[${day} ${template.name}] Skipped template: shift outside staff time window (${dayHours.earliestStaffStart ?? dayHours.openTime}–${dayHours.latestStaffEnd ?? dayHours.closeTime}).`
        );
        return;
      }

      const slots = getRequiredSlotsForTemplate(template);

      slots.forEach((slot, slotIndex) => {
        const tryFillSlot = (allowInCharge: boolean): ScheduledShift | null => {
          const getRejectionReason = (s: Staff): string | null => {
            if (isStaffOnLeave(s.id, dateStr, leaves)) {
              return 'on leave';
            }
            if ((s.fixedWeeklyDaysOff || []).includes(day)) {
              return 'fixed weekly day off';
            }
            if ((s.unavailableDates || []).includes(dateStr)) {
              return 'unavailable this date';
            }
            const doff = weekOffs[s.id];
            if (doff?.includes(day)) {
              return 'marked day off';
            }
            const avail = getAvailabilityForDay(s, day);
            if (!avail.isAvailable) {
              return 'not available this day';
            }
            const shiftStart = getMinutes(template.startTime);
            let shiftEnd = getMinutes(template.endTime);
            const availStart = getMinutes(avail.startTime);
            let availEnd = getMinutes(avail.endTime);
            if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;
            if (availEnd <= availStart) availEnd += 24 * 60;
            if (shiftStart < availStart || shiftEnd > availEnd) {
              return 'shift outside personal availability window';
            }

            const shiftDuration = getDurationHours(template.startTime, template.endTime);
            const effectiveDuration = Math.max(0, shiftDuration - settings.breakDuration / 60);
            const currentWeekly = staffHours[s.id] || 0;
            const staffWeekCap =
              typeof s.requestedWeeklyHoursCap === 'number' && s.requestedWeeklyHoursCap > 0
                ? Math.min(s.maxHoursWeek, s.requestedWeeklyHoursCap)
                : s.maxHoursWeek;
            const weekCap = Math.min(staffWeekCap, settings.maxHoursWeek);
            if (currentWeekly + effectiveDuration > weekCap) {
              return `would exceed weekly cap (${currentWeekly.toFixed(2)} + ${effectiveDuration.toFixed(2)} > ${weekCap})`;
            }
            if (effectiveDuration > settings.maxHoursDay) {
              return `shift effective hours (${effectiveDuration.toFixed(2)}) > max hours/day (${settings.maxHoursDay})`;
            }

            const hasOverlap = schedule.some(
              (sh) =>
                sh.staffId === s.id && sh.day === day && isOverlapping(sh, template)
            );
            if (hasOverlap) {
              return 'overlaps another shift same day';
            }

            const roleKey = slot.roleKey;
            if (roleKey === 'Any') {
              return null;
            }
            if (staffMatchesRoleSlot(s.role, roleKey, aliases)) {
              return null;
            }
            if (
              allowInCharge &&
              settings.inChargeModeEnabled &&
              template.inChargeAllowed !== false &&
              managerLikeRoleKey(roleKey) &&
              staffMatchesBackupInCharge(s.role, backups)
            ) {
              return null;
            }
            return allowInCharge
              ? 'role mismatch (in-charge path not applicable or disabled)'
              : 'role mismatch';
          };

          const candidates = staffList.filter((s) => getRejectionReason(s) === null);

          if (consoleTrace) {
            console.groupCollapsed(
              `[AutoSchedule] ${day} | ${template.name} | slot ${slotIndex + 1} "${slot.roleKey}" | inChargePass=${allowInCharge}`
            );
            console.log('Candidate scan (weekly hours = effective hours assigned so far this run):');
            staffList.forEach((s) => {
              const wk = staffHours[s.id] || 0;
              const rej = getRejectionReason(s);
              console.log(
                `  ${s.name} — weekly eff. hrs ${wk.toFixed(2)} — ${rej ? `REJECTED: ${rej}` : 'ELIGIBLE'}`
              );
            });
          }

          const scored = candidates.map((s) => {
            let score = 0;
            const ctx = dayOffContext(s, day, days, weekOffs);
            if (settings.dayOffRulesEnabled) {
              const globalBandsBefore =
                settings.applyGlobalDayOffShiftDefaults &&
                settings.globalBeforeDayOffPreferBands &&
                settings.globalBeforeDayOffPreferBands.length > 0
                  ? settings.globalBeforeDayOffPreferBands
                  : [];
              const globalBandsAfter =
                settings.applyGlobalDayOffShiftDefaults &&
                settings.globalAfterDayOffPreferBands &&
                settings.globalAfterDayOffPreferBands.length > 0
                  ? settings.globalAfterDayOffPreferBands
                  : [];
              const staffBefore = (s.beforeDayOffPrefer || '') as
                | ''
                | 'Morning'
                | 'Mid'
                | 'Closing';
              const staffAfter = (s.afterDayOffPrefer || '') as
                | ''
                | 'Morning'
                | 'Mid'
                | 'Closing';
              if (ctx.beforeDayOff) {
                if (staffBefore) {
                  const ok = templateMatchesShiftPreference(template, staffBefore);
                  if (ok) score += 20;
                  else if (strictPrefs) score -= 1000;
                } else if (globalBandsBefore.length > 0) {
                  const ok = globalBandsBefore.some((b) => templateMatchesShiftPreference(template, b));
                  if (ok) score += 20;
                  else if (strictPrefs) score -= 1000;
                }
              }
              if (ctx.afterDayOff) {
                if (staffAfter) {
                  const ok = templateMatchesShiftPreference(template, staffAfter);
                  if (ok) score += 20;
                  else if (strictPrefs) score -= 1000;
                } else if (globalBandsAfter.length > 0) {
                  const ok = globalBandsAfter.some((b) => templateMatchesShiftPreference(template, b));
                  if (ok) score += 20;
                  else if (strictPrefs) score -= 1000;
                }
              }
            }

            if ((s.preferSchedulingOnDays || []).includes(day)) {
              score += 8;
            }

            if (settings.honorStaffSchedulingPreferences !== false) {
              const band = effectivePreferredBandForDay(s, day, dateStr);
              if (band) {
                const ok = templateMatchesShiftPreference(template, band);
                const mul = s.staffStrongBandPreference ? 2 : 1;
                if (ok) score += 24 * mul;
                else score -= 12 * mul;
              }
              const minM = s.minMorningDaysPerWeek;
              if (typeof minM === 'number' && minM > 0) {
                const morningDays = countMorningStyleDaysForStaff(schedule, s.id, templates);
                if (morningDays < minM && templateMatchesShiftPreference(template, 'Morning')) {
                  score += 16;
                }
              }
            }

            if (settings.enableBandCoverageTargets) {
              const tgt = effectiveBandTargetsForDay(day, settings);
              if (tgt) {
                const counts = countDistinctStaffByBandForDay(day, schedule, templates, normWeek);
                if (
                  templateMatchesShiftPreference(template, 'Morning') &&
                  counts.Morning < tgt.morningMin
                ) {
                  score += 26;
                }
                if (templateMatchesShiftPreference(template, 'Mid') && counts.Mid < tgt.midMin) {
                  score += 26;
                }
                if (
                  templateMatchesShiftPreference(template, 'Closing') &&
                  counts.Closing < tgt.closingMin
                ) {
                  score += 26;
                }
              }
            }
            return { s, score };
          });

          let pool = strictPrefs ? scored.filter((x) => x.score >= -500).map((x) => x.s) : scored.map((x) => x.s);

          if (strictPrefs && pool.length === 0) {
            pool = candidates;
          }

          if (consoleTrace && strictPrefs && candidates.length > pool.length) {
            const poolSet = new Set(pool);
            const dropped = candidates.filter((c) => !poolSet.has(c));
            console.log(
              'Removed from pool (strict day-off preference):',
              dropped.map((s) => s.name).join(', ') || '(none)'
            );
          }

          const scoreById = new Map(scored.map((x) => [x.s.id, x.score]));
          pool.sort((a, b) => {
            const ha = staffHours[a.id] || 0;
            const hb = staffHours[b.id] || 0;
            if (ha !== hb) return ha - hb;
            const sa = scoreById.get(a.id) ?? 0;
            const sb = scoreById.get(b.id) ?? 0;
            if (sa !== sb) return sb - sa;
            if (a.experienced && !b.experienced) return -1;
            if (!a.experienced && b.experienced) return 1;
            return a.name.localeCompare(b.name);
          });

          if (consoleTrace) {
            console.log(
              'Sort order (lower hours first, then experienced, then name):',
              pool.map((s) => `${s.name}(${((staffHours[s.id] || 0).toFixed(1))}h)`).join(' → ')
            );
          }

          for (const s of pool) {
            const roleKey = slot.roleKey;
            const matchedRole =
              roleKey === 'Any' || staffMatchesRoleSlot(s.role, roleKey, aliases);
            const inCharge =
              allowInCharge &&
              !matchedRole &&
              managerLikeRoleKey(roleKey) &&
              staffMatchesBackupInCharge(s.role, backups);

            if (!matchedRole && !inCharge) continue;

            const shiftDuration = getDurationHours(template.startTime, template.endTime);
            const effectiveDuration = Math.max(0, shiftDuration - settings.breakDuration / 60);
            const currentWeekly = staffHours[s.id] || 0;

            if (consoleTrace) {
              console.log('Assigned:', s.name, {
                weeklyEffHoursBefore: currentWeekly.toFixed(2),
                addEffHours: effectiveDuration.toFixed(2),
                inCharge: !!inCharge,
              });
              console.groupEnd();
            }

            return {
              id: newId(),
              staffId: s.id,
              day,
              date: dateStr,
              weekStartDate: normWeek,
              templateId: template.id,
              name: template.name,
              startTime: template.startTime,
              endTime: template.endTime,
              inCharge: inCharge || undefined,
            };
          }
          if (consoleTrace) {
            console.log('UNFILLED (no one in sorted pool passed final role check)');
            console.groupEnd();
          }
          return null;
        };

        let shift = tryFillSlot(false);
        if (!shift && settings.inChargeModeEnabled) {
          shift = tryFillSlot(true);
        }

        if (shift) {
          const shiftDuration = getDurationHours(template.startTime, template.endTime);
          const effectiveDuration = Math.max(0, shiftDuration - settings.breakDuration / 60);
          staffHours[shift.staffId] = (staffHours[shift.staffId] || 0) + effectiveDuration;
          schedule.push(shift);
        } else {
          const reasons: string[] = [];
          staffList.forEach((s) => {
            if (isStaffOnLeave(s.id, dateStr, leaves)) reasons.push(`${s.name}: on leave`);
            else if ((s.fixedWeeklyDaysOff || []).includes(day)) {
              reasons.push(`${s.name}: fixed weekly day off`);
            } else if (weekOffs[s.id]?.includes(day)) reasons.push(`${s.name}: day off`);
            else if (!getAvailabilityForDay(s, day).isAvailable) {
              reasons.push(`${s.name}: unavailable this day`);
            }
            else if (
              slot.roleKey !== 'Any' &&
              !staffMatchesRoleSlot(s.role, slot.roleKey, aliases) &&
              !(
                settings.inChargeModeEnabled &&
                template.inChargeAllowed !== false &&
                managerLikeRoleKey(slot.roleKey) &&
                staffMatchesBackupInCharge(s.role, backups)
              )
            ) {
              reasons.push(`${s.name}: role mismatch for "${slot.roleKey}"`);
            }
          });
          if (log) {
            pushDebug(
              `[${day} ${template.name} slot ${slotIndex + 1} "${slot.roleKey}"] Unfilled. Sample reasons: ${reasons.slice(0, 6).join('; ') || 'no staff'}`
            );
          }
        }
      });
    });
  });

  return schedule;
}

function countAssignmentsForRoleBucket(
  assignedShifts: ScheduledShift[],
  role: string,
  staffList: Staff[],
  aliases: Record<string, string[]>,
  settings: BusinessSettings
): number {
  if (role === 'Any') return assignedShifts.length;
  return assignedShifts.filter((s) => {
    const st = staffList.find((x) => x.id === s.staffId);
    if (!st) return false;
    if (staffMatchesRoleSlot(st.role, role, aliases)) return true;
    if (
      s.inCharge &&
      settings.inChargeModeEnabled &&
      managerLikeRoleKey(role) &&
      staffMatchesBackupInCharge(st.role, settings.inChargeBackupRoles || [])
    ) {
      return true;
    }
    return false;
  }).length;
}

export function getWarnings(
  schedule: ScheduledShift[],
  staffList: Staff[],
  templates: ShiftTemplate[],
  settings: BusinessSettings,
  currentWeekStartDate: string,
  leaves: Leave[] = []
): string[] {
  const warnings: Set<string> = new Set();
  const days = getWeekDaysInOrder(settings.weekStartDay);
  const normWeek = normalizeWeekDate(currentWeekStartDate);
  const aliases = mergeRoleAliases(settings.roleAliases);

  days.forEach((day) => {
    templates.forEach((tpl) => {
      const note = shiftTimingNoteForDay(day, tpl.startTime, tpl.endTime, settings);
      if (note) {
        warnings.add(`Template "${tpl.name}" on ${day}: ${note}`);
      }

      const assignedShifts = schedule.filter(
        (s) =>
          s.day === day &&
          s.templateId === tpl.id &&
          normalizeWeekDate(s.weekStartDate || '') === normWeek
      );

      const req =
        tpl.requiredRoles && Object.keys(tpl.requiredRoles).length > 0
          ? tpl.requiredRoles
          : tpl.requiredRole && tpl.requiredRole !== 'Any'
            ? { [tpl.requiredRole]: tpl.requiredStaffCount }
            : { Any: tpl.requiredStaffCount };

      Object.entries(req).forEach(([role, count]) => {
        const assignedCount = countAssignmentsForRoleBucket(
          assignedShifts,
          role,
          staffList,
          aliases,
          settings
        );
        if (assignedCount < count) {
          if (role === 'Any') {
            warnings.add(
              `Missing staff: "${tpl.name}" on ${day} needs ${count}, has ${assignedCount}.`
            );
          } else {
            warnings.add(
              `"${role}" coverage for ${tpl.name} on ${day}: ${assignedCount}/${count} (role aliases apply).`
            );
          }
        }
      });
    });
  });

  staffList.forEach((staff) => {
    const staffShifts = schedule.filter(
      (s) => s.staffId === staff.id && normalizeWeekDate(s.weekStartDate || '') === normWeek
    );
    let weeklyHours = 0;
    const dailyHours: Record<string, number> = {};

    const sortedShifts = [...staffShifts].sort((a, b) => {
      const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return getMinutes(a.startTime) - getMinutes(b.startTime);
    });

    sortedShifts.forEach((shift, index) => {
      const avail = getAvailabilityForDay(staff, shift.day);

      if (shift.date && isStaffOnLeave(staff.id, shift.date, leaves)) {
        warnings.add(
          `${staff.name} is scheduled on ${shift.day} (${shift.date}) but is on leave.`
        );
      }

      if (!avail || !avail.isAvailable) {
        warnings.add(`${staff.name} is scheduled on ${shift.day}, which is marked as unavailable.`);
      } else {
        const shiftStart = getMinutes(shift.startTime);
        let shiftEnd = getMinutes(shift.endTime);
        const availStart = getMinutes(avail.startTime);
        let availEnd = getMinutes(avail.endTime);

        if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;
        if (availEnd <= availStart) availEnd += 24 * 60;

        if (shiftStart < availStart || shiftEnd > availEnd) {
          warnings.add(
            `${staff.name} is scheduled outside their available hours on ${shift.day}.`
          );
        }
      }

      const bizHours = settings.hoursByDay[shift.day];
      if (bizHours && bizHours.isOpen) {
        const shiftStart = getMinutes(shift.startTime);
        let shiftEnd = getMinutes(shift.endTime);
        const staffLo = getMinutes(bizHours.earliestStaffStart || bizHours.openTime);
        let staffHi = getMinutes(bizHours.latestStaffEnd || bizHours.closeTime);
        if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;
        if (staffHi < staffLo) staffHi += 24 * 60;
        if (shiftStart < staffLo || shiftEnd > staffHi) {
          warnings.add(
            `${shift.name} on ${shift.day} is outside the allowed staff time window for that day.`
          );
        }
      } else if (bizHours && !bizHours.isOpen) {
        warnings.add(`${shift.name} is scheduled on ${shift.day}, but the business is closed.`);
      }

      const duration = getDurationHours(shift.startTime, shift.endTime);
      const effectiveDuration = Math.max(0, duration - settings.breakDuration / 60);

      weeklyHours += effectiveDuration;
      dailyHours[shift.day] = (dailyHours[shift.day] || 0) + effectiveDuration;

      const overlaps = staffShifts.filter(
        (s) => s.id !== shift.id && s.day === shift.day && isOverlapping(s, shift)
      );
      if (overlaps.length > 0) {
        warnings.add(`${staff.name} has overlapping shifts on ${shift.day}.`);
      }

      if (index > 0 && settings.minRestGap > 0) {
        const prevShift = sortedShifts[index - 1];
        let prevEnd = getMinutes(prevShift.endTime);
        let currStart = getMinutes(shift.startTime);

        const dayDiff = days.indexOf(shift.day) - days.indexOf(prevShift.day);
        currStart += dayDiff * 24 * 60;

        if (prevEnd < getMinutes(prevShift.startTime)) prevEnd += 24 * 60;

        const restGapHours = (currStart - prevEnd) / 60;
        if (restGapHours > 0 && restGapHours < settings.minRestGap) {
          warnings.add(
            `${staff.name} has insufficient rest between shifts on ${prevShift.day} and ${shift.day} (${restGapHours.toFixed(1)}h < ${settings.minRestGap}h).`
          );
        }
      }
    });

    if (weeklyHours > staff.maxHoursWeek) {
      warnings.add(
        `${staff.name} exceeds their personal max weekly hours (${weeklyHours.toFixed(1)} > ${staff.maxHoursWeek}).`
      );
    }
    if (weeklyHours > settings.maxHoursWeek) {
      warnings.add(
        `${staff.name} exceeds business max weekly hours (${weeklyHours.toFixed(1)} > ${settings.maxHoursWeek}).`
      );
    }
    if (
      typeof staff.requestedWeeklyHoursCap === 'number' &&
      staff.requestedWeeklyHoursCap > 0 &&
      weeklyHours > staff.requestedWeeklyHoursCap + 0.01
    ) {
      warnings.add(
        `${staff.name} exceeds their requested weekly cap (${weeklyHours.toFixed(1)}h > ${staff.requestedWeeklyHoursCap}h).`
      );
    }

    Object.entries(dailyHours).forEach(([day, hours]) => {
      if (hours > settings.maxHoursDay) {
        warnings.add(
          `${staff.name} exceeds max daily hours on ${day} (${hours.toFixed(1)} > ${settings.maxHoursDay}).`
        );
      }
    });

    const minM = staff.minMorningDaysPerWeek;
    if (typeof minM === 'number' && minM > 0) {
      const mc = countMorningStyleDaysForStaff(staffShifts, staff.id, templates);
      if (mc < minM) {
        warnings.add(
          `${staff.name}: ${mc} morning-style day(s) scheduled; target was at least ${minM} (auto-schedule uses this as a soft preference).`
        );
      }
    }

    staffShifts.forEach((shift) => {
      const dateYmd =
        shift.date || addDaysToWeekStart(normWeek, days.indexOf(shift.day));
      if ((staff.unavailableDates || []).includes(dateYmd)) {
        warnings.add(
          `${staff.name} is scheduled on ${dateYmd} but that date is marked unavailable (staff request).`
        );
      }
      const want = effectivePreferredBandForDay(staff, shift.day, dateYmd);
      if (!want) return;
      const t = shiftRecordAsTemplate(shift, templates);
      if (!templateMatchesShiftPreference(t, want)) {
        warnings.add(
          `${staff.name} on ${shift.day}: prefers "${want}" band for this date but shift is "${shift.name}" (${shift.startTime}–${shift.endTime}).`
        );
      }
    });
  });

  days.forEach((day) => {
    if (!settings.enableBandCoverageTargets) return;
    const tgt = effectiveBandTargetsForDay(day, settings);
    if (!tgt) return;
    const counts = countDistinctStaffByBandForDay(day, schedule, templates, normWeek);
    if (counts.Morning < tgt.morningMin) {
      warnings.add(
        `${day}: morning-style people ${counts.Morning} (soft target ≥ ${tgt.morningMin} after store-hour scaling).`
      );
    }
    if (counts.Mid < tgt.midMin) {
      warnings.add(`${day}: mid-shift people ${counts.Mid} (soft target ≥ ${tgt.midMin}).`);
    }
    if (counts.Closing < tgt.closingMin) {
      warnings.add(
        `${day}: closing-style people ${counts.Closing} (soft target ≥ ${tgt.closingMin}).`
      );
    }
  });

  return Array.from(warnings);
}
