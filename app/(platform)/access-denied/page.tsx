import { Shield, ArrowLeft, Home } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { t } from '@/lib/i18n'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="max-w-lg w-full mx-4">
        <Card className="border-red-200">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-900">
              {t('admin.accessDenied.title')}
            </CardTitle>
            <CardDescription className="text-red-700 text-base">
              {t('admin.accessDenied.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2">
                {t('admin.accessDenied.whyTitle')}
              </h3>
              <ul className="text-red-800 text-sm space-y-1">
                <li>{t('admin.accessDenied.reason1')}</li>
                <li>{t('admin.accessDenied.reason2')}</li>
                <li>{t('admin.accessDenied.reason3')}</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/" className="flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {t('admin.accessDenied.goBack')}
                </Link>
              </Button>
              
              <Button asChild className="flex-1">
                <Link href="/dashboard" className="flex items-center justify-center gap-2">
                  <Home className="w-4 h-4" />
                  {t('admin.accessDenied.dashboard')}
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-red-600">
              <p>
                {t('admin.accessDenied.errorMessage')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}