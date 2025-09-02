'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, MapPin, Building } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { UserDropdown } from '@/components/nav/UserDropdown'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAppContext } from '@/lib/appContext'
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions'
import { setActiveLocationAction } from '@/lib/activeLocation'

// Mock data for demonstration
const mockOrgs = [
  { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Demo Organization' }
]

const mockLocations = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Lyon' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Menton' }
]

export default function HeaderClient() {
  const { context, setContext } = useAppStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffectivePermissions()

  const handleOrgChange = async (orgId?: string) => {
    setContext({
      ...context,
      org_id: orgId ?? null,
      location_id: null
    })

    const params = new URLSearchParams(searchParams.toString())
    if (orgId) {
      params.set('orgId', orgId)
      document.cookie = `pn_org=${orgId}; path=/; max-age=7776000`
    } else {
      params.delete('orgId')
      document.cookie = 'pn_org=; Max-Age=0; path=/'
    }
    params.delete('locationId')
    document.cookie = 'pn_loc=; Max-Age=0; path=/'
    router.replace(`?${params.toString()}`)
    await setAppContext(orgId, undefined)
  }

  const handleLocationChange = async (locationId?: string) => {
    const newLoc = !locationId || locationId === 'all-locations' ? null : locationId
    setContext({
      ...context,
      location_id: newLoc
    })

    const params = new URLSearchParams(searchParams.toString())
    if (context.org_id) {
      params.set('orgId', context.org_id)
    }
    if (newLoc) {
      params.set('locationId', newLoc)
      document.cookie = `pn_loc=${newLoc}; path=/; max-age=7776000`
    } else {
      params.delete('locationId')
      document.cookie = 'pn_loc=; Max-Age=0; path=/'
    }
    router.replace(`?${params.toString()}`)
    await setAppContext(context.org_id ?? undefined, newLoc ?? undefined)
    await setActiveLocationAction(newLoc ?? undefined)
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Context Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select
              value={context.org_id ?? undefined}
              onValueChange={handleOrgChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleziona organizzazione" />
              </SelectTrigger>
              <SelectContent>
                {mockOrgs
                  .filter((org) => org?.id !== undefined && org?.id !== null)
                  .map((org) => (
                    <SelectItem
                      key={`org-${org.id}`}
                      value={String(org.id)}
                    >
                      {org.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {context.org_id && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select
                value={context.location_id ?? undefined}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tutte le location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-locations">
                    Tutte le location
                  </SelectItem>
                  {mockLocations
                    .filter(
                      (location) =>
                        location?.id !== undefined && location?.id !== null
                    )
                    .map((location) => (
                      <SelectItem
                        key={`loc-${location.id}`}
                        value={String(location.id)}
                      >
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
          {/* Notifications */}
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

