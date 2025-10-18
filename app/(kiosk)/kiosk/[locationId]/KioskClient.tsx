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
    <div className="flex flex-col h-screen overflow-hidden p-4 md:p-6">
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full gap-4">
        {/* Header with Glass Effect */}
        <div className="flex-shrink-0 text-center space-y-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{locationName}</h1>
          <p className="text-xl md:text-2xl text-white/80">Timbratura Presenze</p>
        </div>

        {/* Clock with Glass Effect */}
        <div className="flex-shrink-0 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
          <KioskClock />
        </div>

        {/* Main Content with Enhanced Glass Effect */}
        <div className="flex-1 min-h-0 overflow-y-auto backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl">
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

        {/* Footer with Glass Effect */}
        <div className="flex-shrink-0 text-center text-sm backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl py-3 px-4">
          <p className="text-white/60">Klyra Shifts © 2025</p>
        </div>
      </div>
    </div>
  )
}
