-- Migration 1: Rendere obbligatori country e address_line1 nelle location

-- Prima impostare un default per le location esistenti senza paese
UPDATE public.locations 
SET country = 'France' 
WHERE country IS NULL;

-- Rendere la colonna NOT NULL
ALTER TABLE public.locations 
ALTER COLUMN country SET NOT NULL;

-- Rendere obbligatorio address_line1 
UPDATE public.locations 
SET address_line1 = 'Da completare' 
WHERE address_line1 IS NULL OR address_line1 = '';

ALTER TABLE public.locations 
ALTER COLUMN address_line1 SET NOT NULL;

-- Aggiungere check constraint per evitare stringhe vuote
ALTER TABLE public.locations 
ADD CONSTRAINT locations_country_not_empty CHECK (length(trim(country)) > 0);

ALTER TABLE public.locations 
ADD CONSTRAINT locations_address_not_empty CHECK (length(trim(address_line1)) > 0);