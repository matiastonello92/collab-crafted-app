'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Train } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useTransportAllowances } from '@/hooks/useTransportAllowances'
import { format } from 'date-fns'
import { it, enUS } from 'date-fns/locale'
import { TransportAllowanceDialog } from './TransportAllowanceDialog'

interface TransportAllowancesListProps {
  userId: string
}

export function TransportAllowancesList({ userId }: TransportAllowancesListProps) {
  const { t, locale } = useTranslation()
  const { allowances, isLoading } = useTransportAllowances({ userId })
  const [showDialog, setShowDialog] = useState(false)

  const dateLocale = locale === 'it' ? it : enUS

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: t('contracts.transport.status.active') },
      suspended: { variant: 'secondary', label: t('contracts.transport.status.suspended') },
      terminated: { variant: 'destructive', label: t('contracts.transport.status.terminated') },
    }

    const { variant, label } = config[status] || config.active

    return <Badge variant={variant}>{label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <TransportAllowanceDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        userId={userId}
        onSuccess={() => {
          setShowDialog(false)
        }}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('contracts.transport.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('contracts.transport.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('contracts.transport.actions.newAllowance')}
        </Button>
      </div>

      {allowances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Train className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('contracts.transport.noAllowances')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allowances.map((allowance) => (
            <Card key={allowance.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{allowance.allowance_name}</h4>
                      <Badge variant="outline">
                        {t(`contracts.transport.types.${allowance.allowance_type}`)}
                      </Badge>
                      {getStatusBadge(allowance.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('contracts.transport.fields.monthlyAmount')}</p>
                        <p className="font-medium">
                          €{allowance.monthly_amount.toFixed(2)}/mese
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('contracts.transport.fields.employerContribution')}</p>
                        <p className="font-medium">
                          {allowance.employer_contribution_pct}% (€{(allowance.monthly_amount * allowance.employer_contribution_pct / 100).toFixed(2)})
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('contracts.transport.fields.period')}</p>
                        <p className="font-medium">
                          {format(new Date(allowance.start_date), 'dd/MM/yy', { locale: dateLocale })}
                          {allowance.end_date && ` - ${format(new Date(allowance.end_date), 'dd/MM/yy', { locale: dateLocale })}`}
                          {!allowance.end_date && ' - Presente'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </>
  )
}
