import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Printer,
  Download,
  Trash2,
  Plus,
  X,
  FileDown,
  Copy,
  Edit2,
  Search,
  Filter,
  GripVertical,
} from 'lucide-react';
import { BusinessSettings, Staff, ShiftTemplate, ScheduledShift, DayOfWeek, Leave } from '../types';
import { getWeekDaysInOrder } from '../weekUtils';
import { getDurationHours, newId, classifyShiftBand, isStaffOnLeave } from '../utils';
import { addDaysToWeekStart, normalizeWeekDate } from '../dateUtils';
import { defaultQuickShiftTimePresets } from '../constants';

function matchTemplateByTimes(
  templates: ShiftTemplate[],
  startTime: string,
  endTime: string
): ShiftTemplate | undefined {
  return templates.find((t) => t.startTime === startTime && t.endTime === endTime);
}

function staffAutoScheduleHint(staff: Staff): { short: string; full: string } | null {
  const chunks: string[] = [];
  if (staff.staffScheduleRequestBand) {
    chunks.push(`Wants ${staff.staffScheduleRequestBand} (week)`);
  }
  const pb = staff.preferredBandByDay;
  if (pb && Object.keys(pb).length > 0) {
    chunks.push(
      `Days: ${Object.entries(pb)
        .map(([d, b]) => `${d.slice(0, 3)} ${b}`)
        .join(', ')}`
    );
  }
  if (typeof staff.minMorningDaysPerWeek === 'number' && staff.minMorningDaysPerWeek > 0) {
    chunks.push(`≥${staff.minMorningDaysPerWeek} morning-style days`);
  }
  const fixed = staff.fixedWeeklyDaysOff;
  if (fixed && fixed.length > 0) {
    chunks.push(`Fixed off: ${fixed.map((d) => d.slice(0, 3)).join(', ')}`);
  }
  if (typeof staff.requestedWeeklyHoursCap === 'number' && staff.requestedWeeklyHoursCap > 0) {
    chunks.push(`Asked ≤${staff.requestedWeeklyHoursCap}h/wk`);
  }
  const prefDays = staff.preferSchedulingOnDays;
  if (prefDays && prefDays.length > 0) {
    chunks.push(`Prefer: ${prefDays.map((d) => d.slice(0, 3)).join(', ')}`);
  }
  const ex = staff.preferredBandExceptions;
  if (ex && ex.length > 0) {
    chunks.push(`${ex.length} date-specific band rule(s)`);
  }
  const u = staff.unavailableDates;
  if (u && u.length > 0) {
    chunks.push(`${u.length} date(s) off`);
  }
  if (staff.staffStrongBandPreference) {
    chunks.push('Strong band preference');
  }
  const note = staff.staffScheduleRequestNote?.trim();
  const full = [chunks.join(' · '), note].filter(Boolean).join('\n');
  if (!full) return null;
  const short = full.replace(/\n/g, ' — ');
  return { short: short.length > 100 ? `${short.slice(0, 100)}…` : short, full };
}

interface ScheduleTabProps {
  settings: BusinessSettings;
  setSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;
  staffList: Staff[];
  templates: ShiftTemplate[];
  schedule: ScheduledShift[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduledShift[]>>;
  handleAutoGenerate: () => void;
  handleExportCSV: () => void;
  handleExportHTML: () => void;
  handleExportPDF: () => void;
  currentWeekStartDate: string;
  setCurrentWeekStartDate: (date: string) => void;
  weekDayOffsMap: Record<string, Record<string, DayOfWeek[]>>;
  setWeekDayOffs: React.Dispatch<React.SetStateAction<Record<string, Record<string, DayOfWeek[]>>>>;
  generateDebugLines: string[];
  /** Jump to Staff / Shifts / Setup from empty states */
  onNavigateTab?: (tab: 'setup' | 'staff' | 'templates') => void;
  leaves: Leave[];
}

export function ScheduleTab({
  settings,
  setSettings,
  staffList,
  templates,
  schedule,
  setSchedule,
  handleAutoGenerate,
  handleExportCSV,
  handleExportHTML,
  handleExportPDF,
  currentWeekStartDate,
  setCurrentWeekStartDate,
  weekDayOffsMap,
  setWeekDayOffs,
  generateDebugLines,
  onNavigateTab,
  leaves,
}: ScheduleTabProps) {
  const days = getWeekDaysInOrder(settings.weekStartDay);
  const weekNorm = normalizeWeekDate(currentWeekStartDate);
  const weekOffForStaff = (staffId: string) => weekDayOffsMap[weekNorm]?.[staffId] || [];

  const isCurrentWeek = (ws: string | undefined) =>
    ws !== undefined && normalizeWeekDate(ws) === weekNorm;

  const toggleDayOff = (staffId: string, day: DayOfWeek, dateYmd: string) => {
    if (isStaffOnLeave(staffId, dateYmd, leaves)) {
      window.alert('This date is on an approved leave record. Change it under the Leave tab, not here.');
      return;
    }
    const st = staffList.find((s) => s.id === staffId);
    const fixedOff = (st?.fixedWeeklyDaysOff || []).includes(day);
    const onWeekOff = weekOffForStaff(staffId).includes(day);
    if (fixedOff && !onWeekOff) {
      window.alert(
        'This day is a fixed weekly day off for this person. Edit Staff → profile to change it.'
      );
      return;
    }
    if (!onWeekOff) {
      setSchedule((prev) =>
        prev.filter(
          (s) => !(s.staffId === staffId && s.day === day && isCurrentWeek(s.weekStartDate))
        )
      );
    }
    setWeekDayOffs((prev) => {
      const wkMap = { ...(prev[weekNorm] || {}) };
      const list = new Set(wkMap[staffId] || []);
      if (list.has(day)) list.delete(day);
      else list.add(day);
      wkMap[staffId] = Array.from(list);
      return { ...prev, [weekNorm]: wkMap };
    });
  };

  const applyQuickPresetToCell = useCallback(
    (
      staffId: string,
      day: DayOfWeek,
      dateStr: string,
      preset: { label: string; startTime: string; endTime: string }
    ) => {
      const st = staffList.find((s) => s.id === staffId);
      if (st && (st.fixedWeeklyDaysOff || []).includes(day)) {
        window.alert('Cannot add a shift: this weekday is a fixed weekly day off for this person.');
        return;
      }
      if (st && (st.unavailableDates || []).includes(dateStr)) {
        window.alert('Cannot add a shift: this date is marked unavailable for this person (Staff profile).');
        return;
      }
      if (st && isStaffOnLeave(staffId, dateStr, leaves)) {
        window.alert('Cannot add a shift: this person is on leave for this date (see Leave tab).');
        return;
      }
      const tpl = matchTemplateByTimes(templates, preset.startTime, preset.endTime);
      setWeekDayOffs((prev) => {
        const wkMap = { ...(prev[weekNorm] || {}) };
        const list = new Set(wkMap[staffId] || []);
        list.delete(day);
        wkMap[staffId] = Array.from(list);
        return { ...prev, [weekNorm]: wkMap };
      });
      setSchedule((prev) => {
        const others = prev.filter(
          (s) => !(s.staffId === staffId && s.day === day && isCurrentWeek(s.weekStartDate))
        );
        const existing = prev.filter(
          (s) => s.staffId === staffId && s.day === day && isCurrentWeek(s.weekStartDate)
        );
        const carry =
          existing.length > 0
            ? {
                notes: existing[0].notes,
                displayRole: existing[0].displayRole,
                inCharge: existing[0].inCharge,
              }
            : {};
        const newShift: ScheduledShift = {
          id: newId(),
          staffId,
          day,
          date: dateStr,
          weekStartDate: weekNorm,
          templateId: tpl?.id,
          name: tpl?.name || preset.label || 'Shift',
          startTime: preset.startTime,
          endTime: preset.endTime,
          ...carry,
        };
        return [...others, newShift];
      });
    },
    [templates, weekNorm, setSchedule, setWeekDayOffs, staffList, leaves]
  );
  
  const [isAddShiftModalOpen, setIsAddShiftModalOpen] = useState(false);
  const [newShift, setNewShift] = useState<Partial<ScheduledShift>>({});
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editShiftDraft, setEditShiftDraft] = useState<ScheduledShift | null>(null);

  const quickPresets = useMemo(
    () =>
      settings.quickShiftTimePresets && settings.quickShiftTimePresets.length > 0
        ? settings.quickShiftTimePresets
        : defaultQuickShiftTimePresets,
    [settings.quickShiftTimePresets]
  );

  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    e.dataTransfer.setData('shiftId', shiftId);
  };

  const handleDrop = (e: React.DragEvent, targetStaffId: string, targetDay: DayOfWeek, targetDate: string) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData('shiftId');
    if (shiftId) {
      const tgt = staffList.find((s) => s.id === targetStaffId);
      if (tgt && (tgt.fixedWeeklyDaysOff || []).includes(targetDay)) {
        window.alert('That person has a fixed weekly day off on this weekday.');
        return;
      }
      if (tgt && (tgt.unavailableDates || []).includes(targetDate)) {
        window.alert('That person is marked unavailable on this date.');
        return;
      }
      if (tgt && isStaffOnLeave(targetStaffId, targetDate, leaves)) {
        window.alert('That person is on leave on this date.');
        return;
      }
      setSchedule(prev => prev.map(s => {
        if (s.id === shiftId) {
          return { ...s, staffId: targetStaffId, day: targetDay, date: targetDate };
        }
        return s;
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCopyPreviousWeek = () => {
    const prevWeekStart = addDaysToWeekStart(weekNorm, -7);
    let action: 'merge' | 'replace' = 'merge';
    const currentCount = schedule.filter((s) => isCurrentWeek(s.weekStartDate)).length;
    if (currentCount > 0) {
      const userAction = prompt(
        "Current week already has shifts. Type 'replace' to overwrite, or 'merge' to add to existing shifts.",
        'replace'
      );
      if (userAction === 'replace') action = 'replace';
      else if (userAction !== 'merge') return;
    }

    setSchedule((prev) => {
      const source = prev.filter((s) => normalizeWeekDate(s.weekStartDate || '') === prevWeekStart);
      if (source.length === 0) {
        queueMicrotask(() => alert('No shifts found in the previous week to copy.'));
        return prev;
      }

      const currentShifts = prev.filter((s) => isCurrentWeek(s.weekStartDate));
      const newShifts = source.map((s) => {
        const dayIndex = days.indexOf(s.day);
        return {
          ...s,
          id: newId(),
          weekStartDate: weekNorm,
          date: addDaysToWeekStart(weekNorm, dayIndex),
        };
      });

      const filtered =
        currentShifts.length > 0 && action === 'replace'
          ? prev.filter((s) => !isCurrentWeek(s.weekStartDate))
          : prev;
      queueMicrotask(() => alert('Previous week schedule copied successfully.'));
      return [...filtered, ...newShifts];
    });
  };

  const handleClearDay = (day: DayOfWeek) => {
    if (!confirm(`Clear all shifts on ${day} for this week?`)) return;
    setSchedule((prev) => prev.filter((s) => !(s.day === day && isCurrentWeek(s.weekStartDate))));
    alert(`Cleared all shifts on ${day} for this week.`);
  };

  const handleClearStaffRow = (staffId: string) => {
    if (!confirm('Clear all shifts for this staff member for this week?')) return;
    setSchedule((prev) => prev.filter((s) => !(s.staffId === staffId && isCurrentWeek(s.weekStartDate))));
    alert('Cleared this staff member’s shifts for the current week.');
  };

  const handleDuplicateDay = (fromDay: DayOfWeek, toDay: DayOfWeek) => {
    setSchedule((prev) => {
      const fromShifts = prev.filter((s) => s.day === fromDay && isCurrentWeek(s.weekStartDate));
      const toDate = addDaysToWeekStart(weekNorm, days.indexOf(toDay));
      const newShifts = fromShifts.map((s) => ({
        ...s,
        id: newId(),
        day: toDay,
        date: toDate,
      }));
      const withoutTo = prev.filter((s) => !(s.day === toDay && isCurrentWeek(s.weekStartDate)));
      return [...withoutTo, ...newShifts];
    });
  };

  // Coverage Summary
  const coverage = days.map(day => {
    let required = 0;
    templates.forEach(t => {
      if (t.requiredRoles && Object.keys(t.requiredRoles).length > 0) {
        required += Object.values(t.requiredRoles).reduce((sum, count) => sum + count, 0);
      } else {
        required += t.requiredStaffCount;
      }
    });
    const scheduled = schedule.filter(s => s.day === day && isCurrentWeek(s.weekStartDate)).length;
    return { day, required, scheduled };
  });

  const bandCoverageByDay = useMemo(() => {
    return days.map((day) => {
      const shiftsToday = schedule.filter((s) => s.day === day && isCurrentWeek(s.weekStartDate));
      const morning = new Set<string>();
      const mid = new Set<string>();
      const closing = new Set<string>();
      const other = new Set<string>();
      shiftsToday.forEach((s) => {
        const cat = classifyShiftBand(s, templates);
        if (cat === 'Morning') morning.add(s.staffId);
        else if (cat === 'Mid') mid.add(s.staffId);
        else if (cat === 'Closing') closing.add(s.staffId);
        else other.add(s.staffId);
      });
      const off = staffList.filter((st) =>
        (weekDayOffsMap[weekNorm]?.[st.id] || []).includes(day)
      ).length;
      return {
        day,
        morning: morning.size,
        mid: mid.size,
        closing: closing.size,
        other: other.size,
        off,
      };
    });
  }, [days, schedule, staffList, templates, weekNorm, weekDayOffsMap]);

  const roles = Array.from(new Set(staffList.map(s => s.role)));

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? staff.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const promptDuplicateDay = (day: DayOfWeek) => {
    const targetDay = prompt(`Duplicate ${day} to which day? (e.g., Tuesday)`);
    if (targetDay && days.includes(targetDay as DayOfWeek)) {
      handleDuplicateDay(day, targetDay as DayOfWeek);
    } else if (targetDay) {
      alert("Invalid day. Please enter a valid day name.");
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar size={20} /> Weekly Schedule</h2>
          <input 
            type="date" 
            value={currentWeekStartDate}
            onChange={e => setCurrentWeekStartDate(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-48"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-2 text-slate-400" size={16} />
            <select 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white w-32 sm:w-40"
            >
              <option value="">All Roles</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => {
            setNewShift({ weekStartDate: weekNorm, day: days[0], startTime: '09:00', endTime: '17:00' });
            setSelectedStaffIds([]);
            setIsAddShiftModalOpen(true);
          }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"><Plus size={16}/> Add Shift</button>
          <button onClick={handleAutoGenerate} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">Auto Generate</button>
          <button onClick={handleCopyPreviousWeek} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-1"><Copy size={16}/> Copy Prev Week</button>
          <button onClick={() => window.print()} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"><Printer size={16}/> Print</button>
          <button onClick={handleExportCSV} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"><Download size={16}/> Excel</button>
          <button onClick={handleExportHTML} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"><FileDown size={16}/> HTML</button>
          <button onClick={handleExportPDF} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"><FileDown size={16}/> PDF</button>
          <button
            onClick={() => {
              if (!confirm('Clear entire schedule for this week?')) return;
              setSchedule((prev) => prev.filter((s) => !isCurrentWeek(s.weekStartDate)));
              alert('Schedule cleared for this week.');
            }}
            className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1"
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>

      {templates.length === 0 && staffList.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 no-print sm:flex-row sm:items-center sm:justify-between">
          <span>
            <strong>No shift templates.</strong> Auto Generate needs at least one template. Load a preset in{' '}
            <strong>Setup</strong> (business type) or add shifts manually.
          </span>
          {onNavigateTab && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('setup')}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
              >
                Setup
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('templates')}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                Shifts
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 no-print">
        <span className="font-medium text-slate-500">Schedule view:</span>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={settings.showScheduleInlineQuickPresets !== false}
            onChange={(e) =>
              setSettings((s) => ({ ...s, showScheduleInlineQuickPresets: e.target.checked }))
            }
          />
          Quick times in cells
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={settings.showScheduleBandCoverage !== false}
            onChange={(e) =>
              setSettings((s) => ({ ...s, showScheduleBandCoverage: e.target.checked }))
            }
          />
          Shift-type coverage row
        </label>
      </div>

      {settings.debugMode && generateDebugLines.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700 max-h-48 overflow-y-auto no-print">
          <div className="font-semibold text-slate-800 mb-2">Auto-generate debug (last run)</div>
          <ul className="space-y-1">
            {generateDebugLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Coverage Summary Panel */}
      <div className="mb-6 grid grid-cols-7 gap-2 no-print">
        {coverage.map(c => (
          <div key={c.day} className={`p-2 rounded border text-center text-xs ${c.scheduled < c.required ? 'bg-amber-50 border-amber-200 text-amber-800' : c.scheduled > c.required ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div className="font-semibold mb-1">{c.day.substring(0,3)}</div>
            <div>{c.scheduled} / {c.required}</div>
          </div>
        ))}
      </div>

      {settings.showScheduleBandCoverage !== false && (
        <div className="mb-6 no-print">
          <div className="mb-2 text-xs font-semibold text-slate-700">
            People by shift type (distinct staff per day — Morning / Mid / Closing / other / day off)
          </div>
          <div className="grid grid-cols-7 gap-2">
            {bandCoverageByDay.map((row) => (
              <div
                key={row.day}
                className="rounded-lg border border-slate-200 bg-slate-50/90 p-2 text-[10px] leading-tight text-slate-800"
              >
                <div className="mb-1 font-bold text-slate-900">{row.day.slice(0, 3)}</div>
                <div className="space-y-0.5">
                  <div>
                    <span className="font-semibold text-blue-800">Mor</span> {row.morning}
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-800">Mid</span> {row.mid}
                  </div>
                  <div>
                    <span className="font-semibold text-violet-800">Cls</span> {row.closing}
                  </div>
                  {row.other > 0 && (
                    <div>
                      <span className="font-semibold text-slate-600">Oth</span> {row.other}
                    </div>
                  )}
                  <div className="border-t border-amber-200/80 pt-0.5 mt-0.5">
                    <span className="font-bold text-amber-900">OFF</span>{' '}
                    <span className="text-amber-950">{row.off}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print-only mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{settings.businessName}</h1>
        <p className="text-slate-500">Weekly Schedule: Week of {currentWeekStartDate}</p>
      </div>

      {staffList.length === 0 ? (
        <div className="no-print rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center text-slate-600">
          <p className="mb-1 text-base font-medium text-slate-800">No staff in your roster</p>
          <p className="mx-auto mb-4 max-w-md text-sm">
            Add people under <strong>Staff</strong> (or import). You can still edit hours in <strong>Setup</strong> first.
          </p>
          {onNavigateTab && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('staff')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Go to Staff
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('setup')}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Business setup
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-50 p-3 text-left w-48 font-semibold text-slate-700">Staff</th>
                {days.map((day, index) => {
                  const dateStrYmd = addDaysToWeekStart(weekNorm, index);
                  const [yy, mm, dd] = dateStrYmd.split('-').map(Number);
                  const date = new Date(yy, mm - 1, dd);
                  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <th key={day} className="border border-slate-200 bg-slate-50 p-2 text-center font-semibold text-slate-700 w-32 group relative">
                      <div>{day}</div>
                      <div className="text-xs font-normal text-slate-500">{dateStr}</div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 no-print">
                        <button onClick={() => promptDuplicateDay(day)} className="text-slate-400 hover:text-blue-500" title="Duplicate Day"><Copy size={12}/></button>
                        <button onClick={() => handleClearDay(day)} className="text-slate-400 hover:text-red-500" title="Clear Day"><Trash2 size={12}/></button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(staff => (
                <tr key={staff.id} className="print-break-inside-avoid group/row">
                  <td className="border border-slate-200 p-3 bg-white relative">
                    <div className="font-medium text-slate-900">{staff.name}</div>
                    <div className="text-xs text-slate-500">{staff.role}</div>
                    {(() => {
                      const hint = staffAutoScheduleHint(staff);
                      if (!hint) return null;
                      return (
                        <div
                          className="mt-1 max-w-[13rem] text-[10px] leading-snug text-blue-900 no-print"
                          title={hint.full}
                        >
                          {hint.short}
                        </div>
                      );
                    })()}
                    <button onClick={() => handleClearStaffRow(staff.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover/row:opacity-100 no-print" title="Clear Staff Row"><Trash2 size={14}/></button>
                  </td>
                  {days.map((day, index) => {
                    const dateStr = addDaysToWeekStart(weekNorm, index);
                    const fixedWeeklyOff = (staff.fixedWeeklyDaysOff || []).includes(day);
                    const weekMarkedOff = weekOffForStaff(staff.id).includes(day);
                    const onLeave = isStaffOnLeave(staff.id, dateStr, leaves);
                    const isAbsent = onLeave || fixedWeeklyOff || weekMarkedOff;
                    const dayShifts = schedule.filter(
                      (s) => s.staffId === staff.id && s.day === day && isCurrentWeek(s.weekStartDate)
                    );
                    
                    return (
                      <td 
                        key={day} 
                        className={`border border-slate-200 p-2 align-top relative group/cell min-h-[80px] ${
                          isAbsent
                            ? onLeave
                              ? 'bg-rose-50/90'
                              : 'bg-amber-50/80'
                            : 'bg-white'
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, staff.id, day, dateStr)}
                      >
                        {settings.showScheduleInlineQuickPresets === false && !isAbsent && (
                          <div className="mb-1 flex justify-end no-print">
                            <button
                              type="button"
                              onClick={() => toggleDayOff(staff.id, day, dateStr)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-amber-50 hover:text-amber-900"
                            >
                              Day off
                            </button>
                          </div>
                        )}

                        {settings.showScheduleInlineQuickPresets !== false && !isAbsent && (
                          <div className="mb-1.5 flex flex-wrap justify-center gap-1 no-print">
                            {quickPresets.map((p) => (
                              <button
                                key={`${p.label}-${p.startTime}-${p.endTime}`}
                                type="button"
                                title={`Apply ${p.label} (${p.startTime}–${p.endTime})`}
                                onClick={() => applyQuickPresetToCell(staff.id, day, dateStr, p)}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-800 shadow-sm hover:border-blue-400 hover:bg-blue-50"
                              >
                                {p.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              title="Mark day off (clears shifts in this cell)"
                              onClick={() => toggleDayOff(staff.id, day, dateStr)}
                              className="rounded-md border-2 border-amber-500 bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-200"
                            >
                              Day off
                            </button>
                          </div>
                        )}

                        {isAbsent ? (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleDayOff(staff.id, day, dateStr)}
                              className={`no-print mb-1 w-full rounded-xl border-2 py-4 text-center shadow-sm ${
                                onLeave
                                  ? 'border-rose-400 bg-gradient-to-b from-rose-100 to-rose-50'
                                  : 'border-amber-500 bg-gradient-to-b from-amber-100 to-amber-50'
                              }`}
                            >
                              <div
                                className={`text-base font-black uppercase tracking-[0.12em] sm:text-lg ${
                                  onLeave ? 'text-rose-950' : 'text-amber-950'
                                }`}
                              >
                                {onLeave ? 'On leave' : 'Day off'}
                              </div>
                              <div
                                className={`mt-1 text-sm font-semibold ${onLeave ? 'text-rose-900' : 'text-amber-900'}`}
                              >
                                {onLeave ? 'Not working' : 'Off'}
                              </div>
                              {onLeave ? (
                                <div className="mt-2 text-[10px] font-medium text-rose-800/95">
                                  Change dates in the Leave tab
                                </div>
                              ) : fixedWeeklyOff && !weekMarkedOff ? (
                                <div className="mt-2 text-[10px] font-medium text-amber-800/90">
                                  Fixed every week — change in Staff profile
                                </div>
                              ) : (
                                <div className="mt-2 text-[10px] font-medium text-amber-800/90">
                                  Tap to mark working again
                                </div>
                              )}
                            </button>
                            <div
                              className={`hidden print-only py-3 text-center text-sm font-black uppercase tracking-wide ${
                                onLeave ? 'text-rose-950' : 'text-amber-950'
                              }`}
                            >
                              {onLeave ? 'On leave' : 'Day off'}
                            </div>
                          </>
                        ) : null}

                        {dayShifts.length > 0 && onLeave && (
                          <div className="no-print mb-1 rounded border border-rose-300 bg-rose-100/90 px-2 py-1 text-[10px] font-medium text-rose-900">
                            Shifts below overlap leave — remove them or edit dates in the Leave tab.
                          </div>
                        )}

                        {dayShifts.map((shift) => {
                          const tpl = templates.find(t => t.id === shift.templateId);
                          const colorClass = tpl?.colorTag || 'bg-blue-50 border-blue-200 text-blue-900';
                          return (
                            <div
                              key={shift.id}
                              className={`mb-2 flex gap-1 rounded border p-1.5 text-sm ${colorClass}`}
                            >
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, shift.id)}
                                className="cursor-grab text-slate-400 hover:text-slate-600 no-print pt-0.5"
                                title="Drag to another cell"
                              >
                                <GripVertical size={14} />
                              </div>
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() => setEditShiftDraft({ ...shift })}
                              >
                                <div className="font-medium leading-tight">{shift.name}</div>
                                <div className="text-xs opacity-80">
                                  {shift.startTime} - {shift.endTime}
                                </div>
                                {shift.displayRole && (
                                  <div className="text-[10px] font-medium text-slate-700 mt-0.5">
                                    {shift.displayRole}
                                  </div>
                                )}
                                {shift.inCharge && (
                                  <div className="mt-0.5 text-[10px] font-semibold text-amber-900">In charge</div>
                                )}
                                {shift.notes && (
                                  <div className="mt-0.5 text-xs italic opacity-75">{shift.notes}</div>
                                )}
                              </button>
                              <div className="flex shrink-0 flex-col gap-0.5 no-print">
                                <button
                                  type="button"
                                  title="Edit shift"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditShiftDraft({ ...shift });
                                  }}
                                  className="rounded p-0.5 text-slate-500 hover:bg-white/60 hover:text-blue-700"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Remove shift"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSchedule((p) => p.filter((s) => s.id !== shift.id));
                                  }}
                                  className="rounded p-0.5 text-slate-500 hover:bg-white/60 hover:text-red-600"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!isAbsent && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-1 no-print">
                          <button 
                            onClick={() => {
                              setNewShift({ day, date: dateStr, weekStartDate: weekNorm });
                              setSelectedStaffIds([staff.id]);
                              setIsAddShiftModalOpen(true);
                            }}
                            className="bg-slate-100 text-slate-500 hover:text-blue-600 rounded p-1" title="Add Shift"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Manual Shift Modal */}
      {isAddShiftModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Shift</h3>
              <button onClick={() => setIsAddShiftModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Staff</label>
                <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                  {staffList.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={selectedStaffIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStaffIds([...selectedStaffIds, s.id]);
                          else setSelectedStaffIds(selectedStaffIds.filter(id => id !== s.id));
                        }}
                      />
                      {s.name} ({s.role})
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shift Type / Template</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={e => {
                    if (e.target.value === 'custom') {
                      setNewShift({...newShift, templateId: undefined, name: 'Custom Shift'});
                    } else {
                      const tpl = templates.find(t => t.id === e.target.value);
                      if (tpl) {
                        setNewShift({...newShift, templateId: tpl.id, name: tpl.name, startTime: tpl.startTime, endTime: tpl.endTime});
                      }
                    }
                  }}
                >
                  <option value="">Select...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="custom">Custom Shift</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="time" value={newShift.startTime || ''} onChange={e => setNewShift({...newShift, startTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input type="time" value={newShift.endTime || ''} onChange={e => setNewShift({...newShift, endTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input type="text" value={newShift.notes || ''} onChange={e => setNewShift({...newShift, notes: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Opening duties" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsAddShiftModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button 
                onClick={() => {
                  if (!newShift.startTime || !newShift.endTime || !newShift.name) return alert("Please fill required fields");
                  if (selectedStaffIds.length === 0) return alert("Please select at least one staff member");
                  const day = newShift.day as DayOfWeek | undefined;
                  const dateStr =
                    newShift.date ||
                    (day !== undefined
                      ? addDaysToWeekStart(weekNorm, days.indexOf(day))
                      : '');
                  for (const staffId of selectedStaffIds) {
                    const st = staffList.find((s) => s.id === staffId);
                    if (day && st && (st.fixedWeeklyDaysOff || []).includes(day)) {
                      window.alert(
                        `${st.name} has a fixed weekly day off on ${day}. Remove it in Staff profile or pick another day.`
                      );
                      return;
                    }
                    if (dateStr && st && (st.unavailableDates || []).includes(dateStr)) {
                      window.alert(
                        `${st.name} is marked unavailable on ${dateStr}. Update Staff profile or change the date.`
                      );
                      return;
                    }
                    if (dateStr && isStaffOnLeave(staffId, dateStr, leaves)) {
                      window.alert(
                        `${st.name} is on leave for ${dateStr}. Adjust the Leave tab or pick another date.`
                      );
                      return;
                    }
                  }

                  const newShifts = selectedStaffIds.map(staffId => ({
                    ...newShift,
                    id: newId(),
                    staffId,
                    weekStartDate: weekNorm,
                  } as ScheduledShift));
                  
                  setSchedule((prev) => [...prev, ...newShifts]);
                  setIsAddShiftModalOpen(false);
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Add Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {editShiftDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-semibold">Edit shift</h3>
              <button
                type="button"
                onClick={() => setEditShiftDraft(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <div className="mb-2 text-xs font-medium text-slate-600">Quick times</div>
                <div className="flex flex-wrap gap-2">
                  {quickPresets.map((p) => (
                    <button
                      key={`${p.label}-${p.startTime}-${p.endTime}`}
                      type="button"
                      onClick={() => {
                        const tpl = matchTemplateByTimes(templates, p.startTime, p.endTime);
                        setEditShiftDraft((d) =>
                          d
                            ? {
                                ...d,
                                startTime: p.startTime,
                                endTime: p.endTime,
                                templateId: tpl?.id,
                                name: tpl?.name ?? d.name,
                              }
                            : d
                        );
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-blue-300 hover:bg-blue-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Shift title</label>
                <input
                  type="text"
                  value={editShiftDraft.name}
                  onChange={(e) =>
                    setEditShiftDraft((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Shift type / template</label>
                <select
                  className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={editShiftDraft.templateId || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setEditShiftDraft((d) => (d ? { ...d, templateId: undefined } : d));
                      return;
                    }
                    const tpl = templates.find((t) => t.id === v);
                    if (tpl) {
                      setEditShiftDraft((d) =>
                        d
                          ? {
                              ...d,
                              templateId: tpl.id,
                              name: tpl.name,
                              startTime: tpl.startTime,
                              endTime: tpl.endTime,
                            }
                          : d
                      );
                    }
                  }}
                >
                  <option value="">Custom (manual times)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
                  <input
                    type="time"
                    value={editShiftDraft.startTime}
                    onChange={(e) =>
                      setEditShiftDraft((d) => (d ? { ...d, startTime: e.target.value } : d))
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End</label>
                  <input
                    type="time"
                    value={editShiftDraft.endTime}
                    onChange={(e) =>
                      setEditShiftDraft((d) => (d ? { ...d, endTime: e.target.value } : d))
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Display label (optional)</label>
                <input
                  type="text"
                  value={editShiftDraft.displayRole || ''}
                  onChange={(e) =>
                    setEditShiftDraft((d) =>
                      d ? { ...d, displayRole: e.target.value || undefined } : d
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. In-charge manager, Sales cashier"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Shown on the rota for this shift only. Does not change the staff member&apos;s main job title.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editShiftDraft.inCharge}
                  onChange={(e) =>
                    setEditShiftDraft((d) => (d ? { ...d, inCharge: e.target.checked } : d))
                  }
                />
                In charge / acting lead (this shift)
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <input
                  type="text"
                  value={editShiftDraft.notes || ''}
                  onChange={(e) =>
                    setEditShiftDraft((d) => (d ? { ...d, notes: e.target.value || undefined } : d))
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSchedule((p) => p.filter((s) => s.id !== editShiftDraft.id));
                  setEditShiftDraft(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete shift
              </button>
              <button
                type="button"
                onClick={() => setEditShiftDraft(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editShiftDraft.startTime || !editShiftDraft.endTime) {
                    alert('Start and end times are required.');
                    return;
                  }
                  setSchedule((prev) =>
                    prev.map((s) => (s.id === editShiftDraft.id ? { ...editShiftDraft } : s))
                  );
                  setEditShiftDraft(null);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
