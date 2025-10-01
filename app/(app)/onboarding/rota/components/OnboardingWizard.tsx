'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { WizardStepper } from '@/components/onboarding/WizardStepper'
import { Step1SelectLocation } from './Step1SelectLocation'
import { Step2SelectWeek } from './Step2SelectWeek'
import { Step3AddShifts } from './Step3AddShifts'
import { Step4Review } from './Step4Review'
import { useWizardData } from '../hooks/useWizardData'
import { useRotaCheck } from '../hooks/useRotaCheck'
import { useAppStore } from '@/lib/store/unified'

const STEPS = [
  { id: 1, title: 'Location', description: 'Seleziona location' },
  { id: 2, title: 'Settimana', description: 'Scegli settimana' },
  { id: 3, title: 'Turni', description: 'Aggiungi turni' },
  { id: 4, title: 'Pubblica', description: 'Riepilogo e invio' },
]

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [rotaId, setRotaId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<string | null>(null)

  const {
    locations,
    jobTags,
    users,
    shifts,
    loading,
    fetchLocations,
    fetchJobTags,
    fetchUsers,
    fetchShifts,
  } = useWizardData()

  const { checkRota } = useRotaCheck()

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId)
    const location = locations.find((l) => l.id === locationId) as any
    if (location) {
      setSelectedOrgId(location.org_id)
      
      // CRITICAL: Synchronize with global context (like inventory modules)
      console.log('🔄 [WIZARD] Syncing location to global context:', {
        location_id: locationId,
        location_name: location.name,
        org_id: location.org_id
      });
      
      useAppStore.getState().updateLocation(locationId, location.name);
      useAppStore.getState().setContext({ org_id: location.org_id });
      
      fetchJobTags(location.org_id)
      fetchUsers(locationId)
    }
  }

  const handleRotaCreated = (newRotaId: string, newWeekStart: string) => {
    setRotaId(newRotaId)
    setWeekStart(newWeekStart)
    fetchShifts(newRotaId)
    setCurrentStep(3)
  }

  const handleShiftsUpdate = () => {
    if (rotaId) {
      fetchShifts(rotaId)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Onboarding Rota</h1>
        <p className="text-muted-foreground">
          Crea la tua prima rota settimanale e assegna i turni agli utenti.
        </p>
      </div>

      <WizardStepper steps={STEPS} currentStep={currentStep} />

      <Card className="p-6">
        {currentStep === 1 && (
          <Step1SelectLocation
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            onNext={() => setCurrentStep(2)}
            loading={loading}
          />
        )}

        {currentStep === 2 && selectedLocation && selectedOrgId && (
          <Step2SelectWeek
            locationId={selectedLocation}
            orgId={selectedOrgId}
            onRotaCreated={handleRotaCreated}
            onBack={() => setCurrentStep(1)}
            checkRota={checkRota}
          />
        )}

        {currentStep === 3 && rotaId && weekStart && (
          <Step3AddShifts
            rotaId={rotaId}
            weekStart={weekStart}
            jobTags={jobTags}
            users={users}
            shifts={shifts}
            onShiftsUpdate={handleShiftsUpdate}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && rotaId && (
          <Step4Review
            rotaId={rotaId}
            shifts={shifts}
            onBack={() => setCurrentStep(3)}
          />
        )}
      </Card>
    </div>
  )
}
