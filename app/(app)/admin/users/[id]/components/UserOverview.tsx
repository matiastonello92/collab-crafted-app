'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { User, MapPin, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface UserOverviewProps {
  user: {
    id: string
    name: string
    email: string
    phone?: string
    avatar_url?: string
    created_at: string
    is_active: boolean
    last_activity?: string
    email_confirmed?: boolean
  }
  locations: Array<{
    id: string
    name: string
  }>
  topRoles: Array<{
    name: string
    display_name: string
  }>
}

export function UserOverview({ user, locations, topRoles }: UserOverviewProps) {
  const { t } = useTranslation()
  const initials = user.name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* User Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} alt={user.name} />
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              
              <p className="text-muted-foreground">{user.email}</p>
              
              {user.phone && (
                <p className="text-sm text-muted-foreground">{user.phone}</p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                {t('userOverview.emailVerified')}: {user.email_confirmed ? t('common.yes') : t('common.no')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              {t('userOverview.locationsAssigned')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {locations.map(location => (
                  <Badge key={location.id} variant="outline">
                    {location.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('userOverview.noLocationsAssigned')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Roles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {t('userOverview.topRoles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topRoles.map((role, index) => (
                  <Badge key={index} variant="secondary">
                    {role.display_name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('common.messages.noRoles')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              {t('userOverview.accountInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">{t('userOverview.registered')}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(user.created_at), { 
                  addSuffix: true, 
                  locale: it 
                })}
              </p>
            </div>
            
            {user.last_activity && (
              <div>
                <p className="text-sm font-medium">{t('userOverview.lastActivity')}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(user.last_activity), { 
                    addSuffix: true, 
                    locale: it 
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5" />
              {t('userOverview.accountStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('userOverview.accountActive')}</span>
              {user.is_active ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('userOverview.emailVerifiedStatus')}</span>
              {user.email_confirmed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}