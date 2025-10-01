'use client'

import { useState } from 'react'
import { KioskClock } from './components/KioskClock'
import { PinInput } from './components/PinInput'
import { PunchButtons } from './components/PunchButtons'
import type { UserLookupResponse } from '@/types/timeclock'

interface KioskClientProps {
  locationId: string
  locationName: string
  kioskToken: string
}

export function KioskClient({ locationId, locationName, kioskToken }: KioskClientProps) {
  const [currentUser, setCurrentUser] = useState<UserLookupResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleUserIdentified = (user: UserLookupResponse) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">{locationName}</h1>
          <p className="text-xl text-muted-foreground">Timbratura Presenze</p>
        </div>

        {/* Clock */}
        <KioskClock />

        {/* Main Content */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {!currentUser ? (
            <PinInput
              locationId={locationId}
              onUserIdentified={handleUserIdentified}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          ) : (
            <PunchButtons
              locationId={locationId}
              userId={currentUser.user_id}
              userName={currentUser.full_name}
              kioskToken={kioskToken}
              onLogout={handleLogout}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Klyra Shifts © 2025</p>
        </div>
      </div>
    </div>
  )
}
