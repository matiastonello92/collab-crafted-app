'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Edit, Eye, XCircle, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { format, isPast, isFuture } from 'date-fns'
import { it } from 'date-fns/locale'
import { ContractFormDialog } from './ContractFormDialog'
import { type UserContract } from '@/lib/types/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ContractsListProps {
  userId: string
  userFullName: string
}

export function ContractsList({ userId, userFullName }: ContractsListProps) {
  const supabase = useSupabase()
  const [contracts, setContracts] = useState<UserContract[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<UserContract | null>(null)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [contractToTerminate, setContractToTerminate] = useState<UserContract | null>(null)
  const [locationInfo, setLocationInfo] = useState<{ id: string; country: string } | null>(null)

  useEffect(() => {
    loadContracts()
  }, [userId])

  const loadContracts = async () => {
    try {
      setLoading(true)
      
      // Prima carichiamo la location dell'utente per determinare il paese
      const { data: profileData } = await supabase
        .from('profiles')
        .select('default_location_id')
        .eq('id', userId)
        .single()

      if (profileData?.default_location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('id, country')
          .eq('id', profileData.default_location_id)
          .single()

        if (locationData) {
          setLocationInfo(locationData)
        }
      }

      // Poi carichiamo i contratti
      const { data, error } = await supabase
        .from('user_contracts')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      console.error('Error loading contracts:', error)
      toast.error('Errore durante il caricamento dei contratti')
    } finally {
      setLoading(false)
    }
  }

  const getContractStatus = (contract: UserContract) => {
    if (contract.terminated_at) return 'terminated'
    if (!contract.is_active) return 'inactive'
    
    const now = new Date()
    const startDate = new Date(contract.start_date)
    
    if (isFuture(startDate)) return 'future'
    if (contract.end_date && isPast(new Date(contract.end_date))) return 'expired'
    
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Attivo</Badge>
      case 'future':
        return <Badge variant="secondary">Futuro</Badge>
      case 'expired':
        return <Badge variant="outline">Scaduto</Badge>
      case 'terminated':
        return <Badge variant="destructive">Terminato</Badge>
      default:
        return <Badge variant="secondary">Inattivo</Badge>
    }
  }

  const handleNewContract = () => {
    setSelectedContract(null)
    setDialogOpen(true)
  }

  const handleEditContract = (contract: UserContract) => {
    setSelectedContract(contract)
    setDialogOpen(true)
  }

  const handleTerminateClick = (contract: UserContract) => {
    setContractToTerminate(contract)
    setTerminateDialogOpen(true)
  }

  const handleTerminateConfirm = async () => {
    if (!contractToTerminate) return

    try {
      const { error } = await supabase
        .from('user_contracts')
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
        })
        .eq('id', contractToTerminate.id)

      if (error) throw error

      toast.success('Contratto terminato con successo')
      loadContracts()
    } catch (error: any) {
      console.error('Error terminating contract:', error)
      toast.error(error.message || 'Errore durante la terminazione del contratto')
    } finally {
      setTerminateDialogOpen(false)
      setContractToTerminate(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const activeContracts = contracts.filter(c => getContractStatus(c) === 'active')
  const historicalContracts = contracts.filter(c => getContractStatus(c) !== 'active')

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contratti di Lavoro
              </CardTitle>
              <CardDescription>
                Gestisci i contratti e i vincoli di pianificazione per {userFullName}
              </CardDescription>
            </div>
            <Button onClick={handleNewContract} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Contratto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {contracts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-sm font-medium">Nessun contratto</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Inizia creando un nuovo contratto per questo utente
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Contratti Attivi */}
              {activeContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Contratti Attivi</h3>
                  {activeContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      status={getContractStatus(contract)}
                      onEdit={handleEditContract}
                      onTerminate={handleTerminateClick}
                      statusBadge={getStatusBadge(getContractStatus(contract))}
                    />
                  ))}
                </div>
              )}

              {/* Storico Contratti */}
              {historicalContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Storico</h3>
                  {historicalContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      status={getContractStatus(contract)}
                      onEdit={handleEditContract}
                      onTerminate={handleTerminateClick}
                      statusBadge={getStatusBadge(getContractStatus(contract))}
                      isHistorical
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        locationId={locationInfo?.id || ''}
        locationCountry={locationInfo?.country}
        contract={selectedContract}
        onSuccess={loadContracts}
      />

      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminare il contratto?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione segnerà il contratto come terminato. Il contratto non potrà più essere modificato
              ma rimarrà visibile nello storico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminateConfirm}>
              Termina Contratto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface ContractCardProps {
  contract: UserContract
  status: string
  onEdit: (contract: UserContract) => void
  onTerminate: (contract: UserContract) => void
  statusBadge: React.ReactNode
  isHistorical?: boolean
}

function ContractCard({ contract, status, onEdit, onTerminate, statusBadge, isHistorical }: ContractCardProps) {
  return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{contract.job_title || 'Posizione non specificata'}</h4>
              {statusBadge}
              {contract.is_forfait_journalier && (
                <Badge variant="secondary">Forfait</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.contract_type}
              {!contract.is_forfait_journalier && ` • ${contract.weekly_hours}h/settimana`}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(contract.start_date), 'PPP', { locale: it })}
              {contract.end_date && ` - ${format(new Date(contract.end_date), 'PPP', { locale: it })}`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(contract)}
              disabled={status === 'terminated'}
            >
              {status === 'active' ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTerminate(contract)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Dettagli Contratto */}
        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div>
            <span className="text-muted-foreground">Retribuzione:</span>
            <span className="ml-2 font-medium">
              {contract.is_forfait_journalier && contract.daily_rate
                ? `€${contract.daily_rate}/giorno`
                : contract.monthly_salary 
                ? `€${contract.monthly_salary}/mese`
                : contract.hourly_rate 
                ? `€${contract.hourly_rate}/ora`
                : 'Non specificata'
              }
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Giorni/settimana:</span>
            <span className="ml-2 font-medium">{contract.working_days_per_week}</span>
          </div>
          {contract.collective_agreement && (
            <div className="col-span-2">
              <span className="text-muted-foreground">CCNL:</span>
              <span className="ml-2 font-medium">{contract.collective_agreement}</span>
            </div>
          )}
          {contract.niveau && (
            <div>
              <span className="text-muted-foreground">Niveau:</span>
              <span className="ml-2 font-medium">{contract.niveau}</span>
            </div>
          )}
          {contract.echelon && (
            <div>
              <span className="text-muted-foreground">Échelon:</span>
              <span className="ml-2 font-medium">{contract.echelon}</span>
            </div>
          )}
          {contract.coefficient && (
            <div>
              <span className="text-muted-foreground">Coefficient:</span>
              <span className="ml-2 font-medium">{contract.coefficient}</span>
            </div>
          )}
        </div>

        {contract.terminated_at && (
          <p className="text-xs text-destructive pt-2 border-t">
            Terminato il {format(new Date(contract.terminated_at), 'PPP', { locale: it })}
          </p>
        )}
      </div>
  )
}
