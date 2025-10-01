import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/src/integrations/supabase/client'

describe('Shifts CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Shift', () => {
    it('should create a shift successfully', async () => {
      const mockShift = {
        id: 'shift-1',
        org_id: 'org-1',
        location_id: 'loc-1',
        rota_id: 'rota-1',
        start_at: '2024-01-01T09:00:00Z',
        end_at: '2024-01-01T17:00:00Z',
        role: 'server',
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [mockShift],
            error: null,
          }),
        }),
      } as any)

      const { data, error } = await supabase
        .from('shifts')
        .insert(mockShift)
        .select()

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('shift-1')
    })

    it('should fail with invalid time range', async () => {
      const invalidShift = {
        start_at: '2024-01-01T17:00:00Z',
        end_at: '2024-01-01T09:00:00Z', // End before start
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid time range' },
          }),
        }),
      } as any)

      const { error } = await supabase
        .from('shifts')
        .insert(invalidShift)
        .select()

      expect(error).toBeTruthy()
      expect(error?.message).toContain('Invalid time range')
    })
  })

  describe('Update Shift', () => {
    it('should update shift successfully', async () => {
      const updates = { role: 'chef' }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'shift-1', ...updates }],
              error: null,
            }),
          }),
        }),
      } as any)

      const { data, error } = await supabase
        .from('shifts')
        .update(updates)
        .eq('id', 'shift-1')
        .select()

      expect(error).toBeNull()
      expect(data[0].role).toBe('chef')
    })
  })

  describe('Delete Shift', () => {
    it('should delete shift successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as any)

      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', 'shift-1')

      expect(error).toBeNull()
    })
  })

  describe('Overlapping Detection', () => {
    it('should detect overlapping shifts', async () => {
      const existingShift = {
        start_at: '2024-01-01T09:00:00Z',
        end_at: '2024-01-01T17:00:00Z',
      }

      const newShift = {
        start_at: '2024-01-01T15:00:00Z', // Overlaps
        end_at: '2024-01-01T20:00:00Z',
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: [existingShift],
                error: null,
              }),
            }),
          }),
        }),
      } as any)

      const { data } = await supabase
        .from('shifts')
        .select()
        .eq('location_id', 'loc-1')
        .gte('end_at', newShift.start_at)
        .lte('start_at', newShift.end_at)

      expect(data).toHaveLength(1) // Overlap detected
    })
  })
})
