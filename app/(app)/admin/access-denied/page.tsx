import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminAccessDenied() {
  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl">Admin Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Organization admin access is required to view this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Make sure you're in the correct organization and have admin permissions.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}