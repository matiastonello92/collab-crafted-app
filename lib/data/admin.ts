import { createSupabaseServerClient } from '@/utils/supabase/server'

export interface UserWithDetails {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  is_active: boolean | null
  created_at: string | null
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
 * Fetch lista utenti con dettagli (paginata)
 */
export async function getUsersWithDetails(
  page: number = 1,
  limit: number = 20,
  search: string = ''
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
    
    // Route already protected by requireOrgAdmin() + RLS policies handle data access
    const offset = (page - 1) * limit
    let users: UserWithDetails[] = []
    let total = 0

    try {
      // Query profiles FILTERED BY ORG_ID
      let query = supabase
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
        `, { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      // Applica filtro di ricerca se presente
      if (search.trim()) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      // Applica paginazione
      query = query.range(offset, offset + limit - 1)

      const { data: profileUsers, error: profileError, count } = await query

      if (!profileError && profileUsers && profileUsers.length > 0) {
        // Usa profiles direttamente
        users = profileUsers
        total = count || 0
      } else {
        // Fallback a auth.admin.listUsers con filtro per org
        console.log('Fallback to auth.admin.listUsers')
        
        // Use admin client for auth operations
        const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
        const adminSupabase = createSupabaseAdminClient()

        // Get user IDs from memberships for org filtering
        const { data: memberships } = await adminSupabase
          .from('memberships')
          .select('user_id')
          .eq('org_id', orgId)

        if (!memberships) {
          return { users: [], total: 0, hasMore: false }
        }

        const orgUserIds = memberships.map(m => m.user_id)
        
        const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers({
          page: page,
          perPage: limit
        })

        if (authError) {
          console.error('Error fetching auth users:', authError)
          return { users: [], total: 0, hasMore: false }
        }

        // Filter by org membership AND search
        let filteredUsers = (authData.users || []).filter(u => orgUserIds.includes(u.id))
        
        if (search.trim()) {
          const searchLower = search.toLowerCase()
          filteredUsers = filteredUsers.filter(user => 
            user.email?.toLowerCase().includes(searchLower) ||
            user.user_metadata?.full_name?.toLowerCase().includes(searchLower)
          )
        }

        users = filteredUsers.map(user => ({
          id: user.id,
          email: user.email || null,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          is_active: true, // Assume active from auth
          created_at: user.created_at,
        }))

        total = filteredUsers.length
      }
    } catch (fallbackError) {
      console.error('Error in fallback query:', fallbackError)
      return { users: [], total: 0, hasMore: false }
    }

    const hasMore = total > offset + limit

    return {
      users,
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

    return user
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