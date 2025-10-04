'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'

interface SmartCandidate {
  user_id: string
  name: string
  score: number
  reason: string
  details: {
    has_required_tag: boolean
    job_tags: string[]
    availability_preference: string
    availability_score: number
    recent_hours: number
    workload_score: number
  }
}

interface SmartAssignDialogProps {
  open: boolean
  onClose: () => void
  shiftId: string | null
  onAssign: () => void
}

export function SmartAssignDialog({ open, onClose, shiftId, onAssign }: SmartAssignDialogProps) {
  const { t } = useTranslation()
  const supabase = useSupabase()
  const [candidates, setCandidates] = useState<SmartCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  const loadCandidates = async () => {
    if (!shiftId) return

    setLoading(true)
    try {
      console.log('🤖 [SmartAssign] Calling edge function for shift:', shiftId)
      
      const { data, error } = await supabase.functions.invoke('smart-assign', {
        body: { shift_id: shiftId }
      })

      console.log('🤖 [SmartAssign] Raw response:', { data, error })

      if (error) {
        console.error('🤖 [SmartAssign] Full error:', JSON.stringify(error, null, 2))
        
        if (error.message?.includes('FunctionsHttpError') || error.message?.includes('not found')) {
          toast.error(t('planner.smartAssign.functionUnavailable'))
        } else if (error.message?.includes('LOVABLE_API_KEY') || error.message?.includes('API key')) {
          toast.error(t('planner.smartAssign.apiKeyMissing'))
        } else {
          toast.error(`${t('planner.smartAssign.aiError')}: ${error.message}`)
        }
        throw error
      }
      
      console.log('🤖 [SmartAssign] Received candidates:', data)
      setCandidates(data.candidates || [])
    } catch (error) {
      console.error('🤖 [SmartAssign] Exception:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('LOVABLE_API_KEY') || errorMessage.includes('API key')) {
        toast.error('LOVABLE_API_KEY mancante. Configura in Supabase Edge Functions Secrets.')
      } else if (errorMessage.includes('FunctionsHttpError') || errorMessage.includes('not found')) {
        toast.error('Funzione AI non disponibile. Verifica che sia deployata su Supabase.')
      } else {
        toast.error('Errore nel caricamento candidati')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (userId: string) => {
    if (!shiftId) return

    setAssigning(userId)
    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, status: 'assigned' })
      })

      if (!res.ok) throw new Error('Failed to assign')

      toast.success(t('planner.smartAssign.assignSuccess'))
      onAssign()
      onClose()
    } catch (error) {
      console.error('Error assigning shift:', error)
      toast.error(t('planner.smartAssign.assignError'))
    } finally {
      setAssigning(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  useEffect(() => {
    if (open && shiftId && candidates.length === 0) {
      loadCandidates()
    }
  }, [open, shiftId])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('planner.smartAssign.title')}
          </DialogTitle>
        </DialogHeader>

        {!loading && candidates.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              {t('planner.smartAssign.description')}
            </p>
            <Button onClick={loadCandidates} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {t('planner.smartAssign.analyzeCandidates')}
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && candidates.length > 0 && (
          <div className="space-y-3">
            {candidates.map((candidate, index) => (
              <div
                key={candidate.user_id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2 min-w-[60px]">
                  <div className={`text-3xl font-bold ${getScoreColor(candidate.score)}`}>
                    {candidate.score}
                  </div>
                  <Badge variant={getScoreBadge(candidate.score)} className="text-xs">
                    {index === 0 ? '🏆 Top' : `#${index + 1}`}
                  </Badge>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {candidate.name}
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => handleAssign(candidate.user_id)}
                      disabled={!!assigning}
                      className="gap-2"
                    >
                      {assigning === candidate.user_id ? (
                        <>{t('planner.smartAssign.assigning')}</>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          {t('planner.smartAssign.assign')}
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">{candidate.reason}</p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {candidate.details.has_required_tag ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {t('planner.smartAssign.qualified')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                        {t('planner.smartAssign.notQualified')}
                      </Badge>
                    )}

                    {candidate.details.availability_preference !== 'unknown' && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {candidate.details.availability_preference === 'preferred' && `✓ ${t('planner.smartAssign.preferred')}`}
                        {candidate.details.availability_preference === 'ok' && t('planner.smartAssign.available')}
                        {candidate.details.availability_preference === 'unavailable' && `✗ ${t('planner.smartAssign.unavailable')}`}
                      </Badge>
                    )}

                    <Badge variant="outline">
                      {candidate.details.recent_hours}{t('planner.smartAssign.recentHours')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
