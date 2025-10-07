-- Phase 3: Drop user_profiles table
-- Verifica che profiles abbia dati prima di procedere

DO $$
DECLARE
  profiles_count INTEGER;
BEGIN
  -- Conta records in profiles per sicurezza
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  
  IF profiles_count = 0 THEN
    RAISE EXCEPTION 'ABORT: profiles table is empty. Cannot proceed with dropping user_profiles.';
  END IF;
  
  RAISE NOTICE 'Safety check passed: profiles table has % records', profiles_count;
END $$;

-- Drop user_profiles table and all dependencies
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Log the operation
COMMENT ON TABLE public.profiles IS 'Consolidated user profile table (formerly split between profiles and user_profiles)';