import React, { useEffect, useId } from 'react';
import { X, BookOpen } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <h2 className="mb-2 text-base font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2 text-sm text-slate-600">{children}</div>
    </section>
  );
}

export function UserGuideModal({ open, onClose }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="user-guide-modal"
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" aria-hidden />
            <h1 id={titleId} className="text-lg font-semibold text-slate-900">
              How to use Staff Scheduling / Rota Builder
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <article className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <p className="text-sm text-slate-600">
            This app builds weekly rotas for retail, hospitality, clinics, offices, and more. Everything saves in{' '}
            <strong>this browser</strong> until you export a backup. Use the checklist banner at the top until setup is
            complete.
          </p>

          <Section title="Quick start (recommended order)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Setup</strong> — Business name, <strong>week start day</strong> (must match how you read the
                grid), open hours per weekday, max hours, breaks, and optional role aliases.
              </li>
              <li>
                <strong>Shifts</strong> — Add shift templates (name, times, how many people, roles). Or in Setup choose
                a <strong>business type</strong> preset (Retail, Restaurant, etc.) to load a starter pack.
              </li>
              <li>
                <strong>Staff</strong> — Add people, availability windows, optional fixed weekly days off, scheduling
                requests, and bulk edits (filters + checkboxes).
              </li>
              <li>
                <strong>Leave</strong> — Enter approved leave with start/end dates (calendar). Overlapping shifts are
                removed automatically; the schedule blocks new work on those dates.
              </li>
              <li>
                <strong>Schedule</strong> — Pick the week, mark day-offs, use quick time buttons or <strong>Auto Generate</strong>.
                Review yellow <strong>Conflicts &amp; Warnings</strong>, then export CSV / PDF / print if needed.
              </li>
            </ol>
          </Section>

          <Section title="Setup tab (details)">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Day off rules</strong> — When enabled, auto-schedule can favour <em>morning before a day off</em>{' '}
                and <em>closing after a day off</em> (per staff or global defaults). Fixed weekly days off count as
                &quot;off&quot; for those rules.
              </li>
              <li>
                <strong>Honor staff scheduling preferences</strong> — Uses per-day shift type, whole-week requests, and
                date-specific band rules when scoring auto-schedule.
              </li>
              <li>
                <strong>Band coverage targets</strong> (optional) — Soft targets for how many people you want in
                Morning / Mid / Closing-style templates per day; can scale when the store opens late.
              </li>
              <li>Use <strong>Download / Upload Setup</strong> to move settings + staff + templates to another machine.</li>
            </ul>
          </Section>

          <Section title="Staff tab (details)">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Import from Excel, paste from a spreadsheet, or add manually.</li>
              <li>
                <strong>Fixed weekly days off</strong> — Same weekday off every week; shows on the grid and blocks
                auto-schedule.
              </li>
              <li>
                <strong>Calendar rules</strong> — One-off unavailable dates; <strong>date + band</strong> for a specific
                Morning/Mid/Closing on one date.
              </li>
              <li>
                <strong>Bulk edit</strong> — Filter by name/department, select rows, then apply caps, fixed offs, prefer
                days, etc.
              </li>
            </ul>
          </Section>

          <Section title="Schedule tab (details)">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Column headers show <strong>weekday + calendar date</strong>. If the week start in Setup does not match
                the first column date, pick the week again from the date control.
              </li>
              <li>
                <strong className="text-amber-800">Amber</strong> = day off / fixed off; <strong className="text-rose-800">Rose</strong> = on leave.
              </li>
              <li>
                <strong>Copy previous week</strong> merges or replaces shifts; <strong>Clear</strong> removes the
                current week only.
              </li>
              <li>Toggle <strong>Quick times in cells</strong> and <strong>Shift-type coverage row</strong> in the bar under the action buttons.</li>
            </ul>
          </Section>

          <Section title="Data, backup, and privacy">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Data lives in <strong>localStorage</strong> for this site origin — not on our servers.</li>
              <li>Download JSON backup from Setup storage area when offered; export schedules as CSV/PDF/HTML from Schedule.</li>
              <li>Clearing browser data for this site removes the rota — keep backups for anything important.</li>
            </ul>
          </Section>

          <Section title="If something looks wrong">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Staff still scheduled on leave → check leave dates (YYYY-MM-DD) cover that calendar day; add leave again to trigger cleanup.</li>
              <li>Fixed day off on wrong column → confirm <strong>week start day</strong> in Setup and re-select the week in Schedule.</li>
              <li>Before/after day off prefs ignored → turn on <strong>Day off rules</strong> in Setup and re-run Auto Generate.</li>
            </ul>
          </Section>
        </article>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto sm:px-6"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
