'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LogIn, LogOut, Coffee, Play } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { useTranslation } from '@/lib/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
    id: string
    start_at: string
    end_at: string
    actual_start_at?: string | null
    actual_end_at?: string | null
    job_tag?: string
  } | null>(null)

  const [jobTags, setJobTags] = useState<Array<{
    id: string
    key: string
    label_it: string
    categoria: string
    color: string
  }>>([])
  const [showStartShiftDialog, setShowStartShiftDialog] = useState(false)
  const [showUnplannedDialog, setShowUnplannedDialog] = useState(false)
  const [selectedJobTagId, setSelectedJobTagId] = useState<string | null>(null)

  useEffect(() => {
    loadSessionSummary()
    loadNextShift()
    loadJobTags()
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
          id: shift.id,
          start_at: shift.start_at,
          end_at: shift.end_at,
          actual_start_at: shift.actual_start_at, // ✅ Load actual times
          actual_end_at: shift.actual_end_at,     // ✅ Load actual times
          job_tag: shift.job_tags?.label_it
        })
      } else {
        setNextShift(null)
      }
    } catch (error) {
      console.error('Error loading next shift:', error)
    }
  }

  const loadJobTags = async () => {
    try {
      const res = await fetch(`/api/v1/job-tags?locationId=${locationId}`)
      if (res.ok) {
        const { jobTags } = await res.json()
        setJobTags(jobTags || [])
      }
    } catch (error) {
      console.error('Error loading job tags:', error)
    }
  }

  const handlePunch = async (kind: PunchKind, jobTagId?: string) => {
    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/timeclock/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          kind,
          source: 'kiosk',
          kiosk_token: kioskToken,
          job_tag_id: jobTagId
        })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || t('kiosk.errors.punchError'))
        return
      }

      const data = await res.json()
      toast.success(t(`kiosk.punchSuccess.${kind}`))

      // Notify planner to refresh immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shift-updated', { 
          detail: { 
            locationId, 
            kind,
            shiftId: data.shift_id,
            timestamp: new Date().toISOString()
          } 
        }))
      }

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

  const handleStartPlannedShift = () => {
    setShowStartShiftDialog(true)
  }

  const confirmStartShift = () => {
    setShowStartShiftDialog(false)
    handlePunch('clock_in')
  }

  const handleStartUnplannedShift = () => {
    setShowUnplannedDialog(true)
  }

  const confirmUnplannedShift = () => {
    setShowUnplannedDialog(false)
    handlePunch('clock_in', selectedJobTagId || undefined)
    setSelectedJobTagId(null)
  }

  // Helper: show actual time if clocked, otherwise planned
  const getDisplayStartTime = (shift: typeof nextShift) => {
    if (!shift) return ''
    const time = shift.actual_start_at || shift.start_at
    return new Date(time).toLocaleTimeString('it-IT', { 
      hour: '2-digit', minute: '2-digit' 
    })
  }

  const getDisplayEndTime = (shift: typeof nextShift) => {
    if (!shift) return ''
    const time = shift.actual_end_at || shift.end_at
    return new Date(time).toLocaleTimeString('it-IT', { 
      hour: '2-digit', minute: '2-digit' 
    })
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

      {/* Next Shift - Clickable */}
      {nextShift ? (
        <>
          {(sessionSummary?.status === 'not_started' || sessionSummary?.status === 'clocked_out') ? (
            <button
              onClick={handleStartPlannedShift}
              className="w-full bg-gradient-to-br from-blue-500/25 to-cyan-500/25 rounded-3xl p-5 text-center space-y-2 hover:from-blue-500/35 hover:to-cyan-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <p className="text-sm text-white/70 uppercase tracking-wide">
                {t('kiosk.nextShift')}
              </p>
              <p className="text-3xl font-bold text-white">
                {getDisplayStartTime(nextShift)}
                {' - '}
                {getDisplayEndTime(nextShift)}
              </p>
              {nextShift.actual_start_at && (
                <p className="text-xs text-orange-400 font-medium">
                  🟠 Clockato alle {new Date(nextShift.actual_start_at).toLocaleTimeString('it-IT', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
              {nextShift.job_tag && (
                <p className="text-base text-white/90 font-medium">
                  {nextShift.job_tag}
                </p>
              )}
              <p className="text-sm text-white/50 mt-2">
                👆 {t('kiosk.tapToStart')}
              </p>
            </button>
          ) : (
            <div className="bg-gradient-to-br from-blue-500/25 to-cyan-500/25 rounded-3xl p-5 text-center space-y-2">
              <p className="text-sm text-white/70 uppercase tracking-wide">
                {t('kiosk.nextShift')}
              </p>
              <p className="text-3xl font-bold text-white">
                {getDisplayStartTime(nextShift)}
                {' - '}
                {getDisplayEndTime(nextShift)}
              </p>
              {nextShift.actual_start_at && (
                <p className="text-xs text-orange-400 font-medium">
                  🟠 Clockato alle {new Date(nextShift.actual_start_at).toLocaleTimeString('it-IT', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
              {nextShift.job_tag && (
                <p className="text-base text-white/90 font-medium">
                  {nextShift.job_tag}
                </p>
              )}
            </div>
          )}

          {/* AlertDialog conferma turno programmato */}
          <AlertDialog open={showStartShiftDialog} onOpenChange={setShowStartShiftDialog}>
            <AlertDialogContent className="bg-white/95 backdrop-blur-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl">
                  {t('kiosk.startShiftConfirm.title')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  {t('kiosk.startShiftConfirm.description').replace('{time}', 
                    getDisplayStartTime(nextShift)
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-lg px-6 py-3">
                  {t('common.no')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmStartShift}
                  className="text-lg px-6 py-3 bg-gradient-to-br from-green-500 to-emerald-600"
                >
                  {t('common.yes')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <div className="bg-white/10 rounded-3xl p-5 text-center">
          <p className="text-base text-white/50">{t('kiosk.noShiftsScheduled')}</p>
        </div>
      )}

      {/* Punch Buttons - Glassmorphism */}
      <div className="grid grid-cols-2 gap-4">
        {/* Clock In - Only show if no planned shift */}
        {(sessionSummary?.status === 'not_started' || sessionSummary?.status === 'clocked_out') && !nextShift && (
          <>
            <Button
              size="lg"
              onClick={handleStartUnplannedShift}
              disabled={isLoading}
              className="col-span-2 h-28 text-xl flex-col gap-3 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 border-0 text-white font-bold rounded-3xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="w-12 h-12" />
              {t('kiosk.startUnplannedShift')}
            </Button>

            {/* Dialog selezione job tag */}
            <Dialog open={showUnplannedDialog} onOpenChange={setShowUnplannedDialog}>
              <DialogContent className="bg-white/95 backdrop-blur-lg max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {t('kiosk.selectRole.title')}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {t('kiosk.selectRole.description')}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
                  {/* Opzione "Nessun ruolo" */}
                  <button
                    onClick={() => setSelectedJobTagId(null)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedJobTagId === null
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">{t('kiosk.selectRole.noRole')}</p>
                  </button>
                  
                  {/* Job Tags Primary */}
                  {jobTags.filter(jt => jt.categoria === 'primary').length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2 px-1">
                        {t('kiosk.selectRole.primaryRole')}
                      </p>
                      {jobTags
                        .filter(jt => jt.categoria === 'primary')
                        .map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => setSelectedJobTagId(tag.id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left mb-2 ${
                              selectedJobTagId === tag.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {tag.color && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: tag.color }}
                                />
                              )}
                              <p className="font-medium">{tag.label_it}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                  
                  {/* Job Tags Secondary */}
                  {jobTags.filter(jt => jt.categoria === 'secondary').length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2 px-1">
                        {t('kiosk.selectRole.secondaryRole')}
                      </p>
                      {jobTags
                        .filter(jt => jt.categoria === 'secondary')
                        .map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => setSelectedJobTagId(tag.id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left mb-2 ${
                              selectedJobTagId === tag.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {tag.color && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: tag.color }}
                                />
                              )}
                              <p className="font-medium">{tag.label_it}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUnplannedDialog(false)
                      setSelectedJobTagId(null)
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={confirmUnplannedShift}
                    className="bg-gradient-to-br from-purple-500 to-indigo-600"
                  >
                    {t('kiosk.startShift')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
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
