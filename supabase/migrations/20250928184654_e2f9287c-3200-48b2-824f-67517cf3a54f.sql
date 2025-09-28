-- Inventory Management Module - Core Tables with RLS

-- 1) Catalog Items (Products that can be inventoried)
CREATE TABLE IF NOT EXISTS public.inventory_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('kitchen', 'bar', 'cleaning')),
  name text NOT NULL,
  uom text NOT NULL, -- unit of measure (kg, lt, pz, etc.)
  default_unit_price numeric(12,4) NOT NULL DEFAULT 0,
  supplier_id uuid NULL, -- Future suppliers table
  photo_url text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_catalog_org_loc_cat ON public.inventory_catalog_items(org_id, location_id, category, is_active);

-- 2) Inventory Headers (Inventory sessions/snapshots)
CREATE TABLE IF NOT EXISTS public.inventory_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('kitchen', 'bar', 'cleaning')),
  status text NOT NULL CHECK (status IN ('in_progress', 'completed', 'approved')) DEFAULT 'in_progress',
  started_by uuid NOT NULL,
  approved_by uuid NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL,
  total_value numeric(14,4) NOT NULL DEFAULT 0,
  notes text NULL
);

-- Index for performance  
CREATE INDEX IF NOT EXISTS idx_inventory_headers_org_loc_cat ON public.inventory_headers(org_id, location_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_headers_status ON public.inventory_headers(status, started_at DESC);

-- 3) Inventory Lines (Count details for each header)
CREATE TABLE IF NOT EXISTS public.inventory_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  header_id uuid NOT NULL REFERENCES public.inventory_headers(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.inventory_catalog_items(id),
  name_snapshot text NOT NULL, -- denormalized name at counting time
  uom_snapshot text NOT NULL, -- denormalized UoM at counting time
  unit_price_snapshot numeric(12,4) NOT NULL, -- price at counting time
  qty numeric(14,4) NOT NULL DEFAULT 0,
  line_value numeric(14,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  UNIQUE(header_id, catalog_item_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_lines_header ON public.inventory_lines(header_id);

-- 4) Inventory Presence (for real-time collaboration)
CREATE TABLE IF NOT EXISTS public.inventory_presence (
  header_id uuid NOT NULL REFERENCES public.inventory_headers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (header_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.inventory_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_presence ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for catalog items
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at_inventory()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_catalog_items_updated_at
  BEFORE UPDATE ON public.inventory_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at_inventory();

-- Function to update line values and header totals
CREATE OR REPLACE FUNCTION public.update_inventory_totals()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update totals on line changes
CREATE TRIGGER inventory_lines_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_totals();