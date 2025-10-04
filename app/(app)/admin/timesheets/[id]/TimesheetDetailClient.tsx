'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, CheckCircle, Clock, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'
import { formatMinutesToHours } from '@/lib/shifts/timesheet-calculator'
import type { Timesheet } from '@/types/shifts'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

interface TimesheetWithUser extends Timesheet {
  user?: {
    email?: string
    raw_user_meta_data?: {
      full_name?: string
    }
  }
}

export default function TimesheetDetailClient({ timesheetId }: { timesheetId: string }) {
  const { t } = useTranslation()
  const supabase = useSupabase()
  const router = useRouter()
  const [timesheet, setTimesheet] = useState<TimesheetWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchTimesheet()
  }, [timesheetId])

  async function fetchTimesheet() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          user:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('id', timesheetId)
        .single()

      if (error) throw error
      setTimesheet(data)
      setNotes(data.notes || '')
    } catch (err: any) {
      toast.error(err.message || t('toast.timesheet.errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    try {
      setApproving(true)
      
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        throw new Error('Non autenticato')
      }

      const res = await fetch(`/api/v1/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({ notes })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Approvazione fallita')
      }

      toast.success(t('toast.timesheet.approved'))
      
      fetchTimesheet()
    } catch (err: any) {
      toast.error(err.message || t('toast.timesheet.errorApproving'))
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">{t('admin.loading')}</p>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">{t('admin.timesheetDetailNotFound')}</p>
      </div>
    )
  }

  const totals = timesheet.totals
  const totalHours = totals.regular_minutes + totals.overtime_minutes

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/timesheets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              {timesheet.user?.raw_user_meta_data?.full_name || timesheet.user?.email}
            </h1>
            <Badge variant={
              timesheet.status === 'approved' ? 'default' :
              timesheet.status === 'locked' ? 'secondary' : 'outline'
            }>
              {timesheet.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{timesheet.period_start} - {timesheet.period_end}</span>
          </div>
        </div>
        {!timesheet.approved_at && (
          <Button onClick={handleApprove} disabled={approving}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {approving ? t('admin.timesheetDetailApproving') : t('admin.timesheetDetailApproveButton')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t('admin.timesheets.totalHours')}</div>
          <div className="text-3xl font-bold">{formatMinutesToHours(totalHours)}h</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t('admin.timesheetDetailRegularHours')}</div>
          <div className="text-3xl font-bold">{formatMinutesToHours(totals.regular_minutes)}h</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t('admin.timesheetDetailOvertime')}</div>
          <div className="text-3xl font-bold text-orange-600">
            {formatMinutesToHours(totals.overtime_minutes)}h
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t('admin.timesheetDetailDaysWorked')}</div>
          <div className="text-3xl font-bold">{totals.days_worked}</div>
        </Card>
      </div>

      {/* Breakdown */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">{t('admin.timesheetDetailBreakdown')}</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">{t('admin.timesheetDetailBreakTotal')}</span>
            <span className="font-semibold">{formatMinutesToHours(totals.break_minutes)}h</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">{t('admin.timesheetDetailPlannedHours')}</span>
            <span className="font-semibold">{formatMinutesToHours(totals.planned_minutes)}h</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">{t('admin.timesheetDetailVariance')}</span>
            <span className={`font-semibold ${totals.variance_minutes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.variance_minutes >= 0 ? '+' : ''}
              {formatMinutesToHours(totals.variance_minutes)}h
            </span>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">{t('admin.timesheetDetailNotes')}</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('admin.timesheetDetailNotesPlaceholder')}
          rows={4}
          disabled={!!timesheet.approved_at}
        />
      </Card>

      {timesheet.approved_at && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              Approvato il {new Date(timesheet.approved_at).toLocaleDateString('it-IT')}
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}
