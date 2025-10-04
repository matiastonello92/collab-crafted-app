'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CatalogoTagTab } from './CatalogoTagTab'
import { AssegnazioniTab } from './AssegnazioniTab'
import { Tags, UserCog } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function JobTagsClient() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('catalogo')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('staff.jobTags.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('staff.jobTags.description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="catalogo" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            {t('staff.jobTags.tabCatalog')}
          </TabsTrigger>
          <TabsTrigger value="assegnazioni" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            {t('staff.jobTags.tabAssignments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('staff.jobTags.catalogTitle')}</CardTitle>
              <CardDescription>
                {t('staff.jobTags.catalogDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CatalogoTagTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assegnazioni" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('staff.jobTags.assignmentsTitle')}</CardTitle>
              <CardDescription>
                {t('staff.jobTags.assignmentsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssegnazioniTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
