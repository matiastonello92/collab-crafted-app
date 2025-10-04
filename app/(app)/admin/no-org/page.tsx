'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

export default function AdminNoOrg() {
  const { t } = useTranslation()
  
  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl">{t('admin.noOrg.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {t('admin.noOrg.description')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('admin.noOrg.reason')}
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.noOrg.backToHome')}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}