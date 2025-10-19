'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Calendar, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'
import { usePermissionCheck } from '@/hooks/usePermissions'
import { ContractsList } from './ContractsList'

interface ContractsSchedulingPanelProps {
  userId: string
  isSchedulable: boolean
  userFullName: string
}

export function ContractsSchedulingPanel({ userId, isSchedulable: initialSchedulable, userFullName }: ContractsSchedulingPanelProps) {
  const supabase = useSupabase()
  const { hasPermission } = usePermissionCheck()
  const [isSchedulable, setIsSchedulable] = useState(initialSchedulable)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const canManageContracts = hasPermission('users:manage_contracts') || hasPermission('users:manage')

  const handleSchedulableToggle = async (checked: boolean) => {
    setIsUpdating(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_schedulable: checked })
        .eq('id', userId)

      if (error) throw error

      setIsSchedulable(checked)
      
      toast.success(
        checked 
          ? `${userFullName} è ora pianificabile nei turni`
          : `${userFullName} non è più pianificabile nei turni`
      )
    } catch (error) {
      console.error('Error updating schedulable status:', error)
      toast.error('Errore durante l\'aggiornamento dello stato pianificabile')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Scheduling Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Stato Pianificazione
          </CardTitle>
          <CardDescription>
            Controlla se questo utente può essere assegnato ai turni nel planner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor="schedulable-toggle" className="text-base font-medium">
                Utente Pianificabile
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isSchedulable 
                  ? 'L\'utente appare nel planner e può essere assegnato ai turni'
                  : 'L\'utente non appare nel planner e non può essere assegnato ai turni'
                }
              </p>
            </div>
            <Switch
              id="schedulable-toggle"
              checked={isSchedulable}
              onCheckedChange={handleSchedulableToggle}
              disabled={isUpdating || !canManageContracts}
            />
          </div>

          {/* Visual Feedback */}
          {isSchedulable ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Utente Pianificabile</AlertTitle>
              <AlertDescription>
                Questo utente è abilitato per la pianificazione dei turni e apparirà nelle viste del planner.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Utente Non Pianificabile</AlertTitle>
              <AlertDescription>
                Questo utente non può essere assegnato ai turni. Attiva l'opzione sopra per renderlo pianificabile.
              </AlertDescription>
            </Alert>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Stato corrente:</span>
            <Badge variant={isSchedulable ? 'default' : 'secondary'}>
              {isSchedulable ? 'Pianificabile' : 'Non Pianificabile'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Section */}
      {canManageContracts ? (
        <ContractsList userId={userId} userFullName={userFullName} />
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Permessi Insufficienti</AlertTitle>
          <AlertDescription>
            Non hai i permessi necessari per gestire i contratti. Contatta un amministratore.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
