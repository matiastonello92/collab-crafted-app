-- Add grid coordinate columns to user_dashboard_widgets table
ALTER TABLE public.user_dashboard_widgets
ADD COLUMN IF NOT EXISTS grid_x INTEGER,
ADD COLUMN IF NOT EXISTS grid_y INTEGER,
ADD COLUMN IF NOT EXISTS grid_w INTEGER,
ADD COLUMN IF NOT EXISTS grid_h INTEGER DEFAULT 1;

-- Add comment to explain the columns
COMMENT ON COLUMN public.user_dashboard_widgets.grid_x IS 'Grid column position (0-based)';
COMMENT ON COLUMN public.user_dashboard_widgets.grid_y IS 'Grid row position (0-based)';
COMMENT ON COLUMN public.user_dashboard_widgets.grid_w IS 'Widget width in grid columns';
COMMENT ON COLUMN public.user_dashboard_widgets.grid_h IS 'Widget height in grid rows (default 1)';

-- Create index for faster grid queries
CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_grid 
ON public.user_dashboard_widgets(user_id, grid_y, grid_x);