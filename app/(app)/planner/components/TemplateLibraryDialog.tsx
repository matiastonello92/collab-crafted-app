'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Trash2, Play } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from '@/lib/i18n'

interface Template {
  id: string
  name: string
  description: string | null
  shift_template_items: Array<{
    weekday: number
    start_time: string
    end_time: string
    job_tag_id: string | null
  }>
}

interface Props {
  open: boolean
  onClose: () => void
  locationId: string
  currentWeekStart: string
  onApplied: () => void
}

const WEEKDAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export function TemplateLibraryDialog({ 
  open, 
  onClose, 
  locationId, 
  currentWeekStart,
  onApplied 
}: Props) {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (open && locationId) {
      loadTemplates()
    }
  }, [open, locationId])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/shift-templates?location_id=${locationId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        toast.error(t('planner.templateLibrary.toast.errorLoading'))
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error(t('planner.templateLibrary.toast.errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (templateId: string) => {
    setApplying(templateId)
    try {
      const response = await fetch(`/api/v1/shift-templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start_date: currentWeekStart,
          create_rota: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t('planner.templateLibrary.toast.applied').replace('{count}', data.shifts.length))
        onApplied()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || t('planner.templateLibrary.toast.errorApplying'))
      }
    } catch (error) {
      console.error('Error applying template:', error)
      toast.error(t('planner.templateLibrary.toast.errorApplying'))
    } finally {
      setApplying(null)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm(t('planner.templateLibrary.deleteConfirm'))) return

    setDeleting(templateId)
    try {
      const response = await fetch(`/api/v1/shift-templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success(t('planner.templateLibrary.toast.deleted'))
        loadTemplates()
      } else {
        toast.error(t('planner.templateLibrary.toast.errorDeleting'))
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error(t('planner.templateLibrary.toast.errorDeleting'))
    } finally {
      setDeleting(null)
    }
  }

  const getTemplateStats = (template: Template) => {
    const shiftsCount = template.shift_template_items.length
    const days = new Set(template.shift_template_items.map(i => i.weekday)).size
    return { shiftsCount, days }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('planner.templateLibrary.title')}</DialogTitle>
          <DialogDescription>
            {t('planner.templateLibrary.description')} {format(new Date(currentWeekStart), 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('planner.templateLibrary.noTemplates')}</p>
            <p className="text-sm mt-2">{t('planner.templateLibrary.noTemplatesDescription')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map(template => {
              const stats = getTemplateStats(template)
              return (
                <div 
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApply(template.id)}
                        disabled={applying === template.id || !!deleting}
                      >
                        {applying === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            {t('planner.templateLibrary.apply')}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleting === template.id || !!applying}
                      >
                        {deleting === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {stats.shiftsCount} {t('planner.templateLibrary.shifts')}
                    </Badge>
                    <Badge variant="secondary">
                      {stats.days} {t('planner.templateLibrary.days')}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
