'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { t, getCurrentLocale } from '@/lib/i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'section' | 'component'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  retryCount: number
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeouts: Set<NodeJS.Timeout> = new Set()

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Use crypto.randomUUID for hydration-safe ID generation
    const errorId = typeof window !== 'undefined' && window.crypto?.randomUUID 
      ? `error_${Date.now()}_${window.crypto.randomUUID().slice(0, 8)}`
      : `error_ssr_${error.name?.slice(0, 3) || 'err'}_${error.message?.length || 0}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo)
    
    // Log structured error information
    console.error('[EnhancedErrorBoundary] Error caught:', {
      errorId: this.state.errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      level: this.props.level,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
    })

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  componentWillUnmount() {
    // Clean up any pending retries
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, this would send to your monitoring service
      // Example: Sentry, LogRocket, DataDog, etc.
      if (typeof window !== 'undefined' && 'fetch' in window) {
        await fetch('/api/internal/error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorId: this.state.errorId,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            },
            errorInfo,
            level: this.props.level,
            url: window.location.href,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {}) // Silently fail - error reporting shouldn't break the app
      }
    } catch {
      // Silently fail - error reporting shouldn't break the app
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state
    const maxRetries = 3
    
    if (retryCount >= maxRetries) {
      return
    }

    // Exponential backoff for retry
    const retryDelay = Math.pow(2, retryCount) * 1000

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      })
      this.retryTimeouts.delete(timeout)
    }, retryDelay)

    this.retryTimeouts.add(timeout)
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render appropriate error UI based on level
      return this.renderErrorUI()
    }

    return this.props.children
  }

  private renderErrorUI() {
    const { error, errorInfo, errorId, retryCount } = this.state
    const { level = 'component' } = this.props
    const maxRetries = 3

    // Different UI for different error levels
    switch (level) {
      case 'page':
        return <PageLevelError 
          error={error} 
          errorId={errorId} 
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      
      case 'section':
        return <SectionLevelError 
          error={error} 
          errorId={errorId} 
          onRetry={this.handleRetry}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      
      default:
        return <ComponentLevelError 
          error={error} 
          errorId={errorId} 
          onRetry={this.handleRetry}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
    }
  }
}

// Page-level error component
function PageLevelError({ 
  error, 
  errorId, 
  onRetry, 
  onReload, 
  retryCount, 
  maxRetries 
}: {
  error: Error | null
  errorId: string
  onRetry: () => void
  onReload: () => void
  retryCount: number
  maxRetries: number
}) {
  const locale = getCurrentLocale()
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl rounded-3xl border-destructive/20 bg-card shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">
            {t('errorBoundary.applicationError', locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {t('errorBoundary.pageError', locale)}
            </p>
            <div className="text-xs font-mono text-muted-foreground/80">
              {t('errorBoundary.errorId', locale)}: {errorId}
            </div>
          </div>
          
          <ErrorDetails error={error} />
          
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button 
              onClick={onRetry} 
              disabled={retryCount >= maxRetries}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {retryCount >= maxRetries 
                ? t('errorBoundary.maxRetriesReached', locale)
                : t('errorBoundary.retryCount', locale).replace('{count}', retryCount.toString()).replace('{max}', maxRetries.toString())
              }
            </Button>
            <Button variant="outline" onClick={onReload}>
              {t('errorBoundary.reloadPage', locale)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Section-level error component
function SectionLevelError({ 
  error, 
  errorId, 
  onRetry, 
  retryCount, 
  maxRetries 
}: {
  error: Error | null
  errorId: string
  onRetry: () => void
  retryCount: number
  maxRetries: number
}) {
  const locale = getCurrentLocale()
  
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">{t('errorBoundary.sectionError', locale)}</p>
            <p className="text-sm text-muted-foreground">
              {t('errorBoundary.sectionFailedToLoad', locale)}
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRetry}
          disabled={retryCount >= maxRetries}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('errorBoundary.retry', locale)}
        </Button>
      </CardContent>
    </Card>
  )
}

// Component-level error component
function ComponentLevelError({ 
  error, 
  errorId, 
  onRetry, 
  retryCount, 
  maxRetries 
}: {
  error: Error | null
  errorId: string
  onRetry: () => void
  retryCount: number
  maxRetries: number
}) {
  const locale = getCurrentLocale()
  
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {t('errorBoundary.componentError', locale)}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onRetry}
          disabled={retryCount >= maxRetries}
          className="h-8 text-xs"
        >
          {t('errorBoundary.retry', locale)}
        </Button>
      </div>
    </div>
  )
}

// Error details component with collapsible stack trace
function ErrorDetails({ error }: { error: Error | null }) {
  const [showDetails, setShowDetails] = useState(false)
  const locale = getCurrentLocale()
  
  if (!error) return null

  return (
    <div className="text-left">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="mb-2 h-8 px-2 text-xs"
      >
        {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
        {t('errorBoundary.errorDetails', locale)}
      </Button>
      
      {showDetails && (
        <div className="space-y-2">
          <div>
            <Badge variant="destructive" className="mb-2">
              {error.name}
            </Badge>
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
          
          {error.stack && (
            <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// Convenience wrapper for common use cases
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  level: 'page' | 'section' | 'component' = 'component'
) {
  return function WrappedComponent(props: P) {
    return (
      <EnhancedErrorBoundary level={level}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    )
  }
}