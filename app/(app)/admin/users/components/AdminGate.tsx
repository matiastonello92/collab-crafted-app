import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { checkIsAdmin } from '@/lib/data/admin'

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
              <h3 className="text-lg font-semibold mb-2">Accesso Negato</h3>
              <p className="text-muted-foreground">
                Non hai i permessi necessari per accedere a questa sezione amministrativa.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                È richiesto il ruolo di amministratore per visualizzare questa pagina.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}