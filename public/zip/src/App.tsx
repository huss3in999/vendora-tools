import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { BusinessSettings, Staff, ShiftTemplate, ScheduledShift, Leave, DayOfWeek, DAYS_MONDAY_START } from './types';
import {
  generateSchedule,
  getWarnings,
  getDurationHours,
  newId,
  normalizeHoursByDayStaffWindow,
  isStaffOnLeave,
} from './utils';
import { defaultSettings, businessPresets } from './constants';
import { addDaysToWeekStart, normalizeWeekDate } from './dateUtils';
import { getWeekDaysInOrder, readSavedWeekStartDayFromStorage, snapDateToWeekStart } from './weekUtils';
import { normalizeStaffRecord } from './staffAvailability';
import {
  Calendar,
  AlertTriangle,
  X,
  Settings,
  Users,
  Clock,
  Palmtree,
  CalendarDays,
  LayoutGrid,
  HelpCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { ROTA_CLEAR_BANNER_SESSION_KEY } from './rotaBrowserStorage';
import { SetupTab } from './components/SetupTab';
import { StaffTab } from './components/StaffTab';
import { TemplatesTab } from './components/TemplatesTab';
import { LeaveTab } from './components/LeaveTab';
import { ScheduleTab } from './components/ScheduleTab';
import { StaffViewTab } from './components/StaffViewTab';
import { SetupChecklistBanner } from './components/SetupChecklistBanner';
import { UserGuideModal } from './components/UserGuideModal';
import { getSetupReadiness, ROTA_SETUP_BANNER_DISMISSED_KEY } from './setupReadiness';

export default function App() {
  const [settings, setSettings] = useLocalStorage<BusinessSettings>('rota_settings', defaultSettings);
  const [staffList, setStaffList] = useLocalStorage<Staff[]>('rota_staff', []);
  const [templates, setTemplates] = useLocalStorage<ShiftTemplate[]>('rota_templates', []);
  const [schedule, setSchedule] = useLocalStorage<ScheduledShift[]>('rota_schedule', []);
  const [leaves, setLeaves] = useLocalStorage<Leave[]>('rota_leaves', []);
  /** weekStart YYYY-MM-DD → staffId → days off */
  const [weekDayOffs, setWeekDayOffs] = useLocalStorage<Record<string, Record<string, DayOfWeek[]>>>(
    'rota_week_dayoffs',
    {}
  );

  // UI State
  const [activeTab, setActiveTab] = useState<'setup' | 'staff' | 'templates' | 'leave' | 'schedule' | 'staffView'>('schedule');
  const [generateDebugLines, setGenerateDebugLines] = useState<string[]>([]);
  const [showUserGuide, setShowUserGuide] = useState(false);

  // Current Week State — must match settings.weekStartDay or column weekday labels and calendar dates drift apart.
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState(() => {
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const wsd = readSavedWeekStartDayFromStorage();
    return snapDateToWeekStart(normalizeWeekDate(ymd), wsd);
  });

  const weekNorm = useMemo(() => normalizeWeekDate(currentWeekStartDate), [currentWeekStartDate]);

  useEffect(() => {
    setSchedule((prev) => {
      const order = getWeekDaysInOrder(settings.weekStartDay);
      const filtered = prev.filter((s) => {
        const wk = normalizeWeekDate(s.weekStartDate || '');
        let dateStr = '';
        if (s.date && String(s.date).trim()) {
          dateStr = normalizeWeekDate(s.date);
        } else {
          const idx = order.indexOf(s.day);
          if (idx < 0) return true;
          dateStr = addDaysToWeekStart(wk, idx);
        }
        return !isStaffOnLeave(s.staffId, dateStr, leaves);
      });
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [leaves, setSchedule, settings.weekStartDay]);

  const warnings = useMemo(
    () => getWarnings(schedule, staffList, templates, settings, weekNorm, leaves),
    [schedule, staffList, templates, settings, weekNorm, leaves]
  );

  const setupReadiness = useMemo(
    () => getSetupReadiness(settings, staffList.length, templates.length),
    [settings, staffList.length, templates.length]
  );

  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);
  useEffect(() => {
    try {
      setSetupBannerDismissed(localStorage.getItem(ROTA_SETUP_BANNER_DISMISSED_KEY) === '1');
    } catch {
      setSetupBannerDismissed(false);
    }
  }, []);

  const dismissSetupBanner = () => {
    try {
      localStorage.setItem(ROTA_SETUP_BANNER_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setSetupBannerDismissed(true);
  };

  const resetSetupBanner = () => setSetupBannerDismissed(false);

  const days = getWeekDaysInOrder(settings.weekStartDay);

  const isInCurrentWeek = (weekStartDate: string | undefined) =>
    weekStartDate !== undefined && normalizeWeekDate(weekStartDate) === weekNorm;

  const settingsMigrated = useRef(false);
  useEffect(() => {
    if (settingsMigrated.current) return;
    settingsMigrated.current = true;
    setSettings((prev) => {
      let next: BusinessSettings = prev;
      let changed = false;
      if (prev.openTime && !prev.hoursByDay) {
        next = { ...defaultSettings, ...prev, hoursByDay: defaultSettings.hoursByDay };
        changed = true;
      }
      const hb = next.hoursByDay;
      if (hb) {
        const first = hb[DAYS_MONDAY_START[0]];
        if (first && first.earliestStaffStart === undefined) {
          const migrated = { ...hb };
          DAYS_MONDAY_START.forEach((d) => {
            const h = migrated[d];
            migrated[d] = {
              ...h,
              earliestStaffStart: h.openTime || '09:00',
              latestStaffEnd: h.closeTime || '17:00',
            };
          });
          next = { ...next, hoursByDay: migrated };
          changed = true;
        }
        const hbCurrent = (changed ? next.hoursByDay : hb)!;
        const widened = normalizeHoursByDayStaffWindow(hbCurrent);
        if (
          DAYS_MONDAY_START.some((d) => {
            const a = hbCurrent[d];
            const b = widened[d];
            return (
              a?.earliestStaffStart !== b?.earliestStaffStart || a?.latestStaffEnd !== b?.latestStaffEnd
            );
          })
        ) {
          next = { ...next, hoursByDay: widened };
          changed = true;
        }
      }
      if (!next.roleAliases) {
        next = { ...next, roleAliases: { ...(defaultSettings.roleAliases || {}) } };
        changed = true;
      }
      if (next.inChargeBackupRoles === undefined) {
        next = { ...next, inChargeBackupRoles: defaultSettings.inChargeBackupRoles || [] };
        changed = true;
      }
      if (next.dayOffPreferenceMode === undefined) {
        next = { ...next, dayOffPreferenceMode: 'Soft' };
        changed = true;
      }
      if (next.debugMode === undefined) {
        next = { ...next, debugMode: false };
        changed = true;
      }
      if (next.inChargeModeEnabled === undefined) {
        next = { ...next, inChargeModeEnabled: false };
        changed = true;
      }
      if (next.dayOffRulesEnabled === undefined) {
        next = { ...next, dayOffRulesEnabled: true };
        changed = true;
      }
      if (next.applyGlobalDayOffShiftDefaults === undefined) {
        next = { ...next, applyGlobalDayOffShiftDefaults: false };
        changed = true;
      }
      if (next.globalBeforeDayOffPreferBands === undefined) {
        const legacy = (next as BusinessSettings & { globalBeforeDayOffPrefer?: string })
          .globalBeforeDayOffPrefer;
        const bands: ('Morning' | 'Mid' | 'Closing')[] =
          legacy === 'Mid' || legacy === 'Closing' || legacy === 'Morning'
            ? [legacy]
            : ['Morning'];
        const rest = { ...next } as BusinessSettings & {
          globalBeforeDayOffPrefer?: unknown;
        };
        delete rest.globalBeforeDayOffPrefer;
        next = { ...rest, globalBeforeDayOffPreferBands: bands };
        changed = true;
      }
      if (next.globalAfterDayOffPreferBands === undefined) {
        const legacy = (next as BusinessSettings & { globalAfterDayOffPrefer?: string })
          .globalAfterDayOffPrefer;
        const bands: ('Morning' | 'Mid' | 'Closing')[] =
          legacy === 'Mid' || legacy === 'Morning' || legacy === 'Closing'
            ? [legacy]
            : ['Closing'];
        const rest = { ...next } as BusinessSettings & {
          globalAfterDayOffPrefer?: unknown;
        };
        delete rest.globalAfterDayOffPrefer;
        next = { ...rest, globalAfterDayOffPreferBands: bands };
        changed = true;
      }
      if (next.showScheduleInlineQuickPresets === undefined) {
        next = { ...next, showScheduleInlineQuickPresets: true };
        changed = true;
      }
      if (next.showScheduleBandCoverage === undefined) {
        next = { ...next, showScheduleBandCoverage: true };
        changed = true;
      }
      if (next.enableBandCoverageTargets === undefined) {
        next = { ...next, enableBandCoverageTargets: false };
        changed = true;
      }
      if (next.scaleBandTargetsForLateOpen === undefined) {
        next = { ...next, scaleBandTargetsForLateOpen: true };
        changed = true;
      }
      if (next.bandCoverageTargetsByDay === undefined) {
        next = { ...next, bandCoverageTargetsByDay: {} };
        changed = true;
      }
      if (next.quickShiftTimePresets === undefined) {
        next = { ...next, quickShiftTimePresets: [...(defaultSettings.quickShiftTimePresets || [])] };
        changed = true;
      }
      if (next.honorStaffSchedulingPreferences === undefined) {
        next = { ...next, honorStaffSchedulingPreferences: true };
        changed = true;
      }
      if (!DAYS_MONDAY_START.includes(next.weekStartDay)) {
        next = { ...next, weekStartDay: 'Monday' };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [setSettings]);

  useEffect(() => {
    setCurrentWeekStartDate((prev) => snapDateToWeekStart(normalizeWeekDate(prev), settings.weekStartDay));
  }, [settings.weekStartDay]);

  useEffect(() => {
    setStaffList((prev) => {
      if (!prev.some((s) => Array.isArray(s.availability as unknown))) return prev;
      return prev.map(normalizeStaffRecord);
    });
  }, [setStaffList]);

  const handleDeleteStaff = (staffId: string, staffName: string) => {
    if (
      !confirm(
        `Remove ${staffName} from staff? Their shifts and leave records for this person will be removed from saved data.`
      )
    ) {
      return;
    }
    setStaffList((prev) => prev.filter((s) => s.id !== staffId));
    setSchedule((prev) => prev.filter((s) => s.staffId !== staffId));
    setLeaves((prev) => prev.filter((l) => l.staffId !== staffId));
    setWeekDayOffs((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((weekKey) => {
        const map = { ...next[weekKey] };
        if (map[staffId]) {
          delete map[staffId];
          next[weekKey] = map;
        }
      });
      return next;
    });
    alert(`${staffName} was removed. Shifts and leave entries linked to them were cleared.`);
  };

  const handleAutoGenerate = () => {
    if (staffList.length === 0) {
      alert("Please add staff members first.");
      return;
    }
    if (templates.length === 0) {
      alert("Please add shift templates first.");
      return;
    }
    const wk = normalizeWeekDate(currentWeekStartDate);
    const debugLog: string[] = [];
    const newSchedule = generateSchedule(staffList, templates, settings, wk, leaves, {
      weekStaffDayOffs: weekDayOffs[wk] || {},
      debugLog: settings.debugMode ? debugLog : undefined,
      consoleTrace: settings.debugMode === true,
    });
    if (settings.debugMode) {
      setGenerateDebugLines(debugLog);
    } else {
      setGenerateDebugLines([]);
    }
    setSchedule((prev) => {
      const otherWeeks = prev.filter((s) => normalizeWeekDate(s.weekStartDate || '') !== wk);
      return [...otherWeeks, ...newSchedule];
    });
  };

  const handleLoadPreset = (presetName: string) => {
    const presetTemplates = businessPresets[presetName];
    if (presetTemplates) {
      const newTemplates = presetTemplates.map(t => ({ ...t, id: newId() }));
      setTemplates(newTemplates);
    }
  };

  const handleExportCSV = () => {
    let csv = `Staff Scheduling / Rota Builder - ${settings.businessName}\nWeek of ${currentWeekStartDate}\n\n`;
    csv += `Staff,${days.join(',')},Total Hours\n`;

    staffList.forEach(staff => {
      let row = `"${staff.name}",`;
      let totalHours = 0;
      
      days.forEach(day => {
        const shifts = schedule.filter(s => s.staffId === staff.id && s.day === day && isInCurrentWeek(s.weekStartDate));
        if (shifts.length > 0) {
          const shiftStrs = shifts.map(s => `${s.name} (${s.startTime}-${s.endTime})${s.displayRole ? ` [${s.displayRole}]` : ''}${s.inCharge ? ' [In charge]' : ''}${s.notes ? ` - ${s.notes}` : ''}`).join(' & ');
          row += `"${shiftStrs}",`;
          shifts.forEach(s => {
            totalHours += Math.max(0, getDurationHours(s.startTime, s.endTime) - (settings.breakDuration / 60));
          });
        } else {
          row += `"",`;
        }
      });
      row += `"${totalHours.toFixed(1)}"\n`;
      csv += row;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `schedule_${currentWeekStartDate}.csv`;
    link.click();
  };

  const handleExportHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${settings.businessName} - Schedule</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
          th { background-color: #f8fafc; }
          .shift { background-color: #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-bottom: 6px; font-size: 0.9em; border-left: 4px solid #3b82f6; }
          .notes { font-size: 0.8em; color: #666; font-style: italic; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>${settings.businessName}</h1>
        <h2>Weekly Schedule: Week of ${currentWeekStartDate}</h2>
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              ${days.map(d => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${staffList.map(staff => `
              <tr>
                <td><strong>${staff.name}</strong><br/><small>${staff.role}</small></td>
                ${days.map(day => {
                  const shifts = schedule.filter(s => s.staffId === staff.id && s.day === day && isInCurrentWeek(s.weekStartDate));
                  return `<td>${shifts.map(s => `
                    <div class="shift">
                      <strong>${s.name}</strong>${s.displayRole ? ` <span class="notes">(${s.displayRole})</span>` : ''}${s.inCharge ? ' <em>(In charge)</em>' : ''}<br/>
                      ${s.startTime} - ${s.endTime}
                      ${s.notes ? `<div class="notes">${s.notes}</div>` : ''}
                    </div>
                  `).join('')}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `schedule_${currentWeekStartDate}.html`;
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(20);
    doc.text(settings.businessName, 14, 22);
    
    doc.setFontSize(14);
    doc.text(`Weekly Schedule: Week of ${currentWeekStartDate}`, 14, 32);

    const tableColumn = ["Staff", ...days];
    const tableRows: any[] = [];

    staffList.forEach(staff => {
      const staffData = [
        `${staff.name}\n(${staff.role})`
      ];
      
      days.forEach(day => {
        const shifts = schedule.filter(s => s.staffId === staff.id && s.day === day && isInCurrentWeek(s.weekStartDate));
        if (shifts.length > 0) {
          staffData.push(shifts.map(s => `${s.name}${s.displayRole ? ` (${s.displayRole})` : ''}${s.inCharge ? ' (In charge)' : ''}\n${s.startTime} - ${s.endTime}${s.notes ? `\nNote: ${s.notes}` : ''}`).join('\n\n'));
        } else {
          staffData.push('');
        }
      });
      
      tableRows.push(staffData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' }
      }
    });

    doc.save(`schedule_${currentWeekStartDate}.pdf`);
  };

  const [storageClearedBanner, setStorageClearedBanner] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(ROTA_CLEAR_BANNER_SESSION_KEY) === '1') {
        sessionStorage.removeItem(ROTA_CLEAR_BANNER_SESSION_KEY);
        setStorageClearedBanner(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const prevScheduleLength = useRef(schedule.length);

  useEffect(() => {
    if (schedule.length !== prevScheduleLength.current) {
      if (schedule.length > 0 && schedule.length % 10 === 0) {
        setShowBackupReminder(true);
      }
      prevScheduleLength.current = schedule.length;
    }
  }, [schedule.length]);

  const handleDownloadBackup = () => {
    try {
      const data = {
        settings,
        staffList,
        templates,
        schedule,
        leaves,
        weekDayOffs,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `rota_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setShowBackupReminder(false);
    } catch {
      alert('Could not create the backup file. Your browser may be blocking downloads or storage is full.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print-container">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 no-print">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-blue-600" />
              Staff Scheduling / Rota Builder
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-xl">
              Hours, team, and shift types in one place — auto-build a draft rota or edit by hand. Data stays in this
              browser until you export it.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <button
              type="button"
              data-testid="user-guide-open"
              onClick={() => setShowUserGuide(true)}
              className="no-print flex shrink-0 items-center justify-center gap-2 self-stretch rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:self-end"
              aria-label="Open step-by-step guide: how to use the rota builder"
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
              How to use
            </button>
            <nav
              className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 [scrollbar-width:thin]"
              aria-label="Main sections"
            >
            {(
              [
                { id: 'setup' as const, label: 'Setup', Icon: Settings },
                { id: 'staff' as const, label: 'Staff', Icon: Users },
                { id: 'templates' as const, label: 'Shifts', Icon: Clock },
                { id: 'leave' as const, label: 'Leave', Icon: Palmtree },
                { id: 'schedule' as const, label: 'Schedule', Icon: CalendarDays },
                { id: 'staffView' as const, label: 'Staff View', Icon: LayoutGrid },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                <span>{label}</span>
              </button>
            ))}
            </nav>
          </div>
        </div>
      </header>

      <UserGuideModal open={showUserGuide} onClose={() => setShowUserGuide(false)} />

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6">
        {!setupBannerDismissed && (
          <SetupChecklistBanner
            doneCount={setupReadiness.doneCount}
            total={setupReadiness.total}
            percent={setupReadiness.percent}
            items={setupReadiness.items}
            allOk={setupReadiness.allOk}
            onGoTo={setActiveTab}
            onDismiss={dismissSetupBanner}
          />
        )}

        {storageClearedBanner && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center gap-4 no-print">
            <p className="text-emerald-900 text-sm">
              Browser data for this rota app was cleared. The app reloaded with empty default data.
            </p>
            <button
              type="button"
              onClick={() => setStorageClearedBanner(false)}
              className="shrink-0 text-emerald-800 hover:text-emerald-950 px-2"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {showBackupReminder && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center no-print">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertTriangle size={18} />
              <span><strong>Reminder:</strong> It's a good idea to download a backup of your schedule.</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownloadBackup} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Download Backup</button>
              <button onClick={() => setShowBackupReminder(false)} className="text-blue-600 hover:text-blue-800 px-2"><X size={18}/></button>
            </div>
          </div>
        )}
        
        {/* Warnings Panel */}
        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 no-print">
            <h3 className="text-amber-800 font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle size={18} />
              Conflicts & Warnings ({warnings.length})
            </h3>
            <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {activeTab === 'setup' && (
          <SetupTab 
            settings={settings} 
            setSettings={setSettings} 
            onLoadPreset={handleLoadPreset} 
            staffList={staffList}
            setStaffList={setStaffList}
            templates={templates}
            setTemplates={setTemplates}
            schedule={schedule}
            leaves={leaves}
            weekDayOffs={weekDayOffs}
            setSchedule={setSchedule}
            setLeaves={setLeaves}
            setWeekDayOffs={setWeekDayOffs}
            onNavigateTab={setActiveTab}
            onResetSetupBanner={resetSetupBanner}
          />
        )}
        {activeTab === 'staff' && (
          <StaffTab
            staffList={staffList}
            setStaffList={setStaffList}
            onDeleteStaff={handleDeleteStaff}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab templates={templates} setTemplates={setTemplates} settings={settings} />
        )}
        {activeTab === 'leave' && <LeaveTab leaves={leaves} setLeaves={setLeaves} staffList={staffList} />}
        {activeTab === 'staffView' && (
          <StaffViewTab
            staffList={staffList}
            schedule={schedule}
            currentWeekStartDate={currentWeekStartDate}
            settings={settings}
            weekDayOffsForWeek={weekDayOffs[normalizeWeekDate(currentWeekStartDate)] || {}}
          />
        )}
        {activeTab === 'schedule' && (
          <div>
            <ScheduleTab
              settings={settings}
              setSettings={setSettings}
              staffList={staffList}
              templates={templates}
              schedule={schedule}
              setSchedule={setSchedule}
              handleAutoGenerate={handleAutoGenerate}
              handleExportCSV={handleExportCSV}
              handleExportHTML={handleExportHTML}
              handleExportPDF={handleExportPDF}
              currentWeekStartDate={currentWeekStartDate}
              setCurrentWeekStartDate={(v) =>
                setCurrentWeekStartDate(
                  snapDateToWeekStart(normalizeWeekDate(v), settings.weekStartDay)
                )
              }
              weekDayOffsMap={weekDayOffs}
              setWeekDayOffs={setWeekDayOffs}
              generateDebugLines={generateDebugLines}
              onNavigateTab={setActiveTab}
              leaves={leaves}
            />
          </div>
        )}
      </main>
    </div>
  );
}

