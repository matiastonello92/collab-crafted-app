-- Add shift_id column to time_correction_requests for shift-based corrections
ALTER TABLE time_correction_requests
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_time_corrections_shift_id 
  ON time_correction_requests(shift_id) 
  WHERE shift_id IS NOT NULL;

-- Add check: either event_id OR shift_id must be present (not both, not neither)
ALTER TABLE time_correction_requests
DROP CONSTRAINT IF EXISTS chk_correction_target;

ALTER TABLE time_correction_requests
ADD CONSTRAINT chk_correction_target 
  CHECK (
    (event_id IS NOT NULL AND shift_id IS NULL) OR 
    (event_id IS NULL AND shift_id IS NOT NULL)
  );

COMMENT ON COLUMN time_correction_requests.shift_id IS 'For "forgot to clock in" corrections - links to shift.actual_start_at';