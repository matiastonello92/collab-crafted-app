-- Add created_by column to rotas table for audit trail
ALTER TABLE public.rotas
  ADD COLUMN created_by uuid;