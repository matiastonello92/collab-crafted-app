'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import type { TransportAllowance } from '@/lib/types/contracts'

interface UseTransportAllowancesOptions {
  userId?: string
  status?: 'active' | 'suspended' | 'terminated'
}

export function useTransportAllowances({ userId, status }: UseTransportAllowancesOptions = {}) {
  const supabase = useSupabase()
  
  const key = userId ? `transport-allowances-${userId}-${status || 'all'}` : null

  const fetcher = useCallback(async (): Promise<TransportAllowance[]> => {
    let query = supabase
      .from('transport_allowances')
      .select('*')
      .order('start_date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }, [supabase, userId, status])

  const { data, error, isLoading, mutate } = useSWR<TransportAllowance[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const createAllowance = useCallback(async (allowanceData: Partial<TransportAllowance>) => {
    const { data: newAllowance, error } = await supabase
      .from('transport_allowances')
      .insert([allowanceData])
      .select()
      .single()

    if (error) throw error
    
    await mutate()
    return newAllowance
  }, [supabase, mutate])

  const updateAllowance = useCallback(async (id: string, allowanceData: Partial<TransportAllowance>) => {
    const { data: updatedAllowance, error } = await supabase
      .from('transport_allowances')
      .update(allowanceData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    await mutate()
    return updatedAllowance
  }, [supabase, mutate])

  const terminateAllowance = useCallback(async (id: string) => {
    const { data: terminatedAllowance, error } = await supabase
      .from('transport_allowances')
      .update({ status: 'terminated', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await mutate()
    return terminatedAllowance
  }, [supabase, mutate])

  const deleteAllowance = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('transport_allowances')
      .delete()
      .eq('id', id)

    if (error) throw error
    await mutate()
  }, [supabase, mutate])

  return {
    allowances: data || [],
    isLoading,
    error,
    createAllowance,
    updateAllowance,
    terminateAllowance,
    deleteAllowance,
    refresh: mutate,
  }
}
