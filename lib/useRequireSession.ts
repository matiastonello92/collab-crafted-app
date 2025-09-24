'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

export function useRequireSession() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (!data.session) router.replace('/login')
    })

    return () => {
      mounted = false
    }
  }, [router])
}
