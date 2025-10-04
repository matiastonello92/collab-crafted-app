'use client'

import { useState, useEffect } from 'react'
import { useIsClient } from '@/lib/hydration/HydrationToolkit'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Ban, RefreshCw } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

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
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const isClient = useIsClient()
  const { t } = useTranslation()

  const loadInvitations = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const now = new Date()
      
      // Filter active invitations: pending, not revoked, not accepted, not expired
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          email,
          token,
          status,
          expires_at,
          created_at,
          revoked_at,
          accepted_at,
          invitation_roles_locations (
            role:roles (name, display_name),
            location:locations (name)
          )
        `)
        .in('status', ['pending', 'sent'])
        .is('revoked_at', null)
        .is('accepted_at', null)
        .gt('expires_at', now.toISOString())
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const processedInvitations: Invitation[] = data?.map((inv: any) => {
        const roleInfo = inv.invitation_roles_locations?.[0]?.role
        const locationNames = inv.invitation_roles_locations?.map(
          (invRoleLocation: any) => invRoleLocation.location?.name
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
      toast.error(t('toast.invitation.errorLoading'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setCurrentTime(new Date())
    loadInvitations()
    
    // Listen for invitation creation events - only on client
    if (typeof window !== 'undefined') {
      const handleInvitationCreated = () => loadInvitations()
      window.addEventListener('invitation:created', handleInvitationCreated)
      
      return () => window.removeEventListener('invitation:created', handleInvitationCreated)
    }
  }, [])

  const copyInviteLink = async (token: string) => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/invite/${token}`
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(link)
          toast.success(t('toast.invitation.linkCopied'))
        } catch (error) {
          toast.error(t('toast.invitation.errorCopying'))
        }
      } else {
        // Fallback for older browsers
        try {
          const textArea = document.createElement('textarea')
          textArea.value = link
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          toast.success(t('toast.invitation.linkCopied'))
        } catch (error) {
          toast.error(t('toast.invitation.errorCopying'))
        }
      }
    }
  }

  const revokeInvitation = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/admin/invitations/${id}/revoke`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(t('errorMessages.failedToRevoke'))
      }

      toast.success(t('toast.invitation.revoked'))
      loadInvitations() // Refresh list
    } catch (error) {
      console.error('Error revoking invitation:', error)
      toast.error(t('toast.invitation.errorRevoking'))
    }
  }

  const refreshInvitations = () => {
    setIsRefreshing(true)
    loadInvitations()
  }

  const getStatusColor = (status: string, expiresAt: string) => {
    if (!currentTime) return 'secondary'
    const expiryDate = new Date(expiresAt)
    
    if (status === 'accepted') return 'default'
    if (status === 'revoked') return 'destructive'
    if (status === 'sent') return 'default'
    if (currentTime > expiryDate) return 'secondary'
    return 'secondary'
  }

  const getStatusLabel = (status: string, expiresAt: string) => {
    if (!currentTime) return t('admin.invitationsList.statusPending')
    const expiryDate = new Date(expiresAt)
    
    if (status === 'accepted') return t('admin.invitationsList.statusAccepted')
    if (status === 'revoked') return t('admin.invitationsList.statusRevoked')
    if (status === 'sent') return t('admin.invitationsList.statusSent')
    if (currentTime > expiryDate) return t('admin.invitationsList.statusExpired')
    return t('admin.invitationsList.statusPending')
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
          {t('admin.invitationsList.activeInvites').replace('{count}', invitations.length.toString())}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshInvitations}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('admin.invitationsList.refresh')}
        </Button>
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('admin.invitationsList.noInvites')}</p>
          <p className="text-xs mt-1">{t('admin.invitationsList.noInvitesDescription')}</p>
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
                      {t('admin.invitationsList.role')}: {invitation.role_name}
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
                    {isClient ? (
                      <>
                        {t('admin.invitationsList.createdAgo')} {formatDistanceToNow(new Date(invitation.created_at), {
                          addSuffix: true,
                          locale: it
                        })} • {t('admin.invitationsList.expiresIn')} {formatDistanceToNow(new Date(invitation.expires_at), {
                          addSuffix: true,
                          locale: it
                        })}
                      </>
                    ) : (
                      <>{t('admin.invitationsList.createdAgo')}: {invitation.created_at} • {t('admin.invitationsList.expiresIn')}: {invitation.expires_at}</>
                    )}
                  </p>
                </div>
              </div>

              {(invitation.status === 'pending' || invitation.status === 'sent') && currentTime && currentTime < new Date(invitation.expires_at) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invitation.token)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {t('admin.invitationsList.copyLink')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeInvitation(invitation.id)}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    {t('admin.invitationsList.revoke')}
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