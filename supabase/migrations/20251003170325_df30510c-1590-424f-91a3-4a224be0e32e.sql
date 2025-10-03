-- =====================================================
-- KLYRA RECIPES MODULE - Schema & Workflow
-- Pattern: Inventory-like approval workflow + multi-tenant RLS
-- =====================================================

-- 1. HELPER FUNCTION per gestione permessi recipes
CREATE OR REPLACE FUNCTION public.user_can_manage_recipes(p_org_id uuid, p_location_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN is_platform_admin() 
    OR (
      user_in_org(p_org_id) 
      AND user_in_location(p_location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    );
END;
$$;

-- 2. TABELLA recipes (core)
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  
  -- Dati base ricetta
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'main_course', -- main_course, appetizer, dessert, beverage, etc.
  cuisine_type text, -- italian, french, asian, etc.
  
  -- Dettagli tecnici
  servings integer NOT NULL DEFAULT 4,
  prep_time_minutes integer NOT NULL DEFAULT 0,
  cook_time_minutes integer NOT NULL DEFAULT 0,
  
  -- Media
  photo_url text, -- OBBLIGATORIO per pubblicare
  
  -- Metadata
  allergens text[] DEFAULT '{}', -- manual allergen tags
  season text[] DEFAULT '{}', -- spring, summer, fall, winter
  tags text[] DEFAULT '{}', -- custom tags
  
  -- Workflow states
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published', 'archived')),
  
  -- Audit trail
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  submitted_by uuid,
  submitted_at timestamptz,
  
  published_by uuid,
  published_at timestamptz,
  
  archived_by uuid,
  archived_at timestamptz,
  
  -- Stats
  view_count integer NOT NULL DEFAULT 0,
  clone_count integer NOT NULL DEFAULT 0,
  
  is_active boolean NOT NULL DEFAULT true,
  
  CONSTRAINT recipes_org_fk FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
  CONSTRAINT recipes_location_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_recipes_org_location ON public.recipes(org_id, location_id);
CREATE INDEX idx_recipes_status ON public.recipes(status) WHERE is_active = true;
CREATE INDEX idx_recipes_category ON public.recipes(category) WHERE is_active = true;
CREATE INDEX idx_recipes_created_by ON public.recipes(created_by);

-- Trigger updated_at
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admin vede tutto
CREATE POLICY recipes_select_admin ON public.recipes
  FOR SELECT
  USING (is_platform_admin());

-- Policy: Utenti vedono ricette della loro org/location
CREATE POLICY recipes_select_org ON public.recipes
  FOR SELECT
  USING (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND (
      status = 'published' -- tutti vedono pubblicate
      OR created_by = auth.uid() -- creator vede proprie bozze
      OR user_can_manage_recipes(org_id, location_id) -- manager vedono tutto
    )
  );

-- Policy: Chiunque può creare bozze
CREATE POLICY recipes_insert ON public.recipes
  FOR INSERT
  WITH CHECK (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND status = 'draft'
    AND created_by = auth.uid()
  );

-- Policy: Aggiornamento
CREATE POLICY recipes_update ON public.recipes
  FOR UPDATE
  USING (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND (
      (status = 'draft' AND created_by = auth.uid()) -- creator modifica proprie bozze
      OR user_can_manage_recipes(org_id, location_id) -- manager modificano tutto
    )
  );

-- Policy: Cancellazione (solo bozze, solo creator o manager)
CREATE POLICY recipes_delete ON public.recipes
  FOR DELETE
  USING (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND status = 'draft'
    AND (
      created_by = auth.uid()
      OR user_can_manage_recipes(org_id, location_id)
    )
  );

-- 3. TABELLA recipe_ingredients (link a inventory_catalog_items)
CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.inventory_catalog_items(id) ON DELETE RESTRICT,
  
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  
  -- Quantità per ricetta base
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL, -- g, kg, ml, l, pcs, etc.
  
  -- Snapshot dei dati item (per storicizzazione)
  item_name_snapshot text NOT NULL,
  
  -- Ordinamento
  sort_order integer NOT NULL DEFAULT 0,
  
  -- Opzionalità
  is_optional boolean NOT NULL DEFAULT false,
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT recipe_ingredients_org_fk FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
  CONSTRAINT recipe_ingredients_location_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_item ON public.recipe_ingredients(catalog_item_id);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Ingredients seguono la visibilità della ricetta
CREATE POLICY recipe_ingredients_select ON public.recipe_ingredients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
    )
  );

CREATE POLICY recipe_ingredients_insert ON public.recipe_ingredients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.status = 'draft'
        AND (r.created_by = auth.uid() OR user_can_manage_recipes(r.org_id, r.location_id))
    )
  );

CREATE POLICY recipe_ingredients_update ON public.recipe_ingredients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.status = 'draft'
        AND (r.created_by = auth.uid() OR user_can_manage_recipes(r.org_id, r.location_id))
    )
  );

CREATE POLICY recipe_ingredients_delete ON public.recipe_ingredients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.status = 'draft'
        AND (r.created_by = auth.uid() OR user_can_manage_recipes(r.org_id, r.location_id))
    )
  );

-- 4. TABELLA recipe_steps
CREATE TABLE public.recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  
  -- Contenuto step
  step_number integer NOT NULL,
  title text,
  instruction text NOT NULL,
  
  -- Timer opzionale
  timer_minutes integer CHECK (timer_minutes >= 0),
  
  -- Checklist opzionale (array di stringhe)
  checklist_items text[] DEFAULT '{}',
  
  -- Media step
  photo_url text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT recipe_steps_org_fk FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
  CONSTRAINT recipe_steps_location_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT recipe_steps_unique_step_number UNIQUE (recipe_id, step_number)
);

CREATE INDEX idx_recipe_steps_recipe ON public.recipe_steps(recipe_id, step_number);

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

-- Steps seguono la visibilità della ricetta
CREATE POLICY recipe_steps_select ON public.recipe_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_steps.recipe_id
    )
  );

CREATE POLICY recipe_steps_insert ON public.recipe_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_steps.recipe_id
        AND r.status = 'draft'
        AND (r.created_by = auth.uid() OR user_can_manage_recipes(r.org_id, r.location_id))
    )
  );

CREATE POLICY recipe_steps_update ON public.recipe_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_steps.recipe_id
        AND r.status = 'draft'
        AND (r.created_by = auth.uid() OR user_can_manage_recipes(r.org_id, r.location_id))
    )
  );

CREATE POLICY recipe_steps_delete ON public.recipe_steps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_steps.recipe_id
        AND r.status = 'draft'
        AND (r.created_by = auth.uid() OR user_can_manage_recipes(r.org_id, r.location_id))
    )
  );

-- 5. TABELLA recipe_service_notes (note di servizio per staff)
CREATE TABLE public.recipe_service_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  
  note_text text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT recipe_service_notes_org_fk FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
  CONSTRAINT recipe_service_notes_location_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_service_notes_recipe ON public.recipe_service_notes(recipe_id, created_at DESC);

ALTER TABLE public.recipe_service_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_service_notes_select ON public.recipe_service_notes
  FOR SELECT
  USING (
    user_in_org(org_id) 
    AND user_in_location(location_id)
  );

CREATE POLICY recipe_service_notes_insert ON public.recipe_service_notes
  FOR INSERT
  WITH CHECK (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND created_by = auth.uid()
  );

-- 6. TABELLA recipe_favorites (preferiti utente)
CREATE TABLE public.recipe_favorites (
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX idx_recipe_favorites_user ON public.recipe_favorites(user_id, created_at DESC);

ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_favorites_all ON public.recipe_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. STORAGE BUCKET per foto ricette
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-photos',
  'recipe-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: multi-tenant isolation per org_id
CREATE POLICY "recipe_photos_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'recipe-photos');

CREATE POLICY "recipe_photos_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "recipe_photos_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'recipe-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "recipe_photos_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'recipe-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM memberships WHERE user_id = auth.uid()
    )
  );