'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Ban, RefreshCw } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Invitation {
  id: string
  email: string
  token: string
  status: string
  expires_at: string
  created_at: string
  role_name?: string
  location_names?: string[]
}

export function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadInvitations = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          email,
          token,
          status,
          expires_at,
          created_at,
          invitation_roles_locations (
            role:roles (name, display_name),
            location:locations (name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const processedInvitations: Invitation[] = data?.map((inv: any) => {
        const roleInfo = inv.invitation_roles_locations?.[0]?.role
        const locationNames = inv.invitation_roles_locations?.map(
          (irl: any) => irl.location?.name
        ).filter(Boolean) || []

        return {
          id: inv.id,
          email: inv.email,
          token: inv.token,
          status: inv.status,
          expires_at: inv.expires_at,
          created_at: inv.created_at,
          role_name: roleInfo?.display_name || roleInfo?.name,
          location_names: locationNames
        }
      }) || []

      setInvitations(processedInvitations)
    } catch (error) {
      console.error('Error loading invitations:', error)
      toast.error('Errore nel caricamento degli inviti')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadInvitations()
  }, [])

  const copyInviteLink = async (token: string) => {
    try {
      const link = `${window.location.origin}/invite/${token}`
      await navigator.clipboard.writeText(link)
      toast.success('Link copiato negli appunti!')
    } catch (error) {
      toast.error('Errore nella copia del link')
    }
  }

  const revokeInvitation = async (id: string) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('invitations')
        .update({ 
          status: 'revoked',
          revoked_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Invito revocato')
      loadInvitations()
    } catch (error) {
      console.error('Error revoking invitation:', error)
      toast.error('Errore nella revoca dell\'invito')
    }
  }

  const refreshInvitations = () => {
    setIsRefreshing(true)
    loadInvitations()
  }

  const getStatusColor = (status: string, expiresAt: string) => {
    const now = new Date()
    const expiryDate = new Date(expiresAt)
    
    if (status === 'accepted') return 'default'
    if (status === 'revoked') return 'destructive'
    if (now > expiryDate) return 'secondary'
    return 'secondary'
  }

  const getStatusLabel = (status: string, expiresAt: string) => {
    const now = new Date()
    const expiryDate = new Date(expiresAt)
    
    if (status === 'accepted') return 'Accettato'
    if (status === 'revoked') return 'Revocato'
    if (now > expiryDate) return 'Scaduto'
    return 'Pending'
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {invitations.length} inviti trovati
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshInvitations}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nessun invito trovato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map(invitation => (
            <div
              key={invitation.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invitation.email}</span>
                    <Badge
                      variant={getStatusColor(invitation.status, invitation.expires_at)}
                    >
                      {getStatusLabel(invitation.status, invitation.expires_at)}
                    </Badge>
                  </div>
                  
                  {invitation.role_name && (
                    <p className="text-sm text-muted-foreground">
                      Ruolo: {invitation.role_name}
                    </p>
                  )}
                  
                  {invitation.location_names && invitation.location_names.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {invitation.location_names.map((name, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Creato {formatDistanceToNow(new Date(invitation.created_at), {
                      addSuffix: true,
                      locale: it
                    })} • Scade {formatDistanceToNow(new Date(invitation.expires_at), {
                      addSuffix: true,
                      locale: it
                    })}
                  </p>
                </div>
              </div>

              {invitation.status === 'pending' && new Date() < new Date(invitation.expires_at) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invitation.token)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copia Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeInvitation(invitation.id)}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Revoca
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}