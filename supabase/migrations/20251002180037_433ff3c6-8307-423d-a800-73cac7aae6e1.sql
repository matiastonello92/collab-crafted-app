-- Add missing columns to shift_assignments
ALTER TABLE public.shift_assignments 
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposed_at timestamptz;

-- Add email column to profiles for better query performance
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email text;

-- Sync email from auth.users to profiles (initial sync)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Create trigger function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile email when auth.users email changes
  UPDATE public.profiles 
  SET email = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email updates
DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email();

-- Also sync email on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_email
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email();

-- Add index on profiles.email for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

COMMENT ON COLUMN public.shift_assignments.assigned_at IS 'Timestamp when shift was assigned to user';
COMMENT ON COLUMN public.shift_assignments.proposed_at IS 'Timestamp when shift was proposed to user';
COMMENT ON COLUMN public.profiles.email IS 'User email synced from auth.users';