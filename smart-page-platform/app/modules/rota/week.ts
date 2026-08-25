export type RotaSettings = {
  timezone: string;
  timezoneOffsetMinutes: number;
  weekStartDay: number;
  cutoffDay: number;
  cutoffTime: string;
  totalStaff: number;
  minimumMorning: number;
  minimumClosing: number;
  maxAbsentPerDay: number;
  allowEmergencyOverride: boolean;
  shiftTemplatesJson: string;
};

const DAY_MS = 86_400_000;

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateOnly: string, days: number) {
  const date = parseDateOnly(dateOnly);
  if (!date) return dateOnly;
  return formatDateOnly(new Date(date.getTime() + days * DAY_MS));
}

export function weekStartForDate(dateOnly: string, weekStartDay: number) {
  const date = parseDateOnly(dateOnly);
  if (!date) return dateOnly;
  const offset = (date.getUTCDay() - weekStartDay + 7) % 7;
  return formatDateOnly(new Date(date.getTime() - offset * DAY_MS));
}

export function cutoffForWeek(weekStart: string, settings: Pick<RotaSettings, "weekStartDay" | "cutoffDay" | "cutoffTime" | "timezoneOffsetMinutes">) {
  const start = parseDateOnly(weekStart);
  if (!start) return new Date(Number.NaN);
  let daysBefore = (settings.weekStartDay - settings.cutoffDay + 7) % 7;
  if (daysBefore === 0) daysBefore = 7;
  const cutoffDate = new Date(start.getTime() - daysBefore * DAY_MS);
  const [hoursText, minutesText] = settings.cutoffTime.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  return new Date(
    Date.UTC(
      cutoffDate.getUTCFullYear(),
      cutoffDate.getUTCMonth(),
      cutoffDate.getUTCDate(),
      Number.isFinite(hours) ? hours : 23,
      Number.isFinite(minutes) ? minutes : 59
    ) - settings.timezoneOffsetMinutes * 60_000
  );
}

export function normalizeRequestTarget(targetDate: string, settings: RotaSettings, now = new Date()) {
  const parsed = parseDateOnly(targetDate);
  if (!parsed) throw new Error("Choose a valid target date.");

  const originalTargetDate = formatDateOnly(parsed);
  let effectiveTargetDate = originalTargetDate;
  let weekStart = weekStartForDate(effectiveTargetDate, settings.weekStartDay);
  let cutoff = cutoffForWeek(weekStart, settings);
  let movedWeeks = 0;

  while (now.getTime() > cutoff.getTime() && movedWeeks < 104) {
    effectiveTargetDate = addDays(effectiveTargetDate, 7);
    weekStart = addDays(weekStart, 7);
    cutoff = cutoffForWeek(weekStart, settings);
    movedWeeks += 1;
  }

  return {
    originalTargetDate,
    targetDate: effectiveTargetDate,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    cutoffIso: cutoff.toISOString(),
    movedWeeks,
    isLate: movedWeeks > 0
  };
}

export function normalizeAnnualLeaveRange(startDate: string, endDate: string, settings: RotaSettings, now = new Date()) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) throw new Error("Choose valid From and To dates for annual leave.");
  if (end.getTime() < start.getTime()) throw new Error("The To date cannot be before the From date.");
  const durationDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (durationDays > 60) throw new Error("Annual leave can be submitted for up to 60 days at a time.");

  const timing = normalizeRequestTarget(startDate, settings, now);
  return {
    ...timing,
    originalEndDate: formatDateOnly(end),
    endDate: addDays(formatDateOnly(end), timing.movedWeeks * 7),
    durationDays
  };
}

export function formatWeekRange(weekStart: string, locale = "en-GB") {
  const start = parseDateOnly(weekStart);
  const end = parseDateOnly(addDays(weekStart, 6));
  if (!start || !end) return weekStart;
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function requestTypeLabel(value: string) {
  const labels: Record<string, string> = {
    day_off: "Day off",
    morning: "Morning shift",
    mid: "Mid shift",
    closing: "Closing shift",
    shift_swap: "Shift swap",
    annual_leave: "Annual leave",
    emergency_leave: "Emergency leave",
    other: "Other"
  };
  return labels[value] ?? value;
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancel_requested: "Cancellation requested",
    cancelled: "Cancelled"
  };
  return labels[value] ?? value;
}
