'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import { createAmendmentFormSchema } from '@/lib/validations/contract-amendments'
import type { AmendmentFormValues } from '@/lib/validations/contract-amendments'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ContractAmendmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  contractId?: string
  onSuccess?: () => void
}

interface FieldChange {
  key: string
  previousValue: string
  newValue: string
}

export function ContractAmendmentDialog({
  open,
  onOpenChange,
  userId,
  contractId,
  onSuccess,
}: ContractAmendmentDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([
    { key: '', previousValue: '', newValue: '' },
  ])

  const schema = createAmendmentFormSchema(t)

  const form = useForm<AmendmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amendment_date: new Date().toISOString().split('T')[0],
      effective_date: new Date().toISOString().split('T')[0],
      amendment_type: 'salary_change',
      previous_values: {},
      new_values: {},
      reason: '',
      notes: '',
    },
  })

  const addFieldChange = () => {
    setFieldChanges([...fieldChanges, { key: '', previousValue: '', newValue: '' }])
  }

  const removeFieldChange = (index: number) => {
    setFieldChanges(fieldChanges.filter((_, i) => i !== index))
  }

  const updateFieldChange = (index: number, field: keyof FieldChange, value: string) => {
    const updated = [...fieldChanges]
    updated[index][field] = value
    setFieldChanges(updated)
  }

  const onSubmit = async (data: AmendmentFormValues) => {
    // Build previous_values and new_values from fieldChanges
    const previous_values: Record<string, any> = {}
    const new_values: Record<string, any> = {}

    fieldChanges.forEach((change) => {
      if (change.key.trim()) {
        previous_values[change.key] = change.previousValue
        new_values[change.key] = change.newValue
      }
    })

    if (Object.keys(previous_values).length === 0) {
      toast.error(t('contracts.amendments.validation.noChanges'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contract-amendments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          user_id: userId,
          contract_id: contractId,
          previous_values,
          new_values,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create amendment')
      }

      toast.success(t('contracts.amendments.messages.createSuccess'))
      form.reset()
      setFieldChanges([{ key: '', previousValue: '', newValue: '' }])
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating amendment:', error)
      toast.error(t('contracts.amendments.messages.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('contracts.amendments.actions.newAmendment')}</DialogTitle>
          <DialogDescription>
            {t('contracts.amendments.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amendment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.amendments.fields.amendmentType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="salary_change">{t('contracts.amendments.types.salary_change')}</SelectItem>
                      <SelectItem value="hours_change">{t('contracts.amendments.types.hours_change')}</SelectItem>
                      <SelectItem value="position_change">{t('contracts.amendments.types.position_change')}</SelectItem>
                      <SelectItem value="other">{t('contracts.amendments.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amendment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.amendments.fields.amendmentDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.amendments.fields.effectiveDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.amendments.fields.reason')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic Field Changes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>{t('contracts.amendments.fields.changedValues')}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFieldChange}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('contracts.amendments.actions.addField')}
                </Button>
              </div>

              {fieldChanges.map((change, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder={t('contracts.amendments.placeholders.fieldName')}
                          value={change.key}
                          onChange={(e) => updateFieldChange(index, 'key', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder={t('contracts.amendments.placeholders.previousValue')}
                            value={change.previousValue}
                            onChange={(e) => updateFieldChange(index, 'previousValue', e.target.value)}
                          />
                          <Input
                            placeholder={t('contracts.amendments.placeholders.newValue')}
                            value={change.newValue}
                            onChange={(e) => updateFieldChange(index, 'newValue', e.target.value)}
                          />
                        </div>
                      </div>
                      {fieldChanges.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFieldChange(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.common.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
