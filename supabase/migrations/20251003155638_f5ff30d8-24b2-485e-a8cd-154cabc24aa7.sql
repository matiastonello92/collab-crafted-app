-- Add foreign key constraints from user_id columns to profiles table
-- This enables PostgREST to auto-detect relationships for joins
-- Using conditional blocks to avoid "already exists" errors

-- Add FK: leaves.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leaves_user_id_fkey'
  ) THEN
    ALTER TABLE public.leaves 
    ADD CONSTRAINT leaves_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add FK: leave_requests.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leave_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.leave_requests 
    ADD CONSTRAINT leave_requests_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add FK: shifts.assigned_to -> profiles.id (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shifts' 
    AND column_name = 'assigned_to'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shifts_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.shifts 
    ADD CONSTRAINT shifts_assigned_to_fkey 
    FOREIGN KEY (assigned_to) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add FK: availability.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'availability_user_id_fkey'
  ) THEN
    ALTER TABLE public.availability 
    ADD CONSTRAINT availability_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add FK: leave_requests.approver_id -> profiles.id (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leave_requests' 
    AND column_name = 'approver_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leave_requests_approver_id_fkey'
  ) THEN
    ALTER TABLE public.leave_requests 
    ADD CONSTRAINT leave_requests_approver_id_fkey 
    FOREIGN KEY (approver_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON public.leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_user_id ON public.availability(user_id);