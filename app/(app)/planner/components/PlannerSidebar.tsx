'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Copy, Lock, Send, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Rota, Location, ShiftWithAssignments, UserProfile, JobTag } from '@/types/shifts'
import { toast } from 'sonner'
import { PlannerStats } from './PlannerStats'
import { UnassignedShiftsPool } from './UnassignedShiftsPool'
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

interface Props {
  rota?: Rota
  shifts: ShiftWithAssignments[]
  locations: Location[]
  selectedLocation: string | null
  onLocationChange: (id: string) => void
  onRefresh: () => void
  viewMode: 'day' | 'employee'
  onViewModeChange: (mode: 'day' | 'employee') => void
  onShiftClick: (shift: ShiftWithAssignments) => void
}

export function PlannerSidebar({ 
  rota,
  shifts,
  locations, 
  selectedLocation, 
  onLocationChange,
  onRefresh,
  viewMode,
  onViewModeChange,
  onShiftClick
}: Props) {
  const [publishing, setPublishing] = useState(false)
  const [locking, setLocking] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showLockDialog, setShowLockDialog] = useState(false)
  
  const canPublish = rota?.status === 'draft'
  const canLock = rota?.status === 'published'
  const canDuplicate = !!rota
  
  const handleDuplicateWeek = async () => {
    if (!rota) return
    
    toast.info('Funzionalità in sviluppo', {
      description: 'La duplicazione settimana sarà disponibile prossimamente'
    })
  }
  
  const handlePublish = async () => {
    if (!rota || !canPublish) return
    
    setPublishing(true)
    try {
      const response = await fetch(`/api/v1/rotas/${rota.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Errore durante la pubblicazione')
        return
      }
      
      toast.success('Rota pubblicata con successo')
      onRefresh()
    } catch (error) {
      console.error('Error publishing rota:', error)
      toast.error('Errore durante la pubblicazione')
    } finally {
      setPublishing(false)
      setShowPublishDialog(false)
    }
  }
  
  const handleLock = async () => {
    if (!rota || !canLock) return
    
    setLocking(true)
    try {
      const response = await fetch(`/api/v1/rotas/${rota.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' })
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Errore durante il blocco')
        return
      }
      
      toast.success('Rota bloccata con successo')
      onRefresh()
    } catch (error) {
      console.error('Error locking rota:', error)
      toast.error('Errore durante il blocco')
    } finally {
      setLocking(false)
      setShowLockDialog(false)
    }
  }
  
  return (
    <>
      <div className="w-96 border-r bg-card overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Location selector */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={selectedLocation || ''} onValueChange={onLocationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* View Mode Toggle */}
          <div className="space-y-2">
            <Label>Vista</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                onClick={() => onViewModeChange('day')}
                className="w-full"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Per Giorno
              </Button>
              <Button
                variant={viewMode === 'employee' ? 'default' : 'outline'}
                onClick={() => onViewModeChange('employee')}
                className="w-full"
              >
                <List className="h-4 w-4 mr-2" />
                Per Utente
              </Button>
            </div>
          </div>
          
          {/* Tabs: Actions / Stats / Unassigned */}
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="actions">Azioni</TabsTrigger>
              <TabsTrigger value="stats">Statistiche</TabsTrigger>
              <TabsTrigger value="pool">Pool</TabsTrigger>
            </TabsList>
            
            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4 mt-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Aggiorna
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleDuplicateWeek}
                disabled={!canDuplicate}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplica settimana
              </Button>
              
              <Button 
                variant="default" 
                className="w-full justify-start"
                onClick={() => setShowPublishDialog(true)}
                disabled={!canPublish || publishing}
              >
                <Send className="mr-2 h-4 w-4" />
                {publishing ? 'Pubblicazione...' : 'Pubblica'}
              </Button>
              
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={() => setShowLockDialog(true)}
                disabled={!canLock || locking}
              >
                <Lock className="mr-2 h-4 w-4" />
                {locking ? 'Blocco...' : 'Blocca'}
              </Button>
              
              {/* Stato attuale */}
              {rota && (
                <div className="mt-6 pt-6 border-t space-y-2">
                  <Label>Informazioni</Label>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <div>Stato: <span className="font-medium">{rota.status}</span></div>
                    <div>Settimana: <span className="font-medium">{rota.week_start_date}</span></div>
                    {rota.labor_budget_eur && (
                      <div>Budget: <span className="font-medium">€{rota.labor_budget_eur}</span></div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-4">
              <PlannerStats shifts={shifts} rota={rota} />
            </TabsContent>
            
            {/* Unassigned Pool Tab */}
            <TabsContent value="pool" className="mt-4">
              <UnassignedShiftsPool 
                shifts={shifts}
                onAssignClick={onShiftClick}
                onShiftClick={onShiftClick}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pubblicare la rota?</AlertDialogTitle>
            <AlertDialogDescription>
              Una volta pubblicata, la rota sarà visibile a tutti i dipendenti.
              I manager potranno ancora modificare i turni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Pubblica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock confirmation dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloccare la rota?</AlertDialogTitle>
            <AlertDialogDescription>
              Una volta bloccata, la rota non potrà più essere modificata da nessuno.
              Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} className="bg-destructive text-destructive-foreground">
              Blocca Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
