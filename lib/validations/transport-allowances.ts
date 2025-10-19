import { z } from 'zod'

export function createTransportAllowanceFormSchema(t: (key: string) => string) {
  return z.object({
    allowance_name: z.string().min(1, t('contracts.transport.validation.nameRequired')),
    allowance_type: z.enum(['public_transport', 'personal_vehicle', 'bike', 'other']),
    monthly_amount: z.number().min(0, t('contracts.transport.validation.amountMin')).max(1000, t('contracts.transport.validation.amountMax')),
    employer_contribution_pct: z.number().min(0).max(100).default(50),
    employee_contribution_pct: z.number().min(0).max(100).default(50),
    start_date: z.string().min(1, t('contracts.transport.validation.startDateRequired')),
    end_date: z.string().optional(),
    notes: z.string().optional(),
  }).refine(
    data => Math.abs((data.employer_contribution_pct + data.employee_contribution_pct) - 100) < 0.01,
    { message: t('contracts.transport.validation.contributionsMust100'), path: ['employer_contribution_pct'] }
  )
}

export type TransportAllowanceFormValues = z.infer<ReturnType<typeof createTransportAllowanceFormSchema>>
