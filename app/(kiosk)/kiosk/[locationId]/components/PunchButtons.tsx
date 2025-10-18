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
      const res = await fetch(
        `/api/v1/timeclock/my-shifts?userId=${userId}&locationId=${locationId}`
      )
      
      if (!res.ok) {
        console.error('Failed to load next shift:', res.statusText)
        return
      }

      const { shifts } = await res.json()
      console.log('[Kiosk Frontend] Received shifts:', shifts)

      if (shifts && shifts.length > 0) {
        const shift = shifts[0]
        setNextShift({
          start_at: shift.planned_start_at,
          end_at: shift.planned_end_at,
          job_tag: shift.job_tags?.label_it
        })
      } else {
        setNextShift(null)
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
    <div className="space-y-6">
      {/* User Header - No Icon */}
      <div className="text-center space-y-3">
        <h2 className="text-5xl md:text-6xl font-bold text-white drop-shadow-2xl">{userName}</h2>
        <p className="text-xl text-white/60">{t('kiosk.chooseAction')}</p>
      </div>

      {/* Session Summary - Clean */}
      {sessionSummary && sessionSummary.status !== 'not_started' && (
        <div className="bg-white/15 rounded-3xl p-5 text-center space-y-2">
          <p className="text-sm text-white/60 uppercase tracking-wide">{t('kiosk.hoursToday')}</p>
          <p className="text-5xl font-bold text-white">
            {Math.floor(sessionSummary.totalMinutes / 60)}h {sessionSummary.totalMinutes % 60}m
          </p>
          {sessionSummary.breakMinutes > 0 && (
            <p className="text-sm text-white/70">
              {t('kiosk.breaks')}: {sessionSummary.breakMinutes}m
            </p>
          )}
        </div>
      )}

      {/* Next Shift - Clean */}
      {nextShift ? (
        <div className="bg-gradient-to-br from-blue-500/25 to-cyan-500/25 rounded-3xl p-5 text-center space-y-2">
          <p className="text-sm text-white/70 uppercase tracking-wide">{t('kiosk.nextShift')}</p>
          <p className="text-3xl font-bold text-white">
            {new Date(nextShift.start_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            {' - '}
            {new Date(nextShift.end_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {nextShift.job_tag && (
            <p className="text-base text-white/90 font-medium">
              {nextShift.job_tag}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white/10 rounded-3xl p-5 text-center">
          <p className="text-base text-white/50">{t('kiosk.noShiftsScheduled')}</p>
        </div>
      )}

      {/* Punch Buttons - Glassmorphism */}
      <div className="grid grid-cols-2 gap-4">
        {/* Clock In */}
        {(sessionSummary?.status === 'not_started' || sessionSummary?.status === 'clocked_out') && (
          <Button
            size="lg"
            onClick={() => handlePunch('clock_in')}
            disabled={isLoading}
            className="col-span-2 h-28 text-xl flex-col gap-3 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 border-0 text-white font-bold rounded-3xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-12 h-12" />
            {t('kiosk.clockIn')}
          </Button>
        )}

        {/* Clock Out + Break */}
        {sessionSummary?.status === 'clocked_in' && (
          <>
            <Button
              size="lg"
              onClick={() => handlePunch('clock_out')}
              disabled={isLoading}
              className="h-28 text-xl flex-col gap-3 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 border-0 text-white font-bold rounded-3xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogOut className="w-10 h-10" />
              {t('kiosk.clockOut')}
            </Button>
            <Button
              size="lg"
              onClick={() => handlePunch('break_start')}
              disabled={isLoading}
              className="h-28 text-xl flex-col gap-3 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white font-bold rounded-3xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Coffee className="w-10 h-10" />
              {t('kiosk.breakStart')}
            </Button>
          </>
        )}

        {/* Break End */}
        {sessionSummary?.status === 'on_break' && (
          <Button
            size="lg"
            onClick={() => handlePunch('break_end')}
            disabled={isLoading}
            className="col-span-2 h-28 text-xl flex-col gap-3 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-0 text-white font-bold rounded-3xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-12 h-12" />
            {t('kiosk.breakEnd')}
          </Button>
        )}
      </div>

      {/* Logout Button */}
      <div className="text-center pt-4">
        <Button
          variant="ghost"
          onClick={onLogout}
          disabled={isLoading}
          className="text-white/50 hover:text-white hover:bg-white/10 text-lg px-8 py-4 rounded-2xl"
        >
          {t('kiosk.changeUser').replace('{name}', userName)}
        </Button>
      </div>
    </div>
  )
}
