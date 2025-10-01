-- ============================================================================
-- MIGRATION: Fix Job Tags Schema
-- Description: Allinea schema job_tags e user_job_tags a codice atteso
-- Risk: LOW (tabelle vuote, nessuna FK in entrata)
-- ============================================================================

-- ============================================================================
-- PART 1: job_tags table - Add missing columns
-- ============================================================================

-- Add missing columns to job_tags
ALTER TABLE public.job_tags 
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS label_it text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS color text;

-- Update NOT NULL constraints after data exists
-- (safe perché tabella è vuota)
ALTER TABLE public.job_tags 
  ALTER COLUMN key SET NOT NULL,
  ALTER COLUMN label_it SET NOT NULL;

-- Drop old columns if they exist
ALTER TABLE public.job_tags 
  DROP COLUMN IF EXISTS label CASCADE,
  DROP COLUMN IF EXISTS name CASCADE;

-- Add unique constraint on (org_id, key)
DROP INDEX IF EXISTS job_tags_org_id_key_key;
CREATE UNIQUE INDEX job_tags_org_id_key_key ON public.job_tags(org_id, key);

-- ============================================================================
-- PART 2: user_job_tags table - Restructure
-- ============================================================================

-- Drop existing primary key constraint
ALTER TABLE public.user_job_tags DROP CONSTRAINT IF EXISTS user_job_tags_pkey CASCADE;

-- Rename tag_id to job_tag_id
ALTER TABLE public.user_job_tags RENAME COLUMN tag_id TO job_tag_id;

-- Add new columns
ALTER TABLE public.user_job_tags 
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS assigned_by uuid;

-- Set id as primary key
ALTER TABLE public.user_job_tags 
  ALTER COLUMN id SET NOT NULL,
  ADD PRIMARY KEY (id);

-- Add unique constraint to prevent duplicate assignments
DROP INDEX IF EXISTS user_job_tags_user_location_tag_unique;
CREATE UNIQUE INDEX user_job_tags_user_location_tag_unique 
  ON public.user_job_tags(user_id, job_tag_id, location_id);

-- Add partial unique index for is_primary (only one primary per user+location)
DROP INDEX IF EXISTS ujt_primary_one_per_loc;
CREATE UNIQUE INDEX ujt_primary_one_per_loc 
  ON public.user_job_tags(user_id, location_id) 
  WHERE is_primary = true;

-- Add foreign key to job_tags
ALTER TABLE public.user_job_tags 
  DROP CONSTRAINT IF EXISTS user_job_tags_job_tag_id_fkey,
  ADD CONSTRAINT user_job_tags_job_tag_id_fkey 
    FOREIGN KEY (job_tag_id) 
    REFERENCES public.job_tags(id) 
    ON DELETE CASCADE;

-- ============================================================================
-- PART 3: SQL Functions
-- ============================================================================

-- Function: generate_job_tag_key
CREATE OR REPLACE FUNCTION public.generate_job_tag_key(p_label text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  -- Convert to lowercase, replace spaces with underscores, remove special chars
  v_key := lower(trim(p_label));
  v_key := regexp_replace(v_key, '\s+', '_', 'g');
  v_key := regexp_replace(v_key, '[^a-z0-9_]', '', 'g');
  v_key := regexp_replace(v_key, '_+', '_', 'g');
  v_key := trim(both '_' from v_key);
  
  RETURN v_key;
END;
$$;

-- Function: job_tag_id_by_name
CREATE OR REPLACE FUNCTION public.job_tag_id_by_name(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.job_tags WHERE key = p_name LIMIT 1;
$$;

-- Function: insert_preset_ristorazione_tags
CREATE OR REPLACE FUNCTION public.insert_preset_ristorazione_tags(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int := 0;
  v_skipped int := 0;
  v_tags jsonb := '[
    {"key": "cameriere", "label_it": "Cameriere", "categoria": "Sala", "color": "#10B981"},
    {"key": "barista", "label_it": "Barista", "categoria": "Sala", "color": "#3B82F6"},
    {"key": "chef", "label_it": "Chef", "categoria": "Cucina", "color": "#EF4444"},
    {"key": "sous_chef", "label_it": "Sous Chef", "categoria": "Cucina", "color": "#F59E0B"},
    {"key": "pizzaiolo", "label_it": "Pizzaiolo", "categoria": "Cucina", "color": "#8B5CF6"},
    {"key": "lavapiatti", "label_it": "Lavapiatti", "categoria": "Cucina", "color": "#6B7280"},
    {"key": "hostess", "label_it": "Hostess", "categoria": "Sala", "color": "#EC4899"},
    {"key": "sommelier", "label_it": "Sommelier", "categoria": "Sala", "color": "#14B8A6"}
  ]'::jsonb;
  v_tag jsonb;
BEGIN
  -- Validate org_id
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id cannot be null';
  END IF;

  -- Loop through preset tags
  FOR v_tag IN SELECT * FROM jsonb_array_elements(v_tags)
  LOOP
    BEGIN
      INSERT INTO public.job_tags (org_id, key, label_it, categoria, color, is_active)
      VALUES (
        p_org_id,
        v_tag->>'key',
        v_tag->>'label_it',
        v_tag->>'categoria',
        v_tag->>'color',
        true
      );
      v_inserted := v_inserted + 1;
    EXCEPTION
      WHEN unique_violation THEN
        v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'skipped', v_skipped,
    'total', jsonb_array_length(v_tags)
  );
END;
$$;

-- ============================================================================
-- PART 4: Trigger for single primary tag
-- ============================================================================

-- Function: ensure_single_primary_tag
CREATE OR REPLACE FUNCTION public.ensure_single_primary_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting a tag as primary, unset all other primary tags for same user+location
  IF NEW.is_primary = true THEN
    UPDATE public.user_job_tags
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND location_id = NEW.location_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS tg_ensure_single_primary_tag ON public.user_job_tags;
CREATE TRIGGER tg_ensure_single_primary_tag
  BEFORE INSERT OR UPDATE OF is_primary
  ON public.user_job_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_tag();

-- ============================================================================
-- PART 5: Update RLS Policies (if needed)
-- ============================================================================

-- Policies already exist and reference org_id, user_id, location_id
-- No changes needed as column names remain compatible

-- ============================================================================
-- PART 6: Verify schema
-- ============================================================================

-- Add comments for documentation
COMMENT ON COLUMN public.job_tags.key IS 'Slug-like unique identifier within org (e.g., "cameriere")';
COMMENT ON COLUMN public.job_tags.label_it IS 'Italian display label (e.g., "Cameriere")';
COMMENT ON COLUMN public.job_tags.categoria IS 'Category grouping (e.g., "Sala", "Cucina")';
COMMENT ON COLUMN public.job_tags.color IS 'Hex color for UI display';

COMMENT ON COLUMN public.user_job_tags.is_primary IS 'Only one primary tag allowed per user+location';
COMMENT ON COLUMN public.user_job_tags.note IS 'Optional notes about this assignment';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_job_tag_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_tag_id_by_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_preset_ristorazione_tags TO authenticated;