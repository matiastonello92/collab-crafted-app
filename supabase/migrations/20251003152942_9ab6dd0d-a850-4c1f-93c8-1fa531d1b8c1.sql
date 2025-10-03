-- Create leaves table for definitive absences (manager-created or approved requests)
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  notes TEXT,
  created_by UUID NOT NULL, -- manager or system (approval)
  created_from_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS leaves_org_location_idx ON public.leaves(org_id, location_id);
CREATE INDEX IF NOT EXISTS leaves_user_dates_idx ON public.leaves(user_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS leaves_location_dates_idx ON public.leaves(location_id, start_at, end_at);

-- Enable RLS
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaves

-- SELECT: Anyone in org/location can view leaves
CREATE POLICY "leaves_select"
ON public.leaves
FOR SELECT
USING (
  is_platform_admin() 
  OR user_in_org(org_id) AND user_in_location(location_id)
);

-- INSERT: Only managers with shifts:manage or system (via service role)
CREATE POLICY "leaves_insert"
ON public.leaves
FOR INSERT
WITH CHECK (
  is_platform_admin()
  OR (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'shifts:manage')
  )
);

-- DELETE: Only the user who owns the leave (user_id = auth.uid())
CREATE POLICY "leaves_delete"
ON public.leaves
FOR DELETE
USING (
  is_platform_admin()
  OR user_id = auth.uid()
);

-- UPDATE: No one can update leaves (immutable once created)
-- No UPDATE policy = no one can update

-- Trigger for updated_at
CREATE TRIGGER leaves_updated_at
BEFORE UPDATE ON public.leaves
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Add column to leave_requests to track conversion
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS converted_to_leave_id UUID REFERENCES public.leaves(id) ON DELETE SET NULL;

-- Add coherence trigger
CREATE TRIGGER leaves_enforce_org_location_coherence
BEFORE INSERT OR UPDATE ON public.leaves
FOR EACH ROW
EXECUTE FUNCTION enforce_org_location_coherence();