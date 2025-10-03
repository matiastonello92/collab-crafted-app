-- Add foreign keys for recipes table to enable profile joins
ALTER TABLE recipes
  ADD CONSTRAINT recipes_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE recipes
  ADD CONSTRAINT recipes_submitted_by_fkey 
  FOREIGN KEY (submitted_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE recipes
  ADD CONSTRAINT recipes_published_by_fkey 
  FOREIGN KEY (published_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE recipes
  ADD CONSTRAINT recipes_archived_by_fkey 
  FOREIGN KEY (archived_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_submitted_by ON recipes(submitted_by);
CREATE INDEX IF NOT EXISTS idx_recipes_published_by ON recipes(published_by);
CREATE INDEX IF NOT EXISTS idx_recipes_archived_by ON recipes(archived_by);