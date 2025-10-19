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
  FormDescription,
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
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslation } from '@/lib/i18n'
import { createTransportAllowanceFormSchema } from '@/lib/validations/transport-allowances'
import type { TransportAllowanceFormValues } from '@/lib/validations/transport-allowances'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface TransportAllowanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSuccess?: () => void
}

export function TransportAllowanceDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: TransportAllowanceDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const schema = createTransportAllowanceFormSchema(t)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      allowance_name: '',
      allowance_type: 'public_transport' as const,
      monthly_amount: 0,
      employer_contribution_pct: 50,
      employee_contribution_pct: 50,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: '',
    },
  })

  const watchType = form.watch('allowance_type')
  const watchEmployerPct = form.watch('employer_contribution_pct') ?? 50
  const watchAmount = form.watch('monthly_amount') ?? 0

  const employerAmount = (watchAmount * watchEmployerPct) / 100
  const employeeAmount = (watchAmount * (100 - watchEmployerPct)) / 100

  const showFranceWarning = watchType === 'public_transport' && watchEmployerPct < 50

  const onSubmit = async (data: TransportAllowanceFormValues) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/transport-allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          user_id: userId,
          end_date: data.end_date || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create transport allowance')
      }

      toast.success(t('contracts.transport.messages.createSuccess'))
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating transport allowance:', error)
      toast.error(t('contracts.transport.messages.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('contracts.transport.actions.newAllowance')}</DialogTitle>
          <DialogDescription>
            {t('contracts.transport.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="allowance_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.transport.fields.allowanceName')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pass Navigo, Titre de transport..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowance_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.transport.fields.allowanceType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public_transport">{t('contracts.transport.types.public_transport')}</SelectItem>
                      <SelectItem value="personal_vehicle">{t('contracts.transport.types.personal_vehicle')}</SelectItem>
                      <SelectItem value="bike">{t('contracts.transport.types.bike')}</SelectItem>
                      <SelectItem value="other">{t('contracts.transport.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthly_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contracts.transport.fields.monthlyAmount')}</FormLabel>
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
              name="employer_contribution_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('contracts.transport.fields.employerContribution')} ({field.value}%)
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[field.value ?? 50]}
                      onValueChange={(vals) => {
                        field.onChange(vals[0])
                        form.setValue('employee_contribution_pct', 100 - vals[0])
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Datore di lavoro: €{employerAmount.toFixed(2)} | Dipendente: €{employeeAmount.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showFranceWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('contracts.transport.warnings.franceMinimum50')}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.transport.fields.startDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.transport.fields.endDate')}</FormLabel>
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
