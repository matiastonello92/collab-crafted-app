import { t } from '@/lib/i18n';

// Standardized English keys for API communication
export const MONTHS = [
  { key: 'jan', color: '220 90% 56%' },
  { key: 'feb', color: '210 90% 56%' },
  { key: 'mar', color: '150 60% 50%' },
  { key: 'apr', color: '140 60% 50%' },
  { key: 'may', color: '90 60% 50%' },
  { key: 'jun', color: '50 70% 55%' },
  { key: 'jul', color: '35 80% 55%' },
  { key: 'aug', color: '25 85% 55%' },
  { key: 'sep', color: '40 70% 50%' },
  { key: 'oct', color: '30 60% 50%' },
  { key: 'nov', color: '210 50% 50%' },
  { key: 'dec', color: '220 70% 56%' }
] as const;

export function getCurrentMonth(): string {
  return MONTHS[new Date().getMonth()].key;
}

export function formatSeasonRange(months: string[]): string {
  if (!months || months.length === 0) return '';
  if (months.length === 1) {
    return t(`months.${months[0]}`).slice(0, 3);
  }
  
  const sorted = [...months].sort((a, b) => {
    const idxA = MONTHS.findIndex(m => m.key === a);
    const idxB = MONTHS.findIndex(m => m.key === b);
    return idxA - idxB;
  });
  
  const first = t(`months.${sorted[0]}`).slice(0, 3);
  const last = t(`months.${sorted[sorted.length - 1]}`).slice(0, 3);
  return `${first}–${last}`;
}

export function getSeasonColor(months: string[]): string {
  if (!months || months.length === 0) return '200 50% 50%';
  const month = MONTHS.find(m => m.key === months[0]);
  return month?.color || '200 50% 50%';
}

export function getMonthLabel(key: string): string {
  return t(`months.${key}`);
}
