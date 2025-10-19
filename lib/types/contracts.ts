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
  echelon?: string
  niveau?: string
  is_forfait_journalier: boolean
  daily_rate?: number
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
  is_forfait_journalier: boolean
  daily_rate?: number
  hourly_rate?: number
  monthly_salary?: number
  collective_agreement?: string
  coefficient?: string
  echelon?: string
  niveau?: string
  min_rest_hours: number
  max_consecutive_days: number
  notes?: string
}

// Contract type codes for France
export const FRANCE_CONTRACT_TYPE_CODES = [
  'cdi',
  'cdd',
  'cadre',
  'interim',
  'apprentissage',
  'professionnalisation',
  'saisonnier',
] as const

// Niveaux codes for France (HCR - Hôtels Cafés Restaurants)
export const FRANCE_NIVEAU_CODES = ['I', 'II', 'III', 'IV', 'V'] as const

// Échelon codes
export const FRANCE_ECHELON_CODES = ['1', '2', '3'] as const

// For backward compatibility
export const FRANCE_NIVEAUX = FRANCE_NIVEAU_CODES.map(value => ({ value, label: `Niveau ${value}` }))
export const FRANCE_ECHELONS = FRANCE_ECHELON_CODES.map(value => ({ value, label: `Échelon ${value}` }))

// Helper per calcolare il coefficient da niveau + echelon
export function getCoefficient(niveau?: string, echelon?: string): string {
  if (!niveau || !echelon) return ''
  
  // Tabella coefficienti HCR
  const coefficients: Record<string, Record<string, number>> = {
    'I': { '1': 100, '2': 110, '3': 120 },
    'II': { '1': 130, '2': 140, '3': 150 },
    'III': { '1': 160, '2': 170, '3': 180 },
    'IV': { '1': 190, '2': 210, '3': 230 },
    'V': { '1': 250, '2': 270, '3': 290 },
  }
  
  return coefficients[niveau]?.[echelon]?.toString() || ''
}

// Default contract type codes (for other countries)
export const DEFAULT_CONTRACT_TYPE_CODES = [
  'full_time',
  'part_time',
  'temporary',
  'seasonal',
] as const

// Get contract type codes for country
export function getContractTypeCodesForCountry(country?: string): readonly string[] {
  if (!country) return DEFAULT_CONTRACT_TYPE_CODES
  
  const normalized = country.toUpperCase()
  
  switch(normalized) {
    case 'FRANCE':
    case 'FR':
      return FRANCE_CONTRACT_TYPE_CODES
    default:
      return DEFAULT_CONTRACT_TYPE_CODES
  }
}

// Get translation key for contract type
export function getContractTypeTranslationKey(code: string): string {
  return `contracts.types.${code}`
}

// Funzione per determinare se un paese richiede campi specifici
export function requiresFrenchFields(country?: string): boolean {
  if (!country) return false
  const normalized = country.toUpperCase()
  return normalized === 'FRANCE' || normalized === 'FR'
}
