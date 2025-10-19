'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import type { ContractAmendment } from '@/lib/types/contracts'

interface UseContractAmendmentsOptions {
  userId?: string
  contractId?: string
}

export function useContractAmendments({ userId, contractId }: UseContractAmendmentsOptions = {}) {
  const supabase = useSupabase()
  
  const key = userId ? `contract-amendments-${userId}` : null

  const fetcher = useCallback(async (): Promise<ContractAmendment[]> => {
    let query = supabase
      .from('contract_amendments')
      .select('*')
      .order('amendment_date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (contractId) {
      query = query.eq('contract_id', contractId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }, [supabase, userId, contractId])

  const { data, error, isLoading, mutate } = useSWR<ContractAmendment[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const createAmendment = useCallback(async (amendmentData: Partial<ContractAmendment>) => {
    const { data: newAmendment, error } = await supabase
      .from('contract_amendments')
      .insert([amendmentData])
      .select()
      .single()

    if (error) throw error
    
    await mutate()
    return newAmendment
  }, [supabase, mutate])

  const updateAmendment = useCallback(async (id: string, amendmentData: Partial<ContractAmendment>) => {
    const { data: updatedAmendment, error } = await supabase
      .from('contract_amendments')
      .update(amendmentData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    await mutate()
    return updatedAmendment
  }, [supabase, mutate])

  const deleteAmendment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('contract_amendments')
      .delete()
      .eq('id', id)

    if (error) throw error
    await mutate()
  }, [supabase, mutate])

  return {
    amendments: data || [],
    isLoading,
    error,
    createAmendment,
    updateAmendment,
    deleteAmendment,
    refresh: mutate,
  }
}
