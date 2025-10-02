'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Copy, Lock, Send, RefreshCw, LayoutGrid, List, Filter, X, FolderOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Rota, Location, ShiftWithAssignments, UserProfile, JobTag } from '@/types/shifts'
import { toast } from 'sonner'
import { PlannerStats } from './PlannerStats'
import { UnassignedShiftsPool } from './UnassignedShiftsPool'
import { TemplateLibraryDialog } from './TemplateLibraryDialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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

export interface PlannerFilters {
  jobTags: string[]
  users: string[]
  assignmentStatus: 'all' | 'assigned' | 'unassigned' | 'pending'
  showLeave: boolean
  showConflicts: boolean
}

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
  jobTags?: JobTag[]
  users?: UserProfile[]
  filters: PlannerFilters
  onFiltersChange: (filters: PlannerFilters) => void
  currentWeekStart?: string
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
  onShiftClick,
  jobTags = [],
  users = [],
  filters,
  onFiltersChange,
  currentWeekStart
}: Props) {
  const [publishing, setPublishing] = useState(false)
  const [locking, setLocking] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)
  
  const canPublish = rota?.status === 'draft'
  const canLock = rota?.status === 'published'
  const canDuplicate = !!rota
  
  const handleDuplicateWeek = async () => {
    if (!rota) return
    
    setDuplicating(true)
    try {
      const response = await fetch(`/api/v1/rotas/${rota.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_assignments: false // User can customize this
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Settimana duplicata: ${data.shifts_created} turni creati`)
        onRefresh()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Errore durante duplicazione')
      }
    } catch (error) {
      console.error('Error duplicating week:', error)
      toast.error('Errore durante duplicazione')
    } finally {
      setDuplicating(false)
    }
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
          
          {/* Tabs: Actions / Stats / Filters / Unassigned */}
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="actions">Azioni</TabsTrigger>
              <TabsTrigger value="filters">
                <Filter className="h-3 w-3 mr-1" />
                Filtri
              </TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
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
                disabled={!canDuplicate || duplicating}
              >
                <Copy className="mr-2 h-4 w-4" />
                {duplicating ? 'Duplicazione...' : 'Duplica settimana'}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowTemplatesDialog(true)}
                disabled={!selectedLocation}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Template
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
            
            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4 mt-4">
              {/* Assignment Status */}
              <div className="space-y-2">
                <Label>Stato Assegnazione</Label>
                <Select 
                  value={filters.assignmentStatus} 
                  onValueChange={(value: any) => onFiltersChange({ ...filters, assignmentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="assigned">Assegnati</SelectItem>
                    <SelectItem value="unassigned">Non assegnati</SelectItem>
                    <SelectItem value="pending">In attesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Job Tags Filter */}
              {jobTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Job Tags</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {jobTags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.jobTags.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            const newTags = checked
                              ? [...filters.jobTags, tag.id]
                              : filters.jobTags.filter(t => t !== tag.id)
                            onFiltersChange({ ...filters, jobTags: newTags })
                          }}
                        />
                        <Badge 
                          variant="outline" 
                          style={{ 
                            borderColor: tag.color || '#888',
                            color: tag.color || '#888'
                          }}
                        >
                          {tag.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Visual Toggles */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Mostra Ferie</Label>
                  <Checkbox
                    checked={filters.showLeave}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, showLeave: !!checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Evidenzia Conflitti</Label>
                  <Checkbox
                    checked={filters.showConflicts}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, showConflicts: !!checked })
                    }
                  />
                </div>
              </div>
              
              {/* Clear Filters */}
              {(filters.jobTags.length > 0 || filters.assignmentStatus !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onFiltersChange({
                    jobTags: [],
                    users: [],
                    assignmentStatus: 'all',
                    showLeave: true,
                    showConflicts: true
                  })}
                >
                  <X className="h-3 w-3 mr-2" />
                  Reset Filtri
                </Button>
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

      {/* Template Library Dialog */}
      {selectedLocation && currentWeekStart && (
        <TemplateLibraryDialog
          open={showTemplatesDialog}
          onClose={() => setShowTemplatesDialog(false)}
          locationId={selectedLocation}
          currentWeekStart={currentWeekStart}
          onApplied={onRefresh}
        />
      )}

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
