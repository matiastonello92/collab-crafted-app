-- Add product_category column to inventory_catalog_items
ALTER TABLE public.inventory_catalog_items 
ADD COLUMN IF NOT EXISTS product_category TEXT;

-- Add comment explaining categories per department
COMMENT ON COLUMN public.inventory_catalog_items.product_category IS 
'Product category varies by department: 
Kitchen: Carne, Pesce, Vegetali, Latticini, Conserve, Surgelati
Bar: Vini, Birre, Soft Drink, Consumabili, Altro
Cleaning: Pulizia, Consumabili, Manutenzione, Altro';