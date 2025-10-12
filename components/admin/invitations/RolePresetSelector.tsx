'use client'

import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export type RolePresetType = 'admin' | 'manager' | 'staff' | 'custom'

interface RolePreset {
  id: RolePresetType
  title: string
  description: string
  icon: string
}

interface RolePresetSelectorProps {
  selected: RolePresetType | null
  onSelect: (preset: RolePresetType) => void
}

export function RolePresetSelector({ selected, onSelect }: RolePresetSelectorProps) {
  const { t } = useTranslation()
  
  const PRESETS: RolePreset[] = [
    {
      id: 'admin',
      title: t('admin.rolePresets.admin.title'),
      description: t('admin.rolePresets.admin.description'),
      icon: '👑'
    },
    {
      id: 'manager',
      title: t('admin.rolePresets.manager.title'),
      description: t('admin.rolePresets.manager.description'),
      icon: '📊'
    },
    {
      id: 'staff',
      title: t('admin.rolePresets.staff.title'),
      description: t('admin.rolePresets.staff.description'),
      icon: '👤'
    },
    {
      id: 'custom',
      title: t('admin.rolePresets.custom.title'),
      description: t('admin.rolePresets.custom.description'),
      icon: '⚙️'
    }
  ]
  
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
