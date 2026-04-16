import React, { useRef, useEffect, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Settings, Download, Upload, Database, Trash2 } from 'lucide-react';
import {
  BusinessSettings,
  DayOfWeek,
  DAYS_MONDAY_START,
  Staff,
  ShiftTemplate,
  ScheduledShift,
  Leave,
  ShiftPreferenceBand,
} from '../types';
import { defaultSettings, businessPresets, defaultQuickShiftTimePresets } from '../constants';
import { normalizeHoursByDayStaffWindow, newId } from '../utils';
import { normalizeStaffRecord } from '../staffAvailability';
import { DEFAULT_ROLE_ALIASES } from '../roleUtils';
import {
  ROTA_CLEAR_BANNER_SESSION_KEY,
  ROTA_LOCALSTORAGE_DATA_KEYS,
  ROTA_STORAGE_META_KEY,
  clearAllRotaAppBrowserStorage,
  listPresentRotaLocalKeys,
  listPresentRotaSessionKeys,
  readRotaStorageMeta,
} from '../rotaBrowserStorage';
import { ROTA_SETUP_BANNER_DISMISSED_KEY, type MainTabId } from '../setupReadiness';

const BAND_OPTIONS: ShiftPreferenceBand[] = ['Morning', 'Mid', 'Closing'];

function toggleBandInList(list: ShiftPreferenceBand[], band: ShiftPreferenceBand): ShiftPreferenceBand[] {
  if (list.includes(band)) return list.filter((b) => b !== band);
  return [...list, band];
}

function roleAliasesToText(aliases: Record<string, string[]> | undefined): string {
  if (!aliases) return '';
  return Object.entries(aliases)
    .map(([k, v]) => `${k} = ${v.join(', ')}`)
    .join('\n');
}

function parseRoleAliasesText(text: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  text.split('\n').forEach((line) => {
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const rest = line.slice(idx + 1);
    const parts = rest
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (key && parts.length) out[key] = parts;
  });
  return out;
}

const VALID_DAYS = new Set<DayOfWeek>(DAYS_MONDAY_START);

function sanitizeImportedStaffList(rows: unknown[]): Staff[] {
  const out: Staff[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const s = row as Partial<Staff>;
    if (typeof s.id !== 'string' || !s.id.trim() || typeof s.name !== 'string') continue;
    out.push(normalizeStaffRecord({ ...(s as Staff) }));
  }
  return out;
}

function sanitizeImportedTemplates(rows: unknown[]): ShiftTemplate[] {
  const out: ShiftTemplate[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const t = row as Partial<ShiftTemplate>;
    if (typeof t.id !== 'string' || !t.id.trim() || typeof t.name !== 'string') continue;
    if (typeof t.startTime !== 'string' || typeof t.endTime !== 'string') continue;
    const count =
      typeof t.requiredStaffCount === 'number' && Number.isFinite(t.requiredStaffCount) ? t.requiredStaffCount : 1;
    out.push({
      ...t,
      id: t.id,
      name: t.name,
      startTime: t.startTime,
      endTime: t.endTime,
      requiredStaffCount: count,
      requiredRole: typeof t.requiredRole === 'string' ? t.requiredRole : '',
      colorTag: typeof t.colorTag === 'string' ? t.colorTag : '#64748b',
    } as ShiftTemplate);
  }
  return out;
}

function sanitizeImportedSchedule(rows: unknown[]): ScheduledShift[] {
  const out: ScheduledShift[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const staffId = typeof r.staffId === 'string' ? r.staffId : '';
    const day = typeof r.day === 'string' && VALID_DAYS.has(r.day as DayOfWeek) ? (r.day as DayOfWeek) : null;
    if (!staffId || !day) continue;
    out.push({
      id: typeof r.id === 'string' && r.id.trim() ? r.id : newId(),
      staffId,
      day,
      date: typeof r.date === 'string' ? r.date : undefined,
      weekStartDate: typeof r.weekStartDate === 'string' ? r.weekStartDate : undefined,
      templateId: typeof r.templateId === 'string' ? r.templateId : undefined,
      name: typeof r.name === 'string' ? r.name : 'Shift',
      startTime: typeof r.startTime === 'string' ? r.startTime : '09:00',
      endTime: typeof r.endTime === 'string' ? r.endTime : '17:00',
      notes: typeof r.notes === 'string' ? r.notes : undefined,
      inCharge: typeof r.inCharge === 'boolean' ? r.inCharge : undefined,
      displayRole: typeof r.displayRole === 'string' ? r.displayRole : undefined,
    });
  }
  return out;
}

function sanitizeImportedLeaves(rows: unknown[]): Leave[] {
  const out: Leave[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.staffId !== 'string' || typeof r.startDate !== 'string' || typeof r.endDate !== 'string') continue;
    out.push({
      id: typeof r.id === 'string' && r.id.trim() ? r.id : newId(),
      staffId: r.staffId,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: typeof r.reason === 'string' ? r.reason : '',
    });
  }
  return out;
}

/** Drop invalid week keys / staff maps so localStorage never gets a shape the app cannot read. */
function sanitizeImportedWeekDayOffs(raw: unknown): Record<string, Record<string, DayOfWeek[]>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Record<string, DayOfWeek[]>> = {};
  for (const [wk, staffMap] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof wk !== 'string' || !wk.trim() || !staffMap || typeof staffMap !== 'object' || Array.isArray(staffMap)) {
      continue;
    }
    const inner: Record<string, DayOfWeek[]> = {};
    for (const [staffId, days] of Object.entries(staffMap as Record<string, unknown>)) {
      if (typeof staffId !== 'string' || !Array.isArray(days)) continue;
      const cleaned = days.filter((d): d is DayOfWeek => typeof d === 'string' && VALID_DAYS.has(d as DayOfWeek));
      inner[staffId] = cleaned;
    }
    if (Object.keys(inner).length > 0) out[wk] = inner;
  }
  return out;
}

interface SetupTabProps {
  settings: BusinessSettings;
  setSettings: (settings: BusinessSettings) => void;
  onLoadPreset: (presetName: string) => void;
  staffList: Staff[];
  setStaffList: (staff: Staff[]) => void;
  templates: ShiftTemplate[];
  setTemplates: (templates: ShiftTemplate[]) => void;
  schedule: ScheduledShift[];
  leaves: Leave[];
  weekDayOffs: Record<string, Record<string, DayOfWeek[]>>;
  setSchedule: Dispatch<SetStateAction<ScheduledShift[]>>;
  setLeaves: Dispatch<SetStateAction<Leave[]>>;
  setWeekDayOffs: Dispatch<SetStateAction<Record<string, Record<string, DayOfWeek[]>>>>;
  onNavigateTab?: (tab: MainTabId) => void;
  onResetSetupBanner?: () => void;
}

export function SetupTab({
  settings,
  setSettings,
  onLoadPreset,
  staffList,
  setStaffList,
  templates,
  setTemplates,
  schedule,
  leaves,
  weekDayOffs,
  setSchedule,
  setLeaves,
  setWeekDayOffs,
  onNavigateTab,
  onResetSetupBanner,
}: SetupTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storageRefresh, setStorageRefresh] = useState(0);
  const refreshStorageSnapshot = useCallback(() => setStorageRefresh((n) => n + 1), []);

  useEffect(() => {
    const onFocus = () => refreshStorageSnapshot();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshStorageSnapshot]);

  useEffect(() => {
    refreshStorageSnapshot();
  }, [
    refreshStorageSnapshot,
    settings,
    staffList,
    templates,
    schedule,
    leaves,
    weekDayOffs,
  ]);

  const presentLocal = listPresentRotaLocalKeys();
  const presentSession = listPresentRotaSessionKeys();
  const meta = readRotaStorageMeta();
  const hasInMemoryRotaData =
    staffList.length > 0 ||
    templates.length > 0 ||
    schedule.length > 0 ||
    leaves.length > 0 ||
    Object.keys(weekDayOffs).length > 0;

  const handleClearBrowserStorage = () => {
    if (
      !confirm(
        'Are you sure you want to delete all saved browser data for this rota app? This cannot be undone.'
      )
    ) {
      return;
    }
    try {
      sessionStorage.setItem(ROTA_CLEAR_BANNER_SESSION_KEY, '1');
    } catch {
      /* still reload */
    }
    clearAllRotaAppBrowserStorage();
    window.location.reload();
  };

  const handleDayHoursChange = (day: DayOfWeek, field: string, value: any) => {
    setSettings({
      ...settings,
      hoursByDay: {
        ...settings.hoursByDay,
        [day]: {
          ...settings.hoursByDay[day],
          [field]: value
        }
      }
    });
  };

  const handleWeekendToggle = (day: DayOfWeek) => {
    const newWeekends = settings.weekendDays.includes(day)
      ? settings.weekendDays.filter(d => d !== day)
      : [...settings.weekendDays, day];
    setSettings({ ...settings, weekendDays: newWeekends });
  };

  const handleDownloadSetup = () => {
    try {
      const setupData = {
        settings,
        staffList,
        templates
      };
      const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `rota_setup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      alert('Could not create the download file. Your browser may be blocking downloads or storage is full.');
    }
  };

  const handleUploadSetup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      alert('Could not read that file from your device. Try again or use a smaller .json file.');
    };
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string' || !text.trim()) {
          alert('That file is empty or could not be read as text.');
          return;
        }
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          alert('That file is not a JSON object. Use a backup or setup export from this app.');
          return;
        }
        let applied = false;
        if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
          const s = { ...data.settings };
          if (s.hoursByDay) {
            s.hoursByDay = normalizeHoursByDayStaffWindow(s.hoursByDay);
          }
          setSettings(s as BusinessSettings);
          applied = true;
        }
        if (Array.isArray(data.staffList)) {
          const cleaned = sanitizeImportedStaffList(data.staffList);
          setStaffList(cleaned);
          applied = true;
        }
        if (Array.isArray(data.templates)) {
          const cleaned = sanitizeImportedTemplates(data.templates);
          setTemplates(cleaned);
          applied = true;
        }
        if (Array.isArray(data.schedule)) {
          setSchedule(sanitizeImportedSchedule(data.schedule));
          applied = true;
        }
        if (Array.isArray(data.leaves)) {
          setLeaves(sanitizeImportedLeaves(data.leaves));
          applied = true;
        }
        if (data.weekDayOffs && typeof data.weekDayOffs === 'object' && !Array.isArray(data.weekDayOffs)) {
          setWeekDayOffs(sanitizeImportedWeekDayOffs(data.weekDayOffs));
          applied = true;
        }
        alert(applied ? 'File loaded successfully.' : 'No recognized rota fields in that JSON (expected settings, staffList, templates, schedule, leaves, or weekDayOffs).');
      } catch {
        alert('That file is not valid JSON, or it is corrupted. Use UTF-8 .json exported from this app.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Settings size={20} /> Business Setup</h2>
        <div className="flex gap-2">
          <button type="button" onClick={handleDownloadSetup} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"><Download size={16}/> Download Setup</button>
          <button
            type="button"
            title="Imports JSON from this app: setup export, full backup, or any saved fields combined."
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"
          >
            <Upload size={16}/> Upload Setup
          </button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleUploadSetup} className="hidden" />
        </div>
      </div>

      <div
        key={storageRefresh}
        className="mb-8 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 no-print"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-2">
            <Database className="text-slate-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-slate-800">Browser storage (auto-save)</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Your rota is saved automatically in this browser under the keys below. If the app still behaves like an
                older version after an update, stale saved data or a cached script may be involved — use{' '}
                <strong>Clear All Saved Browser Data</strong> to reset storage, and hard-refresh the page (Ctrl+Shift+R)
                if needed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearBrowserStorage}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
          >
            <Trash2 size={16} />
            Clear All Saved Browser Data
          </button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 border-t border-slate-200/80 pt-3">
          <div>
            <dt className="font-medium text-slate-600">Data in memory (current session)</dt>
            <dd>
              {hasInMemoryRotaData
                ? 'Yes — staff, templates, schedule, leave, or week day-offs include saved records.'
                : 'Empty defaults (no staff/templates/shifts/leave/week day-offs yet).'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">localStorage keys with a stored value</dt>
            <dd className="font-mono break-all">
              {presentLocal.length ? presentLocal.join(', ') : 'None'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Expected data keys (always used for auto-save)</dt>
            <dd className="font-mono break-all">{ROTA_LOCALSTORAGE_DATA_KEYS.join(', ')}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Metadata key (last save time)</dt>
            <dd className="font-mono break-all">{ROTA_STORAGE_META_KEY}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Last auto-save (UTC)</dt>
            <dd>{meta?.lastSavedAt ? new Date(meta.lastSavedAt).toLocaleString() : 'Not recorded yet'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">sessionStorage (rota_*)</dt>
            <dd className="font-mono break-all">
              {presentSession.length ? presentSession.join(', ') : 'None'}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={refreshStorageSnapshot}
          className="text-xs text-blue-600 hover:underline"
        >
          Refresh storage info
        </button>
        {onResetSetupBanner && (
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(ROTA_SETUP_BANNER_DISMISSED_KEY);
                } catch {
                  /* ignore */
                }
                onResetSetupBanner();
              }}
              className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
            >
              Show setup checklist banner again
            </button>
          </div>
        )}
      </div>

      {onNavigateTab && (
        <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50/50 p-4 no-print">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Quick start</h3>
          <p className="text-xs text-slate-600 mb-3">
            Use any vertical — retail, food service, office, warehouse, gym, clinic. Flow is the same:
          </p>
          <ol className="flex flex-wrap gap-2 text-xs">
            {(
              [
                { t: 'setup' as const, label: '1. Hours & rules' },
                { t: 'templates' as const, label: '2. Shift types' },
                { t: 'staff' as const, label: '3. Team' },
                { t: 'schedule' as const, label: '4. Rota' },
              ] as const
            ).map((step) => (
              <li key={step.t}>
                <button
                  type="button"
                  onClick={() => onNavigateTab(step.t)}
                  className="rounded-lg bg-white px-3 py-1.5 font-medium text-blue-800 ring-1 ring-blue-200 hover:bg-blue-50"
                >
                  {step.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* General Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-slate-800 border-b pb-2">General Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
            <input type="text" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Type (Preset)</label>
            <select 
              value={settings.businessType} 
              onChange={e => {
                setSettings({...settings, businessType: e.target.value});
                if (e.target.value !== 'Custom') {
                  if (confirm(`Load default shift templates for ${e.target.value}? This will replace existing templates.`)) {
                    onLoadPreset(e.target.value);
                  }
                }
              }} 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Custom">Custom</option>
              {Object.keys(businessPresets)
                .sort((a, b) => a.localeCompare(b))
                .map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Week Start Day</label>
            <select
              value={settings.weekStartDay}
              onChange={(e) =>
                setSettings({ ...settings, weekStartDay: e.target.value as DayOfWeek })
              }
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {DAYS_MONDAY_START.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Hours/Day</label>
              <input type="number" value={settings.maxHoursDay} onChange={e => setSettings({...settings, maxHoursDay: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Hours/Week</label>
              <input type="number" value={settings.maxHoursWeek} onChange={e => setSettings({...settings, maxHoursWeek: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Break Duration (min)</label>
              <input type="number" value={settings.breakDuration} onChange={e => setSettings({...settings, breakDuration: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Rest Gap (hrs)</label>
              <input type="number" value={settings.minRestGap} onChange={e => setSettings({...settings, minRestGap: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pre-Opening Buffer (min)</label>
              <input type="number" value={settings.preOpeningBuffer} onChange={e => setSettings({...settings, preOpeningBuffer: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Post-Closing Buffer (min)</label>
              <input type="number" value={settings.postClosingBuffer} onChange={e => setSettings({...settings, postClosingBuffer: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Weekend Days</label>
            <div className="flex flex-wrap gap-2">
              {['Friday', 'Saturday', 'Sunday'].map(day => (
                <label key={day} className="flex items-center gap-1 text-sm bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input 
                    type="checkbox" 
                    checked={settings.weekendDays.includes(day as DayOfWeek)}
                    onChange={() => handleWeekendToggle(day as DayOfWeek)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Business Hours By Day */}
        <div className="space-y-4">
          <h3 className="font-medium text-slate-800 border-b pb-2">Hours by day</h3>
          <p className="text-xs text-slate-500">
            Store hours are for customers. Staff may start earlier or finish later using the staff window — this avoids
            confusing “opening time” with “when employees arrive”.
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {DAYS_MONDAY_START.map((day) => {
              const hours = settings.hoursByDay[day];
              return (
                <div key={day} className="border border-slate-100 rounded-lg p-2 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-20 font-medium text-slate-700">{day}</div>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={hours.isOpen}
                        onChange={(e) => handleDayHoursChange(day, 'isOpen', e.target.checked)}
                      />
                      Open
                    </label>
                  </div>
                  {hours.isOpen ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Store open</label>
                        <input
                          type="time"
                          value={hours.openTime}
                          onChange={(e) => handleDayHoursChange(day, 'openTime', e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Store close</label>
                        <input
                          type="time"
                          value={hours.closeTime}
                          onChange={(e) => handleDayHoursChange(day, 'closeTime', e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                          Earliest staff start
                        </label>
                        <input
                          type="time"
                          value={hours.earliestStaffStart ?? hours.openTime}
                          onChange={(e) => handleDayHoursChange(day, 'earliestStaffStart', e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Latest staff end</label>
                        <input
                          type="time"
                          value={hours.latestStaffEnd ?? hours.closeTime}
                          onChange={(e) => handleDayHoursChange(day, 'latestStaffEnd', e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">Closed</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t pt-6">
        <h3 className="font-medium text-slate-800 border-b pb-2">Role aliases &amp; advanced scheduling</h3>
        <p className="text-xs text-slate-500">
          One line per role slot keyword. Auto-schedule matches staff job titles to these lists (not exact text only).
          Example: <code className="bg-slate-100 px-1 rounded">manager = Store Manager, Supervisor</code>
        </p>
        <textarea
          className="w-full min-h-[120px] p-3 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
          value={roleAliasesToText(settings.roleAliases)}
          onChange={(e) =>
            setSettings({ ...settings, roleAliases: parseRoleAliasesText(e.target.value) })
          }
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() =>
            setSettings({ ...settings, roleAliases: { ...DEFAULT_ROLE_ALIASES } })
          }
          className="text-xs text-blue-600 hover:underline"
        >
          Reset role aliases to defaults
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings.debugMode}
              onChange={(e) => setSettings({ ...settings, debugMode: e.target.checked })}
            />
            Debug mode (show why auto-schedule skipped slots)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings.inChargeModeEnabled}
              onChange={(e) => setSettings({ ...settings, inChargeModeEnabled: e.target.checked })}
            />
            Enable “In charge” / acting lead coverage
          </label>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Eligible backup roles (comma-separated)
            </label>
            <input
              type="text"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={(settings.inChargeBackupRoles || []).join(', ')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  inChargeBackupRoles: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Supervisor, Assistant Manager, ..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.honorStaffSchedulingPreferences !== false}
              onChange={(e) =>
                setSettings({ ...settings, honorStaffSchedulingPreferences: e.target.checked })
              }
            />
            Honor per-staff shift requests &amp; day band preferences (auto-schedule)
          </label>
          <p className="md:col-span-2 text-xs text-slate-500 -mt-2">
            Turn off to ignore “whole-week request”, “preferred band by day”, and “minimum morning days” when generating
            the rota (day-off before/after rules are separate).
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings.dayOffRulesEnabled}
              onChange={(e) => setSettings({ ...settings, dayOffRulesEnabled: e.target.checked })}
            />
            Enable day-off shift preferences (per staff)
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preference mode</label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={settings.dayOffPreferenceMode || 'Soft'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dayOffPreferenceMode: e.target.value as 'Soft' | 'Strict',
                })
              }
            >
              <option value="Soft">Soft (prefer when possible)</option>
              <option value="Strict">Strict (enforce when possible)</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h4 className="text-sm font-semibold text-slate-800">Shop-wide day-off defaults</h4>
            <p className="text-xs text-slate-600">
              When <strong>day-off shift preferences</strong> are enabled above, you can use these defaults for anyone
              who has “No preference” on their staff profile. Per-staff choices always win when set.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!settings.applyGlobalDayOffShiftDefaults}
                onChange={(e) =>
                  setSettings({ ...settings, applyGlobalDayOffShiftDefaults: e.target.checked })
                }
              />
              Use shop-wide before/after day-off shift types when staff has no preference
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Day <strong>before</strong> a day off — allow these shift types (pick one or more)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  A template counts as OK if it matches <em>any</em> ticked band. Untick all to skip this rule for
                  staff with no personal preference.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {BAND_OPTIONS.map((band) => (
                    <label key={band} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(settings.globalBeforeDayOffPreferBands || []).includes(band)}
                        onChange={() =>
                          setSettings({
                            ...settings,
                            globalBeforeDayOffPreferBands: toggleBandInList(
                              settings.globalBeforeDayOffPreferBands || [],
                              band
                            ),
                          })
                        }
                      />
                      {band === 'Morning' ? 'Morning / early' : band === 'Mid' ? 'Mid' : 'Closing'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Day <strong>after</strong> a day off — allow these shift types (pick one or more)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Same as above: auto-schedule accepts any template that fits at least one selected band.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {BAND_OPTIONS.map((band) => (
                    <label key={band} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(settings.globalAfterDayOffPreferBands || []).includes(band)}
                        onChange={() =>
                          setSettings({
                            ...settings,
                            globalAfterDayOffPreferBands: toggleBandInList(
                              settings.globalAfterDayOffPreferBands || [],
                              band
                            ),
                          })
                        }
                      />
                      {band === 'Morning' ? 'Morning / early' : band === 'Mid' ? 'Mid' : 'Closing'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-200 p-4">
            <h4 className="text-sm font-semibold text-slate-800">Quick shift times (Schedule tab)</h4>
            <p className="text-xs text-slate-600">
              One-tap buttons when editing a shift. Match your real template times for best results.
            </p>
            <div className="space-y-2">
              {(settings.quickShiftTimePresets && settings.quickShiftTimePresets.length > 0
                ? settings.quickShiftTimePresets
                : defaultQuickShiftTimePresets
              ).map((row, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => {
                      const list = [...(settings.quickShiftTimePresets || defaultQuickShiftTimePresets)];
                      list[i] = { ...list[i], label: e.target.value };
                      setSettings({ ...settings, quickShiftTimePresets: list });
                    }}
                    className="w-24 p-1.5 border border-slate-300 rounded text-xs"
                    placeholder="Label"
                  />
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(e) => {
                      const list = [...(settings.quickShiftTimePresets || defaultQuickShiftTimePresets)];
                      list[i] = { ...list[i], startTime: e.target.value };
                      setSettings({ ...settings, quickShiftTimePresets: list });
                    }}
                    className="p-1.5 border border-slate-300 rounded text-xs"
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={(e) => {
                      const list = [...(settings.quickShiftTimePresets || defaultQuickShiftTimePresets)];
                      list[i] = { ...list[i], endTime: e.target.value };
                      setSettings({ ...settings, quickShiftTimePresets: list });
                    }}
                    className="p-1.5 border border-slate-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...(settings.quickShiftTimePresets || defaultQuickShiftTimePresets)];
                      list.splice(i, 1);
                      setSettings({ ...settings, quickShiftTimePresets: list });
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  quickShiftTimePresets: [
                    ...(settings.quickShiftTimePresets || defaultQuickShiftTimePresets),
                    { label: 'New', startTime: '09:00', endTime: '18:00' },
                  ],
                })
              }
              className="text-xs text-blue-600 hover:underline"
            >
              Add preset row
            </button>
          </div>

          <div className="md:col-span-2 space-y-4 rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
            <h4 className="text-sm font-semibold text-slate-800">Band coverage targets (auto-schedule)</h4>
            <p className="text-xs text-slate-600">
              Optional soft targets: nudge auto-schedule so each day has enough people in Morning / Mid / Closing-style
              templates. The engine still respects roles, hours, and templates. When the store opens at{' '}
              <strong>10:00 or later</strong>, morning targets are scaled down (fewer “early” people needed). Very short
              days slightly reduce closing targets.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!settings.enableBandCoverageTargets}
                onChange={(e) =>
                  setSettings({ ...settings, enableBandCoverageTargets: e.target.checked })
                }
              />
              Enable band coverage targets
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.scaleBandTargetsForLateOpen !== false}
                onChange={(e) =>
                  setSettings({ ...settings, scaleBandTargetsForLateOpen: e.target.checked })
                }
              />
              Auto-scale targets from store hours (late open / short day)
            </label>
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-600">
                    <th className="p-2 font-medium">Day</th>
                    <th className="p-2 font-medium">Min morning people</th>
                    <th className="p-2 font-medium">Min mid people</th>
                    <th className="p-2 font-medium">Min closing people</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS_MONDAY_START.map((d) => {
                    const row = settings.bandCoverageTargetsByDay?.[d] || {};
                    const setRow = (patch: { morningMin?: number; midMin?: number; closingMin?: number }) => {
                      const next = { ...(settings.bandCoverageTargetsByDay || {}) };
                      const cur = { ...row, ...patch };
                      const has =
                        (cur.morningMin ?? 0) > 0 ||
                        (cur.midMin ?? 0) > 0 ||
                        (cur.closingMin ?? 0) > 0;
                      if (has) next[d] = cur;
                      else delete next[d];
                      setSettings({ ...settings, bandCoverageTargetsByDay: next });
                    };
                    return (
                      <tr key={d} className="border-b border-slate-100">
                        <td className="p-2 font-medium text-slate-800">{d.slice(0, 3)}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            className="w-16 rounded border border-slate-300 p-1"
                            value={row.morningMin ?? ''}
                            onChange={(e) =>
                              setRow({
                                morningMin: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            className="w-16 rounded border border-slate-300 p-1"
                            value={row.midMin ?? ''}
                            onChange={(e) =>
                              setRow({
                                midMin: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            className="w-16 rounded border border-slate-300 p-1"
                            value={row.closingMin ?? ''}
                            onChange={(e) =>
                              setRow({
                                closingMin:
                                  e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-800">Schedule tab layout</h4>
            <p className="text-xs text-slate-600">
              Optional panels to speed up manual edits and see coverage. You can turn them off for a minimal grid.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showScheduleInlineQuickPresets !== false}
                onChange={(e) =>
                  setSettings({ ...settings, showScheduleInlineQuickPresets: e.target.checked })
                }
              />
              Show quick time + DAY OFF chips inside each cell (uses your quick shift presets above)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showScheduleBandCoverage !== false}
                onChange={(e) =>
                  setSettings({ ...settings, showScheduleBandCoverage: e.target.checked })
                }
              />
              Show coverage by shift type (people on Morning / Mid / Closing / other / day off per day)
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3 border-t pt-4">
        <button onClick={() => alert('Settings saved locally!')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">Save Settings</button>
        <button onClick={() => { if(confirm('Reset all settings to default?')) setSettings(defaultSettings) }} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">Reset Settings</button>
      </div>
    </section>
  );
}

