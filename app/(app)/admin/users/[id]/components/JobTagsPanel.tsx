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
  type JobTag,
  type UserJobTagAssignment
} from '@/lib/admin/data-fetchers'
import { useTranslation } from '@/lib/i18n'

interface JobTagsPanelProps {
  userId: string
  locationId: string | null
  locationName: string
}

export default function JobTagsPanel({ userId, locationId, locationName }: JobTagsPanelProps) {
  const [userJobTags, setUserJobTags] = useState<UserJobTagAssignment[]>([])
  const [availableJobTags, setAvailableJobTags] = useState<JobTag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const { t } = useTranslation()

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

      const scopedTags = userTags.filter(tag => {
        if (locationId === null) {
          return tag.location_id === null
        }
        if (!locationId) {
          return true
        }
        return tag.location_id === locationId
      })

      setUserJobTags(scopedTags)
      setAvailableJobTags(allTags)
    } catch (error) {
      console.error('Error loading job tags:', error)
      toast.error(t('toast.jobTag.errorLoading'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignTag = async () => {
    if (!selectedTagId) return

    try {
      setIsAssigning(true)
      const assignment = await assignJobTagToUser(userId, selectedTagId, locationId ?? null)

      setUserJobTags(prev => [...prev, assignment])
      
      setSelectedTagId('')
      toast.success(t('toast.jobTag.assigned'))
    } catch (error) {
      console.error('Error assigning job tag:', error)
      toast.error(t('toast.jobTag.errorAssigning'))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveTag = async (tag: UserJobTagAssignment) => {
    try {
      await removeJobTagFromUser(tag.assignmentId)

      setUserJobTags(prev => prev.filter(existing => existing.assignmentId !== tag.assignmentId))
      toast.success(t('toast.jobTag.removed'))
    } catch (error) {
      console.error('Error removing job tag:', error)
      toast.error(t('toast.jobTag.errorRemoving'))
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
            {t('admin.jobTags')} - {locationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>{t('admin.loading')}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {t('admin.jobTags')} - {locationName}
        </CardTitle>
        <CardDescription>
          {t('admin.jobTagsDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tags */}
        <div className="space-y-2">
          <Label>{t('admin.jobTagsAssigned')}</Label>
          {userJobTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userJobTags.map(tag => (
                <Badge
                  key={tag.assignmentId}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag.label_it}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                    title={t('admin.removeJobTag')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('admin.jobTagsNone')}
            </p>
          )}
        </div>

        {/* Add New Tag */}
        <div className="space-y-3 border-t pt-4">
          <Label>{t('admin.jobTagsAdd')}</Label>
          <div className="flex gap-2">
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('admin.jobTagsSelect')} />
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
              {isAssigning ? t('admin.adding') : t('admin.add')}
            </Button>
          </div>
          {getUnassignedTags().length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t('admin.jobTagsAllAssigned')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}