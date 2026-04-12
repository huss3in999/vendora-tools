import React from 'react';
import { Staff, ScheduledShift, BusinessSettings, DayOfWeek } from '../types';
import { getWeekDaysInOrder } from '../weekUtils';
import { Printer } from 'lucide-react';
import { addDaysToWeekStart, normalizeWeekDate } from '../dateUtils';

interface StaffViewTabProps {
  staffList: Staff[];
  schedule: ScheduledShift[];
  currentWeekStartDate: string;
  settings: BusinessSettings;
  weekDayOffsForWeek: Record<string, DayOfWeek[]>;
}

export function StaffViewTab({
  staffList,
  schedule,
  currentWeekStartDate,
  settings,
  weekDayOffsForWeek,
}: StaffViewTabProps) {
  const days = getWeekDaysInOrder(settings.weekStartDay);
  const weekNorm = normalizeWeekDate(currentWeekStartDate);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-lg font-semibold">Staff View</h2>
        <button
          onClick={() => window.print()}
          className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      <div className="print-only mb-6 hidden">
        <h1 className="text-2xl font-bold text-slate-900">{settings.businessName}</h1>
        <p className="text-slate-500">Employee Schedule: Week of {currentWeekStartDate}</p>
      </div>

      <div className="space-y-6">
        {staffList.map((staff) => {
          const staffShifts = schedule.filter(
            (s) => s.staffId === staff.id && normalizeWeekDate(s.weekStartDate || '') === weekNorm
          );
          const offs = weekDayOffsForWeek[staff.id] || [];
          const fixedOffDays = staff.fixedWeeklyDaysOff || [];
          const hasAnyRow = days.some((day) => {
            const ds = staffShifts.filter((s) => s.day === day);
            return ds.length > 0 || offs.includes(day) || fixedOffDays.includes(day);
          });

          return (
            <div key={staff.id} className="border rounded-lg overflow-hidden print-break-inside-avoid">
              <div className="bg-slate-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-slate-800">
                  {staff.name}{' '}
                  <span className="text-sm font-normal text-slate-500 ml-2">{staff.role}</span>
                </h3>
              </div>
              <div className="divide-y">
                {!hasAnyRow && (
                  <div className="px-4 py-3 text-sm text-slate-500">No shifts or day-offs this week.</div>
                )}
                {days.map((day, index) => {
                  const dayShifts = staffShifts.filter((s) => s.day === day);
                  const dateStrYmd = addDaysToWeekStart(weekNorm, index);
                  const [yy, mm, dd] = dateStrYmd.split('-').map(Number);
                  const date = new Date(yy, mm - 1, dd);
                  const label = date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  const isOff = fixedOffDays.includes(day) || offs.includes(day);

                  if (dayShifts.length === 0 && !isOff) return null;

                  return (
                    <div
                      key={day}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6"
                    >
                      <div className="w-36 font-medium text-slate-700">{label}</div>
                      <div className="flex-1 space-y-2">
                        {isOff && dayShifts.length === 0 && (
                          <div className="text-amber-800 font-medium text-sm">Day off</div>
                        )}
                        {dayShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                          >
                            <div className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
                              {shift.startTime} - {shift.endTime}
                            </div>
                            <div className="text-slate-600 font-medium">{shift.name}</div>
                            {shift.displayRole && (
                              <div className="text-xs font-medium text-slate-700">{shift.displayRole}</div>
                            )}
                            {shift.inCharge && (
                              <span className="text-xs font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                In charge
                              </span>
                            )}
                            {shift.notes && (
                              <div className="text-sm text-slate-500 italic">Note: {shift.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {schedule.filter((s) => normalizeWeekDate(s.weekStartDate || '') === weekNorm).length === 0 &&
          staffList.length > 0 && (
            <div className="text-center py-8 text-slate-500">
              No shifts scheduled for this week. Use Schedule to add shifts or mark days off.
            </div>
          )}
      </div>
    </section>
  );
}
