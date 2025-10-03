'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, X, Tag } from 'lucide-react'
import { 
  fetchAvailableJobTags, 
  fetchUserJobTags, 
  assignJobTagToUser, 
  removeJobTagFromUser,
  type JobTag 
} from '@/lib/admin/data-fetchers'

interface JobTagsPanelProps {
  userId: string
  locationId: string
  locationName: string
}

export default function JobTagsPanel({ userId, locationId, locationName }: JobTagsPanelProps) {
  const [userJobTags, setUserJobTags] = useState<JobTag[]>([])
  const [availableJobTags, setAvailableJobTags] = useState<JobTag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    loadData()
  }, [userId, locationId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [userTags, allTags] = await Promise.all([
        fetchUserJobTags(userId, locationId),
        fetchAvailableJobTags()
      ])
      setUserJobTags(userTags)
      setAvailableJobTags(allTags)
    } catch (error) {
      console.error('Error loading job tags:', error)
      toast.error('Errore nel caricamento dei job tags')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignTag = async () => {
    if (!selectedTagId) return

    try {
      setIsAssigning(true)
      await assignJobTagToUser(userId, selectedTagId, locationId)
      
      // Update local state
      const assignedTag = availableJobTags.find(tag => tag.id === selectedTagId)
      if (assignedTag) {
        setUserJobTags(prev => [...prev, { ...assignedTag, location_id: locationId }])
      }
      
      setSelectedTagId('')
      toast.success('Job tag assegnato con successo')
    } catch (error) {
      console.error('Error assigning job tag:', error)
      toast.error('Errore nell\'assegnazione del job tag')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeJobTagFromUser(userId, tagId, locationId)
      
      // Update local state
      setUserJobTags(prev => prev.filter(tag => tag.id !== tagId))
      toast.success('Job tag rimosso con successo')
    } catch (error) {
      console.error('Error removing job tag:', error)
      toast.error('Errore nella rimozione del job tag')
    }
  }

  const getUnassignedTags = () => {
    const assignedTagIds = new Set(userJobTags.map(tag => tag.id))
    return availableJobTags.filter(tag => !assignedTagIds.has(tag.id))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Job Tags - {locationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>Caricamento...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Job Tags - {locationName}
        </CardTitle>
        <CardDescription>
          Gestisci i job titles assegnati all'utente per questa location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tags */}
        <div className="space-y-2">
          <Label>Job Tags Assegnati</Label>
          {userJobTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userJobTags.map(tag => (
                <Badge 
                  key={tag.id} 
                  variant="secondary" 
                  className="flex items-center gap-1"
                >
                  {tag.label_it}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                    title="Rimuovi job tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessun job tag assegnato per questa location
            </p>
          )}
        </div>

        {/* Add New Tag */}
        <div className="space-y-3 border-t pt-4">
          <Label>Aggiungi Job Tag</Label>
          <div className="flex gap-2">
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleziona un job tag..." />
              </SelectTrigger>
              <SelectContent>
                {getUnassignedTags().map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.label_it}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignTag}
              disabled={!selectedTagId || isAssigning}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isAssigning ? 'Assegna...' : 'Aggiungi'}
            </Button>
          </div>
          {getUnassignedTags().length === 0 && (
            <p className="text-xs text-muted-foreground">
              Tutti i job tags disponibili sono già assegnati
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}