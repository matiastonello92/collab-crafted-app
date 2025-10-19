'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, DollarSign } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useBonusesAdvances } from '@/hooks/useBonusesAdvances'
import { format } from 'date-fns'
import { it, enUS } from 'date-fns/locale'

interface BonusesAdvancesListProps {
  userId: string
}

export function BonusesAdvancesList({ userId }: BonusesAdvancesListProps) {
  const { t, locale } = useTranslation()
  const [filter, setFilter] = useState<'all' | 'bonus' | 'advance' | 'commission'>('all')
  const { bonusesAdvances, isLoading, totals } = useBonusesAdvances({ 
    userId,
    transactionType: filter === 'all' ? undefined : filter
  })
  const [showDialog, setShowDialog] = useState(false)

  const dateLocale = locale === 'it' ? it : enUS

  const getTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      bonus: { variant: 'default', label: t('contracts.bonuses.types.bonus') },
      advance: { variant: 'secondary', label: t('contracts.bonuses.types.advance') },
      commission: { variant: 'outline', label: t('contracts.bonuses.types.commission') },
      other: { variant: 'outline', label: t('contracts.bonuses.types.other') },
    }

    const { variant, label } = config[type] || config.other

    return <Badge variant={variant}>{label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: t('contracts.bonuses.status.pending') },
      approved: { variant: 'default', label: t('contracts.bonuses.status.approved') },
      paid: { variant: 'default', label: t('contracts.bonuses.status.paid') },
      cancelled: { variant: 'destructive', label: t('contracts.bonuses.status.cancelled') },
    }

    const { variant, label } = config[status] || config.pending

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('contracts.bonuses.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('contracts.bonuses.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('contracts.bonuses.actions.newBonusAdvance')}
        </Button>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-1">{t('contracts.bonuses.totalYTD')}</p>
            <p className="text-2xl font-bold">€{totals.ytd.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-1">{t('contracts.bonuses.types.bonus')}</p>
            <p className="text-2xl font-bold">€{totals.bonuses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-1">{t('contracts.bonuses.types.advance')}</p>
            <p className="text-2xl font-bold">€{totals.advances.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-1">{t('contracts.bonuses.types.commission')}</p>
            <p className="text-2xl font-bold">€{totals.commissions.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">{t('contracts.bonuses.filters.all')}</TabsTrigger>
          <TabsTrigger value="bonus">{t('contracts.bonuses.types.bonus')}</TabsTrigger>
          <TabsTrigger value="advance">{t('contracts.bonuses.types.advance')}</TabsTrigger>
          <TabsTrigger value="commission">{t('contracts.bonuses.types.commission')}</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-3 mt-4">
          {bonusesAdvances.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('contracts.bonuses.noBonuses')}
                </p>
              </CardContent>
            </Card>
          ) : (
            bonusesAdvances.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{item.description}</h4>
                        {getTypeBadge(item.transaction_type)}
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t('contracts.bonuses.fields.amount')}</p>
                          <p className="text-lg font-bold text-primary">€{item.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('contracts.bonuses.fields.transactionDate')}</p>
                          <p className="font-medium">
                            {format(new Date(item.transaction_date), 'dd MMMM yyyy', { locale: dateLocale })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('contracts.bonuses.fields.paymentDate')}</p>
                          <p className="font-medium">
                            {item.payment_date 
                              ? format(new Date(item.payment_date), 'dd MMMM yyyy', { locale: dateLocale })
                              : '-'
                            }
                          </p>
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
