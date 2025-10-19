'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, FileText, Calendar } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useContractAmendments } from '@/hooks/useContractAmendments'
import { format } from 'date-fns'
import { ContractAmendmentDialog } from './ContractAmendmentDialog'

interface ContractAmendmentsListProps {
  userId: string
}

export function ContractAmendmentsList({ userId }: ContractAmendmentsListProps) {
  const { t } = useTranslation()
  const { amendments, isLoading } = useContractAmendments({ userId })
  const [showDialog, setShowDialog] = useState(false)

  const getAmendmentTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      salary_change: 'default',
      hours_change: 'secondary',
      position_change: 'outline',
      other: 'secondary',
    }

    return (
      <Badge variant={variants[type] as any}>
        {t(`contracts.amendments.types.${type}`)}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'secondary',
      active: 'default',
      superseded: 'outline',
    }

    return (
      <Badge variant={variants[status] as any}>
        {t(`contracts.amendments.status.${status}`)}
      </Badge>
    )
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
      <ContractAmendmentDialog
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
          <h3 className="text-lg font-semibold">{t('contracts.amendments.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('contracts.amendments.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('contracts.amendments.actions.newAmendment')}
        </Button>
      </div>

      {amendments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('contracts.amendments.noAmendments')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {amendments.map((amendment) => (
            <Card key={amendment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        Emendamento #{amendment.id.slice(0, 8)}
                      </CardTitle>
                      {getAmendmentTypeBadge(amendment.amendment_type)}
                      {getStatusBadge(amendment.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(amendment.amendment_date), 'dd MMMM yyyy')}
                      {' → '}
                      {t('contracts.amendments.effectiveFrom')}
                      {' '}
                      {format(new Date(amendment.effective_date), 'dd MMMM yyyy')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {amendment.reason && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('contracts.amendments.reason')}:</p>
                      <p className="text-sm text-muted-foreground">{amendment.reason}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {t('contracts.amendments.previousValues')}
                      </p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(amendment.previous_values).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {t('contracts.amendments.newValues')}
                      </p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(amendment.new_values).map(([key, value]) => (
                          <div key={key} className="text-primary">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {amendment.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('contracts.common.notes')}:</p>
                      <p className="text-sm text-muted-foreground">{amendment.notes}</p>
                    </div>
                  )}
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
