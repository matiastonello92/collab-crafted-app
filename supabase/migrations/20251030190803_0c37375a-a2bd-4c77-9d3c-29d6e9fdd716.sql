-- Add collaboration support to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS collaborator_ids UUID[] DEFAULT '{}';

-- Create recipe collaboration requests table
CREATE TABLE IF NOT EXISTS recipe_collaboration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  UNIQUE(recipe_id, requester_id)
);

-- Enable RLS
ALTER TABLE recipe_collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own collaboration requests" ON recipe_collaboration_requests
  FOR SELECT USING (
    requester_id = auth.uid()
  );

-- Recipe creators/admins/managers can view all requests for their recipes
CREATE POLICY "Recipe managers can view collaboration requests" ON recipe_collaboration_requests
  FOR SELECT USING (
    user_has_permission(auth.uid(), 'recipes:manage') OR
    EXISTS (
      SELECT 1 FROM recipes r 
      WHERE r.id = recipe_id AND r.created_by = auth.uid()
    )
  );

-- Users can create collaboration requests
CREATE POLICY "Users can create collaboration requests" ON recipe_collaboration_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid() AND
    user_in_org(org_id) AND
    user_in_location(location_id) AND
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_id AND r.status = 'draft' AND r.created_by != auth.uid()
    )
  );

-- Creators/admins/managers can update requests
CREATE POLICY "Recipe managers can update collaboration requests" ON recipe_collaboration_requests
  FOR UPDATE USING (
    user_has_permission(auth.uid(), 'recipes:manage') OR
    EXISTS (
      SELECT 1 FROM recipes r 
      WHERE r.id = recipe_id AND r.created_by = auth.uid()
    )
  );

-- Update recipes RLS to allow collaborators to edit
CREATE POLICY "Collaborators can update draft recipes" ON recipes
  FOR UPDATE USING (
    status = 'draft' AND
    auth.uid() = ANY(collaborator_ids)
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_recipe ON recipe_collaboration_requests(recipe_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_status ON recipe_collaboration_requests(status);
CREATE INDEX IF NOT EXISTS idx_recipes_collaborators ON recipes USING GIN(collaborator_ids);