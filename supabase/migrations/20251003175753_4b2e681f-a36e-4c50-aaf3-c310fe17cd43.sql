-- Add missing foreign key constraint for recipe_service_notes.created_by
ALTER TABLE public.recipe_service_notes
  ADD CONSTRAINT recipe_service_notes_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;