-- =========================================
-- HACCP Module Complete Migration
-- =========================================

-- 1. Insert HACCP Permissions
INSERT INTO permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  perm.name,
  perm.display_name,
  'haccp' as category,
  perm.description
FROM organizations o
CROSS JOIN (
  VALUES 
    ('haccp:view', 'View HACCP', 'View HACCP dashboard and tasks'),
    ('haccp:check', 'Execute HACCP Tasks', 'Execute and complete HACCP tasks'),
    ('haccp:sign', 'Sign HACCP Tasks', 'Sign and approve HACCP tasks'),
    ('haccp:export', 'Export HACCP Reports', 'Export HACCP reports and data'),
    ('haccp:manage', 'Manage HACCP', 'Manage HACCP templates and configuration')
) AS perm(name, display_name, description)
ON CONFLICT (org_id, name) DO NOTHING;

-- 2. Create HACCP Equipment table
CREATE TABLE IF NOT EXISTS haccp_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL, -- 'fridge', 'freezer', 'oven', 'storage', etc.
  code TEXT, -- equipment code/identifier
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  temperature_min NUMERIC,
  temperature_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'maintenance', 'inactive'
  notes TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_haccp_equipment_org_location ON haccp_equipment(org_id, location_id);
CREATE INDEX idx_haccp_equipment_type ON haccp_equipment(equipment_type);
CREATE INDEX idx_haccp_equipment_status ON haccp_equipment(status);

ALTER TABLE haccp_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_equipment_select" ON haccp_equipment
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "haccp_equipment_insert" ON haccp_equipment
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

CREATE POLICY "haccp_equipment_update" ON haccp_equipment
  FOR UPDATE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

CREATE POLICY "haccp_equipment_delete" ON haccp_equipment
  FOR DELETE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- 3. Create HACCP Templates table
CREATE TABLE IF NOT EXISTS haccp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- 'temperature', 'cleaning', 'inspection', 'maintenance'
  checklist_items JSONB NOT NULL DEFAULT '[]',
  recurrence_type TEXT, -- 'hourly', 'daily', 'weekly', 'monthly', null for one-time
  recurrence_interval INTEGER DEFAULT 1,
  execution_window_minutes INTEGER DEFAULT 60,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  equipment_id UUID REFERENCES haccp_equipment(id) ON DELETE SET NULL,
  area TEXT,
  assigned_role TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_haccp_templates_org_location ON haccp_templates(org_id, location_id);
CREATE INDEX idx_haccp_templates_type ON haccp_templates(task_type);
CREATE INDEX idx_haccp_templates_active ON haccp_templates(active);
CREATE INDEX idx_haccp_templates_equipment ON haccp_templates(equipment_id);

ALTER TABLE haccp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_templates_select" ON haccp_templates
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "haccp_templates_insert" ON haccp_templates
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

CREATE POLICY "haccp_templates_update" ON haccp_templates
  FOR UPDATE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

CREATE POLICY "haccp_templates_delete" ON haccp_templates
  FOR DELETE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- 4. Create HACCP Tasks table
CREATE TABLE IF NOT EXISTS haccp_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES haccp_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]',
  due_at TIMESTAMPTZ NOT NULL,
  execution_window_minutes INTEGER DEFAULT 60,
  priority TEXT NOT NULL DEFAULT 'medium',
  equipment_id UUID REFERENCES haccp_equipment(id) ON DELETE SET NULL,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  signature_data TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_haccp_tasks_org_location ON haccp_tasks(org_id, location_id);
CREATE INDEX idx_haccp_tasks_template ON haccp_tasks(template_id);
CREATE INDEX idx_haccp_tasks_status ON haccp_tasks(status);
CREATE INDEX idx_haccp_tasks_due_at ON haccp_tasks(due_at);
CREATE INDEX idx_haccp_tasks_assigned ON haccp_tasks(assigned_to);
CREATE INDEX idx_haccp_tasks_equipment ON haccp_tasks(equipment_id);

ALTER TABLE haccp_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_tasks_select" ON haccp_tasks
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "haccp_tasks_insert" ON haccp_tasks
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    (user_has_permission(auth.uid(), 'haccp:manage') OR user_has_permission(auth.uid(), 'haccp:check'))
  );

CREATE POLICY "haccp_tasks_update" ON haccp_tasks
  FOR UPDATE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    (user_has_permission(auth.uid(), 'haccp:manage') OR user_has_permission(auth.uid(), 'haccp:check'))
  );

CREATE POLICY "haccp_tasks_delete" ON haccp_tasks
  FOR DELETE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- 5. Create HACCP Evidences table
CREATE TABLE IF NOT EXISTS haccp_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES haccp_tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_haccp_evidences_task ON haccp_evidences(task_id);
CREATE INDEX idx_haccp_evidences_org_location ON haccp_evidences(org_id, location_id);

ALTER TABLE haccp_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_evidences_select" ON haccp_evidences
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "haccp_evidences_insert" ON haccp_evidences
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:check')
  );

CREATE POLICY "haccp_evidences_delete" ON haccp_evidences
  FOR DELETE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    (user_has_permission(auth.uid(), 'haccp:manage') OR uploaded_by = auth.uid())
  );

-- 6. Create HACCP Temperature Logs table
CREATE TABLE IF NOT EXISTS haccp_temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES haccp_equipment(id) ON DELETE CASCADE,
  task_id UUID REFERENCES haccp_tasks(id) ON DELETE SET NULL,
  temperature NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT '°C',
  is_within_range BOOLEAN NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_haccp_temp_logs_equipment ON haccp_temperature_logs(equipment_id);
CREATE INDEX idx_haccp_temp_logs_task ON haccp_temperature_logs(task_id);
CREATE INDEX idx_haccp_temp_logs_org_location ON haccp_temperature_logs(org_id, location_id);
CREATE INDEX idx_haccp_temp_logs_recorded_at ON haccp_temperature_logs(recorded_at);

ALTER TABLE haccp_temperature_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_temp_logs_select" ON haccp_temperature_logs
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "haccp_temp_logs_insert" ON haccp_temperature_logs
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:check')
  );

CREATE POLICY "haccp_temp_logs_update" ON haccp_temperature_logs
  FOR UPDATE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

CREATE POLICY "haccp_temp_logs_delete" ON haccp_temperature_logs
  FOR DELETE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- 7. Create HACCP Corrective Actions table
CREATE TABLE IF NOT EXISTS haccp_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES haccp_tasks(id) ON DELETE CASCADE,
  temperature_log_id UUID REFERENCES haccp_temperature_logs(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_haccp_corrective_actions_task ON haccp_corrective_actions(task_id);
CREATE INDEX idx_haccp_corrective_actions_temp_log ON haccp_corrective_actions(temperature_log_id);
CREATE INDEX idx_haccp_corrective_actions_org_location ON haccp_corrective_actions(org_id, location_id);
CREATE INDEX idx_haccp_corrective_actions_status ON haccp_corrective_actions(status);

ALTER TABLE haccp_corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_corrective_actions_select" ON haccp_corrective_actions
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "haccp_corrective_actions_insert" ON haccp_corrective_actions
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:check')
  );

CREATE POLICY "haccp_corrective_actions_update" ON haccp_corrective_actions
  FOR UPDATE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    (user_has_permission(auth.uid(), 'haccp:manage') OR user_has_permission(auth.uid(), 'haccp:check'))
  );

CREATE POLICY "haccp_corrective_actions_delete" ON haccp_corrective_actions
  FOR DELETE USING (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- 8. Create triggers for updated_at
CREATE TRIGGER haccp_equipment_updated_at BEFORE UPDATE ON haccp_equipment
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER haccp_templates_updated_at BEFORE UPDATE ON haccp_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER haccp_tasks_updated_at BEFORE UPDATE ON haccp_tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 9. Insert seed data: 3 example templates for first organization
DO $$
DECLARE
  first_org UUID;
  first_location UUID;
  fridge_equipment UUID;
BEGIN
  -- Get first org and location
  SELECT org_id INTO first_org FROM organizations ORDER BY created_at LIMIT 1;
  SELECT id INTO first_location FROM locations WHERE org_id = first_org ORDER BY created_at LIMIT 1;

  IF first_org IS NOT NULL AND first_location IS NOT NULL THEN
    -- Create sample fridge equipment
    INSERT INTO haccp_equipment (org_id, location_id, name, equipment_type, temperature_min, temperature_max, status)
    VALUES (first_org, first_location, 'Main Refrigerator', 'fridge', 0, 4, 'active')
    RETURNING id INTO fridge_equipment;

    -- Template 1: Temperature check
    INSERT INTO haccp_templates (org_id, location_id, name, description, task_type, checklist_items, recurrence_type, recurrence_interval, priority, requires_signature, equipment_id)
    VALUES (
      first_org, 
      first_location,
      'Daily Temperature Check',
      'Check refrigerator temperature twice daily',
      'temperature',
      '[{"id":"1","label":"Check temperature display","required":true},{"id":"2","label":"Record temperature","required":true},{"id":"3","label":"Check door seal","required":false}]'::jsonb,
      'daily',
      1,
      'high',
      true,
      fridge_equipment
    );

    -- Template 2: Cleaning
    INSERT INTO haccp_templates (org_id, location_id, name, description, task_type, checklist_items, recurrence_type, recurrence_interval, priority, requires_photo, area)
    VALUES (
      first_org,
      first_location,
      'Kitchen Deep Clean',
      'Weekly deep cleaning of kitchen area',
      'cleaning',
      '[{"id":"1","label":"Clean work surfaces","required":true},{"id":"2","label":"Sanitize equipment","required":true},{"id":"3","label":"Mop floors","required":true},{"id":"4","label":"Empty waste bins","required":true}]'::jsonb,
      'weekly',
      1,
      'medium',
      true,
      'Kitchen'
    );

    -- Template 3: Inspection
    INSERT INTO haccp_templates (org_id, location_id, name, description, task_type, checklist_items, recurrence_type, recurrence_interval, priority, requires_signature, requires_photo, area)
    VALUES (
      first_org,
      first_location,
      'Monthly Safety Inspection',
      'Monthly comprehensive safety and hygiene inspection',
      'inspection',
      '[{"id":"1","label":"Check fire extinguishers","required":true},{"id":"2","label":"Inspect first aid kit","required":true},{"id":"3","label":"Check pest control","required":true},{"id":"4","label":"Review HACCP logs","required":true},{"id":"5","label":"Staff hygiene audit","required":true}]'::jsonb,
      'monthly',
      1,
      'critical',
      true,
      true,
      'All Areas'
    );
  END IF;
END $$;