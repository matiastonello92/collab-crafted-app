import { notFound } from 'next/navigation'
import { getUserById, getUserRolesByLocation, getUserPermissionOverrides } from '@/lib/data/admin'
import { requireOrgAdmin } from '@/lib/admin/guards'
import UserDetailClient from './UserDetailClient'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params
  
  await requireOrgAdmin()
  
  const user = await getUserById(id)
  
  if (!user) {
    notFound()
  }

  const [rolesByLocation, permissionOverrides] = await Promise.all([
    getUserRolesByLocation(id),
    getUserPermissionOverrides(id)
  ])

  // Prepare data for overview
  const parts = [user.first_name, user.last_name].filter(Boolean)
  const fullName = parts.length > 0 ? parts.join(' ') : 'N/A'

  const userLocations = Array.from(new Set(
    rolesByLocation.map(r => r.location_name).filter(Boolean)
  )).map((name, index) => ({ id: index.toString(), name }))

  const topRoles = Array.from(new Set(
    rolesByLocation.map(r => ({ name: r.role_name, display_name: r.role_display_name }))
      .filter(r => r.name)
  ))

  const userForOverview = {
    id: user.id,
    name: fullName,
    email: user.email || '',
    phone: undefined,
    avatar_url: undefined,
    created_at: user.created_at || new Date().toISOString(),
    is_active: user.is_active ?? true,
    last_activity: undefined,
    email_confirmed: true
  }

  return (
    <UserDetailClient
      user={user}
      rolesByLocation={rolesByLocation}
      userForOverview={userForOverview}
      userLocations={userLocations}
      topRoles={topRoles}
    />
  )
}
