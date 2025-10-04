-- RPC function per ricerca ricette con filtri items (include/exclude)
CREATE OR REPLACE FUNCTION public.search_recipes_by_items(
  p_location_id uuid,
  p_include_items uuid[] DEFAULT NULL,
  p_exclude_items uuid[] DEFAULT NULL
)
RETURNS TABLE (recipe_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT r.id as recipe_id
  FROM recipes r
  WHERE r.location_id = p_location_id
    -- Include logic: ricetta deve avere TUTTI gli items in p_include_items
    AND (
      p_include_items IS NULL 
      OR array_length(p_include_items, 1) IS NULL
      OR (
        SELECT COUNT(DISTINCT ri.catalog_item_id)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id
          AND ri.catalog_item_id = ANY(p_include_items)
      ) = array_length(p_include_items, 1)
    )
    -- Exclude logic: ricetta NON deve avere NESSUNO degli items in p_exclude_items
    AND (
      p_exclude_items IS NULL
      OR array_length(p_exclude_items, 1) IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id
          AND ri.catalog_item_id = ANY(p_exclude_items)
      )
    );
$$;