-- Sprint 6: Add 'closure_report' email type

-- Check if email_logs table has a constraint on email_type
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_logs_email_type_check'
  ) THEN
    ALTER TABLE email_logs 
    DROP CONSTRAINT email_logs_email_type_check;
  END IF;
  
  -- Add new constraint with closure_report type
  ALTER TABLE email_logs 
  ADD CONSTRAINT email_logs_email_type_check 
  CHECK (email_type IN (
    'rota_published', 
    'shift_assignment_change', 
    'leave_decision', 
    'invitation',
    'closure_report'
  ));
END $$;

-- Add comment for documentation
COMMENT ON COLUMN email_logs.email_type IS 'Type of email sent: rota_published, shift_assignment_change, leave_decision, invitation, closure_report';