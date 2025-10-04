-- Create user_dashboard_widgets table for widget preferences
CREATE TABLE IF NOT EXISTS public.user_dashboard_widgets (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  size TEXT DEFAULT 'medium',
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, widget_id)
);

-- Enable RLS
ALTER TABLE public.user_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only manage their own widgets
CREATE POLICY "Users can view own widgets"
  ON public.user_dashboard_widgets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widgets"
  ON public.user_dashboard_widgets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widgets"
  ON public.user_dashboard_widgets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widgets"
  ON public.user_dashboard_widgets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user 
  ON public.user_dashboard_widgets(user_id, position);