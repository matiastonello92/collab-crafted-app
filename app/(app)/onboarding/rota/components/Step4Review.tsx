'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Calendar, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

interface Shift {
  id: string
  start_at: string
  assigned_user_id?: string
}

interface Step4Props {
  rotaId: string
  shifts: Shift[]
  onBack: () => void
}

export function Step4Review({ rotaId, shifts, onBack }: Step4Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)

  const assignedShifts = shifts.filter((s) => s.assigned_user_id)
  const unassignedShifts = shifts.filter((s) => !s.assigned_user_id)
  const uniqueUsers = new Set(assignedShifts.map((s) => s.assigned_user_id)).size

  const handlePublish = async () => {
    if (unassignedShifts.length > 0) {
      const confirmMessage = t('onboarding.step4.unassignedConfirm').replace('{count}', unassignedShifts.length.toString())
      if (!confirm(confirmMessage)) {
        return
      }
    }

    setPublishing(true)
    try {
      const res = await fetch(`/api/v1/rotas/${rotaId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || t('onboarding.step4.toast.publishError'))
      }

      toast.success(t('onboarding.step4.toast.publishSuccess'))
      
      // Redirect to planner
      setTimeout(() => {
        router.push('/planner')
      }, 2000)
    } catch (error: any) {
      console.error('Error publishing rota:', error)
      toast.error(error.message || t('onboarding.step4.toast.publishError'))
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step4.title')}</h2>
        <p className="text-muted-foreground">
          {t('onboarding.step4.description')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{shifts.length}</p>
              <p className="text-sm text-muted-foreground">{t('onboarding.step4.totalShifts')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{uniqueUsers}</p>
              <p className="text-sm text-muted-foreground">{t('onboarding.step4.usersInvolved')}</p>
            </div>
          </div>
        </Card>
      </div>

      {assignedShifts.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            {assignedShifts.length} {t('onboarding.step4.assignedReady')}
          </AlertDescription>
        </Alert>
      )}

      {unassignedShifts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {unassignedShifts.length} {t('onboarding.step4.unassignedWarning')}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <h3 className="font-medium mb-3">{t('onboarding.step4.whatHappens')}</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <span>{t('onboarding.step4.step1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <span>{t('onboarding.step4.step2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <span>{t('onboarding.step4.step3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <span>{t('onboarding.step4.step4')}</span>
          </li>
        </ul>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={publishing}>
          {t('onboarding.step4.buttons.back')}
        </Button>
        <Button onClick={handlePublish} disabled={publishing || shifts.length === 0}>
          {publishing ? t('onboarding.step4.buttons.publishing') : t('onboarding.step4.buttons.publish')}
        </Button>
      </div>
    </div>
  )
}
