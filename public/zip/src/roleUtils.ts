import { ShiftTemplate } from './types';

export function normalizeRoleText(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Default canonical keys → phrases that should match that slot (editable in setup). */
export const DEFAULT_ROLE_ALIASES: Record<string, string[]> = {
  manager: ['store manager', 'manager', 'general manager', 'gm', 'assistant manager', 'supervisor'],
  sales: ['sales', 'sales associate', 'sales staff', 'retail sales', 'associate'],
  vm: ['vm', 'visual', 'visual merchandiser', 'supervisor vm', 'merchandiser'],
  supervisor: ['supervisor', 'store manager', 'supervisor vm', 'manager', 'assistant manager'],
};

export function mergeRoleAliases(user: Record<string, string[]> | undefined): Record<string, string[]> {
  return { ...DEFAULT_ROLE_ALIASES, ...(user || {}) };
}

/**
 * Does staffRole satisfy a template slot labeled requiredKey (e.g. "manager", "Sales Associate")?
 * Uses normalized equality + alias lists (case-insensitive).
 */
export function staffMatchesRoleSlot(
  staffRole: string,
  requiredKey: string,
  roleAliases: Record<string, string[]>
): boolean {
  const key = (requiredKey || '').trim();
  if (!key || key === 'Any') return true;

  const normStaff = normalizeRoleText(staffRole);
  const normKey = normalizeRoleText(key);

  if (normStaff === normKey) return true;

  for (const [canonical, aliases] of Object.entries(roleAliases)) {
    const canonNorm = normalizeRoleText(canonical.replace(/_/g, ' '));
    if (normKey !== canonNorm && normKey !== normalizeRoleText(canonical)) continue;
    for (const a of aliases) {
      if (normalizeRoleText(a) === normStaff) return true;
    }
    if (normStaff.includes(canonNorm) || canonNorm.includes(normStaff)) return true;
  }

  if (normStaff.includes(normKey) || normKey.includes(normStaff)) return true;

  for (const [, aliases] of Object.entries(roleAliases)) {
    for (const a of aliases) {
      const na = normalizeRoleText(a);
      if (na === normStaff) return true;
      if (normKey === na || normStaff.includes(na) || na.includes(normStaff)) return true;
    }
  }

  return false;
}

export function staffMatchesBackupInCharge(staffRole: string, backupRoles: string[]): boolean {
  const normStaff = normalizeRoleText(staffRole);
  for (const b of backupRoles) {
    const nb = normalizeRoleText(b);
    if (!nb) continue;
    if (normStaff === nb || normStaff.includes(nb) || nb.includes(normStaff)) return true;
  }
  return false;
}

export function getRequiredSlotsForTemplate(t: ShiftTemplate): { roleKey: string }[] {
  const slots: { roleKey: string }[] = [];
  if (t.requiredRoles && Object.keys(t.requiredRoles).length > 0) {
    for (const [role, count] of Object.entries(t.requiredRoles)) {
      const n = Math.max(0, Math.floor(Number(count) || 0));
      for (let i = 0; i < n; i++) slots.push({ roleKey: role });
    }
    return slots;
  }
  const single = (t.requiredRole || '').trim();
  const cnt = Math.max(1, Math.floor(t.requiredStaffCount || 1));
  if (single && single !== 'Any') {
    for (let i = 0; i < cnt; i++) slots.push({ roleKey: single });
  } else {
    for (let i = 0; i < cnt; i++) slots.push({ roleKey: 'Any' });
  }
  return slots;
}
