-- Add SELECT policy for invitations table
-- Allows org members and platform admins to view invitations

CREATE POLICY "invitations_select_by_org"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  is_platform_admin()
  OR user_in_org(org_id)
);

-- Add helpful comment
COMMENT ON POLICY "invitations_select_by_org" ON public.invitations IS 
  'Allow org members and platform admins to view invitations in their organization';