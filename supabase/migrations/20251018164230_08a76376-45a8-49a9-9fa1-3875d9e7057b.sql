-- Unify Shifts & Kiosk: Add planned/actual columns to shifts table
-- This makes shifts the single source of truth for both planner and kiosk

-- 1. Add new columns for planned and actual times
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS planned_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS planned_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS planned_break_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_break_minutes INTEGER DEFAULT 0;

-- 2. Add unified status column (replaces fragmented state logic)
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
  CHECK (status IN ('draft', 'assigned', 'in_progress', 'completed', 'cancelled'));

-- 3. Migrate existing data
UPDATE shifts 
SET 
  planned_start_at = start_at,
  planned_end_at = end_at,
  planned_break_minutes = COALESCE(break_minutes, 0),
  status = CASE 
    WHEN source = 'actual' THEN 'completed'
    WHEN source = 'planned' AND EXISTS (
      SELECT 1 FROM shift_assignments sa WHERE sa.shift_id = shifts.id
    ) THEN 'assigned'
    ELSE 'draft'
  END
WHERE planned_start_at IS NULL;

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_actual_start ON shifts(actual_start_at) 
  WHERE actual_start_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);