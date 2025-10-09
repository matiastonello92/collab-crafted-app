-- Add category and is_base_method columns to payment_methods
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS is_base_method boolean DEFAULT false;

-- Update existing payment methods to set appropriate categories based on type
UPDATE public.payment_methods
SET category = CASE 
  WHEN type = 'cash' THEN 'cash'
  WHEN type = 'card' THEN 'pos_card'
  WHEN type = 'bank_transfer' THEN 'bank_transfer'
  ELSE 'custom'
END;

-- Mark existing default methods as base methods
UPDATE public.payment_methods
SET is_base_method = true
WHERE key IN ('contanti', 'pos_carta', 'satispay', 'bonifico', 'credito_cliente');

-- Delete all existing payment methods (we'll recreate base ones)
DELETE FROM public.payment_methods;

-- Insert base payment methods for all existing locations
INSERT INTO public.payment_methods (org_id, location_id, name, key, type, category, is_base_method, is_active, sort_order)
SELECT 
  l.org_id,
  l.id as location_id,
  'Contanti' as name,
  'contanti' as key,
  'cash' as type,
  'cash' as category,
  true as is_base_method,
  true as is_active,
  1 as sort_order
FROM public.locations l
WHERE l.is_active = true;

INSERT INTO public.payment_methods (org_id, location_id, name, key, type, category, is_base_method, is_active, sort_order)
SELECT 
  l.org_id,
  l.id as location_id,
  'POS 1' as name,
  'pos_1' as key,
  'card' as type,
  'pos_card' as category,
  false as is_base_method,
  true as is_active,
  2 as sort_order
FROM public.locations l
WHERE l.is_active = true;

INSERT INTO public.payment_methods (org_id, location_id, name, key, type, category, is_base_method, is_active, sort_order)
SELECT 
  l.org_id,
  l.id as location_id,
  'Bonifico' as name,
  'bonifico' as key,
  'bank_transfer' as type,
  'bank_transfer' as category,
  true as is_base_method,
  true as is_active,
  3 as sort_order
FROM public.locations l
WHERE l.is_active = true;