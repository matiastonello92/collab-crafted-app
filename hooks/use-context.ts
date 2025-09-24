'use client'

import { useState, useEffect } from 'react'
import { createSupabaseUserClient } from '@/lib/supabase/clients'

interface AppContext {
  organizationId: string | null
  locationId: string | null
  isSet: boolean
}

export function useAppContext() {
  const [context, setContext] = useState<AppContext>({
    organizationId: null,
    locationId: null,
    isSet: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setAppContext = async (orgId: string, locationId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Setting app context:', { orgId, locationId })
      
      // Chiamata RPC per impostare il contesto
      const supabase = await createSupabaseUserClient()
      const { data, error: rpcError } = await supabase.rpc('app.set_context_checked', {
        p_org: orgId,
        p_location: locationId
      })
      
      if (rpcError) {
        console.error('❌ RPC Error:', rpcError)
        setError(rpcError.message)
        return false
      }
      
      console.log('✅ Context set successfully:', data)
      
      // Aggiorna lo stato locale
      setContext({
        organizationId: orgId,
        locationId: locationId,
        isSet: true
      })
      
      return true
      
    } catch (err) {
      console.error('❌ Context setting failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    } finally {
      setLoading(false)
    }
  }

  const clearContext = () => {
    setContext({
      organizationId: null,
      locationId: null,
      isSet: false
    })
  }

  return {
    context,
    setAppContext,
    clearContext,
    loading,
    error
  }
}
