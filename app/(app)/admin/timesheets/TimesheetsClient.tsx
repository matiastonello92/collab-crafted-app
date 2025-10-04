'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Download, Filter, Plus, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'
import { getCurrentMonthPeriod, formatMinutesToHours } from '@/lib/shifts/timesheet-calculator'
import type { Timesheet } from '@/types/shifts'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

interface TimesheetWithUser extends Timesheet {
  user?: {
    email?: string
    raw_user_meta_data?: {
      full_name?: string
    }
  }
}

export default function TimesheetsClient() {
  const { t } = useTranslation()
  const supabase = useSupabase()
  const [timesheets, setTimesheets] = useState<TimesheetWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    period_start: '',
    period_end: ''
  })
  
  // Export dialog
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFields, setExportFields] = useState([
    'user_email',
    'period',
    'regular_hours',
    'overtime_hours',
    'total_hours',
    'variance_hours',
    'status'
  ])

  useEffect(() => {
    fetchTimesheets()
  }, [filter])

  async function fetchTimesheets() {
    try {
      setLoading(true)
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          user:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .order('period_start', { ascending: false })

      if (filter.status !== 'all') {
        query = query.eq('status', filter.status)
      }
      if (filter.period_start) {
        query = query.gte('period_start', filter.period_start)
      }
      if (filter.period_end) {
        query = query.lte('period_end', filter.period_end)
      }

      const { data, error } = await query

      if (error) throw error
      setTimesheets(data || [])
    } catch (err: any) {
      toast.error(err.message || t('toast.timesheet.errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateForCurrentMonth() {
    try {
      const period = getCurrentMonthPeriod()
      
      // Get all users with time clock events in current month
      const { data: events } = await supabase
        .from('time_clock_events')
        .select('user_id, location_id')
        .gte('occurred_at', period.start)
        .lte('occurred_at', period.end)

      if (!events || events.length === 0) {
        toast.error(t('toast.timesheet.noEvents'))
        return
      }

      // Get unique user/location combinations
      type EventCombo = { user_id: string; location_id: string }
      const uniqueCombos = [...new Map(
        events.map((e: EventCombo) => [`${e.user_id}-${e.location_id}`, e])
      ).values()] as EventCombo[]

      // Generate timesheets
      for (const combo of uniqueCombos) {
        await fetch('/api/v1/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: combo.user_id,
            location_id: combo.location_id,
            period_start: period.start,
            period_end: period.end
          })
        })
      }

      toast.success(`${uniqueCombos.length} ${t('toast.timesheet.generated')}`)
      
      fetchTimesheets()
    } catch (err: any) {
      toast.error(err.message || t('toast.timesheet.errorGenerating'))
    }
  }

  async function handleExport() {
    try {
      const period = getCurrentMonthPeriod()
      
      const res = await fetch('/api/v1/timesheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_start: filter.period_start || period.start,
          period_end: filter.period_end || period.end,
          status: filter.status !== 'all' ? filter.status : undefined,
          fields: exportFields
        })
      })

      if (!res.ok) throw new Error('Export fallito')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheets_${new Date().toISOString().split('T')[0]}.csv`
      a.click()

      toast.success(t('toast.timesheet.exported'))
      
      setExportOpen(false)
    } catch (err: any) {
      toast.error(err.message || t('toast.timesheet.errorExporting'))
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timesheets</h1>
          <p className="text-muted-foreground">Riepilogo ore lavorate e periodi paga</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Timesheets CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seleziona i campi da includere nel CSV
                </p>
                {[
                  { id: 'user_email', label: 'Email Utente' },
                  { id: 'user_name', label: 'Nome Utente' },
                  { id: 'period', label: 'Periodo' },
                  { id: 'regular_hours', label: 'Ore Ordinarie' },
                  { id: 'overtime_hours', label: 'Straordinari' },
                  { id: 'break_hours', label: 'Pause' },
                  { id: 'total_hours', label: 'Ore Totali' },
                  { id: 'planned_hours', label: 'Ore Pianificate' },
                  { id: 'variance_hours', label: 'Differenza' },
                  { id: 'days_worked', label: 'Giorni Lavorati' },
                  { id: 'status', label: 'Stato' },
                  { id: 'approved_at', label: 'Approvato Il' },
                  { id: 'notes', label: 'Note' }
                ].map(field => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Checkbox
                      id={field.id}
                      checked={exportFields.includes(field.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setExportFields([...exportFields, field.id])
                        } else {
                          setExportFields(exportFields.filter(f => f !== field.id))
                        }
                      }}
                    />
                    <Label htmlFor={field.id}>{field.label}</Label>
                  </div>
                ))}
                <Button onClick={handleExport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Scarica CSV
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleGenerateForCurrentMonth}>
            <Plus className="w-4 h-4 mr-2" />
            Genera Mese Corrente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Stato</Label>
            <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="approved">Approvati</SelectItem>
                <SelectItem value="locked">Bloccati</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Da</Label>
            <Input
              type="date"
              value={filter.period_start}
              onChange={(e) => setFilter({ ...filter, period_start: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <Label>A</Label>
            <Input
              type="date"
              value={filter.period_end}
              onChange={(e) => setFilter({ ...filter, period_end: e.target.value })}
            />
          </div>
          <Button variant="outline" onClick={fetchTimesheets}>
            <Filter className="w-4 h-4 mr-2" />
            Filtra
          </Button>
        </div>
      </Card>

      {/* Timesheets List */}
      {loading ? (
        <p className="text-center text-muted-foreground">Caricamento...</p>
      ) : timesheets.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nessun timesheet trovato</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {timesheets.map(ts => (
            <Link key={ts.id} href={`/admin/timesheets/${ts.id}`}>
              <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {ts.user?.raw_user_meta_data?.full_name || ts.user?.email}
                      </span>
                      <Badge variant={
                        ts.status === 'approved' ? 'default' :
                        ts.status === 'locked' ? 'secondary' : 'outline'
                      }>
                        {ts.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {ts.period_start} - {ts.period_end}
                      </span>
                      <span>Giorni: {ts.totals.days_worked}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-2xl font-bold">
                      {formatMinutesToHours(ts.totals.regular_minutes + ts.totals.overtime_minutes)}h
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ts.totals.variance_minutes >= 0 ? '+' : ''}
                      {formatMinutesToHours(ts.totals.variance_minutes)}h vs pianificate
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
