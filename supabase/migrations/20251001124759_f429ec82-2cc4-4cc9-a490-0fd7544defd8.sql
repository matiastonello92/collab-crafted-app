-- Phase 1: Email Notifications Infrastructure
-- Table: email_logs (audit trail for all sent emails)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'rota_published', 'shift_assignment_change', 'leave_decision'
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  provider_id TEXT, -- external provider message ID
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_email_logs_org_id ON public.email_logs(org_id);
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);

-- RLS policies for email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs_select_admin" ON public.email_logs
  FOR SELECT
  USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'view_settings'))
  );

CREATE POLICY "email_logs_insert_system" ON public.email_logs
  FOR INSERT
  WITH CHECK (user_in_org(org_id));

-- Extend profiles table with email preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{
  "rota_published": true,
  "shift_assignment_change": true,
  "leave_decision": true
}'::jsonb;

-- Comment for documentation
COMMENT ON TABLE public.email_logs IS 'Audit trail for all email notifications sent by the system';
COMMENT ON COLUMN public.profiles.email_preferences IS 'User opt-out preferences for email notification types';