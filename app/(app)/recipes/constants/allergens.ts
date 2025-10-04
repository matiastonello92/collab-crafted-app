import { t } from '@/lib/i18n';

export interface AllergenInfo {
  key: string;
  color: string; // HSL color
}

// Standardized English keys for API communication
export const COMMON_ALLERGENS: AllergenInfo[] = [
  { key: 'gluten', color: '30 80% 50%' },        // orange
  { key: 'crustaceans', color: '10 80% 50%' },   // red-orange
  { key: 'eggs', color: '45 90% 55%' },          // yellow
  { key: 'fish', color: '200 70% 50%' },         // blue
  { key: 'peanuts', color: '25 70% 50%' },       // brown
  { key: 'soy', color: '35 60% 50%' },           // tan
  { key: 'milk', color: '210 50% 55%' },         // light blue
  { key: 'tree_nuts', color: '20 60% 45%' },     // brown
  { key: 'celery', color: '100 50% 50%' },       // green
  { key: 'mustard', color: '50 85% 55%' },       // yellow
  { key: 'sesame', color: '30 50% 60%' },        // beige
  { key: 'lupin', color: '55 55% 50%' },         // lime
  { key: 'molluscs', color: '280 50% 55%' },     // purple
  { key: 'sulfur_dioxide', color: '0 0% 50%' }   // gray
];

export function getAllergenColor(allergenKey: string): string {
  const allergen = COMMON_ALLERGENS.find(a => a.key === allergenKey);
  return allergen?.color || '0 0% 60%'; // default gray
}

export function getAllergenLabel(allergenKey: string): string {
  return t(`allergens.${allergenKey}`);
}
