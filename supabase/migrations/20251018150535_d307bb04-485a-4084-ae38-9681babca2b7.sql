-- Step 1: Convert all non-assigned statuses to 'assigned'
UPDATE shift_assignments
SET status = 'assigned'
WHERE status IN ('proposed', 'accepted', 'confirmed');

-- Step 2: Populate assigned_at if null (use created_at as fallback)
UPDATE shift_assignments
SET assigned_at = COALESCE(assigned_at, created_at)
WHERE assigned_at IS NULL;

-- Step 3: Add assigned_by column if not exists
ALTER TABLE shift_assignments
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id);

-- Step 4: Drop obsolete columns
ALTER TABLE shift_assignments
DROP COLUMN IF EXISTS proposed_at,
DROP COLUMN IF EXISTS responded_at,
DROP COLUMN IF EXISTS acknowledged_at,
DROP COLUMN IF EXISTS published_at;

-- Step 5: Make assigned_at NOT NULL
ALTER TABLE shift_assignments
ALTER COLUMN assigned_at SET NOT NULL;

-- Step 6: Remove old status check constraint
ALTER TABLE shift_assignments 
DROP CONSTRAINT IF EXISTS shift_assignments_status_check;

-- Step 7: Add new constraint (only 'assigned' status allowed)
ALTER TABLE shift_assignments
ADD CONSTRAINT shift_assignments_status_check 
CHECK (status = 'assigned');

-- Step 8: Create index on assigned_by for performance
CREATE INDEX IF NOT EXISTS idx_shift_assignments_assigned_by 
ON shift_assignments(assigned_by);