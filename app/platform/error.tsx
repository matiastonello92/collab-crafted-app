'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Platform Error
          </h1>
          <p className="text-muted-foreground">
            Something went wrong with the platform console.
          </p>
        </div>

        {process.env.NODE_ENV !== 'production' && (
          <pre className="text-xs text-left bg-muted/50 p-3 rounded-lg border border-border text-muted-foreground overflow-auto">
            {error.message}
          </pre>
        )}

        <Button 
          onClick={reset}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <RefreshCw size={16} className="mr-2" />
          Try again
        </Button>
      </div>
    </div>
  )
}