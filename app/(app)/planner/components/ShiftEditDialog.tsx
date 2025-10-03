'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Save, X, Sparkles } from 'lucide-react'
import type { ShiftWithAssignments, UserProfile, JobTag } from '@/types/shifts'
import { SmartAssignDialog } from './SmartAssignDialog'
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
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSmartAssign, setShowSmartAssign] = useState(false)
  
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
    }
  }, [shift, open])
  
  const validateForm = () => {
    if (!startDate) {
      toast.error('Data obbligatoria')
      return false
    }
    if (!startTime || !endTime) {
      toast.error('Orari di inizio e fine obbligatori')
      return false
    }
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${startDate}T${endTime}:00`)
    if (end <= start) {
      toast.error('L\'orario di fine deve essere successivo all\'inizio')
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
        const createResponse = await fetch(`/api/v1/shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rota_id: shift.rota_id,
            location_id: shift.location_id,
            start_at: newStartAt,
            end_at: newEndAt,
            break_minutes: breakMinutes,
            job_tag_id: jobTagId && jobTagId !== NONE_VALUE ? jobTagId : null,
            notes: notes || null
          })
        })
        
        if (!createResponse.ok) {
          const error = await createResponse.json()
          toast.error(error.message || 'Errore durante la creazione')
          return
        }
        
        const { shift: newShift } = await createResponse.json()
        
        if (assignedUserId && assignedUserId !== NONE_VALUE) {
          await fetch(`/api/v1/shifts/${newShift.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: assignedUserId, status: 'assigned' })
          })
        }
        
        toast.success('Turno creato con successo')
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
          toast.error(error.message || 'Errore durante il salvataggio')
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
            toast.error('Errore durante l\'assegnazione utente')
          }
        }
        
        toast.success('Turno aggiornato con successo')
      }
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving shift:', error)
      toast.error('Errore durante il salvataggio')
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
        toast.error(error.message || 'Errore durante l\'eliminazione')
        return
      }
      
      toast.success('Turno eliminato con successo')
      onSave()
      onClose()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting shift:', error)
      toast.error('Errore durante l\'eliminazione')
    } finally {
      setDeleting(false)
    }
  }
  
  if (!shift) return null
  
  const isLocked = shift.rota?.status === 'locked'
  
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Turno</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-medium text-foreground">Data</Label>
                <Input
                  className="bg-background"
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLocked}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-foreground">Inizio</Label>
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
                <Label className="font-medium text-foreground">Fine</Label>
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
                <Label className="font-medium text-foreground">Pausa (minuti)</Label>
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
                <Label className="font-medium text-foreground">Ruolo</Label>
                <Select value={jobTagId} onValueChange={setJobTagId} disabled={isLocked}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Nessun ruolo</SelectItem>
                    {jobTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.label || tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* User Assignment */}
            <div className="space-y-2">
              <Label className="font-medium text-foreground">Assegna Utente</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId} disabled={isLocked}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleziona utente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Nessun utente</SelectItem>
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
              <Label className="font-medium text-foreground">Note</Label>
              <Textarea
                className="bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi note..."
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
              Elimina
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSmartAssign(true)}
                disabled={isLocked}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Assegnazione AI
              </Button>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={loading || isLocked}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il turno verrà eliminato definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleting ? 'Eliminazione...' : 'Elimina'}
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
