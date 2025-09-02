'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, MapPin } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { UserBadge } from '@/components/UserBadge'
import { useRouter } from 'next/navigation'
import { setActiveLocationAction } from '@/lib/activeLocation'
import { useTransition } from 'react'
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions'

type Props = {
  locations: { id: string; name: string }[]
  activeLocation: { id: string; name: string } | null
}

export default function HeaderClient({ locations, activeLocation }: Props) {
  const { context, setContext } = useAppStore()
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    setContext({
      ...context,
      location_id: activeLocation?.id ?? null,
      location_name: activeLocation?.name ?? null,
    })
  }, [activeLocation?.id, activeLocation?.name])

  useEffectivePermissions()

  const handleLocationChange = (locationId: string) => {
    const loc = locations.find((l) => l.id === locationId)
    startTransition(async () => {
      await setActiveLocationAction(locationId)
      setContext({
        ...context,
        location_id: locationId,
        location_name: loc?.name ?? null,
      })
      router.refresh()
    })
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {locations.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select
                value={activeLocation?.id}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Seleziona location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          <UserBadge />
        </div>
      </div>
    </header>
  )
}
