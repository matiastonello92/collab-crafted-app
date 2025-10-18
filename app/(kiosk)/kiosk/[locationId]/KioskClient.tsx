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
      <div className="w-full max-w-3xl space-y-8">
        {/* Header with Glass Effect */}
        <div className="text-center space-y-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">{locationName}</h1>
          <p className="text-2xl text-white/80">Timbratura Presenze</p>
        </div>

        {/* Clock with Glass Effect */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <KioskClock />
        </div>

        {/* Main Content with Enhanced Glass Effect */}
        <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-10 shadow-2xl">
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

        {/* Footer with Glass Effect */}
        <div className="text-center text-sm backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl py-4 px-6">
          <p className="text-white/60">Klyra Shifts © 2025</p>
        </div>
      </div>
    </div>
  )
}
