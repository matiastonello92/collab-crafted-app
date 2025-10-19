'use client'

import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import type { BonusAdvance } from '@/lib/types/contracts'

interface UseBonusesAdvancesOptions {
  userId?: string
  transactionType?: 'bonus' | 'advance' | 'commission' | 'other'
  status?: 'pending' | 'approved' | 'paid' | 'cancelled'
}

export function useBonusesAdvances({ 
  userId, 
  transactionType,
  status 
}: UseBonusesAdvancesOptions = {}) {
  const supabase = useSupabase()
  
  const key = userId 
    ? `bonuses-advances-${userId}-${transactionType || 'all'}-${status || 'all'}` 
    : null

  const fetcher = useCallback(async (): Promise<BonusAdvance[]> => {
    let query = supabase
      .from('bonuses_advances')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }, [supabase, userId, transactionType, status])

  const { data, error, isLoading, mutate } = useSWR<BonusAdvance[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const createBonusAdvance = useCallback(async (bonusData: Partial<BonusAdvance>) => {
    const { data: newBonus, error } = await supabase
      .from('bonuses_advances')
      .insert([bonusData])
      .select()
      .single()

    if (error) throw error
    
    await mutate()
    return newBonus
  }, [supabase, mutate])

  const updateBonusAdvance = useCallback(async (id: string, bonusData: Partial<BonusAdvance>) => {
    const { data: updatedBonus, error } = await supabase
      .from('bonuses_advances')
      .update(bonusData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    await mutate()
    return updatedBonus
  }, [supabase, mutate])

  const approveBonusAdvance = useCallback(async (id: string) => {
    const { data: approvedBonus, error } = await supabase
      .from('bonuses_advances')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await mutate()
    return approvedBonus
  }, [supabase, mutate])

  const deleteBonusAdvance = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('bonuses_advances')
      .delete()
      .eq('id', id)

    if (error) throw error
    await mutate()
  }, [supabase, mutate])

  // Calculate totals
  const totals = useMemo(() => {
    if (!data) return { ytd: 0, bonuses: 0, advances: 0, commissions: 0 }
    
    const currentYear = new Date().getFullYear()
    const ytdItems = data.filter(item => {
      const itemYear = new Date(item.transaction_date).getFullYear()
      return itemYear === currentYear
    })

    return {
      ytd: ytdItems.reduce((sum, item) => sum + item.amount, 0),
      bonuses: data.filter(i => i.transaction_type === 'bonus').reduce((s, i) => s + i.amount, 0),
      advances: data.filter(i => i.transaction_type === 'advance').reduce((s, i) => s + i.amount, 0),
      commissions: data.filter(i => i.transaction_type === 'commission').reduce((s, i) => s + i.amount, 0),
    }
  }, [data])

  return {
    bonusesAdvances: data || [],
    isLoading,
    error,
    totals,
    createBonusAdvance,
    updateBonusAdvance,
    approveBonusAdvance,
    deleteBonusAdvance,
    refresh: mutate,
  }
}
