import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

describe('RLS Multi-Profile Isolation', () => {
  let adminClient: ReturnType<typeof createClient>
  let managerClient: ReturnType<typeof createClient>
  let baseUserClient: ReturnType<typeof createClient>

  const LOCATION_A_ID = 'location-a-test'
  const LOCATION_B_ID = 'location-b-test'
  const ORG_ID = 'org-test'

  beforeAll(() => {
    // Mock JWT tokens for different roles
    const platformAdminJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Mock
    const managerJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Mock
    const baseUserJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Mock

    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${platformAdminJWT}` } },
    })

    managerClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${managerJWT}` } },
    })

    baseUserClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${baseUserJWT}` } },
    })
  })

  describe('Platform Admin', () => {
    it('should access all locations', async () => {
      const { data, error } = await adminClient
        .from('locations')
        .select('*')

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })

    it('should access all shifts across locations', async () => {
      const { data, error } = await adminClient
        .from('shifts')
        .select('*')

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })
  })

  describe('Manager (Location A)', () => {
    it('should access Location A data', async () => {
      const { data, error } = await managerClient
        .from('shifts')
        .select('*')
        .eq('location_id', LOCATION_A_ID)

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })

    it('should be DENIED access to Location B data', async () => {
      const { data, error } = await managerClient
        .from('shifts')
        .select('*')
        .eq('location_id', LOCATION_B_ID)

      // Should return empty or error due to RLS
      expect(data?.length).toBe(0)
    })

    it('should manage users in Location A only', async () => {
      const { error } = await managerClient
        .from('user_roles_locations')
        .insert({
          user_id: 'user-test',
          location_id: LOCATION_A_ID,
          role_id: 'role-test',
          org_id: ORG_ID,
        })

      expect(error).toBeNull()
    })

    it('should be DENIED managing users in Location B', async () => {
      const { error } = await managerClient
        .from('user_roles_locations')
        .insert({
          user_id: 'user-test',
          location_id: LOCATION_B_ID, // Different location
          role_id: 'role-test',
          org_id: ORG_ID,
        })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('violates row-level security')
    })
  })

  describe('Base User (Location A)', () => {
    it('should view own shifts only', async () => {
      const { data, error } = await baseUserClient
        .from('shift_assignments')
        .select('*, shift:shifts(*)')
        .eq('user_id', 'base-user-test')

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })

    it('should NOT view other users shifts', async () => {
      const { data, error } = await baseUserClient
        .from('shift_assignments')
        .select('*')
        .eq('user_id', 'other-user-test') // Different user

      expect(data?.length).toBe(0) // RLS blocks
    })

    it('should be DENIED access to Location B shifts', async () => {
      const { data } = await baseUserClient
        .from('shifts')
        .select('*')
        .eq('location_id', LOCATION_B_ID)

      expect(data?.length).toBe(0)
    })

    it('should NOT manage inventory', async () => {
      const { error } = await baseUserClient
        .from('inventory_headers')
        .insert({
          org_id: ORG_ID,
          location_id: LOCATION_A_ID,
          category: 'bar',
          status: 'in_progress',
          started_by: 'base-user-test',
        })

      expect(error).toBeTruthy() // Should fail due to lack of permission
    })
  })

  describe('Cross-Location Data Leakage Prevention', () => {
    it('Manager A cannot see Manager B leave requests', async () => {
      const { data } = await managerClient
        .from('leave_requests')
        .select('*')
        .eq('org_id', ORG_ID)

      // Should only see Location A users
      const locationBRequests = data?.filter((r: any) => 
        r.user_id === 'location-b-user'
      )
      expect(locationBRequests?.length).toBe(0)
    })
  })
})
