-- Fix missing foreign key constraints on recipe_collaboration_requests table
-- This resolves PGRST200 errors when joining with profiles table

ALTER TABLE recipe_collaboration_requests
  ADD CONSTRAINT recipe_collaboration_requests_requester_id_fkey 
  FOREIGN KEY (requester_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE recipe_collaboration_requests
  ADD CONSTRAINT recipe_collaboration_requests_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;