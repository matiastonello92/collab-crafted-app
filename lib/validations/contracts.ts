import { z } from 'zod'

// Factory function that creates schema with translations
export function createContractFormSchema(t: (key: string) => string) {
  return z.object({
    contract_type: z.string().min(1, t('contracts.validation.contractTypeRequired')),
    job_title: z.string().optional(),
    start_date: z.string().min(1, t('contracts.validation.startDateRequired')),
    end_date: z.string().optional(),
    weekly_hours: z.number()
      .min(0, t('contracts.validation.weeklyHoursMin'))
      .max(80, t('contracts.validation.weeklyHoursMax'))
      .optional(),
    working_days_per_week: z.number()
      .min(1, t('contracts.validation.workingDaysMin'))
      .max(7, t('contracts.validation.workingDaysMax')),
    trial_period_days: z.number()
      .min(0, t('contracts.validation.trialPeriodMin'))
      .default(0),
    is_forfait_journalier: z.boolean().default(false),
    daily_rate: z.number()
      .min(0, t('contracts.validation.weeklyHoursMin'))
      .optional(),
    hourly_rate: z.number()
      .min(0, t('contracts.validation.weeklyHoursMin'))
      .optional(),
    monthly_salary: z.number()
      .min(0, t('contracts.validation.weeklyHoursMin'))
      .optional(),
    collective_agreement: z.string().optional(),
    coefficient: z.string().optional(),
    echelon: z.string().optional(),
    niveau: z.string().optional(),
    min_rest_hours: z.number()
      .min(8, t('contracts.validation.minRestHoursMin'))
      .max(24, t('contracts.validation.minRestHoursMax'))
      .default(11),
    max_consecutive_days: z.number()
      .min(1, t('contracts.validation.maxConsecutiveDaysMin'))
      .max(14, t('contracts.validation.maxConsecutiveDaysMax'))
      .default(6),
    notes: z.string().optional(),
  }).refine(
    data => {
      if (data.is_forfait_journalier) {
        return !!data.daily_rate
      }
      return !!(data.hourly_rate || data.monthly_salary)
    },
    { 
      message: t('contracts.validation.rateRequired'), 
      path: ['daily_rate'] 
    }
  ).refine(
    data => {
      if (!data.is_forfait_journalier && !data.weekly_hours) {
        return false
      }
      return true
    },
    {
      message: t('contracts.validation.weeklyHoursRequired'),
      path: ['weekly_hours']
    }
  )
}

export type ContractFormValues = z.infer<ReturnType<typeof createContractFormSchema>>
