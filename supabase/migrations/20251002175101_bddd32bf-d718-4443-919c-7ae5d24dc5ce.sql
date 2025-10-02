-- Fix RLS policy for rotas: enforce location scoping for ALL users
-- This prevents seeing rotas from other locations even with shifts:manage permission

DROP POLICY IF EXISTS rotas_select ON public.rotas;

CREATE POLICY rotas_select ON public.rotas
FOR SELECT USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND user_in_location(location_id)  -- CRITICAL: must be in the specific location
    AND (
      user_has_permission(auth.uid(), 'shifts:manage')
      OR (status = 'published')
    )
  )
);

-- Add index on location_id for better performance
CREATE INDEX IF NOT EXISTS idx_rotas_location_id ON public.rotas(location_id);

COMMENT ON POLICY rotas_select ON public.rotas IS 
'Users can only see rotas from locations they have access to. Platform admins see all.';