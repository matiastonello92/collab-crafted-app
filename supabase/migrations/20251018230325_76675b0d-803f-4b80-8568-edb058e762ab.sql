-- Add late justification fields to shifts table
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS late_justification TEXT,
ADD COLUMN IF NOT EXISTS late_justification_locked BOOLEAN DEFAULT false;

-- Create index for querying shifts with justifications
CREATE INDEX IF NOT EXISTS idx_shifts_late_justification 
  ON shifts(late_justification) 
  WHERE late_justification IS NOT NULL;

-- Add comments
COMMENT ON COLUMN shifts.late_justification IS 'Justification for late clock-in (non-editable once locked)';
COMMENT ON COLUMN shifts.late_justification_locked IS 'Prevents modification of late_justification';

-- Create trigger to prevent modification of locked justifications
CREATE OR REPLACE FUNCTION prevent_locked_justification_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.late_justification_locked = true 
     AND NEW.late_justification IS DISTINCT FROM OLD.late_justification THEN
    RAISE EXCEPTION 'Cannot modify locked late justification';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

DROP TRIGGER IF EXISTS trigger_prevent_justification_edit ON shifts;

CREATE TRIGGER trigger_prevent_justification_edit
BEFORE UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_justification_edit();