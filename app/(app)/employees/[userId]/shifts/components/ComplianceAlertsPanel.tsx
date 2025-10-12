'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface ComplianceAlert {
  id: string
  ruleKey: string
  ruleName: string
  severity: 'warning' | 'critical'
  violationDate: string
  details: any
}

interface ComplianceAlertsPanelProps {
  alerts: ComplianceAlert[]
  loading: boolean
}

export function ComplianceAlertsPanel({ alerts, loading }: ComplianceAlertsPanelProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.shifts.compliance.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{t('employees.shifts.compliance.allGood')}</p>
              <p className="text-sm text-green-600">
                {t('employees.shifts.compliance.noViolations')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          {t('employees.shifts.compliance.title')} ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between p-3 rounded-lg border bg-orange-50/50 border-orange-200"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className={
                      alert.severity === 'warning'
                        ? 'bg-orange-100 text-orange-800'
                        : ''
                    }
                  >
                    {t(`employees.shifts.compliance.severity.${alert.severity}`)}
                  </Badge>
                  <span className="font-medium text-sm">{alert.ruleName}</span>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {format(new Date(alert.violationDate), 'EEE d MMM yyyy', { locale: it })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
