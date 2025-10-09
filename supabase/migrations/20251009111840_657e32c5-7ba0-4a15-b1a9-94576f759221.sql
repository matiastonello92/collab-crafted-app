-- Add column_mapping to financial_imports table for tracking CSV column mappings
ALTER TABLE public.financial_imports 
ADD COLUMN IF NOT EXISTS column_mapping jsonb DEFAULT '{}'::jsonb;