-- 004_location_admin_system.sql

-- 1. Funzione RLS per verificare se utente è location admin
CREATE OR REPLACE FUNCTION public.user_is_location_admin(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.location_admins la
    WHERE la.user_id = auth.uid() 
      AND la.location_id = p_location_id
  );
$$;

-- 2. Trigger function per auto-assegnazione location admin
CREATE OR REPLACE FUNCTION public.auto_assign_location_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Controlla se l'utente corrente è org admin per questa organizzazione
  IF current_user_id IS NOT NULL AND public.user_is_org_admin(NEW.org_id) THEN
    -- Inserisce l'utente come location admin
    INSERT INTO public.location_admins (org_id, location_id, user_id)
    VALUES (NEW.org_id, NEW.id, current_user_id)
    ON CONFLICT (location_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Trigger su locations per auto-assegnazione
DROP TRIGGER IF EXISTS auto_assign_location_admin_trigger ON public.locations;
CREATE TRIGGER auto_assign_location_admin_trigger
  AFTER INSERT ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_location_admin();

-- 4. Funzione aggregata per permessi effettivi
CREATE OR REPLACE FUNCTION app.get_effective_permissions(p_user UUID, p_org UUID, p_location UUID DEFAULT NULL)
RETURNS TABLE(permission TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH role_permissions_cte AS (
    -- Permessi da ruoli assegnati
    SELECT DISTINCT p.name as permission_name
    FROM public.user_roles_locations url
    JOIN public.roles r ON r.id = url.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id  
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE url.user_id = p_user
      AND url.org_id = p_org
      AND COALESCE(url.is_active, true) = true
      AND (p_location IS NULL OR url.location_id IS NULL OR url.location_id = p_location)
  ),
  user_overrides_cte AS (
    -- Override espliciti dell'utente
    SELECT p.name as permission_name, up.granted
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user
      AND up.org_id = p_org  
      AND (p_location IS NULL OR up.location_id IS NULL OR up.location_id = p_location)
  ),
  combined_permissions AS (
    -- Combina permessi da ruoli
    SELECT permission_name, true as granted
    FROM role_permissions_cte
    
    UNION ALL
    
    -- Aggiunge override utente
    SELECT permission_name, granted
    FROM user_overrides_cte
  ),
  final_permissions AS (
    -- Risolve conflitti: se c'è almeno un deny (granted=false) per un permesso, viene negato
    SELECT permission_name,
           BOOL_AND(granted) as final_granted
    FROM combined_permissions
    GROUP BY permission_name
  )
  SELECT permission_name
  FROM final_permissions
  WHERE final_granted = true;
$$;

-- Grant permessi sulle funzioni
GRANT EXECUTE ON FUNCTION public.user_is_location_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app.get_effective_permissions(UUID, UUID, UUID) TO anon, authenticated;