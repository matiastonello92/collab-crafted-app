-- Add source column to shifts table to distinguish planned vs actual shifts
ALTER TABLE shifts
ADD COLUMN source TEXT NOT NULL DEFAULT 'planned' 
CHECK (source IN ('planned', 'actual'));

-- Index for fast filtering by source
CREATE INDEX idx_shifts_source ON shifts(source);

-- Comment for documentation
COMMENT ON COLUMN shifts.source IS 'planned: manager-created in planner, actual: created/updated from kiosk clock-in/out';