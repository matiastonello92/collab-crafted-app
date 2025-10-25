-- Remove duplicate custom-named foreign keys on haccp_tasks
-- Keep only the standard-named ones (haccp_tasks_*_fkey)

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_completed_by;

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS fk_haccp_tasks_started_by;