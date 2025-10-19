export interface UserContract {
  id: string
  user_id: string
  org_id: string
  location_id: string
  contract_type: string
  job_title?: string
  start_date: string
  end_date?: string
  weekly_hours: number
  working_days_per_week: number
  daily_hours_min?: number
  daily_hours_max?: number
  min_rest_hours: number
  max_consecutive_days: number
  max_weekly_hours?: number
  trial_period_days: number
  collective_agreement?: string
  coefficient?: string
  hourly_rate?: number
  monthly_salary?: number
  salary_currency: string
  country_code: string
  metadata: Record<string, any>
  notes?: string
  is_active: boolean
  terminated_at?: string
  termination_reason?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ContractFormData {
  contract_type: string
  job_title?: string
  start_date: string
  end_date?: string
  weekly_hours: number
  working_days_per_week: number
  trial_period_days: number
  hourly_rate?: number
  monthly_salary?: number
  collective_agreement?: string
  coefficient?: string
  min_rest_hours: number
  max_consecutive_days: number
  notes?: string
}

// Tipi di contratto per Francia
export const FRANCE_CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI - Contratto a tempo indeterminato' },
  { value: 'cdd', label: 'CDD - Contratto a tempo determinato' },
  { value: 'interim', label: 'Lavoro interinale' },
  { value: 'apprentissage', label: 'Contratto di apprendistato' },
  { value: 'professionnalisation', label: 'Contratto di professionalizzazione' },
  { value: 'saisonnier', label: 'Contratto stagionale' },
]

// Tipi di contratto generici (per altri paesi)
export const DEFAULT_CONTRACT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'seasonal', label: 'Seasonal' },
]

// Funzione per ottenere tipi di contratto per paese
export function getContractTypesForCountry(country?: string) {
  if (!country) return DEFAULT_CONTRACT_TYPES
  
  const normalized = country.toUpperCase()
  
  switch(normalized) {
    case 'FRANCE':
    case 'FR':
      return FRANCE_CONTRACT_TYPES
    default:
      return DEFAULT_CONTRACT_TYPES
  }
}

// Funzione per determinare se un paese richiede campi specifici
export function requiresFrenchFields(country?: string): boolean {
  if (!country) return false
  const normalized = country.toUpperCase()
  return normalized === 'FRANCE' || normalized === 'FR'
}
