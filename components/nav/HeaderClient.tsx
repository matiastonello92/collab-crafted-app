'use client'

import { useEffect, startTransition } from 'react'
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
import { UserDropdown } from '@/components/nav/UserDropdown'
import { useRouter } from 'next/navigation'
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions'
import { setActiveLocationAction } from '@/lib/activeLocation'

interface Location {
  id: string
  name: string
  org_id: string
}

interface HeaderClientProps {
  locations: Location[]
  activeLocationId: string | null
}

export default function HeaderClient({ locations, activeLocationId }: HeaderClientProps) {
  const { context, setContext } = useAppStore()
  const router = useRouter()

  useEffectivePermissions()

  useEffect(() => {
    if (locations.length > 0) {
      const active = locations.find(l => l.id === activeLocationId) || locations[0]
      setContext({
        ...context,
        org_id: active.org_id,
        location_id: active.id,
        location_name: active.name,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocationId, locations])

  const handleLocationChange = (locationId: string) => {
    const loc = locations.find(l => l.id === locationId)
    startTransition(async () => {
      await setActiveLocationAction(locationId)
      setContext({
        ...context,
        org_id: loc?.org_id || null,
        location_id: loc?.id || null,
        location_name: loc?.name || null,
      })
      router.refresh()
    })
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Location Selector */}
        <div className="flex items-center gap-4">
          {locations.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select
                value={context.location_id || undefined}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Seleziona location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Right side */}
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
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}
