'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertCircle, FileText, Clock, Shield } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface UserContract {
  id: string
  contract_type: string
  start_date: string
  end_date: string | null
  weekly_hours: number
  daily_hours_min: number | null
  daily_hours_max: number | null
  min_rest_hours: number | null
  max_consecutive_days: number | null
  max_weekly_hours: number | null
  notes: string | null
  is_active: boolean
  created_at: string
}

interface UserContractsViewProps {
  userId: string
  isSchedulable: boolean
}

export function UserContractsView({ userId, isSchedulable }: UserContractsViewProps) {
  const [contracts, setContracts] = useState<UserContract[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()
  const { t } = useTranslation()

  useEffect(() => {
    loadContracts()
  }, [userId])

  const loadContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_contracts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      console.error('Error loading contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full_time: t('contracts.fullTime'),
      part_time: t('contracts.partTime'),
      seasonal: t('contracts.seasonal'),
      temporary: t('contracts.temporary'),
      internship: t('contracts.internship')
    }
    return labels[type] || type
  }

  if (!isSchedulable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('contracts.notSchedulable')}</AlertTitle>
        <AlertDescription>
          {t('contracts.notSchedulableDescription')}
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return <div>{t('common.loading')}</div>
  }

  if (contracts.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>{t('contracts.noContracts')}</AlertTitle>
        <AlertDescription>
          {t('contracts.noContractsDescription')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>{t('contracts.readOnlyTitle')}</AlertTitle>
        <AlertDescription>
          {t('contracts.readOnlyDescription')}
        </AlertDescription>
      </Alert>

      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {getContractTypeLabel(contract.contract_type)}
              </CardTitle>
              <Badge variant={contract.is_active ? 'default' : 'secondary'}>
                {contract.is_active ? t('contracts.active') : t('contracts.inactive')}
              </Badge>
            </div>
            <CardDescription>
              {t('contracts.validFrom')} {format(new Date(contract.start_date), 'PPP', { locale: it })}
              {contract.end_date && (
                <> {t('contracts.to')} {format(new Date(contract.end_date), 'PPP', { locale: it })}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Working Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {t('contracts.weeklyHours')}
                </div>
                <p className="text-2xl font-bold">{contract.weekly_hours}h</p>
              </div>
              
              {(contract.daily_hours_min || contract.daily_hours_max) && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">{t('contracts.dailyHours')}</div>
                  <p className="text-sm text-muted-foreground">
                    {contract.daily_hours_min && `Min: ${contract.daily_hours_min}h`}
                    {contract.daily_hours_min && contract.daily_hours_max && ' | '}
                    {contract.daily_hours_max && `Max: ${contract.daily_hours_max}h`}
                  </p>
                </div>
              )}
            </div>

            {/* Scheduling Constraints */}
            {(contract.min_rest_hours || contract.max_consecutive_days || contract.max_weekly_hours) && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">{t('contracts.schedulingConstraints')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {contract.min_rest_hours && (
                    <div>
                      <span className="text-muted-foreground">{t('contracts.minRestHours')}:</span>
                      <span className="ml-2 font-medium">{contract.min_rest_hours}h</span>
                    </div>
                  )}
                  {contract.max_consecutive_days && (
                    <div>
                      <span className="text-muted-foreground">{t('contracts.maxConsecutiveDays')}:</span>
                      <span className="ml-2 font-medium">{contract.max_consecutive_days}</span>
                    </div>
                  )}
                  {contract.max_weekly_hours && (
                    <div>
                      <span className="text-muted-foreground">{t('contracts.maxWeeklyHours')}:</span>
                      <span className="ml-2 font-medium">{contract.max_weekly_hours}h</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {contract.notes && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">{t('contracts.notes')}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
