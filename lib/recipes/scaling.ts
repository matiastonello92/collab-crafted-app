/**
 * Utility per scaling porzioni ricette
 */

export interface ScalableIngredient {
  id?: string;
  catalog_item_id?: string | null;
  sub_recipe_id?: string | null;
  quantity: number;
  unit: string;
  item_name_snapshot: string;
  is_optional?: boolean;
  notes?: string;
  sort_order?: number;
  
  // Metadata sub-ricetta (caricato dal backend)
  sub_recipe?: {
    id: string;
    title: string;
    servings: number;
    photo_url?: string;
    status?: string;
  };
}

export type IngredientType = 'catalog' | 'sub_recipe';

export interface ScalingResult {
  originalServings: number;
  targetServings: number;
  scaleFactor: number;
  ingredients: ScalableIngredient[];
}

/**
 * Calcola il fattore di scaling tra porzioni originali e target
 */
export function calculateScaleFactor(
  originalServings: number,
  targetServings: number
): number {
  if (originalServings <= 0) return 1;
  return targetServings / originalServings;
}

/**
 * Scala le quantità degli ingredienti in base al numero di porzioni
 */
export function scaleIngredients(
  ingredients: ScalableIngredient[],
  originalServings: number,
  targetServings: number
): ScalableIngredient[] {
  const scaleFactor = calculateScaleFactor(originalServings, targetServings);
  
  return ingredients.map(ingredient => ({
    ...ingredient,
    quantity: parseFloat((ingredient.quantity * scaleFactor).toFixed(2))
  }));
}

/**
 * Formatta la quantità con arrotondamento intelligente
 */
export function formatQuantity(quantity: number): string {
  // Arrotonda a 2 decimali se necessario
  const rounded = Math.round(quantity * 100) / 100;
  
  // Se è un numero intero, mostra senza decimali
  if (rounded % 1 === 0) {
    return rounded.toString();
  }
  
  // Altrimenti mostra con massimo 2 decimali
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Calcola il totale tempo di preparazione
 */
export function calculateTotalTime(
  prep_time_minutes: number,
  cook_time_minutes: number
): number {
  return prep_time_minutes + cook_time_minutes;
}

/**
 * Formatta il tempo in formato leggibile
 */
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}min`;
}

/**
 * Calcola quantità espansa per sub-ricette
 * Se usi 2 porzioni di una ricetta da 4 porzioni = scale factor 0.5
 */
export function calculateSubRecipeScale(
  requestedServings: number,
  subRecipeBaseServings: number
): number {
  if (subRecipeBaseServings <= 0) return 1;
  return requestedServings / subRecipeBaseServings;
}

/**
 * Espande ingredienti di una sub-ricetta in base alla quantità richiesta
 */
export function expandSubRecipeIngredients(
  subRecipeIngredients: ScalableIngredient[],
  requestedServings: number,
  subRecipeBaseServings: number
): ScalableIngredient[] {
  const scale = calculateSubRecipeScale(requestedServings, subRecipeBaseServings);
  
  return subRecipeIngredients.map(ing => ({
    ...ing,
    quantity: parseFloat((ing.quantity * scale).toFixed(2))
  }));
}
