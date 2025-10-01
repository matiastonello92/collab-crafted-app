'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, AlertCircle } from 'lucide-react'

interface Location {
  id: string
  name: string
}

interface Step1Props {
  locations: Location[]
  selectedLocation: string | null
  onLocationChange: (locationId: string) => void
  onNext: () => void
  loading: boolean
}

export function Step1SelectLocation({
  locations,
  selectedLocation,
  onLocationChange,
  onNext,
  loading,
}: Step1Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Caricamento location...</p>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Non hai accesso a nessuna location. Contatta l'amministratore per ottenere i
          permessi necessari.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Seleziona Location</h2>
        <p className="text-muted-foreground">
          Scegli la location per cui vuoi creare la rota settimanale.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Select value={selectedLocation || ''} onValueChange={onLocationChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona una location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {location.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedLocation}>
          Avanti
        </Button>
      </div>
    </div>
  )
}
