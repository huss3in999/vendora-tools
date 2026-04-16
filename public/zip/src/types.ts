export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** Shift “bands” for preferences and coverage (matches template names/times). */
export type ShiftPreferenceBand = 'Morning' | 'Mid' | 'Closing';

export const DAYS_MONDAY_START: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SUNDAY_START: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface DailyHours {
  isOpen: boolean;
  /** When the store opens to customers */
  openTime: string;
  /** When the store closes to customers */
  closeTime: string;
  /** Earliest time any staff may clock in (e.g. prep before open) */
  earliestStaffStart: string;
  /** Latest time any staff may finish (e.g. after closing cleanup) */
  latestStaffEnd: string;
}

export interface BusinessSettings {
  businessName: string;
  businessType: string;
  /** First day shown in the rota week (any weekday). */
  weekStartDay: DayOfWeek;
  hoursByDay: Record<DayOfWeek, DailyHours>;
  maxHoursDay: number;
  maxHoursWeek: number;
  breakDuration: number;
  /** Minutes before store open that shifts may start (applied from store open time) */
  preOpeningBuffer: number;
  /** Minutes after store close that shifts may end (applied from store close time) */
  postClosingBuffer: number;
  minRestGap: number;
  weekendDays: DayOfWeek[];
  /** Canonical role key → job titles that count for that slot (see Setup) */
  roleAliases?: Record<string, string[]>;
  debugMode?: boolean;
  inChargeModeEnabled?: boolean;
  /** Staff role labels that may cover a missing manager slot when In Charge is ON */
  inChargeBackupRoles?: string[];
  dayOffRulesEnabled?: boolean;
  dayOffPreferenceMode?: 'Soft' | 'Strict';
  /** When on, staff with no per-person before/after day-off preference use the shop-wide defaults below. */
  applyGlobalDayOffShiftDefaults?: boolean;
  /**
   * Shop-wide acceptable shift bands before a day off (multi-select). Auto-schedule treats a template as OK if it
   * matches any selected band when staff has no per-person preference.
   */
  globalBeforeDayOffPreferBands?: ShiftPreferenceBand[];
  /**
   * Shop-wide acceptable shift bands after a day off (multi-select).
   */
  globalAfterDayOffPreferBands?: ShiftPreferenceBand[];
  /** One-tap time buttons when editing a shift on the Schedule tab. */
  quickShiftTimePresets?: { label: string; startTime: string; endTime: string }[];
  /** When true (default), auto-schedule uses per-staff band/day preferences and requests below. */
  honorStaffSchedulingPreferences?: boolean;
  /** Show shop quick-time preset chips inside each schedule cell (fast edits). */
  showScheduleInlineQuickPresets?: boolean;
  /** Show people-per-band coverage row (Morning / Mid / Closing / Off) on the Schedule tab. */
  showScheduleBandCoverage?: boolean;
  /** When on, auto-schedule nudges assignments toward minimum people per band per day (see bandCoverageTargetsByDay). */
  enableBandCoverageTargets?: boolean;
  /** Reduce “morning” targets when store opens at or after 10:00; slightly trim closing targets on very short days. */
  scaleBandTargetsForLateOpen?: boolean;
  /** Optional minimum distinct staff per band per weekday (soft targets). */
  bandCoverageTargetsByDay?: Partial<
    Record<DayOfWeek, { morningMin?: number; midMin?: number; closingMin?: number }>
  >;
  // Legacy fields for migration
  globalBeforeDayOffPrefer?: '' | 'Morning' | 'Mid' | 'Closing';
  globalAfterDayOffPrefer?: '' | 'Morning' | 'Mid' | 'Closing';
  openTime?: string;
  closeTime?: string;
}

export interface TimeRange {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  availability: Record<DayOfWeek, TimeRange>;
  maxHoursWeek: number;
  notes: string;
  phone?: string;
  experienced?: boolean;
  /** Prefer this shift type before a scheduled day off (when rules enabled) */
  beforeDayOffPrefer?: '' | 'Morning' | 'Mid' | 'Closing';
  /** Prefer this shift type after a scheduled day off (when rules enabled) */
  afterDayOffPrefer?: '' | 'Morning' | 'Mid' | 'Closing';
  /**
   * Optional preferred shift band for specific weekdays (e.g. VM always morning on Mon/Wed).
   * Days not listed are unconstrained by this field.
   */
  preferredBandByDay?: Partial<Record<DayOfWeek, 'Morning' | 'Mid' | 'Closing'>>;
  /** Whole-week soft preference for auto-schedule (e.g. staff asked to work mornings). */
  staffScheduleRequestBand?: '' | 'Morning' | 'Mid' | 'Closing';
  /** Free-text staff request (shown on roster; for managers only, not parsed by the engine). */
  staffScheduleRequestNote?: string;
  /** Prefer at least this many distinct days with a morning-style shift (soft scoring + warning if not met). */
  minMorningDaysPerWeek?: number;
  /** Same days off every week (auto-schedule + grid treat as off; optional). */
  fixedWeeklyDaysOff?: DayOfWeek[];
  /**
   * Requested lower weekly hours cap for scheduling (e.g. student). Auto-schedule uses min(this, maxHoursWeek).
   */
  requestedWeeklyHoursCap?: number;
  /** Prefer to be scheduled on these weekdays when possible (soft bonus). */
  preferSchedulingOnDays?: DayOfWeek[];
  /** Specific calendar dates (YYYY-MM-DD) with a required shift band for that day (overrides weekday band). */
  preferredBandExceptions?: { date: string; band: ShiftPreferenceBand }[];
  /** Calendar dates (YYYY-MM-DD) they cannot work — one-off off / request (auto-schedule + quick add respect this). */
  unavailableDates?: string[];
  /** Stronger auto-schedule weighting for band preferences / exceptions (still soft vs coverage). */
  staffStrongBandPreference?: boolean;
  // Legacy field
  legacyAvailability?: DayOfWeek[];
}

export interface Leave {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  requiredRole: string;
  requiredRoles?: Record<string, number>;
  colorTag: string;
  /** When In Charge mode is on, allow backup roles to cover strict role slots */
  inChargeAllowed?: boolean;
  notes?: string;
}

export interface ScheduledShift {
  id: string;
  staffId: string;
  day: DayOfWeek;
  date?: string;
  weekStartDate?: string;
  templateId?: string;
  name: string;
  startTime: string;
  endTime: string;
  notes?: string;
  /** Acting lead when manager slot covered by backup (In Charge mode) */
  inCharge?: boolean;
  /** Optional label on this shift only (e.g. “In-charge manager”, “Sales cashier”) for the rota view / exports. */
  displayRole?: string;
}
