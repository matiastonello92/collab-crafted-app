import { z } from 'zod'

export function createBonusAdvanceFormSchema(t: (key: string) => string) {
  return z.object({
    transaction_type: z.enum(['bonus', 'advance', 'commission', 'other']),
    description: z.string().min(1, t('contracts.bonuses.validation.descriptionRequired')),
    amount: z.number().min(0.01, t('contracts.bonuses.validation.amountMin')).max(50000, t('contracts.bonuses.validation.amountMax')),
    transaction_date: z.string().min(1, t('contracts.bonuses.validation.transactionDateRequired')),
    payment_date: z.string().optional(),
    related_month: z.string().optional(),
    notes: z.string().optional(),
  }).refine(
    data => data.transaction_type !== 'advance' || data.amount <= 10000,
    { message: t('contracts.bonuses.validation.advanceMaxAmount'), path: ['amount'] }
  )
}

export type BonusAdvanceFormValues = z.infer<ReturnType<typeof createBonusAdvanceFormSchema>>
