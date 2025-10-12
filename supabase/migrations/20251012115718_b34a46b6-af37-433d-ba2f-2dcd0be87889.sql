-- Add first_name and last_name columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing full_name data (split on first space)
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL;

-- Update profile_update_self function to handle first_name and last_name
CREATE OR REPLACE FUNCTION public.profile_update_self(
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_locale text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_marketing_opt_in boolean DEFAULT NULL,
  p_notif_prefs jsonb DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  rec public.profiles;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  update public.profiles set
    first_name       = coalesce(p_first_name, first_name),
    last_name        = coalesce(p_last_name, last_name),
    -- Compute full_name for backward compatibility
    full_name        = coalesce(
      CASE 
        WHEN p_first_name IS NOT NULL OR p_last_name IS NOT NULL 
        THEN trim(coalesce(p_first_name, first_name, '') || ' ' || coalesce(p_last_name, last_name, ''))
        ELSE full_name
      END,
      full_name
    ),
    avatar_url       = coalesce(p_avatar_url, avatar_url),
    phone            = coalesce(p_phone, phone),
    locale           = coalesce(p_locale, locale),
    timezone         = coalesce(p_timezone, timezone),
    marketing_opt_in = coalesce(p_marketing_opt_in, marketing_opt_in),
    notif_prefs      = coalesce(p_notif_prefs, notif_prefs),
    updated_at       = now()
  where id = uid
  returning * into rec;

  if not found then
    insert into public.profiles(
      id, first_name, last_name, full_name, avatar_url, phone, 
      locale, timezone, marketing_opt_in, notif_prefs
    )
    values (
      uid, p_first_name, p_last_name,
      trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, '')),
      p_avatar_url, p_phone, p_locale, p_timezone,
      coalesce(p_marketing_opt_in, false), 
      coalesce(p_notif_prefs, '{}'::jsonb)
    )
    returning * into rec;
  end if;

  return rec;
end;
$function$;