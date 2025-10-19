import { z } from 'zod'

export const contractFormSchema = z.object({
  contract_type: z.string().min(1, 'Tipo contratto obbligatorio'),
  job_title: z.string().optional(),
  start_date: z.string().min(1, 'Data inizio obbligatoria'),
  end_date: z.string().optional(),
  weekly_hours: z.number().min(1, 'Minimo 1 ora').max(80, 'Ore settimanali devono essere tra 1 e 80'),
  working_days_per_week: z.number().min(1, 'Minimo 1 giorno').max(7, 'Massimo 7 giorni'),
  trial_period_days: z.number().min(0, 'Non può essere negativo').default(0),
  hourly_rate: z.number().min(0, 'Non può essere negativo').optional(),
  monthly_salary: z.number().min(0, 'Non può essere negativo').optional(),
  collective_agreement: z.string().optional(),
  coefficient: z.string().optional(),
  min_rest_hours: z.number().min(8, 'Minimo legale 8 ore').max(24, 'Massimo 24 ore').default(11),
  max_consecutive_days: z.number().min(1, 'Minimo 1 giorno').max(14, 'Massimo 14 giorni').default(6),
  notes: z.string().optional(),
}).refine(
  data => data.hourly_rate || data.monthly_salary,
  { 
    message: 'Specificare almeno una tra tariffa oraria o salario mensile', 
    path: ['hourly_rate'] 
  }
)

export type ContractFormValues = z.infer<typeof contractFormSchema>
