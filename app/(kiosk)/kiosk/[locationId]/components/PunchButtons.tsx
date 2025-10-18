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
}

type PunchKind = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'

export function PunchButtons({
  locationId,
  userId,
  userName,
  kioskToken,
  onLogout
}: PunchButtonsProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<{
    totalMinutes: number
    breakMinutes: number
    status: 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out'
  } | null>(null)

  useEffect(() => {
    loadSessionSummary()
  }, [])

  const loadSessionSummary = async () => {
    // Note: This would need to be called via API in production
    // For MVP, we'll just show current state based on last punch
    setSessionSummary({
      totalMinutes: 0,
      breakMinutes: 0,
      status: 'not_started'
    })
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
    <div className="space-y-10">
      {/* User Header */}
      <div className="text-center space-y-4">
        <div className="w-24 h-24 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/30 flex items-center justify-center mx-auto shadow-2xl">
          <User className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white drop-shadow-lg">{userName}</h2>
        <p className="text-white/70 text-lg">{t('kiosk.chooseAction')}</p>
      </div>

      {/* Session Summary */}
      {sessionSummary && sessionSummary.status !== 'not_started' && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center space-y-2 shadow-xl">
          <p className="text-sm text-white/70">{t('kiosk.hoursToday')}</p>
          <p className="text-3xl font-bold text-white">
            {Math.floor(sessionSummary.totalMinutes / 60)}h {sessionSummary.totalMinutes % 60}m
          </p>
          {sessionSummary.breakMinutes > 0 && (
            <p className="text-sm text-white/60">
              {t('kiosk.breaks')}: {sessionSummary.breakMinutes}m
            </p>
          )}
        </div>
      )}

      {/* Punch Buttons */}
      <div className="grid grid-cols-2 gap-5">
        <Button
          size="lg"
          variant="default"
          onClick={() => handlePunch('clock_in')}
          disabled={isLoading}
          className="h-32 text-xl flex-col gap-4 backdrop-blur-xl bg-gradient-to-br from-green-500/80 to-emerald-600/80 hover:from-green-400/90 hover:to-emerald-500/90 border-2 border-white/30 text-white font-bold shadow-2xl transition-all hover:scale-105"
        >
          <LogIn className="w-12 h-12" />
          {t('kiosk.clockIn')}
        </Button>

        <Button
          size="lg"
          variant="default"
          onClick={() => handlePunch('clock_out')}
          disabled={isLoading}
          className="h-32 text-xl flex-col gap-4 backdrop-blur-xl bg-gradient-to-br from-red-500/80 to-rose-600/80 hover:from-red-400/90 hover:to-rose-500/90 border-2 border-white/30 text-white font-bold shadow-2xl transition-all hover:scale-105"
        >
          <LogOut className="w-12 h-12" />
          {t('kiosk.clockOut')}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => handlePunch('break_start')}
          disabled={isLoading}
          className="h-32 text-xl flex-col gap-4 backdrop-blur-xl bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 text-white font-bold shadow-2xl transition-all hover:scale-105"
        >
          <Coffee className="w-12 h-12" />
          {t('kiosk.breakStart')}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => handlePunch('break_end')}
          disabled={isLoading}
          className="h-32 text-xl flex-col gap-4 backdrop-blur-xl bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 text-white font-bold shadow-2xl transition-all hover:scale-105"
        >
          <Play className="w-12 h-12" />
          {t('kiosk.breakEnd')}
        </Button>
      </div>

      {/* Logout Button */}
      <div className="text-center pt-4">
        <Button
          variant="ghost"
          onClick={onLogout}
          disabled={isLoading}
          className="text-white/60 hover:text-white hover:bg-white/10 text-lg px-6 py-3"
        >
          {t('kiosk.changeUser').replace('{name}', userName)}
        </Button>
      </div>
    </div>
  )
}
