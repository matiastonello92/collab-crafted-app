'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { UserLookupResponse } from '@/types/timeclock'
import { Loader2, User } from 'lucide-react'

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
      toast.error('Inserisci un PIN di 4 cifre')
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
        toast.error(error.error || 'PIN non valido')
        setPin(['', '', '', ''])
        inputRefs[0].current?.focus()
        return
      }

      const user: UserLookupResponse = await res.json()
      toast.success(`Benvenuto, ${user.full_name}!`)
      onUserIdentified(user)
    } catch (error) {
      console.error('Lookup error:', error)
      toast.error('Errore durante la ricerca. Riprova.')
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
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <User className="w-16 h-16 mx-auto text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Inserisci il tuo PIN</h2>
        <p className="text-muted-foreground">Usa il codice PIN a 4 cifre</p>
      </div>

      {/* PIN Input Fields */}
      <div className="flex justify-center gap-4">
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
            className="w-16 h-20 text-center text-3xl font-bold border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
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
          className="text-lg px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifica...
            </>
          ) : (
            'Cancella'
          )}
        </Button>
      </div>
    </div>
  )
}
