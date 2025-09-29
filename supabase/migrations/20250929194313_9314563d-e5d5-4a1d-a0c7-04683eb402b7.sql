-- Fix inventory value calculations
-- Drop existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS update_inventory_totals ON public.inventory_lines CASCADE;
DROP TRIGGER IF EXISTS inventory_lines_update_totals ON public.inventory_lines CASCADE;
DROP FUNCTION IF EXISTS public.update_inventory_totals() CASCADE;

-- Create helper function to calculate header total
CREATE OR REPLACE FUNCTION public.calculate_header_total(p_header_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(line_value), 0)
  FROM public.inventory_lines
  WHERE header_id = p_header_id;
$$;

-- Create new AFTER trigger that only updates header total
CREATE OR REPLACE FUNCTION public.update_header_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update header total_value after line changes
  UPDATE public.inventory_headers 
  SET total_value = public.calculate_header_total(COALESCE(NEW.header_id, OLD.header_id))
  WHERE id = COALESCE(NEW.header_id, OLD.header_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger for INSERT, UPDATE, DELETE on inventory_lines
CREATE TRIGGER update_header_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_header_total();