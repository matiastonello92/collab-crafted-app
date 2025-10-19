-- Migration 4: Aggiornare RLS policies per user_contracts

-- DROP policies esistenti
DROP POLICY IF EXISTS "user_contracts_select" ON public.user_contracts;
DROP POLICY IF EXISTS "user_contracts_insert" ON public.user_contracts;
DROP POLICY IF EXISTS "user_contracts_update" ON public.user_contracts;
DROP POLICY IF EXISTS "user_contracts_delete" ON public.user_contracts;

-- SELECT: utente può vedere i propri contratti, chi ha users:manage o users:manage_contracts può vedere tutti
CREATE POLICY "user_contracts_select"
ON public.user_contracts
FOR SELECT
USING (
  is_platform_admin() 
  OR user_id = auth.uid()
  OR (
    user_in_org(org_id) 
    AND user_in_location(location_id) 
    AND (
      user_has_permission(auth.uid(), 'users:manage') 
      OR user_has_permission(auth.uid(), 'users:manage_contracts')
    )
  )
);

-- INSERT: solo chi ha users:manage_contracts può creare contratti
CREATE POLICY "user_contracts_insert"
ON public.user_contracts
FOR INSERT
WITH CHECK (
  user_in_org(org_id) 
  AND user_in_location(location_id) 
  AND user_has_permission(auth.uid(), 'users:manage_contracts')
);

-- UPDATE: solo chi ha users:manage_contracts può modificare contratti
CREATE POLICY "user_contracts_update"
ON public.user_contracts
FOR UPDATE
USING (
  user_in_org(org_id) 
  AND user_in_location(location_id) 
  AND user_has_permission(auth.uid(), 'users:manage_contracts')
);

-- DELETE: solo platform admin può eliminare
CREATE POLICY "user_contracts_delete"
ON public.user_contracts
FOR DELETE
USING (is_platform_admin());