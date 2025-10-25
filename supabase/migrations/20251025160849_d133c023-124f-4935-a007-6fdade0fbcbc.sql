-- Remove duplicate foreign keys from haccp_tasks table
-- These were manually added but already existed from CREATE TABLE statement

-- Remove duplicate FK for equipment_id (fixes PGRST201 error)
ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_equipment;

-- Remove other duplicate FKs added in the same migration
ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_assigned_to;

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_template;

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_location;

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_org;

-- Note: Standard auto-generated FKs remain:
-- - haccp_tasks_equipment_id_fkey
-- - haccp_tasks_assigned_to_fkey
-- - haccp_tasks_template_id_fkey
-- - haccp_tasks_location_id_fkey
-- - haccp_tasks_org_id_fkey