import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Job Tags - Database Tests', () => {
  let supabase: any
  let testOrgId: string
  let testUserId: string
  let testLocationId: string
  let testTagId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Create test org
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org Job Tags', slug: 'test-job-tags' })
      .select()
      .single()
    testOrgId = org.org_id

    // Create test location
    const { data: location } = await supabase
      .from('locations')
      .insert({ org_id: testOrgId, name: 'Test Location', status: 'active' })
      .select()
      .single()
    testLocationId = location.id

    // Create test user via auth
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: 'test-job-tags@example.com',
      password: 'test123456',
      email_confirm: true
    })
    testUserId = authUser.user.id

    // Create test job tag
    const { data: tag } = await supabase
      .from('job_tags')
      .insert({
        org_id: testOrgId,
        key: 'test_cameriere',
        label_it: 'Cameriere Test',
        categoria: 'Sala',
        color: '#10B981',
        is_active: true
      })
      .select()
      .single()
    testTagId = tag.id
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('user_job_tags').delete().eq('org_id', testOrgId)
    await supabase.from('job_tags').delete().eq('org_id', testOrgId)
    await supabase.from('locations').delete().eq('org_id', testOrgId)
    await supabase.from('organizations').delete().eq('org_id', testOrgId)
    await supabase.auth.admin.deleteUser(testUserId)
  })

  describe('generate_job_tag_key function', () => {
    it('should generate correct slug from label', async () => {
      const { data, error } = await supabase.rpc('generate_job_tag_key', {
        p_label: 'Chef de Rang'
      })

      expect(error).toBeNull()
      expect(data).toBe('chef_de_rang')
    })

    it('should handle special characters', async () => {
      const { data } = await supabase.rpc('generate_job_tag_key', {
        p_label: 'Pizzaiolo (Senior)'
      })

      expect(data).toBe('pizzaiolo_senior')
    })

    it('should handle accented characters', async () => {
      const { data } = await supabase.rpc('generate_job_tag_key', {
        p_label: 'Maître d\'hôtel'
      })

      expect(data).toMatch(/maitre/)
    })
  })

  describe('ujt_primary_one_per_loc index', () => {
    it('should allow only one primary tag per user+location', async () => {
      // Create second tag
      const { data: tag2 } = await supabase
        .from('job_tags')
        .insert({
          org_id: testOrgId,
          key: 'test_pizzaiolo',
          label_it: 'Pizzaiolo Test',
          categoria: 'Cucina',
          is_active: true
        })
        .select()
        .single()

      // Insert first primary assignment
      const { error: error1 } = await supabase
        .from('user_job_tags')
        .insert({
          org_id: testOrgId,
          location_id: testLocationId,
          user_id: testUserId,
          job_tag_id: testTagId,
          is_primary: true
        })

      expect(error1).toBeNull()

      // Try to insert second primary assignment for same user+location -> should fail
      const { error: error2 } = await supabase
        .from('user_job_tags')
        .insert({
          org_id: testOrgId,
          location_id: testLocationId,
          user_id: testUserId,
          job_tag_id: tag2.id,
          is_primary: true
        })

      // Should violate unique index
      expect(error2).toBeTruthy()
      expect(error2?.code).toBe('23505') // Unique violation

      // Cleanup
      await supabase.from('user_job_tags').delete().eq('user_id', testUserId)
      await supabase.from('job_tags').delete().eq('id', tag2.id)
    })
  })

  describe('ensure_single_primary_tag trigger', () => {
    it('should unset old primary when setting new primary', async () => {
      // Create second tag
      const { data: tag2 } = await supabase
        .from('job_tags')
        .insert({
          org_id: testOrgId,
          key: 'test_barista',
          label_it: 'Barista Test',
          categoria: 'Sala',
          is_active: true
        })
        .select()
        .single()

      // Insert first primary
      const { data: assign1 } = await supabase
        .from('user_job_tags')
        .insert({
          org_id: testOrgId,
          location_id: testLocationId,
          user_id: testUserId,
          job_tag_id: testTagId,
          is_primary: true
        })
        .select()
        .single()

      expect(assign1.is_primary).toBe(true)

      // Insert second tag as secondary first
      const { data: assign2 } = await supabase
        .from('user_job_tags')
        .insert({
          org_id: testOrgId,
          location_id: testLocationId,
          user_id: testUserId,
          job_tag_id: tag2.id,
          is_primary: false
        })
        .select()
        .single()

      // Now update second to primary - trigger should unset first
      await supabase
        .from('user_job_tags')
        .update({ is_primary: true })
        .eq('id', assign2.id)

      // Check first is now false
      const { data: updatedAssign1 } = await supabase
        .from('user_job_tags')
        .select('is_primary')
        .eq('id', assign1.id)
        .single()

      expect(updatedAssign1.is_primary).toBe(false)

      // Check second is now true
      const { data: updatedAssign2 } = await supabase
        .from('user_job_tags')
        .select('is_primary')
        .eq('id', assign2.id)
        .single()

      expect(updatedAssign2.is_primary).toBe(true)

      // Cleanup
      await supabase.from('user_job_tags').delete().eq('user_id', testUserId)
      await supabase.from('job_tags').delete().eq('id', tag2.id)
    })
  })

  describe('job_tags unique constraint', () => {
    it('should prevent duplicate keys per org', async () => {
      const { error } = await supabase
        .from('job_tags')
        .insert({
          org_id: testOrgId,
          key: 'test_cameriere', // Same key as existing tag
          label_it: 'Cameriere Duplicate',
          is_active: true
        })

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23505') // Unique violation
    })

    it('should allow same key in different orgs', async () => {
      // Create another org
      const { data: org2 } = await supabase
        .from('organizations')
        .insert({ name: 'Test Org 2', slug: 'test-org-2' })
        .select()
        .single()

      const { error } = await supabase
        .from('job_tags')
        .insert({
          org_id: org2.org_id,
          key: 'test_cameriere', // Same key but different org
          label_it: 'Cameriere Org 2',
          is_active: true
        })

      expect(error).toBeNull()

      // Cleanup
      await supabase.from('job_tags').delete().eq('org_id', org2.org_id)
      await supabase.from('organizations').delete().eq('org_id', org2.org_id)
    })
  })
})
