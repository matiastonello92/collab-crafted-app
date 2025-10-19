'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import { ContractsList } from './ContractsList'
import { ContractAmendmentsList } from './ContractAmendmentsList'
import { TransportAllowancesList } from './TransportAllowancesList'
import { BonusesAdvancesList } from './BonusesAdvancesList'
import { useSupabase } from '@/hooks/useSupabase'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface ContractsSchedulingPanelProps {
  userId: string
  isSchedulable: boolean
  userFullName: string
}

export function ContractsSchedulingPanel({ userId, isSchedulable: initialSchedulable, userFullName }: ContractsSchedulingPanelProps) {
  const supabase = useSupabase()
  const { t } = useTranslation()
  const { permissions } = usePermissions()
  const [isSchedulable, setIsSchedulable] = useState(initialSchedulable)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const canManageContracts = checkPermission(permissions, ['users:manage_contracts', 'users:manage'])

  const handleSchedulableToggle = async (checked: boolean) => {
    setIsUpdating(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_schedulable: checked })
        .eq('id', userId)

      if (error) throw error

      setIsSchedulable(checked)
      toast.success(checked ? `${userFullName} è ora programmabile` : `${userFullName} non è più programmabile`)
    } catch (error) {
      console.error('Error updating schedulable status:', error)
      toast.error('Errore aggiornamento stato')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contratti e Programmazione</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is-schedulable" className="text-base">Programmabile</Label>
            <p className="text-sm text-muted-foreground">L'utente può essere assegnato ai turni</p>
          </div>
          <Switch id="is-schedulable" checked={isSchedulable} onCheckedChange={handleSchedulableToggle} disabled={isUpdating} />
        </div>

        {canManageContracts ? (
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="current">Contratto Attuale</TabsTrigger>
              <TabsTrigger value="all">Tutti & Avenant</TabsTrigger>
              <TabsTrigger value="transport">Indennità</TabsTrigger>
              <TabsTrigger value="bonuses">Premi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="mt-6"><ContractsList userId={userId} userFullName={userFullName} /></TabsContent>
            <TabsContent value="all" className="mt-6"><ContractAmendmentsList userId={userId} /></TabsContent>
            <TabsContent value="transport" className="mt-6"><TransportAllowancesList userId={userId} /></TabsContent>
            <TabsContent value="bonuses" className="mt-6"><BonusesAdvancesList userId={userId} /></TabsContent>
          </Tabs>
        ) : (
          <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Non hai i permessi necessari</AlertDescription></Alert>
        )}
      </CardContent>
    </Card>
  )
}
