-- ===================================================================
-- Recalculate Cleaning Deadlines - Auto-update on Area Changes
-- ===================================================================

-- Function to recalculate pending/overdue deadlines for an area
CREATE OR REPLACE FUNCTION public.recalculate_pending_deadlines(p_area_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_completion RECORD;
  v_new_deadline TIMESTAMPTZ;
BEGIN
  -- Loop through all pending/overdue completions for this area
  FOR v_completion IN 
    SELECT id, scheduled_for 
    FROM public.haccp_cleaning_completions
    WHERE area_id = p_area_id 
      AND status IN ('pending', 'overdue')
      AND completed_at IS NULL
  LOOP
    -- Recalculate deadline using existing function
    v_new_deadline := public.calculate_cleaning_deadline(p_area_id, v_completion.scheduled_for);
    
    -- Update the deadline
    UPDATE public.haccp_cleaning_completions
    SET deadline_at = v_new_deadline
    WHERE id = v_completion.id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN v_updated_count;
END;
$$;

-- Trigger function to auto-recalculate when area deadline settings change
CREATE OR REPLACE FUNCTION public.trigger_recalculate_deadlines_on_area_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only recalculate if deadline-related fields changed
  IF (OLD.deadline_type IS DISTINCT FROM NEW.deadline_type OR
      OLD.deadline_time IS DISTINCT FROM NEW.deadline_time OR
      OLD.deadline_offset_hours IS DISTINCT FROM NEW.deadline_offset_hours) THEN
    
    PERFORM public.recalculate_pending_deadlines(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on haccp_cleaning_areas
DROP TRIGGER IF EXISTS trigger_area_deadline_update ON public.haccp_cleaning_areas;
CREATE TRIGGER trigger_area_deadline_update
AFTER UPDATE ON public.haccp_cleaning_areas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_deadlines_on_area_update();

-- Immediate fix: Recalculate all existing pending deadlines
DO $$
DECLARE
  v_area RECORD;
  v_count INTEGER;
BEGIN
  FOR v_area IN SELECT id FROM public.haccp_cleaning_areas WHERE is_active = true
  LOOP
    v_count := public.recalculate_pending_deadlines(v_area.id);
    IF v_count > 0 THEN
      RAISE NOTICE 'Recalculated % pending deadlines for area %', v_count, v_area.id;
    END IF;
  END LOOP;
END $$;