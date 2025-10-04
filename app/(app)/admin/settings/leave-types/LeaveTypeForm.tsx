'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { LeaveType } from '@/types/shifts'
import { useTranslation } from '@/lib/i18n'

interface Props {
  leaveType?: LeaveType
  onSuccess: () => void
  onCancel: () => void
}

export function LeaveTypeForm({ leaveType, onSuccess, onCancel }: Props) {
  const { t } = useTranslation()
  const [key, setKey] = useState(leaveType?.key || '')
  const [label, setLabel] = useState(leaveType?.label || '')
  const [color, setColor] = useState(leaveType?.color || '#6b7280')
  const [requiresApproval, setRequiresApproval] = useState(leaveType?.requires_approval ?? true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = leaveType
        ? `/api/v1/admin/leave-types/${leaveType.id}`
        : '/api/v1/admin/leave-types'

      const method = leaveType ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          label,
          color,
          requires_approval: requiresApproval,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success(leaveType ? t('admin.leaveTypeForm.toast.typeUpdated') : t('admin.leaveTypeForm.toast.typeCreated'))
      onSuccess()
    } catch (error: any) {
      console.error('Error saving leave type:', error)
      toast.error(error.message || t('admin.leaveTypeForm.toast.errorSaving'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">{t('admin.leaveTypeForm.labels.label')} *</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('admin.leaveTypeForm.placeholders.labelExample')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="key">{t('admin.leaveTypeForm.labels.key')} *</Label>
        <Input
          id="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t('admin.leaveTypeForm.placeholders.keyExample')}
          required
          disabled={!!leaveType}
        />
        {leaveType && (
          <p className="text-xs text-muted-foreground">
            {t('admin.leaveTypeForm.descriptions.keyImmutable')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">{t('admin.leaveTypeForm.labels.color')}</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-20 h-10"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder={t('admin.leaveTypeForm.placeholders.colorCode')}
            pattern="^#[0-9a-fA-F]{6}$"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="requires_approval">{t('admin.leaveTypeForm.labels.requiresApproval')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('admin.leaveTypeForm.descriptions.requiresApprovalDescription')}
          </p>
        </div>
        <Switch
          id="requires_approval"
          checked={requiresApproval}
          onCheckedChange={setRequiresApproval}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('admin.leaveTypeForm.buttons.cancel')}
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? t('admin.leaveTypeForm.buttons.saving') : leaveType ? t('admin.leaveTypeForm.buttons.update') : t('admin.leaveTypeForm.buttons.create')}
        </Button>
      </div>
    </form>
  )
}
