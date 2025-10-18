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
  orgId: string
}

export function KioskClient({ locationId, locationName, kioskToken, orgId }: KioskClientProps) {
  const [currentUser, setCurrentUser] = useState<UserLookupResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleUserIdentified = (user: UserLookupResponse) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden p-6 md:p-8 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full gap-6">
        {/* Header - Clean */}
        <div className="flex-shrink-0 text-center space-y-1">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-2xl">{locationName}</h1>
          <p className="text-xl md:text-2xl text-white/70">Timbratura Presenze</p>
        </div>

        {/* Clock - Clean */}
        <div className="flex-shrink-0">
          <KioskClock />
        </div>

        {/* Main Content - Clean */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full max-w-2xl">
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
                orgId={orgId}
              />
            )}
          </div>
        </div>

        {/* Footer - Clean */}
        <div className="flex-shrink-0 text-center">
          <p className="text-white/40 text-sm">Klyra Shifts © 2025</p>
        </div>
      </div>
    </div>
  )
}
