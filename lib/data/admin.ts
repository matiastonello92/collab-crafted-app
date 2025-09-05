import { createSupabaseServerClient } from '@/utils/supabase/server'
import { getAuthSnapshot } from '@/lib/server/auth-snapshot'

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
    const { permissions } = await getAuthSnapshot()
    const adminPerms = ['locations.manage_users', 'locations.assign_roles', 'locations.manage_settings']
    return adminPerms.some(p => permissions.includes(p))
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
    
    // Verifica autorizzazioni admin
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return { users: [], total: 0, hasMore: false }
    }

    const offset = (page - 1) * limit

    // Query base per utenti
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false })

    // Applica filtro di ricerca se presente
    if (search.trim()) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    // Applica paginazione
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return { users: [], total: 0, hasMore: false }
    }

    // Per ogni utente, recupera email da auth.users via RPC o query separata
    // Nota: auth.users non è esposta via API, quindi creiamo un placeholder email
    const usersWithEmail: UserWithDetails[] = (users || []).map(user => ({
      ...user,
      email: `user_${user.id.slice(0, 8)}@example.com` // Placeholder - in produzione servirebbe un trigger o RPC
    }))

    const total = count || 0
    const hasMore = total > offset + limit

    return {
      users: usersWithEmail,
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

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        is_active,
        created_at
      `)
      .eq('id', userId)
      .single()

    if (error || !user) {
      console.error('Error fetching user:', error)
      return null
    }

    // Placeholder email
    const userWithEmail: UserWithDetails = {
      ...user,
      email: `user_${user.id.slice(0, 8)}@example.com`
    }

    return userWithEmail
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