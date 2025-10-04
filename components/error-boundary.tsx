'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error }: { error?: Error }) {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-[100svh] bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex h-full max-w-md items-center justify-center">
        <div className="w-full rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-medium text-foreground">
              {t('common.errorBoundary.title')}
            </h3>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{t('common.errorBoundary.description')}</p>
            {error && (
              <details className="mt-2 space-y-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t('common.errorBoundary.technicalDetails')}
                </summary>
                <pre className="max-h-40 overflow-auto rounded-md border border-border/60 bg-muted/40 p-2 text-xs text-muted-foreground">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('common.errorBoundary.reloadPage')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
