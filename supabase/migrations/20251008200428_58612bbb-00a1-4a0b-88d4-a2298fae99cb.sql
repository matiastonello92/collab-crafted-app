-- Add finance permission tags
-- This migration updates RLS policies for financial tables to require specific permissions

-- Update cash_closures policies
DROP POLICY IF EXISTS "cash_closures_select" ON public.cash_closures;
CREATE POLICY "cash_closures_select" ON public.cash_closures
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:view'))
  );

DROP POLICY IF EXISTS "cash_closures_insert" ON public.cash_closures;
CREATE POLICY "cash_closures_insert" ON public.cash_closures
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND
    user_has_permission(auth.uid(), 'finance:create')
  );

DROP POLICY IF EXISTS "cash_closures_update" ON public.cash_closures;
CREATE POLICY "cash_closures_update" ON public.cash_closures
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:create'))
  );

DROP POLICY IF EXISTS "cash_closures_delete" ON public.cash_closures;
CREATE POLICY "cash_closures_delete" ON public.cash_closures
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:create') AND status = 'draft')
  );

-- Update closure_items policies
DROP POLICY IF EXISTS "closure_items_select" ON public.closure_items;
CREATE POLICY "closure_items_select" ON public.closure_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cash_closures cc
      WHERE cc.id = closure_items.closure_id AND (
        is_platform_admin() OR 
        (user_in_org(cc.org_id) AND user_in_location(cc.location_id) AND 
         user_has_permission(auth.uid(), 'finance:view'))
      )
    )
  );

DROP POLICY IF EXISTS "closure_items_insert" ON public.closure_items;
CREATE POLICY "closure_items_insert" ON public.closure_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cash_closures cc
      WHERE cc.id = closure_items.closure_id AND 
      user_in_org(cc.org_id) AND user_in_location(cc.location_id) AND
      user_has_permission(auth.uid(), 'finance:create')
    )
  );

DROP POLICY IF EXISTS "closure_items_update" ON public.closure_items;
CREATE POLICY "closure_items_update" ON public.closure_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cash_closures cc
      WHERE cc.id = closure_items.closure_id AND (
        is_platform_admin() OR 
        (user_in_org(cc.org_id) AND user_in_location(cc.location_id) AND 
         user_has_permission(auth.uid(), 'finance:create'))
      )
    )
  );

DROP POLICY IF EXISTS "closure_items_delete" ON public.closure_items;
CREATE POLICY "closure_items_delete" ON public.closure_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cash_closures cc
      WHERE cc.id = closure_items.closure_id AND (
        is_platform_admin() OR 
        (user_in_org(cc.org_id) AND user_in_location(cc.location_id) AND 
         user_has_permission(auth.uid(), 'finance:create'))
      )
    )
  );

-- Update financial_imports policies
DROP POLICY IF EXISTS "financial_imports_select" ON public.financial_imports;
CREATE POLICY "financial_imports_select" ON public.financial_imports
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:view'))
  );

DROP POLICY IF EXISTS "financial_imports_insert" ON public.financial_imports;
CREATE POLICY "financial_imports_insert" ON public.financial_imports
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND
    user_has_permission(auth.uid(), 'finance:create')
  );

DROP POLICY IF EXISTS "financial_imports_update" ON public.financial_imports;
CREATE POLICY "financial_imports_update" ON public.financial_imports
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:create'))
  );

DROP POLICY IF EXISTS "financial_imports_delete" ON public.financial_imports;
CREATE POLICY "financial_imports_delete" ON public.financial_imports
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:create'))
  );

-- Update closure_email_recipients policies
DROP POLICY IF EXISTS "email_recipients_select" ON public.closure_email_recipients;
CREATE POLICY "email_recipients_select" ON public.closure_email_recipients
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND (location_id IS NULL OR user_in_location(location_id)) AND 
     user_has_permission(auth.uid(), 'finance:view'))
  );

DROP POLICY IF EXISTS "email_recipients_insert" ON public.closure_email_recipients;
CREATE POLICY "email_recipients_insert" ON public.closure_email_recipients
  FOR INSERT WITH CHECK (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'finance:manage'))
  );

DROP POLICY IF EXISTS "email_recipients_update" ON public.closure_email_recipients;
CREATE POLICY "email_recipients_update" ON public.closure_email_recipients
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'finance:manage'))
  );

DROP POLICY IF EXISTS "email_recipients_delete" ON public.closure_email_recipients;
CREATE POLICY "email_recipients_delete" ON public.closure_email_recipients
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'finance:manage'))
  );