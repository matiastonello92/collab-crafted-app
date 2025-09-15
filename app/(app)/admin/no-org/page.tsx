import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminNoOrg() {
  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl">No Organization Context</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Unable to determine your organization context. Admin access requires a valid organization.
          </p>
          <p className="text-sm text-muted-foreground">
            This may happen if you don't belong to any organization or if there's a configuration issue.
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