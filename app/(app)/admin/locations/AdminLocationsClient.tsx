'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, MapPin, Eye } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

interface Location {
  id: string
  name: string
  city: string
  country: string
  is_active: boolean
  updated_at: string
}

interface AdminLocationsClientProps {
  locations: Location[]
  currentCount: number
  maxLocations?: number
  canAddLocation: boolean
}

export default function AdminLocationsClient({ 
  locations, 
  currentCount, 
  maxLocations, 
  canAddLocation 
}: AdminLocationsClientProps) {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.locationsTitle')}</h1>
          <p className="text-muted-foreground">
            {t('admin.locationsDesc')}
            {maxLocations && ` (${currentCount}/${maxLocations})`}
          </p>
        </div>
        <Button asChild disabled={!canAddLocation}>
          <Link href="/admin/locations/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.addLocation')}
          </Link>
        </Button>
      </div>

      {/* Plan limit alert */}
      {maxLocations && currentCount >= maxLocations && (
        <Alert>
          <AlertDescription>
            {t('admin.planLimit')} ({maxLocations} locations). {t('admin.planLimitDesc')}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder={t('admin.searchPlaceholder')}
              className="max-w-sm"
            />
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('admin.active')}</SelectItem>
                <SelectItem value="inactive">{t('admin.archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locations ({locations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.locationName')}</TableHead>
                  <TableHead>{t('admin.locationCity')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('admin.lastUpdate')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.name}
                    </TableCell>
                    <TableCell>
                      {location.city}, {location.country}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? "default" : "secondary"}>
                        {location.is_active ? t('admin.active') : t('admin.archived')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(location.updated_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/locations/${location.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          {t('admin.openLocation')}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
