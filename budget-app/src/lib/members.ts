import type { Member, MemberId } from '../types';

export const MEMBERS: readonly Member[] = [
  {
    id: 'simon',
    label: 'Simón',
    initial: 'S',
    accent: 'emerald',
    gradient: 'from-emerald-400 to-cyan-500',
    ringClass: 'ring-emerald-500/50',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    glowClass: 'shadow-[0_0_30px_rgba(52,211,153,0.25)]',
  },
  {
    id: 'maria',
    label: 'María',
    initial: 'M',
    accent: 'pink',
    gradient: 'from-pink-400 to-fuchsia-500',
    ringClass: 'ring-pink-500/50',
    bgClass: 'bg-pink-500/10',
    textClass: 'text-pink-400',
    glowClass: 'shadow-[0_0_30px_rgba(236,72,153,0.25)]',
  },
] as const;

export const STORAGE_KEY = 'budget-current-member';
export const DEFAULT_MEMBER: MemberId = 'simon';

export function isMemberId(value: unknown): value is MemberId {
  return value === 'simon' || value === 'maria';
}

export function loadCurrentMember(): MemberId {
  if (typeof window === 'undefined') return DEFAULT_MEMBER;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isMemberId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_MEMBER;
}

export function saveCurrentMember(member: MemberId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, member);
  } catch {
    /* ignore */
  }
}

export function getMember(id: MemberId): Member {
  const member = MEMBERS.find((m) => m.id === id);
  if (!member) throw new Error(`Unknown member id: ${id}`);
  return member;
}

export function currentPeriod(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}
