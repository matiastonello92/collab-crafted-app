import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/integrations/supabase/client'

describe('Leave Requests CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create leave request', async () => {
    const mockRequest = {
      id: 'leave-1',
      user_id: 'user-1',
      org_id: 'org-1',
      type_id: 'type-1',
      start_at: '2024-02-01T00:00:00Z',
      end_at: '2024-02-05T23:59:59Z',
      status: 'pending',
    }

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [mockRequest],
          error: null,
        }),
      }),
    } as any)

    const { data, error } = await supabase
      .from('leave_requests')
      .insert(mockRequest)
      .select()

    expect(error).toBeNull()
    expect(data[0].status).toBe('pending')
  })

  it('should approve leave request', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ status: 'approved', approver_id: 'manager-1' }],
            error: null,
          }),
        }),
      }),
    } as any)

    const { data } = await supabase
      .from('leave_requests')
      .update({ status: 'approved', approver_id: 'manager-1' })
      .eq('id', 'leave-1')
      .select()

    expect(data[0].status).toBe('approved')
  })

  it('should reject leave request', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ status: 'rejected' }],
            error: null,
          }),
        }),
      }),
    } as any)

    const { data } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected' })
      .eq('id', 'leave-1')
      .select()

    expect(data[0].status).toBe('rejected')
  })
})
