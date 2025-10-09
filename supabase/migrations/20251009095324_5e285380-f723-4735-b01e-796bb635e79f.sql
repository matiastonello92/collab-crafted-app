-- Add type column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.payment_methods ADD COLUMN type text DEFAULT 'other';
  END IF;
END $$;

-- Fix RLS policies for payment_methods to use finance:manage permission
DROP POLICY IF EXISTS "payment_methods_select" ON public.payment_methods;
CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id))
  );

DROP POLICY IF EXISTS "payment_methods_insert" ON public.payment_methods;
CREATE POLICY "payment_methods_insert" ON public.payment_methods
  FOR INSERT WITH CHECK (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:manage'))
  );

DROP POLICY IF EXISTS "payment_methods_update" ON public.payment_methods;
CREATE POLICY "payment_methods_update" ON public.payment_methods
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:manage'))
  );

DROP POLICY IF EXISTS "payment_methods_delete" ON public.payment_methods;
CREATE POLICY "payment_methods_delete" ON public.payment_methods
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND 
     user_has_permission(auth.uid(), 'finance:manage'))
  );

-- Insert default payment methods for existing locations
INSERT INTO public.payment_methods (org_id, location_id, name, key, type, is_active, sort_order)
SELECT DISTINCT 
  l.org_id,
  l.id as location_id,
  m.name,
  m.key,
  m.type,
  true as is_active,
  m.sort_order
FROM public.locations l
CROSS JOIN (
  VALUES 
    ('Contanti', 'cash', 'cash', 1),
    ('POS/Carta', 'card', 'card', 2),
    ('Satispay', 'satispay', 'digital', 3),
    ('Bonifico', 'bank_transfer', 'bank_transfer', 4),
    ('Credito Cliente', 'customer_credit', 'customer_credit', 5)
) AS m(name, key, type, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm
  WHERE pm.location_id = l.id AND pm.key = m.key
);