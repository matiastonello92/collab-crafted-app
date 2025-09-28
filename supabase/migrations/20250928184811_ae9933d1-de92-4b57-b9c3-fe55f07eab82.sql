-- Fix security issues: Add RLS policies for inventory tables and fix functions (fixed)

-- Drop trigger first, then function with CASCADE, then recreate properly
DROP TRIGGER IF EXISTS inventory_catalog_items_updated_at ON public.inventory_catalog_items;
DROP FUNCTION IF EXISTS public.tg_touch_updated_at_inventory() CASCADE;

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at_inventory()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER inventory_catalog_items_updated_at
  BEFORE UPDATE ON public.inventory_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at_inventory();

-- Drop and recreate the totals function with proper security
DROP TRIGGER IF EXISTS inventory_lines_update_totals ON public.inventory_lines;
DROP FUNCTION IF EXISTS public.update_inventory_totals() CASCADE;

CREATE OR REPLACE FUNCTION public.update_inventory_totals()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update line value
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.line_value = NEW.qty * NEW.unit_price_snapshot;
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
  END IF;

  -- Update header total
  UPDATE public.inventory_headers 
  SET total_value = (
    SELECT COALESCE(SUM(line_value), 0) 
    FROM public.inventory_lines 
    WHERE header_id = COALESCE(NEW.header_id, OLD.header_id)
  )
  WHERE id = COALESCE(NEW.header_id, OLD.header_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger
CREATE TRIGGER inventory_lines_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_totals();

-- Helper function to check if user can manage inventory for location
CREATE OR REPLACE FUNCTION public.user_can_manage_inventory(p_org_id uuid, p_location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_platform_admin() OR
    user_is_org_admin(p_org_id) OR
    is_manager_for_location(p_location_id);
$$;

-- RLS Policies for inventory_catalog_items
CREATE POLICY "inventory_catalog_items_select" ON public.inventory_catalog_items
FOR SELECT USING (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_catalog_items.location_id 
      AND COALESCE(url.is_active, true)
  ))
);

CREATE POLICY "inventory_catalog_items_insert" ON public.inventory_catalog_items
FOR INSERT WITH CHECK (
  user_can_manage_inventory(org_id, location_id)
);

CREATE POLICY "inventory_catalog_items_update" ON public.inventory_catalog_items
FOR UPDATE USING (
  user_can_manage_inventory(org_id, location_id)
) WITH CHECK (
  user_can_manage_inventory(org_id, location_id)
);

CREATE POLICY "inventory_catalog_items_delete" ON public.inventory_catalog_items
FOR DELETE USING (
  user_can_manage_inventory(org_id, location_id)
);

-- RLS Policies for inventory_headers
CREATE POLICY "inventory_headers_select" ON public.inventory_headers
FOR SELECT USING (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_headers.location_id 
      AND COALESCE(url.is_active, true)
  ))
);

CREATE POLICY "inventory_headers_insert" ON public.inventory_headers
FOR INSERT WITH CHECK (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_headers.location_id 
      AND COALESCE(url.is_active, true)
  ))
);

CREATE POLICY "inventory_headers_update" ON public.inventory_headers
FOR UPDATE USING (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_headers.location_id 
      AND COALESCE(url.is_active, true)
  )) OR
  -- Allow base users to mark as completed
  (status = 'in_progress' AND auth.uid() = started_by)
);

CREATE POLICY "inventory_headers_delete" ON public.inventory_headers
FOR DELETE USING (
  user_can_manage_inventory(org_id, location_id) AND status != 'approved'
);

-- RLS Policies for inventory_lines  
CREATE POLICY "inventory_lines_select" ON public.inventory_lines
FOR SELECT USING (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_lines.location_id 
      AND COALESCE(url.is_active, true)
  ))
);

CREATE POLICY "inventory_lines_insert" ON public.inventory_lines
FOR INSERT WITH CHECK (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_lines.location_id 
      AND COALESCE(url.is_active, true)
  ) AND EXISTS (
    SELECT 1 FROM inventory_headers h 
    WHERE h.id = inventory_lines.header_id 
      AND h.status IN ('in_progress', 'completed')
  ))
);

CREATE POLICY "inventory_lines_update" ON public.inventory_lines
FOR UPDATE USING (
  is_platform_admin() OR 
  (user_in_org(org_id) AND EXISTS (
    SELECT 1 FROM user_roles_locations url 
    JOIN locations l ON l.id = url.location_id 
    WHERE url.user_id = auth.uid() 
      AND l.id = inventory_lines.location_id 
      AND COALESCE(url.is_active, true)
  ) AND EXISTS (
    SELECT 1 FROM inventory_headers h 
    WHERE h.id = inventory_lines.header_id 
      AND (h.status IN ('in_progress', 'completed') OR user_can_manage_inventory(h.org_id, h.location_id))
  ))
);

CREATE POLICY "inventory_lines_delete" ON public.inventory_lines
FOR DELETE USING (
  user_can_manage_inventory(org_id, location_id)
);

-- RLS Policies for inventory_presence
CREATE POLICY "inventory_presence_select" ON public.inventory_presence
FOR SELECT USING (
  is_platform_admin() OR 
  EXISTS (
    SELECT 1 FROM inventory_headers h
    JOIN user_roles_locations url ON url.location_id = h.location_id
    WHERE h.id = inventory_presence.header_id
      AND url.user_id = auth.uid()
      AND COALESCE(url.is_active, true)
  )
);

CREATE POLICY "inventory_presence_insert" ON public.inventory_presence
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM inventory_headers h
    JOIN user_roles_locations url ON url.location_id = h.location_id
    WHERE h.id = inventory_presence.header_id
      AND url.user_id = auth.uid()
      AND COALESCE(url.is_active, true)
  )
);

CREATE POLICY "inventory_presence_update" ON public.inventory_presence
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "inventory_presence_delete" ON public.inventory_presence
FOR DELETE USING (user_id = auth.uid());