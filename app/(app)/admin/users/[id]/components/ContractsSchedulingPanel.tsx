'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
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
  const { t } = useTranslation()
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
          ? t('contracts.scheduling.messages.schedulableEnabled').replace('{userFullName}', userFullName)
          : t('contracts.scheduling.messages.schedulableDisabled').replace('{userFullName}', userFullName)
      )
    } catch (error) {
      console.error('Error updating schedulable status:', error)
      toast.error(t('contracts.scheduling.messages.updateError'))
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
            {t('contracts.scheduling.title')}
          </CardTitle>
          <CardDescription>
            {t('contracts.scheduling.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor="schedulable-toggle" className="text-base font-medium">
                {t('contracts.scheduling.schedulableLabel')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isSchedulable 
                  ? t('contracts.scheduling.schedulableTrue')
                  : t('contracts.scheduling.schedulableFalse')
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
              <AlertTitle>{t('contracts.scheduling.schedulableTitle')}</AlertTitle>
              <AlertDescription>
                {t('contracts.scheduling.schedulableAlert')}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>{t('contracts.scheduling.notSchedulableTitle')}</AlertTitle>
              <AlertDescription>
                {t('contracts.scheduling.notSchedulableAlert')}
              </AlertDescription>
            </Alert>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">{t('contracts.scheduling.currentStatus')}:</span>
            <Badge variant={isSchedulable ? 'default' : 'secondary'}>
              {isSchedulable ? t('contracts.scheduling.schedulable') : t('contracts.scheduling.notSchedulable')}
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
          <AlertTitle>{t('contracts.scheduling.insufficientPermissions')}</AlertTitle>
          <AlertDescription>
            {t('contracts.scheduling.insufficientPermissionsDescription')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
