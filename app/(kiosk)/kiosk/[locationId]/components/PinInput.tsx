'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { UserLookupResponse } from '@/types/timeclock'
import { Loader2, User } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface PinInputProps {
  locationId: string
  onUserIdentified: (user: UserLookupResponse) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function PinInput({
  locationId,
  onUserIdentified,
  isLoading,
  setIsLoading
}: PinInputProps) {
  const { t } = useTranslation()
  const [pin, setPin] = useState<string[]>(['', '', '', ''])
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ]

  useEffect(() => {
    inputRefs[0].current?.focus()
  }, [])

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only numbers

    const newPin = [...pin]
    newPin[index] = value.slice(-1) // Only last character
    setPin(newPin)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus()
    }

    // Auto-submit when 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join('')
      if (fullPin.length === 4) {
        handleLookup(fullPin)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handleLookup = async (fullPin: string) => {
    if (fullPin.length !== 4) {
      toast.error(t('kiosk.errors.invalidPin'))
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/timeclock/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin, location_id: locationId })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || t('kiosk.errors.pinNotValid'))
        setPin(['', '', '', ''])
        inputRefs[0].current?.focus()
        return
      }

      const user: UserLookupResponse = await res.json()
      toast.success(t('kiosk.welcome').replace('{name}', user.full_name))
      onUserIdentified(user)
    } catch (error) {
      console.error('Lookup error:', error)
      toast.error(t('kiosk.errors.lookupError'))
      setPin(['', '', '', ''])
      inputRefs[0].current?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setPin(['', '', '', ''])
    inputRefs[0].current?.focus()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl backdrop-blur-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xl">
          <User className="w-7 h-7 md:w-8 md:h-8 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{t('kiosk.enterPin')}</h2>
        <p className="text-white/70 text-base md:text-lg">{t('kiosk.pinDescription')}</p>
      </div>

      {/* PIN Input Fields */}
      <div className="flex justify-center gap-3 md:gap-5">
        {pin.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isLoading}
            className="w-14 h-18 md:w-16 md:h-20 text-center text-2xl md:text-3xl font-bold backdrop-blur-xl bg-white/20 border-2 border-white/30 rounded-2xl text-white placeholder-white/30 focus:border-white/50 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:opacity-50 transition-all shadow-xl"
          />
        ))}
      </div>

      {/* Clear Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={handleClear}
          disabled={isLoading}
          className="text-base md:text-lg px-6 md:px-8 py-4 md:py-5 backdrop-blur-xl bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/40 transition-all shadow-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('kiosk.verifying')}
            </>
          ) : (
            t('kiosk.clear')
          )}
        </Button>
      </div>
    </div>
  )
}
