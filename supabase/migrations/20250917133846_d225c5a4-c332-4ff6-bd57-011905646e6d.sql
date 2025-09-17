-- Migration: Complete removal of location_admins dependency (Fixed)
-- Step 1: Backup location_admins table
CREATE TABLE IF NOT EXISTS public.location_admins_backup AS 
SELECT * FROM public.location_admins;

-- Step 2: Verify data consistency between location_admins and user_roles_locations
-- Check for missing manager role assignments
DO $$
DECLARE
    missing_count INTEGER;
    total_admins INTEGER;
BEGIN
    -- Count total location admins
    SELECT COUNT(*) INTO total_admins FROM public.location_admins;
    
    -- Count missing manager roles in user_roles_locations
    SELECT COUNT(*) INTO missing_count
    FROM public.location_admins la
    LEFT JOIN public.user_roles_locations url ON (
        url.user_id = la.user_id 
        AND url.location_id = la.location_id
        AND url.role_id IN (
            SELECT r.id FROM public.roles r 
            WHERE r.name = 'manager' AND r.org_id = la.org_id
        )
        AND COALESCE(url.is_active, true) = true
    )
    WHERE url.id IS NULL;
    
    RAISE NOTICE 'Location admins backup: % rows', total_admins;
    RAISE NOTICE 'Missing manager role assignments: %', missing_count;
    
    -- If there are missing assignments, we need to create them
    IF missing_count > 0 THEN
        RAISE NOTICE 'Creating missing manager role assignments...';
        
        -- Insert missing manager role assignments
        INSERT INTO public.user_roles_locations (user_id, role_id, location_id, org_id, assigned_by, is_active)
        SELECT DISTINCT
            la.user_id,
            r.id as role_id,
            la.location_id,
            la.org_id,
            la.user_id as assigned_by, -- Self-assigned for migration
            true as is_active
        FROM public.location_admins la
        JOIN public.roles r ON (r.name = 'manager' AND r.org_id = la.org_id)
        LEFT JOIN public.user_roles_locations url ON (
            url.user_id = la.user_id 
            AND url.location_id = la.location_id
            AND url.role_id = r.id
            AND COALESCE(url.is_active, true) = true
        )
        WHERE url.id IS NULL;
        
        GET DIAGNOSTICS missing_count = ROW_COUNT;
        RAISE NOTICE 'Created % missing manager role assignments', missing_count;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully. location_admins table backed up and all functions will be migrated to RBAC.';
END $$;

-- Step 3: Migrate database functions to use RBAC instead of location_admins

-- 3.1: Update is_manager_for_location function
CREATE OR REPLACE FUNCTION public.is_manager_for_location(loc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    public.platform_admin()  -- bypass globale SOLO platform admin
    OR EXISTS (
      SELECT 1
      FROM public.user_roles_locations url
      JOIN public.roles r ON r.id = url.role_id
      JOIN public.locations l ON l.id = url.location_id
      WHERE url.user_id = auth.uid()
        AND url.location_id = loc_id
        AND r.name = 'manager'
        AND COALESCE(url.is_active, true) = true
        -- vincolo multi-tenant: l'utente deve appartenere ALLA STESSA ORG della location
        AND public.user_in_org(l.org_id)
        AND url.org_id = l.org_id
    )
$function$;