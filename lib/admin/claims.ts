export function isAdminFromClaims(user: any): boolean {
  if (!user) return false
  const meta: any = (user as any).app_metadata || {}
  const perms: string[] = Array.isArray(meta.permissions) ? meta.permissions : []
  if (perms.includes('*')) return true
  const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0)
  return Number.isFinite(roleLevel) && roleLevel >= 90
}
