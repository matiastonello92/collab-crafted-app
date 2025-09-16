'use client';

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const TOKENS: Array<{ name: string; label: string }> = [
  { name: '--background', label: 'Background' },
  { name: '--background-elevated', label: 'Background Elevated' },
  { name: '--foreground', label: 'Foreground' },
  { name: '--muted', label: 'Muted' },
  { name: '--muted-foreground', label: 'Muted Foreground' },
  { name: '--card', label: 'Card' },
  { name: '--card-foreground', label: 'Card Foreground' },
  { name: '--border', label: 'Border' },
  { name: '--ring', label: 'Ring' },
  { name: '--primary', label: 'Primary' },
  { name: '--primary-foreground', label: 'Primary Foreground' },
  { name: '--accent', label: 'Accent' },
  { name: '--accent-foreground', label: 'Accent Foreground' },
]

export default function ThemeDiagnosticsPage() {
  const [bodyClass, setBodyClass] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement)
    const next: Record<string, string> = {}
    TOKENS.forEach((token) => {
      next[token.name] = computed.getPropertyValue(token.name).trim()
    })
    setValues(next)
    setBodyClass(document.body.className)
  }, [])

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Theme diagnostics</CardTitle>
          <CardDescription>Runtime inspection for CSS variable tokens and current body class.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Body class</p>
            <code className="mt-1 block rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {bodyClass || '—'}
            </code>
          </div>
          <Separator />
          <div className="space-y-3">
            {TOKENS.map(({ name, label }) => {
              const value = values[name]
              return (
                <div key={name} className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] sm:items-center">
                  <span className="font-mono text-xs text-muted-foreground">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <div
                      aria-hidden="true"
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ backgroundColor: value ? `hsl(${value})` : 'transparent' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{value || '—'}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
