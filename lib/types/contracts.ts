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

// Tipi di contratto per Francia
export const FRANCE_CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI - Contratto a tempo indeterminato' },
  { value: 'cdd', label: 'CDD - Contratto a tempo determinato' },
  { value: 'cadre', label: 'Cadre - Contratto dirigenziale' },
  { value: 'interim', label: 'Lavoro interinale' },
  { value: 'apprentissage', label: 'Contratto di apprendistato' },
  { value: 'professionnalisation', label: 'Contratto di professionalizzazione' },
  { value: 'saisonnier', label: 'Contratto stagionale' },
]

// Niveaux per Francia (HCR - Hôtels Cafés Restaurants)
export const FRANCE_NIVEAUX = [
  { value: 'I', label: 'Niveau I - Employé' },
  { value: 'II', label: 'Niveau II - Employé qualifié' },
  { value: 'III', label: 'Niveau III - Employé hautement qualifié' },
  { value: 'IV', label: 'Niveau IV - Agent de maîtrise' },
  { value: 'V', label: 'Niveau V - Cadre' },
]

// Échelons per Niveau
export const FRANCE_ECHELONS = [
  { value: '1', label: 'Échelon 1' },
  { value: '2', label: 'Échelon 2' },
  { value: '3', label: 'Échelon 3' },
]

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
