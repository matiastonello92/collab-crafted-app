-- Seed default leave types for organizations
-- This script creates standard leave types for each organization

DO $$
DECLARE
  org RECORD;
BEGIN
  -- Loop through all organizations
  FOR org IN SELECT org_id FROM organizations LOOP
    
    -- Insert default leave types if they don't exist
    INSERT INTO leave_types (org_id, key, label, color, requires_approval, is_active)
    VALUES 
      (org.org_id, 'annual_leave', 'Ferie', '#10b981', true, true),
      (org.org_id, 'sick_leave', 'Malattia', '#ef4444', false, true),
      (org.org_id, 'personal_leave', 'Permesso Personale', '#3b82f6', true, true),
      (org.org_id, 'unpaid_leave', 'Permesso Non Retribuito', '#6b7280', true, true),
      (org.org_id, 'study_leave', 'Permesso Studio', '#8b5cf6', true, true)
    ON CONFLICT (org_id, key) DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE 'Default leave types seeded for all organizations';
END $$;
