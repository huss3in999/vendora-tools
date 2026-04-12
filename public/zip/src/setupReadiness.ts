import { BusinessSettings, DAYS_MONDAY_START } from './types';

export const ROTA_SETUP_BANNER_DISMISSED_KEY = 'rota_setup_banner_dismissed';

export type MainTabId = 'setup' | 'staff' | 'templates' | 'leave' | 'schedule' | 'staffView';

export type SetupReadinessItem = {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
  tab: MainTabId;
};

export function getSetupReadiness(
  settings: BusinessSettings,
  staffCount: number,
  templateCount: number
): {
  items: SetupReadinessItem[];
  doneCount: number;
  total: number;
  allOk: boolean;
  percent: number;
} {
  const openDayCount = DAYS_MONDAY_START.filter((d) => settings.hoursByDay[d]?.isOpen).length;
  const hasOpenDay = openDayCount > 0;
  const nameOk = settings.businessName.trim().length >= 2;

  const items: SetupReadinessItem[] = [
    {
      id: 'identity',
      label: 'Business name',
      detail: nameOk ? `"${settings.businessName.trim().slice(0, 40)}${settings.businessName.trim().length > 40 ? '…' : ''}"` : 'Set your business name in Setup',
      ok: nameOk,
      tab: 'setup',
    },
    {
      id: 'hours',
      label: 'Trading hours',
      detail: hasOpenDay ? `${openDayCount} open day(s) configured` : 'Open at least one day in Setup → hours',
      ok: hasOpenDay,
      tab: 'setup',
    },
    {
      id: 'templates',
      label: 'Shift templates',
      detail: templateCount > 0 ? `${templateCount} template(s)` : 'Add shifts (or load a business preset in Setup)',
      ok: templateCount > 0,
      tab: 'templates',
    },
    {
      id: 'staff',
      label: 'Staff',
      detail: staffCount > 0 ? `${staffCount} people` : 'Add staff or import a list',
      ok: staffCount > 0,
      tab: 'staff',
    },
  ];

  const doneCount = items.filter((i) => i.ok).length;
  const total = items.length;
  return {
    items,
    doneCount,
    total,
    allOk: doneCount === total,
    percent: Math.round((doneCount / total) * 100),
  };
}
