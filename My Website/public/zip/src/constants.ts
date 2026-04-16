import { BusinessSettings, DayOfWeek, DAYS_MONDAY_START } from './types';
import { DEFAULT_ROLE_ALIASES } from './roleUtils';

export const defaultDailyHours = {
  isOpen: true,
  openTime: '09:00',
  closeTime: '17:00',
  earliestStaffStart: '09:00',
  latestStaffEnd: '17:00',
};

export const defaultSettings: BusinessSettings = {
  businessName: 'My Business',
  businessType: 'Custom',
  weekStartDay: 'Monday',
  hoursByDay: {
    Monday: { ...defaultDailyHours },
    Tuesday: { ...defaultDailyHours },
    Wednesday: { ...defaultDailyHours },
    Thursday: { ...defaultDailyHours },
    Friday: { ...defaultDailyHours },
    Saturday: { ...defaultDailyHours },
    Sunday: { ...defaultDailyHours, isOpen: false }
  },
  maxHoursDay: 8,
  maxHoursWeek: 40,
  breakDuration: 30,
  preOpeningBuffer: 0,
  postClosingBuffer: 0,
  minRestGap: 10,
  weekendDays: ['Saturday', 'Sunday'],
  roleAliases: { ...DEFAULT_ROLE_ALIASES },
  debugMode: false,
  inChargeModeEnabled: false,
  inChargeBackupRoles: ['Supervisor', 'Supervisor VM', 'Assistant Manager', 'Store Manager'],
  dayOffRulesEnabled: true,
  dayOffPreferenceMode: 'Soft' as const,
  applyGlobalDayOffShiftDefaults: false,
  globalBeforeDayOffPreferBands: ['Morning'],
  globalAfterDayOffPreferBands: ['Closing'],
  quickShiftTimePresets: [
    { label: '8–5', startTime: '08:00', endTime: '17:00' },
    { label: '9–6', startTime: '09:00', endTime: '18:00' },
    { label: '10–7', startTime: '10:00', endTime: '19:00' },
    { label: '11–8', startTime: '11:00', endTime: '20:00' },
  ],
  honorStaffSchedulingPreferences: true,
  showScheduleInlineQuickPresets: true,
  showScheduleBandCoverage: true,
  enableBandCoverageTargets: false,
  scaleBandTargetsForLateOpen: true,
  bandCoverageTargetsByDay: {},
};

export const defaultQuickShiftTimePresets = defaultSettings.quickShiftTimePresets!;

export const defaultAvailability = {
  Monday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
  Tuesday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
  Wednesday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
  Thursday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
  Friday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
  Saturday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
  Sunday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
};

export const businessPresets: Record<string, any[]> = {
  Retail: [
    { name: 'Morning', startTime: '08:00', endTime: '16:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-blue-100 text-blue-800 border-blue-200' },
    { name: 'Mid', startTime: '12:00', endTime: '20:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-green-100 text-green-800 border-green-200' },
    { name: 'Closing', startTime: '14:00', endTime: '22:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-purple-100 text-purple-800 border-purple-200' }
  ],
  Restaurant: [
    { name: 'Breakfast', startTime: '06:00', endTime: '14:00', requiredStaffCount: 3, requiredRole: '', colorTag: 'bg-orange-100 text-orange-800 border-orange-200' },
    { name: 'Lunch', startTime: '10:00', endTime: '18:00', requiredStaffCount: 4, requiredRole: '', colorTag: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { name: 'Dinner', startTime: '16:00', endTime: '23:59', requiredStaffCount: 5, requiredRole: '', colorTag: 'bg-red-100 text-red-800 border-red-200' }
  ],
  Clinic: [
    { name: 'Morning Shift', startTime: '07:00', endTime: '15:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-teal-100 text-teal-800 border-teal-200' },
    { name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-cyan-100 text-cyan-800 border-cyan-200' }
  ],
  Office: [
    { name: 'Standard', startTime: '09:00', endTime: '17:00', requiredStaffCount: 5, requiredRole: '', colorTag: 'bg-slate-100 text-slate-800 border-slate-200' }
  ],
  Cafe: [
    { name: 'Open', startTime: '06:00', endTime: '14:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-amber-100 text-amber-900 border-amber-200' },
    { name: 'Mid', startTime: '10:00', endTime: '18:00', requiredStaffCount: 3, requiredRole: '', colorTag: 'bg-orange-100 text-orange-900 border-orange-200' },
    { name: 'Close', startTime: '14:00', endTime: '22:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-stone-100 text-stone-900 border-stone-200' },
  ],
  Warehouse: [
    { name: 'Early', startTime: '06:00', endTime: '14:00', requiredStaffCount: 4, requiredRole: '', colorTag: 'bg-slate-100 text-slate-800 border-slate-200' },
    { name: 'Late', startTime: '14:00', endTime: '22:00', requiredStaffCount: 4, requiredRole: '', colorTag: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
  ],
  Gym: [
    { name: 'Open', startTime: '05:30', endTime: '14:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
    { name: 'Peak', startTime: '12:00', endTime: '21:00', requiredStaffCount: 3, requiredRole: '', colorTag: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  ],
  Salon: [
    { name: 'Stylist day', startTime: '09:00', endTime: '17:00', requiredStaffCount: 3, requiredRole: '', colorTag: 'bg-pink-100 text-pink-900 border-pink-200' },
    { name: 'Evening', startTime: '12:00', endTime: '20:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200' },
  ],
  Security: [
    { name: 'Day patrol', startTime: '06:00', endTime: '18:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-slate-100 text-slate-800 border-slate-200' },
    { name: 'Night', startTime: '18:00', endTime: '06:00', requiredStaffCount: 2, requiredRole: '', colorTag: 'bg-gray-100 text-gray-900 border-gray-200' },
  ],
};

export const shiftColors = [
  { label: 'Blue', value: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Green', value: 'bg-green-100 text-green-800 border-green-200' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-800 border-purple-200' },
  { label: 'Orange', value: 'bg-orange-100 text-orange-800 border-orange-200' },
  { label: 'Red', value: 'bg-red-100 text-red-800 border-red-200' },
  { label: 'Teal', value: 'bg-teal-100 text-teal-800 border-teal-200' },
  { label: 'Pink', value: 'bg-pink-100 text-pink-800 border-pink-200' },
  { label: 'Slate', value: 'bg-slate-100 text-slate-800 border-slate-200' },
];
