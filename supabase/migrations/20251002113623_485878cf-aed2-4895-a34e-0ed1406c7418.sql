-- Drop existing complex policies for rotas
DROP POLICY IF EXISTS "rotas_insert" ON public.rotas;
DROP POLICY IF EXISTS "rotas_update" ON public.rotas;
DROP POLICY IF EXISTS "rotas_delete" ON public.rotas;

-- Create simplified policies for rotas (same pattern as Inventory)
CREATE POLICY "rotas_insert_simplified"
ON public.rotas
FOR INSERT
WITH CHECK (
  is_platform_admin() 
  OR user_is_org_admin(org_id) 
  OR is_manager_for_location(location_id)
);

CREATE POLICY "rotas_update_simplified"
ON public.rotas
FOR UPDATE
USING (
  is_platform_admin() 
  OR user_is_org_admin(org_id) 
  OR is_manager_for_location(location_id)
)
WITH CHECK (
  is_platform_admin() 
  OR user_is_org_admin(org_id) 
  OR is_manager_for_location(location_id)
);

CREATE POLICY "rotas_delete_simplified"
ON public.rotas
FOR DELETE
USING (
  is_platform_admin() 
  OR user_is_org_admin(org_id) 
  OR is_manager_for_location(location_id)
);

-- Drop and recreate user_job_tags SELECT policy (it was complex)
DROP POLICY IF EXISTS "user_job_tags_select" ON public.user_job_tags;

CREATE POLICY "user_job_tags_select_simplified"
ON public.user_job_tags
FOR SELECT
USING (
  is_platform_admin() 
  OR user_id = auth.uid()
  OR user_is_org_admin(org_id)
  OR is_manager_for_location(location_id)
);