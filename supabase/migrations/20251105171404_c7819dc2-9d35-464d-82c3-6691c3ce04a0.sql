-- Add foreign key for completed_by (references auth.users)
ALTER TABLE public.haccp_cleaning_item_completions
  ADD CONSTRAINT fk_item_completions_completed_by
  FOREIGN KEY (completed_by) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Refresh schema cache (Supabase PostgREST)
NOTIFY pgrst, 'reload schema';