-- Create table for tracking individual item completions
CREATE TABLE public.haccp_cleaning_item_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id UUID NOT NULL REFERENCES public.haccp_cleaning_completions(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  completed_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  UNIQUE(completion_id, item_id, completed_by)
);

-- Add RLS policies
ALTER TABLE public.haccp_cleaning_item_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view item completions in their location"
  ON public.haccp_cleaning_item_completions
  FOR SELECT
  USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'haccp:view'))
  );

CREATE POLICY "Users can add item completions"
  ON public.haccp_cleaning_item_completions
  FOR INSERT
  WITH CHECK (
    user_in_org(org_id) AND 
    user_in_location(location_id) AND 
    user_has_permission(auth.uid(), 'haccp:check') AND
    completed_by = auth.uid()
  );

CREATE POLICY "Users can remove their own item completions"
  ON public.haccp_cleaning_item_completions
  FOR DELETE
  USING (
    completed_by = auth.uid() AND
    user_in_org(org_id) AND 
    user_in_location(location_id)
  );

-- Add indexes for performance
CREATE INDEX idx_item_completions_completion_id ON public.haccp_cleaning_item_completions(completion_id);
CREATE INDEX idx_item_completions_completed_by ON public.haccp_cleaning_item_completions(completed_by);

-- Add columns to haccp_cleaning_completions
ALTER TABLE public.haccp_cleaning_completions 
  ADD COLUMN completion_type TEXT DEFAULT 'full' CHECK (completion_type IN ('full', 'partial')),
  ADD COLUMN partial_completion_reason TEXT;

-- Enable realtime for collaborative updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.haccp_cleaning_item_completions;