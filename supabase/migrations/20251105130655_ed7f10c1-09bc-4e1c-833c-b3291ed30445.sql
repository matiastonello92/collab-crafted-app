-- =====================================================
-- STEP 1: Extend haccp_cleaning_areas schema
-- =====================================================
ALTER TABLE public.haccp_cleaning_areas
ADD COLUMN IF NOT EXISTS deadline_type TEXT DEFAULT 'end_of_period' CHECK (deadline_type IN ('end_of_period', 'custom_time')),
ADD COLUMN IF NOT EXISTS deadline_time TIME DEFAULT '23:59:00',
ADD COLUMN IF NOT EXISTS deadline_offset_hours INTEGER DEFAULT 0;

COMMENT ON COLUMN public.haccp_cleaning_areas.deadline_type IS 'Type of deadline: end_of_period (default) or custom_time';
COMMENT ON COLUMN public.haccp_cleaning_areas.deadline_time IS 'Custom deadline time (HH:MM:SS), used when deadline_type = custom_time';
COMMENT ON COLUMN public.haccp_cleaning_areas.deadline_offset_hours IS 'Hours offset for deadline (e.g., +3 for next day 3am)';

-- =====================================================
-- STEP 2: Extend haccp_cleaning_completions schema
-- =====================================================
ALTER TABLE public.haccp_cleaning_completions
ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;

-- Add 'missed' to status check constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'haccp_cleaning_completions_status_check_extended'
  ) THEN
    ALTER TABLE public.haccp_cleaning_completions 
    DROP CONSTRAINT IF EXISTS haccp_cleaning_completions_status_check;
    
    ALTER TABLE public.haccp_cleaning_completions
    ADD CONSTRAINT haccp_cleaning_completions_status_check_extended 
    CHECK (status IN ('pending', 'completed', 'skipped', 'overdue', 'missed'));
  END IF;
END $$;

-- =====================================================
-- STEP 3: Function to calculate deadline
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_cleaning_deadline(
  p_area_id UUID,
  p_scheduled_for TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_area RECORD;
  v_deadline TIMESTAMPTZ;
  v_base_date TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_area 
  FROM haccp_cleaning_areas 
  WHERE id = p_area_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Area % not found', p_area_id;
  END IF;
  
  IF v_area.deadline_type = 'custom_time' THEN
    v_base_date := date_trunc('day', p_scheduled_for) + v_area.deadline_time::TIME;
    v_deadline := v_base_date + (v_area.deadline_offset_hours || ' hours')::INTERVAL;
  ELSE
    CASE v_area.cleaning_frequency
      WHEN 'daily' THEN
        v_deadline := date_trunc('day', p_scheduled_for) + INTERVAL '1 day' - INTERVAL '1 minute';
      WHEN 'weekly' THEN
        v_deadline := date_trunc('week', p_scheduled_for) + INTERVAL '7 days' - INTERVAL '1 minute';
      WHEN 'monthly' THEN
        v_deadline := date_trunc('month', p_scheduled_for) + INTERVAL '1 month' - INTERVAL '1 minute';
      ELSE
        RAISE EXCEPTION 'Invalid frequency: %', v_area.cleaning_frequency;
    END CASE;
  END IF;
  
  RETURN v_deadline;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 4: Generate next cleaning task (ONE per area)
-- =====================================================
CREATE OR REPLACE FUNCTION generate_next_cleaning_task(
  p_area_id UUID
) RETURNS UUID AS $$
DECLARE
  v_area RECORD;
  v_existing_active INT;
  v_next_scheduled_date TIMESTAMPTZ;
  v_deadline_at TIMESTAMPTZ;
  v_new_completion_id UUID;
BEGIN
  SELECT * INTO v_area 
  FROM haccp_cleaning_areas 
  WHERE id = p_area_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  SELECT COUNT(*) INTO v_existing_active
  FROM haccp_cleaning_completions
  WHERE area_id = p_area_id
    AND status IN ('pending', 'overdue');
  
  IF v_existing_active > 0 THEN
    RETURN NULL;
  END IF;
  
  CASE v_area.cleaning_frequency
    WHEN 'daily' THEN
      v_next_scheduled_date := date_trunc('day', now());
    WHEN 'weekly' THEN
      v_next_scheduled_date := date_trunc('week', now());
    WHEN 'monthly' THEN
      v_next_scheduled_date := date_trunc('month', now());
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', v_area.cleaning_frequency;
  END CASE;
  
  v_deadline_at := calculate_cleaning_deadline(p_area_id, v_next_scheduled_date);
  
  INSERT INTO haccp_cleaning_completions (
    area_id, org_id, location_id, scheduled_for, status, deadline_at
  ) VALUES (
    v_area.id, 
    v_area.org_id, 
    v_area.location_id, 
    v_next_scheduled_date,
    'pending',
    v_deadline_at
  )
  RETURNING id INTO v_new_completion_id;
  
  RETURN v_new_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 5: Close expired cleaning tasks
-- =====================================================
CREATE OR REPLACE FUNCTION close_expired_cleaning_tasks()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE haccp_cleaning_completions
  SET status = 'missed'
  WHERE status IN ('pending', 'overdue')
    AND deadline_at < now()
    AND completed_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 6: Trigger - Auto-generate initial task on area creation
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_create_initial_cleaning_task()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    PERFORM generate_next_cleaning_task(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_initial_cleaning_task ON haccp_cleaning_areas;
CREATE TRIGGER auto_create_initial_cleaning_task
AFTER INSERT ON haccp_cleaning_areas
FOR EACH ROW
EXECUTE FUNCTION trigger_create_initial_cleaning_task();

-- =====================================================
-- STEP 7: Trigger - Generate next task on completion
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_generate_next_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_area RECORD;
  v_next_scheduled_date TIMESTAMPTZ;
  v_deadline_at TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IN ('pending', 'overdue') THEN
    
    UPDATE haccp_cleaning_completions
    SET status = 'missed'
    WHERE area_id = NEW.area_id
      AND id != NEW.id
      AND status IN ('pending', 'overdue')
      AND deadline_at < now();
    
    SELECT * INTO v_area 
    FROM haccp_cleaning_areas 
    WHERE id = NEW.area_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    CASE v_area.cleaning_frequency
      WHEN 'daily' THEN
        v_next_scheduled_date := date_trunc('day', COALESCE(NEW.completed_at, now()) + INTERVAL '1 day');
      WHEN 'weekly' THEN
        v_next_scheduled_date := date_trunc('week', COALESCE(NEW.completed_at, now()) + INTERVAL '1 week');
      WHEN 'monthly' THEN
        v_next_scheduled_date := date_trunc('month', COALESCE(NEW.completed_at, now()) + INTERVAL '1 month');
    END CASE;
    
    v_deadline_at := calculate_cleaning_deadline(NEW.area_id, v_next_scheduled_date);
    
    INSERT INTO haccp_cleaning_completions (
      area_id, org_id, location_id, scheduled_for, status, deadline_at
    )
    SELECT 
      NEW.area_id, 
      NEW.org_id, 
      NEW.location_id, 
      v_next_scheduled_date, 
      'pending',
      v_deadline_at
    WHERE NOT EXISTS (
      SELECT 1 FROM haccp_cleaning_completions
      WHERE area_id = NEW.area_id
        AND scheduled_for >= v_next_scheduled_date
        AND status IN ('pending', 'overdue')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_next_on_completion ON haccp_cleaning_completions;
CREATE TRIGGER auto_generate_next_on_completion
AFTER UPDATE ON haccp_cleaning_completions
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_next_on_completion();

GRANT EXECUTE ON FUNCTION calculate_cleaning_deadline(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_next_cleaning_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_expired_cleaning_tasks() TO authenticated;

DO $$
DECLARE
  completion_rec RECORD;
  v_deadline TIMESTAMPTZ;
BEGIN
  FOR completion_rec IN 
    SELECT id, area_id, scheduled_for 
    FROM haccp_cleaning_completions 
    WHERE deadline_at IS NULL
  LOOP
    BEGIN
      v_deadline := calculate_cleaning_deadline(completion_rec.area_id, completion_rec.scheduled_for);
      UPDATE haccp_cleaning_completions 
      SET deadline_at = v_deadline 
      WHERE id = completion_rec.id;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
END $$;