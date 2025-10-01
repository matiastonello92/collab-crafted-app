'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShiftTimeFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export function ShiftTimeField({
  label,
  value,
  onChange,
  error,
}: ShiftTimeFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
