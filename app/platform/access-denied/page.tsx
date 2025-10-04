'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

export default function PlatformAccessDenied() {
  const { t } = useTranslation()
  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl">{t('admin.accessDenied.platformAccessDenied')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {t('admin.accessDenied.platformDescription')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('admin.accessDenied.platformContact')}
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.accessDenied.backToHome')}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}