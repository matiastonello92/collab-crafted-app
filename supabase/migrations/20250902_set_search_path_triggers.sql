-- Ensure trigger functions run with the public schema in scope
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
