'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LeaveTypeForm } from './LeaveTypeForm'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, Edit, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LeaveType } from '@/types/shifts'
import { useTranslation } from '@/lib/i18n'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function LeaveTypesClient() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const { t } = useTranslation()

  const { data, error, mutate } = useSWR<{ leaveTypes: LeaveType[] }>(
    '/api/v1/admin/leave-types',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  const handleCreate = () => {
    setEditingType(null)
    setDialogOpen(true)
  }

  const handleEdit = (type: LeaveType) => {
    setEditingType(type)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.leaveTypesDeleteConfirm'))) {
      return
    }

    try {
      const res = await fetch(`/api/v1/admin/leave-types/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast.success(t('toast.leaveType.deleted'))
      mutate()
    } catch (error: any) {
      console.error('Error deleting leave type:', error)
      toast.error(t('toast.leaveType.errorDeleting'))
    }
  }

  const handleToggleActive = async (type: LeaveType) => {
    try {
      const res = await fetch(`/api/v1/admin/leave-types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !type.is_active }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      toast.success(type.is_active ? t('admin.leaveTypesDeactivated') : t('admin.leaveTypesActivated'))
      mutate()
    } catch (error: any) {
      console.error('Error toggling leave type:', error)
      toast.error(t('toast.leaveType.errorUpdating'))
    }
  }

  const handleSuccess = () => {
    setDialogOpen(false)
    setEditingType(null)
    mutate()
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('admin.leaveTypesErrorLoading')}: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const leaveTypes = data?.leaveTypes || []
  const loading = !data && !error

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.leaveTypes')}</h1>
          <p className="text-muted-foreground">
            {t('admin.leaveTypesDesc')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.leaveTypesNew')}
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">{t('admin.leaveTypesNone')}</p>
            <p className="text-sm mt-2">
              {t('admin.leaveTypesNoneDesc')}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.leaveTypesLabel')}</TableHead>
                <TableHead>{t('admin.leaveTypesKey')}</TableHead>
                <TableHead>{t('admin.leaveTypesColor')}</TableHead>
                <TableHead>{t('admin.leaveTypesRequiresApproval')}</TableHead>
                <TableHead>{t('admin.status')}</TableHead>
                <TableHead className="text-right">{t('admin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map(type => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.label}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {type.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: type.color || '#6b7280' }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {type.color || '#6b7280'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {type.requires_approval ? (
                      <Badge variant="outline">{t('admin.leaveTypesYes')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('admin.leaveTypesNo')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(type)}
                    >
                      {type.is_active ? (
                        <Badge variant="default">{t('admin.leaveTypesActive')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('admin.leaveTypesInactive')}</Badge>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(type)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? t('admin.leaveTypesEdit') : t('admin.leaveTypesNew')}
            </DialogTitle>
          </DialogHeader>
          <LeaveTypeForm
            leaveType={editingType || undefined}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
