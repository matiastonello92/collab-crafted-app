-- Fix user-related foreign keys on haccp_tasks
-- All user references must point to profiles table, not auth.users

-- Drop existing FKs to auth.users
ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS haccp_tasks_assigned_to_fkey CASCADE;

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS haccp_tasks_started_by_fkey CASCADE;

ALTER TABLE public.haccp_tasks
  DROP CONSTRAINT IF EXISTS haccp_tasks_completed_by_fkey CASCADE;

-- Add correct FKs to profiles
ALTER TABLE public.haccp_tasks
  ADD CONSTRAINT haccp_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.haccp_tasks
  ADD CONSTRAINT haccp_tasks_started_by_fkey
  FOREIGN KEY (started_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.haccp_tasks
  ADD CONSTRAINT haccp_tasks_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;