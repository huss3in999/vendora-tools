import { Staff, DayOfWeek, TimeRange, DAYS_MONDAY_START } from './types';
import { defaultAvailability } from './constants';

function openAllDay(): TimeRange {
  return { isAvailable: true, startTime: '00:00', endTime: '23:59' };
}

function closedDay(): TimeRange {
  return { isAvailable: false, startTime: '00:00', endTime: '23:59' };
}

/**
 * Safe read for UI / scheduler: supports legacy `availability: ["Monday", …]` arrays.
 */
export function getAvailabilityForDay(staff: Staff, day: DayOfWeek): TimeRange {
  const a = staff.availability as unknown;
  if (Array.isArray(a)) {
    const days = a.filter((x): x is string => typeof x === 'string');
    return days.includes(day) ? openAllDay() : closedDay();
  }
  const slot = staff.availability?.[day];
  if (slot && typeof slot === 'object' && typeof slot.isAvailable === 'boolean') {
    return {
      isAvailable: slot.isAvailable,
      startTime: slot.startTime || '00:00',
      endTime: slot.endTime || '23:59',
    };
  }
  return closedDay();
}

/**
 * Convert legacy staff rows to the current `Record<DayOfWeek, TimeRange>` shape (mutates copy only).
 */
export function normalizeStaffRecord(staff: Staff): Staff {
  const a = staff.availability as unknown;
  if (Array.isArray(a)) {
    const days = new Set(a.filter((x): x is DayOfWeek => typeof x === 'string') as DayOfWeek[]);
    const availability = { ...defaultAvailability };
    DAYS_MONDAY_START.forEach((d) => {
      availability[d] = days.has(d)
        ? { isAvailable: true, startTime: '00:00', endTime: '23:59' }
        : { isAvailable: false, startTime: '00:00', endTime: '23:59' };
    });
    return {
      ...staff,
      availability,
      legacyAvailability: undefined,
    };
  }
  if (!a || typeof a !== 'object') {
    return {
      ...staff,
      availability: JSON.parse(JSON.stringify(defaultAvailability)) as Staff['availability'],
    };
  }
  const availability = { ...defaultAvailability };
  DAYS_MONDAY_START.forEach((d) => {
    const slot = (a as Record<string, TimeRange>)[d];
    if (slot && typeof slot.isAvailable === 'boolean') {
      availability[d] = {
        isAvailable: slot.isAvailable,
        startTime: slot.startTime || '00:00',
        endTime: slot.endTime || '23:59',
      };
    }
  });
  return { ...staff, availability };
}
