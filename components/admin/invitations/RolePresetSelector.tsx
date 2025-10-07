'use client'

import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RolePresetType = 'admin' | 'manager' | 'staff' | 'custom'

interface RolePreset {
  id: RolePresetType
  title: string
  description: string
  icon: string
}

const PRESETS: RolePreset[] = [
  {
    id: 'admin',
    title: 'Administrator',
    description: 'Full access to all locations and settings',
    icon: '👑'
  },
  {
    id: 'manager',
    title: 'Manager',
    description: 'Manage team, shifts, inventory for assigned locations',
    icon: '📊'
  },
  {
    id: 'staff',
    title: 'Staff Base',
    description: 'View own shifts, clock in/out, basic permissions',
    icon: '👤'
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Define permissions manually',
    icon: '⚙️'
  }
]

interface RolePresetSelectorProps {
  selected: RolePresetType | null
  onSelect: (preset: RolePresetType) => void
}

export function RolePresetSelector({ selected, onSelect }: RolePresetSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {PRESETS.map(preset => (
        <Card
          key={preset.id}
          className={cn(
            'relative p-4 cursor-pointer transition-all hover:shadow-md',
            selected === preset.id
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/50'
          )}
          onClick={() => onSelect(preset.id)}
        >
          {selected === preset.id && (
            <div className="absolute top-2 right-2">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            </div>
          )}
          
          <div className="text-3xl mb-2">{preset.icon}</div>
          <h3 className="font-semibold text-sm mb-1">{preset.title}</h3>
          <p className="text-xs text-muted-foreground leading-tight">
            {preset.description}
          </p>
        </Card>
      ))}
    </div>
  )
}
