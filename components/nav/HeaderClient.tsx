'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions'

export default function HeaderClient({
  locations,
  activeLocationId,
  setActiveLocation,
}: {
  locations: { id: string; name: string }[]
  activeLocationId: string | null
  setActiveLocation: (id?: string | null) => Promise<void>
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const setContext = useAppStore(s => s.setContext)

  useEffectivePermissions()

  useEffect(() => {
    const name = locations.find(l => l.id === activeLocationId)?.name ?? null
    setContext({ org_id: null, location_id: activeLocationId, user_id: null, location_name: name })
  }, [activeLocationId, locations, setContext])

  const onSelect = (id: string) => {
    startTransition(async () => {
      await setActiveLocation(id)
      router.refresh()
    })
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select value={activeLocationId ?? undefined} onValueChange={onSelect}>
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
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              3
            </Badge>
          </Button>

          <UserDropdown />
        </div>
      </div>
    </header>
  )
}
