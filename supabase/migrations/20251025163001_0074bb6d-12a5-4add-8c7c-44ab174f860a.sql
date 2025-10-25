-- Complete cleanup of all duplicate foreign keys in HACCP tables
-- Remove custom-named FKs (fk_*), keep standard-named ones (*_fkey)

-- haccp_tasks
ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_template;

-- haccp_evidences
ALTER TABLE public.haccp_evidences
  DROP CONSTRAINT IF EXISTS fk_haccp_evidences_task,
  DROP CONSTRAINT IF EXISTS fk_haccp_evidences_uploaded_by;

-- haccp_temperature_logs
ALTER TABLE public.haccp_temperature_logs
  DROP CONSTRAINT IF EXISTS fk_haccp_temp_logs_equipment,
  DROP CONSTRAINT IF EXISTS fk_haccp_temp_logs_task,
  DROP CONSTRAINT IF EXISTS fk_haccp_temp_logs_recorded_by;

-- haccp_corrective_actions
ALTER TABLE public.haccp_corrective_actions
  DROP CONSTRAINT IF EXISTS fk_haccp_corrective_task,
  DROP CONSTRAINT IF EXISTS fk_haccp_corrective_temp_log,
  DROP CONSTRAINT IF EXISTS fk_haccp_corrective_created_by,
  DROP CONSTRAINT IF EXISTS fk_haccp_corrective_resolved_by;

-- haccp_equipment
ALTER TABLE public.haccp_equipment
  DROP CONSTRAINT IF EXISTS fk_haccp_equipment_created_by;

-- haccp_templates
ALTER TABLE public.haccp_templates
  DROP CONSTRAINT IF EXISTS fk_haccp_templates_created_by;