-- Step 1: Time Correction Requests Table
CREATE TABLE IF NOT EXISTS public.time_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.time_clock_events(id) ON DELETE CASCADE,
  original_time TIMESTAMPTZ,
  requested_time TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for time_correction_requests
ALTER TABLE public.time_correction_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests
CREATE POLICY "time_correction_requests_select_own"
ON public.time_correction_requests
FOR SELECT
USING (user_id = auth.uid() OR is_platform_admin() OR user_has_permission(auth.uid(), 'timeclock:manage'));

-- Employees can create their own requests
CREATE POLICY "time_correction_requests_insert_own"
ON public.time_correction_requests
FOR INSERT
WITH CHECK (user_id = auth.uid() AND user_in_org(org_id));

-- Only managers can update (approve/reject)
CREATE POLICY "time_correction_requests_update_manager"
ON public.time_correction_requests
FOR UPDATE
USING (is_platform_admin() OR user_has_permission(auth.uid(), 'timeclock:manage'));

-- Trigger for updated_at
CREATE TRIGGER tg_time_correction_requests_updated_at
BEFORE UPDATE ON public.time_correction_requests
FOR EACH ROW
EXECUTE FUNCTION public.tg_touch_updated_at();

-- Step 2: Add PIN code column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pin_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_pin_code ON public.profiles(pin_code) WHERE pin_code IS NOT NULL;

-- Add kiosk_token to time_clock_events for anti-spoofing
ALTER TABLE public.time_clock_events
ADD COLUMN IF NOT EXISTS kiosk_token TEXT;