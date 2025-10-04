export interface AllergenInfo {
  key: string;
  label: string;
  color: string; // HSL color
}

export const COMMON_ALLERGENS: AllergenInfo[] = [
  { key: 'glutine', label: 'Glutine', color: '30 80% 50%' },        // orange
  { key: 'crostacei', label: 'Crostacei', color: '10 80% 50%' },    // red-orange
  { key: 'uova', label: 'Uova', color: '45 90% 55%' },              // yellow
  { key: 'pesce', label: 'Pesce', color: '200 70% 50%' },           // blue
  { key: 'arachidi', label: 'Arachidi', color: '25 70% 50%' },      // brown
  { key: 'soia', label: 'Soia', color: '35 60% 50%' },              // tan
  { key: 'latte', label: 'Latte', color: '210 50% 55%' },           // light blue
  { key: 'frutta_a_guscio', label: 'Frutta a Guscio', color: '20 60% 45%' }, // brown
  { key: 'sedano', label: 'Sedano', color: '100 50% 50%' },         // green
  { key: 'senape', label: 'Senape', color: '50 85% 55%' },          // yellow
  { key: 'sesamo', label: 'Sesamo', color: '30 50% 60%' },          // beige
  { key: 'lupini', label: 'Lupini', color: '55 55% 50%' },          // lime
  { key: 'molluschi', label: 'Molluschi', color: '280 50% 55%' },   // purple
  { key: 'anidride_solforosa', label: 'Anidride Solforosa', color: '0 0% 50%' } // gray
];

export function getAllergenColor(allergenKey: string): string {
  const allergen = COMMON_ALLERGENS.find(a => a.key === allergenKey);
  return allergen?.color || '0 0% 60%'; // default gray
}

export function getAllergenLabel(allergenKey: string): string {
  const allergen = COMMON_ALLERGENS.find(a => a.key === allergenKey);
  return allergen?.label || allergenKey;
}
