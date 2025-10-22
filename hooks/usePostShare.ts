'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { usePermissions, hasPermission } from '@/hooks/usePermissions'
import { toast } from 'sonner'

export function usePostShare() {
  const [isSharing, setIsSharing] = useState(false)
  const { permissions } = usePermissions()
  const canShare = hasPermission(permissions, 'posts:share')

  const sharePost = async (postId: string, shareComment?: string) => {
    if (!canShare) {
      toast.error('Non hai il permesso per condividere post')
      return { success: false, error: 'No permission' }
    }

    setIsSharing(true)
    
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error('Non autenticato')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/v1/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shareComment }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to share post')
      }

      const result = await response.json()
      toast.success('Post condiviso con successo')
      
      return { success: true, data: result.share }
    } catch (error) {
      console.error('Share post error:', error)
      const message = error instanceof Error ? error.message : 'Errore durante la condivisione'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsSharing(false)
    }
  }

  const unsharePost = async (postId: string) => {
    if (!canShare) {
      toast.error('Non hai il permesso per rimuovere condivisioni')
      return { success: false, error: 'No permission' }
    }

    setIsSharing(true)
    
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error('Non autenticato')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/v1/posts/${postId}/share`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unshare post')
      }

      toast.success('Condivisione rimossa')
      
      return { success: true }
    } catch (error) {
      console.error('Unshare post error:', error)
      const message = error instanceof Error ? error.message : 'Errore durante la rimozione'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsSharing(false)
    }
  }

  return {
    sharePost,
    unsharePost,
    isSharing,
    canShare,
  }
}
