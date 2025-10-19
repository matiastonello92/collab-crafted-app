import { z } from 'zod'

export function createAmendmentFormSchema(t: (key: string) => string) {
  return z.object({
    amendment_date: z.string().min(1, t('contracts.amendments.validation.amendmentDateRequired')),
    effective_date: z.string().min(1, t('contracts.amendments.validation.effectiveDateRequired')),
    amendment_type: z.enum(['salary_change', 'hours_change', 'position_change', 'other']),
    previous_values: z.record(z.string(), z.any()),
    new_values: z.record(z.string(), z.any()),
    reason: z.string().optional(),
    notes: z.string().optional(),
  }).refine(
    data => {
      const amendmentDate = new Date(data.amendment_date)
      const effectiveDate = new Date(data.effective_date)
      return effectiveDate >= amendmentDate
    },
    {
      message: t('contracts.amendments.validation.effectiveDateAfterAmendment'),
      path: ['effective_date']
    }
  )
}

export type AmendmentFormValues = z.infer<ReturnType<typeof createAmendmentFormSchema>>
