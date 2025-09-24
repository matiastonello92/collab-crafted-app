'use client'

import React, { Suspense, lazy, ReactNode, ComponentType, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientOnly } from '@/lib/hydration/ClientOnly'

/**
 * Smart lazy loading with optimized fallbacks
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(factory)
  
  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <SmartLoadingSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * Intelligent loading skeleton that adapts to content
 */
interface SmartLoadingSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'dashboard' | 'form'
  lines?: number
  className?: string
}

export function SmartLoadingSkeleton({ 
  variant = 'card', 
  lines = 3,
  className = '' 
}: SmartLoadingSkeletonProps) {
  switch (variant) {
    case 'dashboard':
      return (
        <div className={`space-y-6 ${className}`}>
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Content area */}
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
      
    case 'table':
      return (
        <div className={`space-y-4 ${className}`}>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="border rounded-lg">
            <div className="border-b p-4">
              <div className="flex space-x-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-20" />
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b last:border-b-0 p-4">
                <div className="flex space-x-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
      
    case 'form':
      return (
        <div className={`space-y-4 ${className}`}>
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      )
      
    case 'list':
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      )
      
    default:
      return (
        <Card className={className}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
              <div className="flex space-x-2 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      )
  }
}

/**
 * Progressive loading component
 */
interface ProgressiveLoadingProps {
  children: ReactNode
  placeholder?: ReactNode
  threshold?: number // ms delay before showing placeholder
}

export function ProgressiveLoading({ 
  children, 
  placeholder,
  threshold = 200 
}: ProgressiveLoadingProps) {
  return (
    <Suspense 
      fallback={
        <ClientOnly fallback={placeholder || <SmartLoadingSkeleton />}>
          <DelayedFallback delay={threshold}>
            {placeholder || <SmartLoadingSkeleton />}
          </DelayedFallback>
        </ClientOnly>
      }
    >
      {children}
    </Suspense>
  )
}

/**
 * Delays showing fallback to prevent flash of loading state
 * Now hydration-safe with ClientOnly wrapper
 */
function DelayedFallback({ children, delay }: { children: ReactNode, delay: number }) {
  const [show, setShow] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])
  
  return show ? <>{children}</> : null
}