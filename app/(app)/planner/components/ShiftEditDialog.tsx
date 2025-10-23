'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Save, X, Sparkles, Calendar } from 'lucide-react'
import type { ShiftWithAssignments, UserProfile, JobTag } from '@/types/shifts'
import { SmartAssignDialog } from './SmartAssignDialog'
import { AbsenceForm } from './AbsenceForm'
import { format, parseISO } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from '@/lib/i18n'

// Helper per calcolare durata in formato leggibile
function calculateDuration(startAt: string, endAt: string, breakMinutes: number = 0): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000)
  const workMinutes = totalMinutes - breakMinutes
  
  // Gestisci valori negativi correttamente
  if (workMinutes < 0) {
    const absMinutes = Math.abs(workMinutes)
    const hours = Math.floor(absMinutes / 60)
    const minutes = absMinutes % 60
    return `-${hours}h ${minutes}m`
  }
  
  const hours = Math.floor(workMinutes / 60)
  const minutes = workMinutes % 60
  return `${hours}h ${minutes}m`
}

// Helper per calcolare differenza tra orari (in minuti)
function calculateTimeDiff(actual: string, planned: string): number {
  const actualDate = new Date(actual)
  const plannedDate = new Date(planned)
  return Math.floor((actualDate.getTime() - plannedDate.getTime()) / 60000)
}

// Helper per formattare la differenza in modo leggibile
function formatTimeDiff(minutes: number): { text: string; color: string } {
  const absMinutes = Math.abs(minutes)
  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60
  
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  
  if (minutes === 0) {
    return { text: 'Puntuale', color: 'text-green-600 dark:text-green-400' }
  } else if (minutes > 0) {
    return { text: `+${timeStr} (ritardo)`, color: 'text-red-600 dark:text-red-400' }
  } else {
    return { text: `-${timeStr} (anticipo)`, color: 'text-blue-600 dark:text-blue-400' }
  }
}

const NONE_VALUE = '__none__'

interface Props {
  shift: ShiftWithAssignments | null
  open: boolean
  onClose: () => void
  onSave: () => void
  jobTags: JobTag[]
  users: UserProfile[]
}

export function ShiftEditDialog({ shift, open, onClose, onSave, jobTags, users }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSmartAssign, setShowSmartAssign] = useState(false)
  const [activeTab, setActiveTab] = useState<'shift' | 'absence'>('shift')
  
  // Form state
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [jobTagId, setJobTagId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [assignedUserId, setAssignedUserId] = useState<string>('')
  
  useEffect(() => {
    if (shift && open) {
      const isNew = shift.id === 'new'
      const start = parseISO(shift.start_at)
      const end = parseISO(shift.end_at)
      
      setStartDate(format(start, 'yyyy-MM-dd'))
      setStartTime(isNew ? '' : format(start, 'HH:mm'))
      setEndTime(isNew ? '' : format(end, 'HH:mm'))
      setBreakMinutes(shift.break_minutes || 0)
      setJobTagId(shift.job_tag_id || NONE_VALUE)
      setNotes(shift.notes || '')
      setAssignedUserId(shift.assignments?.[0]?.user_id || NONE_VALUE)
      
      // Reset to shift tab when opening for new shift
      if (isNew) {
        setActiveTab('shift')
      }
    }
  }, [shift, open])
  
  const validateForm = () => {
    if (!startDate) {
      toast.error(t('planner.validation.dateRequired'))
      return false
    }
    if (!startTime || !endTime) {
      toast.error(t('planner.validation.timesRequired'))
      return false
    }
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${startDate}T${endTime}:00`)
    if (end <= start) {
      toast.error(t('planner.validation.endAfterStart'))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!shift) return
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const isNew = shift.id === 'new'
      const newStartAt = new Date(`${startDate}T${startTime}:00`).toISOString()
      const newEndAt = new Date(`${startDate}T${endTime}:00`).toISOString()
      
      if (isNew) {
      const requestBody = {
        rota_id: shift.rota_id,
        location_id: shift.location_id,
        start_at: newStartAt,
        end_at: newEndAt,
        break_minutes: breakMinutes,
        job_tag_id: jobTagId && jobTagId !== NONE_VALUE ? jobTagId : undefined,
        notes: notes || undefined
      }
        
        console.log('🔵 [ShiftCreate] Request body:', requestBody)
        
        const createResponse = await fetch(`/api/v1/shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        if (!createResponse.ok) {
          const error = await createResponse.json()
          console.error('❌ [ShiftCreate] Error response:', error)
          toast.error(error.message || error.error || t('planner.toast.errorSaving'))
          return
        }
        
        const { shift: newShift } = await createResponse.json()
        
        if (assignedUserId && assignedUserId !== NONE_VALUE) {
          console.log('🔵 [ShiftCreate] Assigning shift to user:', assignedUserId)
          
          const assignResponse = await fetch(`/api/v1/shifts/${newShift.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: assignedUserId, status: 'assigned' })
          })
          
          if (!assignResponse.ok) {
            const errorData = await assignResponse.json()
            console.error('❌ [ShiftCreate] Assignment failed:', errorData)
            toast.error(t('planner.toast.errorAssigningUser') + ': ' + (errorData.error || 'Unknown error'))
          } else {
            console.log('✅ [ShiftCreate] Assignment successful')
          }
        }
        
        toast.success(t('planner.toast.shiftCreated'))
      } else {
        const response = await fetch(`/api/v1/shifts/${shift.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_at: newStartAt,
            end_at: newEndAt,
            break_minutes: breakMinutes,
            job_tag_id: jobTagId && jobTagId !== NONE_VALUE ? jobTagId : null,
            notes: notes || null
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          toast.error(error.message || t('planner.toast.errorSaving'))
          return
        }
        
        // Update assignment if changed
        if (assignedUserId && assignedUserId !== NONE_VALUE && assignedUserId !== shift.assignments?.[0]?.user_id) {
          const assignResponse = await fetch(`/api/v1/shifts/${shift.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: assignedUserId,
              status: 'assigned'
            })
          })
          
          if (!assignResponse.ok) {
            toast.error(t('planner.toast.errorAssigningUser'))
          }
        }
        
        toast.success(t('planner.toast.shiftUpdated'))
      }
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving shift:', error)
      toast.error(t('planner.toast.errorSaving'))
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (!shift) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/shifts/${shift.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || t('planner.toast.errorDeleting'))
        return
      }
      
      toast.success(t('planner.toast.shiftDeleted'))
      onSave()
      onClose()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting shift:', error)
      toast.error(t('planner.toast.errorDeleting'))
    } finally {
      setDeleting(false)
    }
  }
  
  if (!shift) return null
  
  const isLocked = shift.rota?.status === 'locked'
  const isNew = shift.id === 'new'
  
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl lg:w-auto max-h-[85vh] overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {!isNew && shift.actual_start_at && !shift.actual_end_at && <span>🟠</span>}
              {!isNew && shift.actual_start_at && shift.actual_end_at && <span className="text-green-600 dark:text-green-400">✓</span>}
              {isNew ? t('planner.edit.newShiftOrAbsence') : t('planner.edit.editShift')}
            </DialogTitle>
            
            {!isNew && (
              <div className="mt-3 space-y-3">
                {/* Badge Status: In Corso */}
                {shift.actual_start_at && !shift.actual_end_at && (
                  <div className="p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🟠</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        Turno in corso
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Colonna Sinistra: Orari Pianificati */}
                      <div className="space-y-2">
                        <div className="font-semibold text-muted-foreground uppercase text-xs">
                          📅 Orario Pianificato
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Inizio:</span>
                            <span className="font-mono font-medium">
                              {format(parseISO(shift.start_at), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Fine:</span>
                            <span className="font-mono font-medium">
                              {format(parseISO(shift.end_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Colonna Destra: Orari Reali */}
                      <div className="space-y-2">
                        <div className="font-semibold text-orange-600 dark:text-orange-400 uppercase text-xs">
                          ⏰ Orario Reale
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Clock in:</span>
                            <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                              {format(parseISO(shift.actual_start_at), 'HH:mm')}
                            </span>
                            {(() => {
                              const diff = calculateTimeDiff(shift.actual_start_at, shift.start_at)
                              const formatted = formatTimeDiff(diff)
                              return diff !== 0 && (
                                <span className={`text-xs ${formatted.color}`}>
                                  {formatted.text}
                                </span>
                              )
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Clock out:</span>
                            <span className="font-mono text-muted-foreground italic">
                              In attesa...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sezione Pause - Turno in Corso */}
                    <div className="pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pausa pianificata:</span>
                        <span className="font-mono">
                          {shift.break_minutes || 0}m
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Pausa presa finora:</span>
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                          {shift.actual_break_minutes || 0}m
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Badge Status: Completato */}
                {shift.actual_start_at && shift.actual_end_at && (
                  <div className="p-4 rounded-lg bg-green-500/10 border-2 border-green-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl text-green-600 dark:text-green-400">✓</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        Turno completato
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Colonna Sinistra: Orari Pianificati */}
                      <div className="space-y-2">
                        <div className="font-semibold text-muted-foreground uppercase text-xs">
                          📅 Orario Pianificato
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Inizio:</span>
                            <span className="font-mono font-medium">
                              {format(parseISO(shift.start_at), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Fine:</span>
                            <span className="font-mono font-medium">
                              {format(parseISO(shift.end_at), 'HH:mm')}
                            </span>
                          </div>
                          <div className="pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">Durata:</span>
                            <span className="ml-2 font-semibold">
                              {calculateDuration(shift.start_at, shift.end_at, shift.break_minutes)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Colonna Destra: Orari Reali */}
                      <div className="space-y-2">
                        <div className="font-semibold text-green-600 dark:text-green-400 uppercase text-xs">
                          ⏰ Orario Reale
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Clock in:</span>
                            <span className="font-mono font-bold text-green-600 dark:text-green-400">
                              {format(parseISO(shift.actual_start_at), 'HH:mm')}
                            </span>
                            {(() => {
                              const diff = calculateTimeDiff(shift.actual_start_at, shift.start_at)
                              const formatted = formatTimeDiff(diff)
                              return diff !== 0 && (
                                <span className={`text-xs ${formatted.color}`}>
                                  {formatted.text}
                                </span>
                              )
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Clock out:</span>
                            <span className="font-mono font-bold text-green-600 dark:text-green-400">
                              {format(parseISO(shift.actual_end_at), 'HH:mm')}
                            </span>
                            {(() => {
                              const diff = calculateTimeDiff(shift.actual_end_at, shift.end_at)
                              const formatted = formatTimeDiff(diff)
                              return diff !== 0 && (
                                <span className={`text-xs ${formatted.color}`}>
                                  {formatted.text}
                                </span>
                              )
                            })()}
                          </div>
                          <div className="pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">Durata:</span>
                            <span className="ml-2 font-bold text-green-600 dark:text-green-400">
                              {calculateDuration(shift.actual_start_at, shift.actual_end_at, shift.actual_break_minutes || 0)}
                            </span>
                          </div>
                          
                          {/* Sezione Pause */}
                          <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pausa pianificata:</span>
                              <span className="font-mono">
                                {shift.break_minutes || 0}m
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pausa effettiva:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-green-600 dark:text-green-400">
                                  {shift.actual_break_minutes || 0}m
                                </span>
                                {(() => {
                                  const diff = (shift.actual_break_minutes || 0) - (shift.break_minutes || 0)
                                  if (diff === 0) return null
                                  return (
                                    <span className={`text-xs ${diff > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                      {diff > 0 ? `+${diff}m` : `${diff}m`}
                                    </span>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Badge Status: Pianificato (non ancora iniziato) */}
                {!shift.actual_start_at && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-lg">⏱️</span>
                      <span className="font-medium">
                        Turno pianificato - non ancora iniziato
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Orario previsto: {format(parseISO(shift.start_at), 'HH:mm')} - {format(parseISO(shift.end_at), 'HH:mm')}
                    </div>
                  </div>
                )}
                
                {/* Banner per turni da kiosk */}
                {shift.source === 'actual' && (
                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30 text-xs text-blue-700 dark:text-blue-300">
                    ℹ️ Turno creato automaticamente da timbratura kiosk
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          
          {isNew ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'shift' | 'absence')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="shift">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('planner.edit.newShift')}
                </TabsTrigger>
                <TabsTrigger value="absence">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('planner.edit.newAbsence')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="shift" className="space-y-4 py-4">
            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-medium text-foreground">{t('planner.edit.date')}</Label>
                <Input
                  className="bg-background"
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLocked}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-foreground">{t('planner.edit.startTime')}</Label>
                <Input
                  className="bg-background"
                  required
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isLocked}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-foreground">{t('planner.edit.endTime')}</Label>
                <Input
                  className="bg-background"
                  required
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>
            
            {/* Break & Job Tag */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium text-foreground">{t('planner.edit.breakMinutes')}</Label>
                <Input
                  className="bg-background"
                  type="number" 
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                  min={0}
                  disabled={isLocked}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-foreground">{t('planner.edit.role')}</Label>
                <Select value={jobTagId} onValueChange={setJobTagId} disabled={isLocked}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('planner.common.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>{t('planner.common.noRole')}</SelectItem>
                    {jobTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.label_it}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* User Assignment */}
            <div className="space-y-2">
              <Label className="font-medium text-foreground">{t('planner.edit.assignUser')}</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId} disabled={isLocked}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('planner.common.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{t('planner.common.noUser')}</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.full_name || user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label className="font-medium text-foreground">{t('planner.edit.notes')}</Label>
              <Textarea
                className="bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('planner.edit.addNotes')}
                rows={3}
                disabled={isLocked}
              />
            </div>
            
            <DialogFooter className="flex justify-between items-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLocked || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSmartAssign(true)}
                  disabled={isLocked}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('planner.edit.aiAssign')}
                </Button>
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={loading || isLocked}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="absence">
            <AbsenceForm
              users={users}
              date={startDate}
              locationId={shift.location_id}
              onSuccess={() => {
                onSave()
                onClose()
              }}
              onCancel={onClose}
            />
          </TabsContent>
        </Tabs>
          ) : (
            // Edit existing shift - no tabs
            <>
              <div className="space-y-4 py-4">
                {/* Date & Time */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{t('planner.edit.date')}</Label>
                    <Input
                      className="bg-background"
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{t('planner.edit.startTime')}</Label>
                    <Input
                      className="bg-background"
                      required
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{t('planner.edit.endTime')}</Label>
                    <Input
                      className="bg-background"
                      required
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
                
                {/* Break & Job Tag */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{t('planner.edit.breakMinutes')}</Label>
                    <Input
                      className="bg-background"
                      type="number" 
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                      min={0}
                      disabled={isLocked}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{t('planner.edit.role')}</Label>
                    <Select value={jobTagId} onValueChange={setJobTagId} disabled={isLocked}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('planner.common.selectRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{t('planner.common.noRole')}</SelectItem>
                        {jobTags.map(tag => (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.label_it}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* User Assignment */}
                <div className="space-y-2">
                  <Label className="font-medium text-foreground">{t('planner.edit.assignUser')}</Label>
                  <Select value={assignedUserId} onValueChange={setAssignedUserId} disabled={isLocked}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('planner.common.selectUser')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t('planner.common.noUser')}</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {user.full_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.full_name || user.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Notes */}
                <div className="space-y-2">
                  <Label className="font-medium text-foreground">{t('planner.edit.notes')}</Label>
                  <Textarea
                    className="bg-background"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('planner.edit.addNotes')}
                    rows={3}
                    disabled={isLocked}
                  />
                </div>
              </div>
              
              <DialogFooter className="flex justify-between items-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLocked || deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSmartAssign(true)}
                    disabled={isLocked}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('planner.edit.aiAssign')}
                  </Button>
                  <Button variant="outline" onClick={onClose} disabled={loading}>
                    <X className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleSave} disabled={loading || isLocked}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planner.edit.delete')} - {t('planner.edit.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.cannotBeUndone')} {t('planner.edit.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleting ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Smart Assignment */}
      <SmartAssignDialog
        open={showSmartAssign}
        onClose={() => setShowSmartAssign(false)}
        shiftId={shift?.id || null}
        onAssign={() => {
          onSave()
          onClose()
        }}
      />
    </>
  )
}
