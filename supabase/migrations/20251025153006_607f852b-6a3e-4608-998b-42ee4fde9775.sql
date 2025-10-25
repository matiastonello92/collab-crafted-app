-- Add foreign keys to haccp_tasks for data integrity and better query performance

-- Add foreign keys to haccp_tasks
ALTER TABLE public.haccp_tasks
  ADD CONSTRAINT fk_haccp_tasks_equipment FOREIGN KEY (equipment_id) 
    REFERENCES public.haccp_equipment(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_tasks_assigned_to FOREIGN KEY (assigned_to) 
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_tasks_template FOREIGN KEY (template_id) 
    REFERENCES public.haccp_templates(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_tasks_started_by FOREIGN KEY (started_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_tasks_completed_by FOREIGN KEY (completed_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign keys to haccp_evidences
ALTER TABLE public.haccp_evidences
  ADD CONSTRAINT fk_haccp_evidences_task FOREIGN KEY (task_id) 
    REFERENCES public.haccp_tasks(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_haccp_evidences_uploaded_by FOREIGN KEY (uploaded_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign keys to haccp_temperature_logs
ALTER TABLE public.haccp_temperature_logs
  ADD CONSTRAINT fk_haccp_temp_logs_equipment FOREIGN KEY (equipment_id) 
    REFERENCES public.haccp_equipment(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_haccp_temp_logs_task FOREIGN KEY (task_id) 
    REFERENCES public.haccp_tasks(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_temp_logs_recorded_by FOREIGN KEY (recorded_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign keys to haccp_corrective_actions
ALTER TABLE public.haccp_corrective_actions
  ADD CONSTRAINT fk_haccp_corrective_task FOREIGN KEY (task_id) 
    REFERENCES public.haccp_tasks(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_haccp_corrective_temp_log FOREIGN KEY (temperature_log_id) 
    REFERENCES public.haccp_temperature_logs(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_corrective_created_by FOREIGN KEY (created_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_haccp_corrective_resolved_by FOREIGN KEY (resolved_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key to haccp_equipment
ALTER TABLE public.haccp_equipment
  ADD CONSTRAINT fk_haccp_equipment_created_by FOREIGN KEY (created_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key to haccp_templates
ALTER TABLE public.haccp_templates
  ADD CONSTRAINT fk_haccp_templates_created_by FOREIGN KEY (created_by) 
    REFERENCES public.profiles(id) ON DELETE SET NULL;