-- Drop incorrect foreign key (references auth.users)
ALTER TABLE public.haccp_cleaning_item_completions
  DROP CONSTRAINT IF EXISTS fk_item_completions_completed_by;

-- Add correct foreign key (references public.profiles)
ALTER TABLE public.haccp_cleaning_item_completions
  ADD CONSTRAINT fk_item_completions_completed_by
  FOREIGN KEY (completed_by) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';