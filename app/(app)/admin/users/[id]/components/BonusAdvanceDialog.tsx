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
import { useTranslation } from '@/lib/i18n'
import { createBonusAdvanceFormSchema } from '@/lib/validations/bonuses-advances'
import type { BonusAdvanceFormValues } from '@/lib/validations/bonuses-advances'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BonusAdvanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSuccess?: () => void
}

export function BonusAdvanceDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: BonusAdvanceDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const schema = createBonusAdvanceFormSchema(t)

  const form = useForm<BonusAdvanceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transaction_type: 'bonus',
      description: '',
      amount: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_date: '',
      related_month: '',
      notes: '',
    },
  })

  const onSubmit = async (data: BonusAdvanceFormValues) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/bonuses-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          user_id: userId,
          payment_date: data.payment_date || null,
          related_month: data.related_month || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create bonus/advance')
      }

      toast.success(t('contracts.bonuses.messages.createSuccess'))
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating bonus/advance:', error)
      toast.error(t('contracts.bonuses.messages.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('contracts.bonuses.actions.newBonusAdvance')}</DialogTitle>
          <DialogDescription>
            {t('contracts.bonuses.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.bonuses.fields.transactionType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bonus">{t('contracts.bonuses.types.bonus')}</SelectItem>
                      <SelectItem value="advance">{t('contracts.bonuses.types.advance')}</SelectItem>
                      <SelectItem value="commission">{t('contracts.bonuses.types.commission')}</SelectItem>
                      <SelectItem value="other">{t('contracts.bonuses.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.bonuses.fields.description')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.bonuses.fields.amount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.bonuses.fields.transactionDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.bonuses.fields.paymentDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="related_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.bonuses.fields.relatedMonth')}</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
