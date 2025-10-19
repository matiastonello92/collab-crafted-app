import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'
import { useTranslation } from '@/lib/i18n'
import { createContractFormSchema, type ContractFormValues } from '@/lib/validations/contracts'
import { 
  getContractTypeCodesForCountry,
  getContractTypeTranslationKey,
  requiresFrenchFields, 
  type UserContract,
  FRANCE_NIVEAUX,
  FRANCE_ECHELONS,
  getCoefficient 
} from '@/lib/types/contracts'
import { Loader2 } from 'lucide-react'

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  locationId: string
  locationCountry?: string
  contract?: UserContract | null
  onSuccess: () => void
}

export function ContractFormDialog({
  open,
  onOpenChange,
  userId,
  locationId,
  locationCountry,
  contract,
  onSuccess
}: ContractFormDialogProps) {
  const { t } = useTranslation()
  const supabase = useSupabase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgId, setOrgId] = useState<string>('')
  
  const isFrench = requiresFrenchFields(locationCountry)
  const contractTypeCodes = getContractTypeCodesForCountry(locationCountry)
  
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(createContractFormSchema(t)),
    defaultValues: {
      contract_type: contract?.contract_type || '',
      job_title: contract?.job_title || '',
      start_date: contract?.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
      end_date: contract?.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
      weekly_hours: contract?.weekly_hours || 35,
      working_days_per_week: contract?.working_days_per_week || 5,
      trial_period_days: contract?.trial_period_days || 0,
      is_forfait_journalier: contract?.is_forfait_journalier || false,
      daily_rate: contract?.daily_rate || undefined,
      hourly_rate: contract?.hourly_rate || undefined,
      monthly_salary: contract?.monthly_salary || undefined,
      collective_agreement: contract?.collective_agreement || '',
      coefficient: contract?.coefficient || '',
      echelon: contract?.echelon || '',
      niveau: contract?.niveau || '',
      min_rest_hours: contract?.min_rest_hours || 11,
      max_consecutive_days: contract?.max_consecutive_days || 6,
      notes: contract?.notes || '',
    },
  })

  const isForfait = form.watch('is_forfait_journalier')
  const niveau = form.watch('niveau')
  const echelon = form.watch('echelon')

  // Auto-calculate coefficient when niveau or echelon changes
  useEffect(() => {
    if (isFrench && niveau && echelon) {
      const coeff = getCoefficient(niveau, echelon)
      form.setValue('coefficient', coeff)
    }
  }, [niveau, echelon, isFrench, form])

  useEffect(() => {
    if (open) {
      loadOrgId()
      if (contract) {
        form.reset({
          contract_type: contract.contract_type,
          job_title: contract.job_title || '',
          start_date: new Date(contract.start_date).toISOString().split('T')[0],
          end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
          weekly_hours: contract.weekly_hours,
          working_days_per_week: contract.working_days_per_week,
          trial_period_days: contract.trial_period_days,
          is_forfait_journalier: contract.is_forfait_journalier,
          daily_rate: contract.daily_rate || undefined,
          hourly_rate: contract.hourly_rate || undefined,
          monthly_salary: contract.monthly_salary || undefined,
          collective_agreement: contract.collective_agreement || '',
          coefficient: contract.coefficient || '',
          echelon: contract.echelon || '',
          niveau: contract.niveau || '',
          min_rest_hours: contract.min_rest_hours,
          max_consecutive_days: contract.max_consecutive_days,
          notes: contract.notes || '',
        })
      }
    }
  }, [open, contract, form])

  const loadOrgId = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('org_id')
        .eq('location_id', locationId)
        .single()

      if (error) throw error
      if (data) setOrgId(data.org_id)
    } catch (error) {
      console.error('Error loading org_id:', error)
    }
  }

  const onSubmit = async (data: ContractFormValues) => {
    setIsSubmitting(true)
    
    try {
      const contractData = {
        user_id: userId,
        org_id: orgId,
        location_id: locationId,
        country_code: locationCountry || 'IT',
        ...data,
      }

      if (contract) {
        const { error } = await supabase
          .from('user_contracts')
          .update(contractData)
          .eq('id', contract.id)

        if (error) throw error
        toast.success(t('contracts.messages.updateSuccess'))
      } else {
        const { error } = await supabase
          .from('user_contracts')
          .insert([contractData])

        if (error) throw error
        toast.success(t('contracts.messages.createSuccess'))
      }

      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving contract:', error)
      toast.error(contract ? t('contracts.messages.updateError') : t('contracts.messages.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? t('contracts.editContract') : t('contracts.newContract')}
          </DialogTitle>
          <DialogDescription>
            {contract 
              ? t('contracts.dialogs.editTitle')
              : t('contracts.dialogs.newTitle')
            }
            {locationCountry && ` (${locationCountry})`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t('contracts.sections.basicInfo')}</h3>
              
              <FormField
                control={form.control}
                name="contract_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.fields.contractType')} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('contracts.fields.contractTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contractTypeCodes.map((code) => (
                          <SelectItem key={code} value={code}>
                            {t(getContractTypeTranslationKey(code))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.fields.jobTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('contracts.fields.jobTitlePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.startDate')} *</FormLabel>
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
                      <FormLabel>
                        {t('contracts.fields.endDate')} {t('contracts.fields.endDateOptional')}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t('contracts.sections.workingHours')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {!isForfait && (
                  <FormField
                    control={form.control}
                    name="weekly_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contracts.fields.weeklyHours')} *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={t('contracts.fields.weeklyHoursPlaceholder')}
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="working_days_per_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.workingDaysPerWeek')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t('contracts.fields.workingDaysPerWeekPlaceholder')}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="trial_period_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.fields.trialPeriodDays')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={t('contracts.fields.trialPeriodPlaceholder')}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Remuneration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t('contracts.sections.remuneration')}</h3>
              
              <FormField
                control={form.control}
                name="is_forfait_journalier"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('contracts.fields.isForfaitJournalier')}</FormLabel>
                      <FormDescription>
                        {t('contracts.fields.isForfaitDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isForfait ? (
                <FormField
                  control={form.control}
                  name="daily_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.dailyRate')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder={t('contracts.fields.dailyRatePlaceholder')}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contracts.fields.hourlyRate')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder={t('contracts.fields.hourlyRatePlaceholder')}
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthly_salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contracts.fields.monthlySalary')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder={t('contracts.fields.monthlySalaryPlaceholder')}
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* French Specific Fields */}
            {isFrench && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">{t('contracts.sections.frenchSpecific')}</h3>
                
                <FormField
                  control={form.control}
                  name="collective_agreement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.collectiveAgreement')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('contracts.fields.collectiveAgreementPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="niveau"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contracts.fields.niveau')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('contracts.fields.niveauPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FRANCE_NIVEAUX.map((n) => (
                              <SelectItem key={n.value} value={n.value}>
                                {n.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="echelon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contracts.fields.echelon')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('contracts.fields.echelonPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FRANCE_ECHELONS.map((e) => (
                              <SelectItem key={e.value} value={e.value}>
                                {e.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="coefficient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.coefficient')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('contracts.fields.coefficientPlaceholder')} {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        {t('contracts.fields.coefficientDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Planning Constraints */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t('contracts.sections.planningConstraints')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_rest_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.minRestHours')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t('contracts.fields.minRestHoursPlaceholder')}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('contracts.fields.minRestHoursDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_consecutive_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contracts.fields.maxConsecutiveDays')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t('contracts.fields.maxConsecutiveDaysPlaceholder')}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('contracts.fields.maxConsecutiveDaysDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t('contracts.sections.notes')}</h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contracts.fields.notesPlaceholder')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('contracts.fields.notesPlaceholder')}
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('contracts.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('contracts.actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
