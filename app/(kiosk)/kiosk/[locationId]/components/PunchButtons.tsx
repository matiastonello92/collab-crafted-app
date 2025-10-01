'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LogIn, LogOut, Coffee, Play, User } from 'lucide-react'
import { getTodaySessionSummary } from '@/lib/shifts/time-clock-logic'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

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
        toast.error(error.error || 'Errore durante la timbratura')
        return
      }

      const kindLabels = {
        clock_in: 'Ingresso registrato',
        clock_out: 'Uscita registrata',
        break_start: 'Inizio pausa registrato',
        break_end: 'Fine pausa registrata'
      }

      toast.success(kindLabels[kind])

      // Auto-logout after 3 seconds
      setTimeout(() => {
        onLogout()
      }, 3000)
    } catch (error) {
      console.error('Punch error:', error)
      toast.error('Errore durante la timbratura. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* User Header */}
      <div className="text-center space-y-2">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <User className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">{userName}</h2>
        <p className="text-muted-foreground">Scegli un'azione</p>
      </div>

      {/* Session Summary */}
      {sessionSummary && sessionSummary.status !== 'not_started' && (
        <div className="bg-muted/50 rounded-lg p-4 text-center space-y-1">
          <p className="text-sm text-muted-foreground">Ore lavorate oggi</p>
          <p className="text-2xl font-bold text-foreground">
            {Math.floor(sessionSummary.totalMinutes / 60)}h {sessionSummary.totalMinutes % 60}m
          </p>
          {sessionSummary.breakMinutes > 0 && (
            <p className="text-xs text-muted-foreground">
              Pause: {sessionSummary.breakMinutes}m
            </p>
          )}
        </div>
      )}

      {/* Punch Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="default"
          onClick={() => handlePunch('clock_in')}
          disabled={isLoading}
          className="h-28 text-xl flex-col gap-3 bg-primary hover:bg-primary/90"
        >
          <LogIn className="w-10 h-10" />
          Ingresso
        </Button>

        <Button
          size="lg"
          variant="default"
          onClick={() => handlePunch('clock_out')}
          disabled={isLoading}
          className="h-28 text-xl flex-col gap-3 bg-destructive hover:bg-destructive/90"
        >
          <LogOut className="w-10 h-10" />
          Uscita
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => handlePunch('break_start')}
          disabled={isLoading}
          className="h-28 text-xl flex-col gap-3 border-2"
        >
          <Coffee className="w-10 h-10" />
          Inizio Pausa
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => handlePunch('break_end')}
          disabled={isLoading}
          className="h-28 text-xl flex-col gap-3 border-2"
        >
          <Play className="w-10 h-10" />
          Fine Pausa
        </Button>
      </div>

      {/* Logout Button */}
      <div className="text-center pt-4">
        <Button
          variant="ghost"
          onClick={onLogout}
          disabled={isLoading}
          className="text-muted-foreground"
        >
          Non sei {userName}? Cambia utente
        </Button>
      </div>
    </div>
  )
}
