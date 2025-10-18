'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LogIn, LogOut, Coffee, Play, User } from 'lucide-react'
import { getTodaySessionSummary } from '@/lib/shifts/time-clock-logic'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { useTranslation } from '@/lib/i18n'

interface PunchButtonsProps {
  locationId: string
  userId: string
  userName: string
  kioskToken: string
  onLogout: () => void
  orgId: string
}

type PunchKind = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'

export function PunchButtons({
  locationId,
  userId,
  userName,
  kioskToken,
  onLogout,
  orgId
}: PunchButtonsProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<{
    totalMinutes: number
    breakMinutes: number
    status: 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out'
  } | null>(null)
  
  const [nextShift, setNextShift] = useState<{
    start_at: string
    end_at: string
    job_tag?: string
  } | null>(null)

  useEffect(() => {
    loadSessionSummary()
    loadNextShift()
  }, [])

  const loadSessionSummary = async () => {
    try {
      const res = await fetch(
        `/api/v1/timeclock/session-summary?userId=${userId}&locationId=${locationId}&orgId=${orgId}`
      )
      if (res.ok) {
        const data = await res.json()
        setSessionSummary(data)
      }
    } catch (error) {
      console.error('Error loading session summary:', error)
    }
  }

  const loadNextShift = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

    const { data: assignments } = await supabase
      .from('shift_assignments')
      .select(`
        shift_id,
        shifts!inner (
          start_at,
          end_at,
          job_tag_id,
          job_tags (
            label_it
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'assigned')
      .gte('shifts.start_at', startOfDay.toISOString())
      .lte('shifts.start_at', endOfDay.toISOString())
      .order('shifts.start_at', { ascending: true })
      .limit(1)

      if (assignments && assignments.length > 0 && assignments[0].shifts) {
        const shift = assignments[0].shifts as any
        setNextShift({
          start_at: shift.start_at,
          end_at: shift.end_at,
          job_tag: shift.job_tags?.label_it
        })
      }
    } catch (error) {
      console.error('Error loading next shift:', error)
    }
  }

  const handlePunch = async (kind: PunchKind) => {
    setIsLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()

      const res = await fetch('/api/v1/timeclock/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          kind,
          source: 'kiosk',
          kiosk_token: kioskToken
        })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || t('kiosk.errors.punchError'))
        return
      }

      toast.success(t(`kiosk.punchSuccess.${kind}`))

      // Reload status after punch
      await loadSessionSummary()

      // Auto-logout after 3 seconds
      setTimeout(() => {
        onLogout()
      }, 3000)
    } catch (error) {
      console.error('Punch error:', error)
      toast.error(t('kiosk.errors.punchError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* User Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/30 flex items-center justify-center mx-auto shadow-2xl">
          <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{userName}</h2>
        <p className="text-white/70 text-base md:text-lg">{t('kiosk.chooseAction')}</p>
      </div>

      {/* Session Summary */}
      {sessionSummary && sessionSummary.status !== 'not_started' && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-3 md:p-4 text-center space-y-1 shadow-xl">
          <p className="text-xs md:text-sm text-white/70">{t('kiosk.hoursToday')}</p>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {Math.floor(sessionSummary.totalMinutes / 60)}h {sessionSummary.totalMinutes % 60}m
          </p>
          {sessionSummary.breakMinutes > 0 && (
            <p className="text-xs md:text-sm text-white/60">
              {t('kiosk.breaks')}: {sessionSummary.breakMinutes}m
            </p>
          )}
        </div>
      )}

      {/* Next Shift */}
      {nextShift ? (
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/30 rounded-2xl p-3 md:p-4 text-center space-y-1 shadow-xl">
          <p className="text-xs md:text-sm text-white/70">{t('kiosk.nextShift')}</p>
          <p className="text-xl md:text-2xl font-bold text-white">
            {new Date(nextShift.start_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            {' - '}
            {new Date(nextShift.end_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {nextShift.job_tag && (
            <p className="text-xs md:text-sm text-white/80">
              {nextShift.job_tag}
            </p>
          )}
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-3 text-center shadow-xl">
          <p className="text-xs md:text-sm text-white/50">{t('kiosk.noShiftsScheduled')}</p>
        </div>
      )}

      {/* Punch Buttons */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* Clock In - solo se not_started o clocked_out */}
        {(sessionSummary?.status === 'not_started' || sessionSummary?.status === 'clocked_out') && (
          <Button
            size="lg"
            variant="default"
            onClick={() => handlePunch('clock_in')}
            disabled={isLoading}
            className="h-20 md:h-24 text-base md:text-lg flex-col gap-2 backdrop-blur-xl bg-gradient-to-br from-green-500/80 to-emerald-600/80 hover:from-green-400/90 hover:to-emerald-500/90 border-2 border-white/30 text-white font-bold shadow-2xl transition-all hover:scale-105 col-span-2"
          >
            <LogIn className="w-8 h-8 md:w-10 md:h-10" />
            {t('kiosk.clockIn')}
          </Button>
        )}

        {/* Clock Out - solo se clocked_in */}
        {sessionSummary?.status === 'clocked_in' && (
          <Button
            size="lg"
            variant="default"
            onClick={() => handlePunch('clock_out')}
            disabled={isLoading}
            className="h-20 md:h-24 text-base md:text-lg flex-col gap-2 backdrop-blur-xl bg-gradient-to-br from-red-500/80 to-rose-600/80 hover:from-red-400/90 hover:to-rose-500/90 border-2 border-white/30 text-white font-bold shadow-2xl transition-all hover:scale-105"
          >
            <LogOut className="w-8 h-8 md:w-10 md:h-10" />
            {t('kiosk.clockOut')}
          </Button>
        )}

        {/* Pausa - solo se clocked_in */}
        {sessionSummary?.status === 'clocked_in' && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => handlePunch('break_start')}
            disabled={isLoading}
            className="h-20 md:h-24 text-base md:text-lg flex-col gap-2 backdrop-blur-xl bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 text-white font-bold shadow-2xl transition-all hover:scale-105"
          >
            <Coffee className="w-8 h-8 md:w-10 md:h-10" />
            {t('kiosk.breakStart')}
          </Button>
        )}

        {/* Termina Pausa - solo se on_break */}
        {sessionSummary?.status === 'on_break' && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handlePunch('break_end')}
              disabled={isLoading}
              className="h-20 md:h-24 text-base md:text-lg flex-col gap-2 backdrop-blur-xl bg-gradient-to-br from-amber-500/80 to-orange-600/80 hover:from-amber-400/90 hover:to-orange-500/90 border-2 border-white/30 text-white font-bold shadow-2xl transition-all hover:scale-105 col-span-2"
            >
              <Play className="w-8 h-8 md:w-10 md:h-10" />
              {t('kiosk.breakEnd')}
            </Button>
          </>
        )}
      </div>

      {/* Logout Button */}
      <div className="text-center pt-2">
        <Button
          variant="ghost"
          onClick={onLogout}
          disabled={isLoading}
          className="text-white/60 hover:text-white hover:bg-white/10 text-base md:text-lg px-6 py-3"
        >
          {t('kiosk.changeUser').replace('{name}', userName)}
        </Button>
      </div>
    </div>
  )
}
