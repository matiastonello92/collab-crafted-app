-- Migration: Sub-Recipes (1 Level) + Recipe Photo Validation

-- 1. Modifica recipe_ingredients per supportare sub-ricette
ALTER TABLE public.recipe_ingredients
  ADD COLUMN sub_recipe_id uuid REFERENCES public.recipes(id) ON DELETE RESTRICT;

-- Rendi catalog_item_id nullable (ora può essere sub_recipe_id invece)
ALTER TABLE public.recipe_ingredients
  ALTER COLUMN catalog_item_id DROP NOT NULL;

-- Constraint: O catalog_item O sub_recipe, non entrambi
ALTER TABLE public.recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_source_check 
  CHECK (
    (catalog_item_id IS NOT NULL AND sub_recipe_id IS NULL)
    OR (catalog_item_id IS NULL AND sub_recipe_id IS NOT NULL)
  );

-- Index per performance
CREATE INDEX idx_recipe_ingredients_sub_recipe ON public.recipe_ingredients(sub_recipe_id);

-- 2. Funzione per rilevare cicli nelle sub-ricette
CREATE OR REPLACE FUNCTION public.recipe_has_cycle(
  p_recipe_id uuid,
  p_sub_recipe_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Controllo diretto: A non può contenere A
  IF p_recipe_id = p_sub_recipe_id THEN
    RETURN true;
  END IF;
  
  -- Controllo 1 livello: se B è già sub-ricetta di A, 
  -- allora A non può diventare sub-ricetta di B (ciclo incrociato)
  IF EXISTS (
    SELECT 1 FROM recipe_ingredients
    WHERE recipe_id = p_sub_recipe_id
      AND sub_recipe_id = p_recipe_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Controllo: la sub-ricetta NON deve contenere a sua volta altre sub-ricette
  -- (limite 1 livello di profondità)
  IF EXISTS (
    SELECT 1 FROM recipe_ingredients
    WHERE recipe_id = p_sub_recipe_id
      AND sub_recipe_id IS NOT NULL
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 3. Trigger per validare ingredienti con sub-ricette
CREATE OR REPLACE FUNCTION public.validate_recipe_ingredient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se è una sub-ricetta
  IF NEW.sub_recipe_id IS NOT NULL THEN
    -- Deve essere published e attiva
    IF NOT EXISTS (
      SELECT 1 FROM recipes
      WHERE id = NEW.sub_recipe_id
        AND status = 'published'
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'La ricetta selezionata non è pubblicata o non è attiva';
    END IF;
    
    -- Controllo ciclo
    IF recipe_has_cycle(NEW.recipe_id, NEW.sub_recipe_id) THEN
      RAISE EXCEPTION 'Loop rilevato: impossibile aggiungere questa sub-ricetta (ciclo o profondità > 1 livello)';
    END IF;
    
    -- Forza unit = "porzioni" per sub-ricette
    NEW.unit := 'porzioni';
    
    -- Auto-popola item_name_snapshot con titolo sub-ricetta
    SELECT title INTO NEW.item_name_snapshot
    FROM recipes
    WHERE id = NEW.sub_recipe_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_ingredients_validate
  BEFORE INSERT OR UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION validate_recipe_ingredient();