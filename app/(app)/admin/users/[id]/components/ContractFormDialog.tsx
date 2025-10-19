'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'
import { contractFormSchema, type ContractFormValues } from '@/lib/validations/contracts'
import { getContractTypesForCountry, requiresFrenchFields, type UserContract } from '@/lib/types/contracts'
import { Loader2 } from 'lucide-react'

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  locationId: string
  locationCountry?: string
  contract?: UserContract | null
  onSuccess: () => void
}

export function ContractFormDialog({
  open,
  onOpenChange,
  userId,
  locationId,
  locationCountry,
  contract,
  onSuccess
}: ContractFormDialogProps) {
  const supabase = useSupabase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgId, setOrgId] = useState<string>('')
  
  const isFrench = requiresFrenchFields(locationCountry)
  const contractTypes = getContractTypesForCountry(locationCountry)
  
  const form = useForm({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contract_type: contract?.contract_type || '',
      job_title: contract?.job_title || '',
      start_date: contract?.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
      end_date: contract?.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
      weekly_hours: contract?.weekly_hours || 35,
      working_days_per_week: contract?.working_days_per_week || 5,
      trial_period_days: contract?.trial_period_days || 0,
      hourly_rate: contract?.hourly_rate || undefined,
      monthly_salary: contract?.monthly_salary || undefined,
      collective_agreement: contract?.collective_agreement || '',
      coefficient: contract?.coefficient || '',
      min_rest_hours: contract?.min_rest_hours || 11,
      max_consecutive_days: contract?.max_consecutive_days || 6,
      notes: contract?.notes || '',
    },
  })

  useEffect(() => {
    if (open) {
      loadOrgId()
      if (contract) {
        form.reset({
          contract_type: contract.contract_type,
          job_title: contract.job_title || '',
          start_date: new Date(contract.start_date).toISOString().split('T')[0],
          end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
          weekly_hours: contract.weekly_hours,
          working_days_per_week: contract.working_days_per_week,
          trial_period_days: contract.trial_period_days,
          hourly_rate: contract.hourly_rate || undefined,
          monthly_salary: contract.monthly_salary || undefined,
          collective_agreement: contract.collective_agreement || '',
          coefficient: contract.coefficient || '',
          min_rest_hours: contract.min_rest_hours,
          max_consecutive_days: contract.max_consecutive_days,
          notes: contract.notes || '',
        })
      }
    }
  }, [open, contract])

  const loadOrgId = async () => {
    try {
      const { data } = await supabase
        .from('locations')
        .select('org_id')
        .eq('id', locationId)
        .single()
      
      if (data) setOrgId(data.org_id)
    } catch (error) {
      console.error('Error loading org_id:', error)
    }
  }

  const onSubmit = async (values: any) => {
    if (!orgId) {
      toast.error('Errore: impossibile determinare l\'organizzazione')
      return
    }

    setIsSubmitting(true)
    
    try {
      const contractData = {
        user_id: userId,
        org_id: orgId,
        location_id: locationId,
        contract_type: values.contract_type,
        job_title: values.job_title || null,
        start_date: values.start_date,
        end_date: values.end_date || null,
        weekly_hours: values.weekly_hours,
        working_days_per_week: values.working_days_per_week,
        trial_period_days: values.trial_period_days,
        hourly_rate: values.hourly_rate || null,
        monthly_salary: values.monthly_salary || null,
        collective_agreement: values.collective_agreement || null,
        coefficient: values.coefficient || null,
        min_rest_hours: values.min_rest_hours,
        max_consecutive_days: values.max_consecutive_days,
        notes: values.notes || null,
        is_active: true,
      }

      if (contract) {
        // Update existing contract
        const { error } = await supabase
          .from('user_contracts')
          .update(contractData)
          .eq('id', contract.id)

        if (error) throw error
        toast.success('Contratto aggiornato con successo')
      } else {
        // Create new contract
        const { error } = await supabase
          .from('user_contracts')
          .insert(contractData)

        if (error) throw error
        toast.success('Contratto creato con successo')
      }

      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      console.error('Error saving contract:', error)
      toast.error(error.message || 'Errore durante il salvataggio del contratto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? 'Modifica Contratto' : 'Nuovo Contratto'}
          </DialogTitle>
          <DialogDescription>
            {contract 
              ? 'Modifica i dettagli del contratto di lavoro'
              : 'Crea un nuovo contratto di lavoro per questo utente'
            }
            {locationCountry && ` (${locationCountry})`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informazioni Base */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Informazioni Base</h3>
              
              <FormField
                control={form.control}
                name="contract_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Contratto *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo contratto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contractTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posizione/Ruolo</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Cameriere, Chef, Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Inizio *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Fine</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Lasciare vuoto per contratti indeterminati
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Orari di Lavoro */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Orari di Lavoro</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weekly_hours"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ore Settimanali *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="80" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="working_days_per_week"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giorni Lavorativi/Settimana *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="7" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="trial_period_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodo di Prova (giorni)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Retribuzione */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Retribuzione</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tariffa Oraria (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthly_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario Mensile (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                * Specificare almeno una tra tariffa oraria o salario mensile
              </p>
            </div>

            {/* Campi Specifici Francia */}
            {isFrench && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Informazioni Legali (Francia)</h3>
                
                <FormField
                  control={form.control}
                  name="collective_agreement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Convenzione Collettiva</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Convention collective HCR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coefficient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coefficiente/Livello</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Niveau II, échelon 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Vincoli di Pianificazione */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Vincoli di Pianificazione</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_rest_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Riposo Minimo tra Turni (ore)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="8" 
                          max="24" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 11)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Minimo legale: 11 ore
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_consecutive_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giorni Consecutivi Max</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="14" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 6)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Standard: 6 giorni
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Note */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Eventuali note aggiuntive sul contratto"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {contract ? 'Salva Modifiche' : 'Crea Contratto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
