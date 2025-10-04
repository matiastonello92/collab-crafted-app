export const MONTHS = [
  { key: 'gen', label: 'Gennaio', color: '220 90% 56%' },
  { key: 'feb', label: 'Febbraio', color: '210 90% 56%' },
  { key: 'mar', label: 'Marzo', color: '150 60% 50%' },
  { key: 'apr', label: 'Aprile', color: '140 60% 50%' },
  { key: 'mag', label: 'Maggio', color: '90 60% 50%' },
  { key: 'giu', label: 'Giugno', color: '50 70% 55%' },
  { key: 'lug', label: 'Luglio', color: '35 80% 55%' },
  { key: 'ago', label: 'Agosto', color: '25 85% 55%' },
  { key: 'set', label: 'Settembre', color: '40 70% 50%' },
  { key: 'ott', label: 'Ottobre', color: '30 60% 50%' },
  { key: 'nov', label: 'Novembre', color: '210 50% 50%' },
  { key: 'dic', label: 'Dicembre', color: '220 70% 56%' }
] as const;

export function getCurrentMonth(): string {
  return MONTHS[new Date().getMonth()].key;
}

export function formatSeasonRange(months: string[]): string {
  if (!months || months.length === 0) return '';
  if (months.length === 1) {
    const month = MONTHS.find(m => m.key === months[0]);
    return month?.label.slice(0, 3) || '';
  }
  
  const sorted = [...months].sort((a, b) => {
    const idxA = MONTHS.findIndex(m => m.key === a);
    const idxB = MONTHS.findIndex(m => m.key === b);
    return idxA - idxB;
  });
  
  const first = MONTHS.find(m => m.key === sorted[0])?.label.slice(0, 3);
  const last = MONTHS.find(m => m.key === sorted[sorted.length - 1])?.label.slice(0, 3);
  return `${first}–${last}`;
}

export function getSeasonColor(months: string[]): string {
  if (!months || months.length === 0) return '200 50% 50%';
  const month = MONTHS.find(m => m.key === months[0]);
  return month?.color || '200 50% 50%';
}

export function getMonthLabel(key: string): string {
  return MONTHS.find(m => m.key === key)?.label || key;
}
