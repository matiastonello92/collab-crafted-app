import { requireOrgAdmin } from '@/lib/admin/guards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Flag, Plus, Search, Filter, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { t } from '@/lib/i18n'

export const runtime = 'nodejs'

export default async function FeatureFlagsPage() {
  // Ensure user has admin permissions
  await requireOrgAdmin()

  // Mock data for the placeholder
  const mockFlags = [
    { name: 'inventory_advanced_search', status: 'active', scope: 'global', description: t('featureFlagsMock.inventorySearch') },
    { name: 'supplier_integration', status: 'active', scope: 'lyon', description: t('featureFlagsMock.supplierIntegration') },
    { name: 'task_automation', status: 'inactive', scope: 'global', description: t('featureFlagsMock.taskAutomation') },
    { name: 'mobile_notifications', status: 'active', scope: 'menton', description: t('featureFlagsMock.mobileNotifications') },
    { name: 'advanced_reporting', status: 'inactive', scope: 'global', description: t('featureFlagsMock.advancedReporting') },
    { name: 'chat_integration', status: 'active', scope: 'global', description: t('featureFlagsMock.chatIntegration') },
  ]

  const totalFlags = mockFlags.length
  const activeFlags = mockFlags.filter(f => f.status === 'active').length
  const inactiveFlags = totalFlags - activeFlags

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Admin
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Flag className="h-8 w-8" />
            {t('featureFlags.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('featureFlags.description')}
          </p>
        </div>
        <Button disabled className="gap-2">
          <Plus className="h-4 w-4" />
          {t('featureFlags.buttons.new')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalFlags}</p>
                <p className="text-sm text-muted-foreground">{t('featureFlags.stats.total')}</p>
              </div>
              <Flag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{activeFlags}</p>
                <p className="text-sm text-muted-foreground">{t('featureFlags.stats.active')}</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {t('featureFlags.badges.active')}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">{inactiveFlags}</p>
                <p className="text-sm text-muted-foreground">{t('featureFlags.stats.inactive')}</p>
              </div>
              <Badge variant="outline">
                {t('featureFlags.badges.inactive')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>{t('featureFlags.title')}</CardTitle>
          <CardDescription>
            {t('featureFlags.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('featureFlags.search.placeholder')}
                  className="pl-10"
                  disabled
                />
              </div>
            </div>
            <Button variant="outline" disabled className="gap-2">
              <Filter className="h-4 w-4" />
              {t('featureFlags.buttons.filters')}
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('featureFlags.table.name')}</TableHead>
                  <TableHead>{t('featureFlags.table.status')}</TableHead>
                  <TableHead>{t('featureFlags.table.scope')}</TableHead>
                  <TableHead>{t('featureFlags.table.description')}</TableHead>
                  <TableHead className="w-24">{t('featureFlags.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFlags.map((flag, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {flag.name}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={flag.status === 'active' ? 'default' : 'outline'}
                        className={flag.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {flag.status === 'active' ? t('featureFlags.badges.active') : t('featureFlags.badges.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {flag.scope === 'global' ? t('featureFlags.badges.global') : flag.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {flag.description}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled>
                        {t('featureFlags.buttons.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Placeholder UI:</strong> {t('featureFlags.placeholder.notice')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}