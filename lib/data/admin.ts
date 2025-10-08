import { createSupabaseServerClient } from '@/utils/supabase/server'

export interface UserWithDetails {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  is_active: boolean | null
  created_at: string | null
  user_type: 'registered' | 'invited'
  invitation_status?: 'pending' | 'expired' | null
  invitation_token?: string | null
  expires_at?: string | null
  user_roles_locations?: {
    role_id: string | null
    location_id: string | null
    assigned_at: string | null
    assigned_by: string | null
    is_active: boolean | null
    roles?: {
      id: string
      name: string
      display_name: string
      level: number
    } | null
    locations?: {
      id: string
      name: string
      city: string | null
    } | null
  }[]
  user_permissions?: {
    id: string
    permission_id: string | null
    location_id: string | null
    granted: boolean | null
    granted_at: string | null
    granted_by: string | null
    permissions?: {
      id: string
      name: string
      display_name: string
      category: string
    } | null
  }[]
}

export interface UserRolesByLocation {
  location_name: string
  location_id: string | null
  role_name: string
  role_display_name: string
  role_level: number
  assigned_at: string | null
  assigned_by: string | null
  is_active: boolean | null
}

export interface UserPermissionOverride {
  permission_name: string
  permission_display_name: string
  permission_category: string
  location_name: string | null
  location_id: string | null
  granted: boolean | null
  granted_at: string | null
  granted_by: string | null
}

/**
 * Verifica se l'utente corrente è admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const meta: any = (user as any).app_metadata || {}
    const perms: string[] = Array.isArray(meta.permissions) ? meta.permissions : []
    const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0)

    return perms.includes('*') || (Number.isFinite(roleLevel) && roleLevel >= 90)
  } catch (error) {
    console.error('Error in checkIsAdmin:', error)
    return false
  }
}

/**
 * Fetch lista utenti con dettagli (paginata) - include profili registrati e inviti pending
 */
export async function getUsersWithDetails(
  page: number = 1,
  limit: number = 20,
  search: string = '',
  sortBy: 'name' | 'email' | 'status' | 'created_at' = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  statusFilter: 'all' | 'active' | 'inactive' | 'pending' | 'expired' = 'all'
): Promise<{ users: UserWithDetails[]; total: number; hasMore: boolean }> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user's org_id for filtering
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { users: [], total: 0, hasMore: false }
    }

    // Get org_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return { users: [], total: 0, hasMore: false }
    }

    const orgId = profile.org_id
    
    // 1. Fetch registered users from profiles
    let profilesQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, email, is_active, created_at, org_id')
      .eq('org_id', orgId)

    if (search.trim()) {
      profilesQuery = profilesQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: registeredUsers, error: profileError } = await profilesQuery

    // 2. Fetch pending/expired invitations
    let invitationsQuery = supabase
      .from('invitations')
      .select('id, email, first_name, last_name, created_at, expires_at, token, status, org_id')
      .eq('org_id', orgId)
      .in('status', ['pending', 'expired'])

    if (search.trim()) {
      invitationsQuery = invitationsQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: invitations, error: invitationError } = await invitationsQuery

    // 3. Map to unified interface
    const registeredUsersMapped: UserWithDetails[] = (registeredUsers || []).map(u => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      is_active: u.is_active,
      created_at: u.created_at,
      user_type: 'registered' as const,
      invitation_status: null,
      invitation_token: null,
      expires_at: null,
    }))

    const invitationsMapped: UserWithDetails[] = (invitations || []).map(inv => ({
      id: inv.id,
      email: inv.email,
      first_name: inv.first_name,
      last_name: inv.last_name,
      is_active: null,
      created_at: inv.created_at,
      user_type: 'invited' as const,
      invitation_status: (inv.status === 'expired' || (inv.expires_at && new Date(inv.expires_at) < new Date())) 
        ? 'expired' as const 
        : 'pending' as const,
      invitation_token: inv.token,
      expires_at: inv.expires_at,
    }))

    // 4. Merge and filter by status
    let allUsers = [...registeredUsersMapped, ...invitationsMapped]

    if (statusFilter !== 'all') {
      allUsers = allUsers.filter(u => {
        if (statusFilter === 'active') return u.user_type === 'registered' && u.is_active === true
        if (statusFilter === 'inactive') return u.user_type === 'registered' && u.is_active === false
        if (statusFilter === 'pending') return u.user_type === 'invited' && u.invitation_status === 'pending'
        if (statusFilter === 'expired') return u.user_type === 'invited' && u.invitation_status === 'expired'
        return true
      })
    }

    // 5. Sort combined list
    allUsers.sort((a, b) => {
      let compareResult = 0
      
      if (sortBy === 'name') {
        const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ').toLowerCase()
        const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ').toLowerCase()
        compareResult = nameA.localeCompare(nameB)
      } else if (sortBy === 'email') {
        compareResult = (a.email || '').localeCompare(b.email || '')
      } else if (sortBy === 'status') {
        const statusA = a.user_type === 'registered' ? (a.is_active ? 'active' : 'inactive') : (a.invitation_status || 'pending')
        const statusB = b.user_type === 'registered' ? (b.is_active ? 'active' : 'inactive') : (b.invitation_status || 'pending')
        compareResult = statusA.localeCompare(statusB)
      } else if (sortBy === 'created_at') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        compareResult = dateA - dateB
      }

      return sortOrder === 'asc' ? compareResult : -compareResult
    })

    // 6. Pagination
    const total = allUsers.length
    const offset = (page - 1) * limit
    const paginatedUsers = allUsers.slice(offset, offset + limit)
    const hasMore = total > offset + limit

    return {
      users: paginatedUsers,
      total,
      hasMore
    }
  } catch (error) {
    console.error('Error in getUsersWithDetails:', error)
    return { users: [], total: 0, hasMore: false }
  }
}

/**
 * Fetch dettagli di un singolo utente
 */
export async function getUserById(userId: string): Promise<UserWithDetails | null> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verifica autorizzazioni admin
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return null
    }

    // Get org_id first to filter correctly
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', currentUser?.id)
      .maybeSingle()

    const { data: user, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        is_active,
        created_at,
        org_id
      `)
      .eq('id', userId)
      .eq('org_id', currentProfile?.org_id)
      .maybeSingle()

    if (error || !user) {
      console.error('Error fetching user:', error)
      return null
    }

    return {
      ...user,
      user_type: 'registered' as const,
      invitation_status: null,
      invitation_token: null,
      expires_at: null,
    }
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

/**
 * Fetch ruoli per location di un utente
 */
export async function getUserRolesByLocation(userId: string): Promise<UserRolesByLocation[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verifica autorizzazioni admin
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return []
    }

    const { data, error } = await supabase
      .from('user_roles_locations')
      .select(`
        assigned_at,
        assigned_by,
        is_active,
        roles!inner (
          name,
          display_name,
          level
        ),
        locations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false })

    if (error || !data) {
      console.error('Error fetching user roles by location:', error)
      return []
    }

    return data.map(item => ({
      location_name: (item.locations as any)?.name || 'Global',
      location_id: (item.locations as any)?.id || null,
      role_name: (item.roles as any)?.name || '',
      role_display_name: (item.roles as any)?.display_name || '',
      role_level: (item.roles as any)?.level || 0,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      is_active: item.is_active
    }))
  } catch (error) {
    console.error('Error in getUserRolesByLocation:', error)
    return []
  }
}

/**
 * Fetch override permessi di un utente
 */
export async function getUserPermissionOverrides(userId: string): Promise<UserPermissionOverride[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verifica autorizzazioni admin
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return []
    }

    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        granted,
        granted_at,
        granted_by,
        permissions!inner (
          name,
          display_name,
          category
        ),
        locations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .order('granted_at', { ascending: false })

    if (error || !data) {
      console.error('Error fetching user permission overrides:', error)
      return []
    }

    return data.map(item => ({
      permission_name: (item.permissions as any)?.name || '',
      permission_display_name: (item.permissions as any)?.display_name || '',
      permission_category: (item.permissions as any)?.category || '',
      location_name: (item.locations as any)?.name || null,
      location_id: (item.locations as any)?.id || null,
      granted: item.granted,
      granted_at: item.granted_at,
      granted_by: item.granted_by
    }))
  } catch (error) {
    console.error('Error in getUserPermissionOverrides:', error)
    return []
  }
}