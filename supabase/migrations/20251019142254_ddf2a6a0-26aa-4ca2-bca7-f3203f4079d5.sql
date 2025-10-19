-- Migration 2: Estendere user_contracts con campi forfait, niveau, echelon

-- Aggiungere nuove colonne per gestione contratti completa
ALTER TABLE public.user_contracts 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS working_days_per_week INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS trial_period_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS collective_agreement TEXT,
ADD COLUMN IF NOT EXISTS coefficient TEXT,
ADD COLUMN IF NOT EXISTS echelon TEXT,
ADD COLUMN IF NOT EXISTS niveau TEXT,
ADD COLUMN IF NOT EXISTS is_forfait_journalier BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS termination_reason TEXT;

-- Modificare contract_type da default fisso a TEXT libero
ALTER TABLE public.user_contracts 
ALTER COLUMN contract_type DROP DEFAULT;

-- Creare funzione per auto-popolare country_code dalla location
CREATE OR REPLACE FUNCTION public.set_contract_country_from_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Popola automaticamente country_code dalla location
  SELECT l.country INTO NEW.country_code
  FROM public.locations l
  WHERE l.id = NEW.location_id;

  IF NEW.country_code IS NULL THEN
    RAISE EXCEPTION 'Location % non ha un paese definito', NEW.location_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger per auto-popolazione country prima di INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_set_contract_country ON public.user_contracts;
CREATE TRIGGER trigger_set_contract_country
BEFORE INSERT OR UPDATE OF location_id ON public.user_contracts
FOR EACH ROW
EXECUTE FUNCTION public.set_contract_country_from_location();

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_contracts_country ON public.user_contracts(country_code);
CREATE INDEX IF NOT EXISTS idx_user_contracts_active_dates ON public.user_contracts(start_date, end_date) WHERE is_active = true;

-- Commenti
COMMENT ON COLUMN public.user_contracts.job_title IS 'Titolo di lavoro (es: Cameriere, Chef, Manager)';
COMMENT ON COLUMN public.user_contracts.collective_agreement IS 'Convenzione collettiva applicata (es: Convention collective HCR)';
COMMENT ON COLUMN public.user_contracts.coefficient IS 'Coefficiente/livello contrattuale (calcolato da niveau + echelon)';
COMMENT ON COLUMN public.user_contracts.echelon IS 'Échelon - livello dettagliato all''interno del niveau';
COMMENT ON COLUMN public.user_contracts.niveau IS 'Niveau - livello principale del contratto';
COMMENT ON COLUMN public.user_contracts.is_forfait_journalier IS 'Se true, il contratto è a forfait giornaliero (non richiede ore)';
COMMENT ON COLUMN public.user_contracts.daily_rate IS 'Tariffa giornaliera per contratti forfait';
COMMENT ON COLUMN public.user_contracts.country_code IS 'Codice paese derivato automaticamente dalla location';
COMMENT ON COLUMN public.user_contracts.metadata IS 'Dati aggiuntivi specifici per paese in formato JSON';