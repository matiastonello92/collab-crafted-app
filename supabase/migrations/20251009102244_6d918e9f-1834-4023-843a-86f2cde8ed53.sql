-- Fix payment_methods RLS policies for proper org admin and location manager access

-- Drop existing policies
DROP POLICY IF EXISTS "payment_methods_select" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_update" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete" ON public.payment_methods;

-- SELECT: Allow users with finance permissions in their org
CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND (
      user_has_permission(auth.uid(), 'finance:view') OR
      user_has_permission(auth.uid(), 'finance:create') OR
      user_has_permission(auth.uid(), 'finance:manage')
    ))
  );

-- INSERT: Allow platform admin, org admin, or location manager
CREATE POLICY "payment_methods_insert" ON public.payment_methods
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    user_is_org_admin(org_id) OR
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:manage'))
  );

-- UPDATE: Allow platform admin, org admin, or location manager
CREATE POLICY "payment_methods_update" ON public.payment_methods
  FOR UPDATE USING (
    is_platform_admin() OR
    user_is_org_admin(org_id) OR
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:manage'))
  );

-- DELETE: Allow platform admin, org admin, or location manager, but prevent deletion of base methods
CREATE POLICY "payment_methods_delete" ON public.payment_methods
  FOR DELETE USING (
    is_base_method = false AND (
      is_platform_admin() OR
      user_is_org_admin(org_id) OR
      (user_in_org(org_id) AND user_in_location(location_id) AND 
       user_has_permission(auth.uid(), 'finance:manage'))
    )
  );