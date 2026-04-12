import React from 'react';
import { CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import type { MainTabId, SetupReadinessItem } from '../setupReadiness';

type Props = {
  doneCount: number;
  total: number;
  percent: number;
  items: SetupReadinessItem[];
  allOk: boolean;
  onGoTo: (tab: MainTabId) => void;
  onDismiss: () => void;
};

export function SetupChecklistBanner({
  doneCount,
  total,
  percent,
  items,
  allOk,
  onGoTo,
  onDismiss,
}: Props) {
  if (allOk) {
    return (
      <div className="no-print rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-emerald-900">
            <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <span>
              <strong>Ready to schedule.</strong> Open <strong>Schedule</strong>, pick the week, then{' '}
              <strong>Auto Generate</strong> or place shifts manually.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onGoTo('schedule')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Go to Schedule
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg px-2 py-1 text-sm text-emerald-800 hover:bg-emerald-100/80"
              aria-label="Hide this message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-print rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50/90 px-4 py-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Finish setup</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Works for retail, clinics, offices, and hospitality — complete these steps, then build your rota.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
            {doneCount}/{total} ({percent}%)
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-slate-500 hover:bg-white/60 hover:text-slate-800"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onGoTo(item.tab)}
              className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                item.ok
                  ? 'border-emerald-200 bg-white/70 text-emerald-900'
                  : 'border-amber-200 bg-white/90 text-slate-800 hover:border-sky-300 hover:bg-white'
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              )}
              <span>
                <span className="font-medium">{item.label}</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-600">{item.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
