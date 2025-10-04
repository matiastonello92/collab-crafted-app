import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { checkIsAdmin } from '@/lib/data/admin'
import { t } from '@/lib/i18n'

interface AdminGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default async function AdminGate({ children, fallback }: AdminGateProps) {
  const isAdmin = await checkIsAdmin()
  
  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('admin.accessDenied')}</h3>
              <p className="text-muted-foreground">
                {t('admin.accessDeniedDesc')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('admin.adminRequired')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}