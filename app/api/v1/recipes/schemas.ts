import { z } from 'zod';

// Recipe schemas
export const createRecipeSchema = z.object({
  org_id: z.string().uuid(),
  location_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['main_course', 'appetizer', 'dessert', 'beverage', 'side_dish', 'soup', 'salad', 'breakfast', 'other']),
  cuisine_type: z.string().optional(),
  servings: z.number().int().min(1).max(1000).default(4),
  prep_time_minutes: z.number().int().min(0).max(1440).default(0),
  cook_time_minutes: z.number().int().min(0).max(1440).default(0),
  photo_url: z.string().optional().nullable(),
  allergens: z.array(z.string()).default([]),
  season: z.array(z.enum(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])).default([]),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.object({
    catalog_item_id: z.string().uuid(),
    quantity: z.number().min(0),
    unit: z.string().min(1),
    item_name_snapshot: z.string().min(1),
    is_optional: z.boolean().default(false),
    notes: z.string().optional().nullable(),
    sort_order: z.number().int().min(0).optional()
  })).optional(),
  steps: z.array(z.object({
    step_number: z.number().int().min(1),
    title: z.string().optional(),
    instruction: z.string().min(1),
    timer_minutes: z.number().int().min(0).optional(),
    checklist_items: z.array(z.string()).default([]),
    photo_url: z.string().optional()
  })).optional()
});

export const updateRecipeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.enum(['main_course', 'appetizer', 'dessert', 'beverage', 'side_dish', 'soup', 'salad', 'breakfast', 'other']).optional(),
  cuisine_type: z.string().optional(),
  servings: z.number().int().min(1).max(1000).optional(),
  prep_time_minutes: z.number().int().min(0).max(1440).optional(),
  cook_time_minutes: z.number().int().min(0).max(1440).optional(),
  photo_url: z.string().optional().nullable(),
  allergens: z.array(z.string()).optional(),
  season: z.array(z.enum(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])).optional(),
  tags: z.array(z.string()).optional()
});

// Ingredient schemas
export const createIngredientSchema = z.object({
  catalog_item_id: z.string().uuid().optional().nullable(),
  sub_recipe_id: z.string().uuid().optional().nullable(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  item_name_snapshot: z.string().min(1),
  is_optional: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0)
}).refine(
  data => (data.catalog_item_id && !data.sub_recipe_id) || 
          (!data.catalog_item_id && data.sub_recipe_id),
  { message: "Specificare catalog_item_id O sub_recipe_id, non entrambi" }
);

export const updateIngredientSchema = z.object({
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  is_optional: z.boolean().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().min(0).optional()
});

// Step schemas
export const createStepSchema = z.object({
  step_number: z.number().int().min(1),
  title: z.string().optional(),
  instruction: z.string().min(1),
  timer_minutes: z.number().int().min(0).optional(),
  checklist_items: z.array(z.string()).default([]),
  photo_url: z.string().optional()
});

export const updateStepSchema = z.object({
  step_number: z.number().int().min(1).optional(),
  title: z.string().optional(),
  instruction: z.string().min(1).optional(),
  timer_minutes: z.number().int().min(0).optional(),
  checklist_items: z.array(z.string()).optional(),
  photo_url: z.string().optional()
});

// Service note schema
export const createServiceNoteSchema = z.object({
  note_text: z.string().min(1).max(1000)
});

// Search/filter schema
export const recipesSearchSchema = z.object({
  locationId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'published', 'archived']).optional(),
  category: z.string().optional(),
  cuisineType: z.string().optional(),
  search: z.string().optional(), // full-text search
  includeItems: z.array(z.string().uuid()).optional(), // filter by ingredient IDs
  excludeItems: z.array(z.string().uuid()).optional(), // exclude recipes with these ingredients
  allergens: z.array(z.string()).optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  tags: z.array(z.string()).optional(),
  minServings: z.number().int().min(1).optional(),
  maxServings: z.number().int().max(1000).optional(),
  maxPrepTime: z.number().int().min(0).optional(),
  maxCookTime: z.number().int().min(0).optional(),
  favoritesOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type CreateStepInput = z.infer<typeof createStepSchema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;
export type CreateServiceNoteInput = z.infer<typeof createServiceNoteSchema>;
export type RecipesSearchParams = z.infer<typeof recipesSearchSchema>;
