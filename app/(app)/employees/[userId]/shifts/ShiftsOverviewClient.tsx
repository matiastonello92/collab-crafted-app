'use client'

import { ArrowLeft, Clock, Calendar, Coffee, TrendingUp, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/lib/i18n'

interface ShiftsOverviewClientProps {
  employee: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
  currentUserId: string
}

export function ShiftsOverviewClient({ employee, currentUserId }: ShiftsOverviewClientProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isOwnProfile = employee.id === currentUserId

  const upcomingFeatures = [
    { icon: Clock, label: t('employees.shifts.comingSoon.features.monthlyRecap') },
    { icon: Calendar, label: t('employees.shifts.comingSoon.features.scheduledHours') },
    { icon: Coffee, label: t('employees.shifts.comingSoon.features.leaveTaken') },
    { icon: TrendingUp, label: t('employees.shifts.comingSoon.features.overtime') },
    { icon: BarChart3, label: t('employees.shifts.comingSoon.features.stats') },
  ]

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/planner')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('employees.shifts.backToPlanner')}
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={employee.avatar_url || undefined} />
          <AvatarFallback className="text-lg">
            {employee.full_name?.[0]?.toUpperCase() || employee.email?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.full_name || employee.email}
          </h1>
          <p className="text-muted-foreground">
            {t('employees.shifts.pageTitle')}
          </p>
        </div>
        {isOwnProfile && (
          <Badge variant="outline" className="bg-primary/10">
            {t('employees.shifts.yourProfile')}
          </Badge>
        )}
      </div>

      {/* Coming Soon Card */}
      <Card className="border-2 border-dashed">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Calendar className="h-16 w-16 text-muted-foreground/40" />
              <div className="absolute -top-1 -right-1">
                <Badge variant="secondary" className="text-xs">
                  🚧
                </Badge>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">
            {t('employees.shifts.comingSoon.title')}
          </CardTitle>
          <CardDescription className="text-base">
            {t('employees.shifts.comingSoon.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border">
                  <feature.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future content */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('employees.shifts.sections.monthlyStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              {t('common.comingSoon')}
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('employees.shifts.sections.calendar')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              {t('common.comingSoon')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
