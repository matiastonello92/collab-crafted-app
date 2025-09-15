'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { setAppContext } from '@/lib/appContext'

interface TestResult {
  pass: boolean
  details: string
}

interface ServerTests {
  auth: TestResult
  featureBranding: TestResult
  featureInvitations: TestResult
}

interface SmokeTestClientProps {
  userId: string
  orgId: string
  locationId: string | null
  serverTests: ServerTests
}

export function SmokeTestClient({ userId, orgId, locationId, serverTests }: SmokeTestClientProps) {
  const [tests, setTests] = useState({
    auth: serverTests.auth,
    appContext: { pass: false, details: 'Not tested' },
    featureBranding: serverTests.featureBranding,
    featureInvitations: serverTests.featureInvitations,
    storage: { pass: false, details: 'Not tested' },
  })

  const [rateLimitTest, setRateLimitTest] = useState({
    running: false,
    requestCount: 0,
    lastStatus: null as number | null,
    results: [] as number[],
  })

  const runAppContextTest = async () => {
    try {
      await setAppContext(orgId, locationId || undefined)
      setTests(prev => ({
        ...prev,
        appContext: { pass: true, details: `Context set: org=${orgId}, location=${locationId || 'none'}` }
      }))
    } catch (error) {
      setTests(prev => ({
        ...prev,
        appContext: { pass: false, details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
      }))
    }
  }

  const runStorageTest = async () => {
    try {
      const response = await fetch(`/api/storage/signed-download?bucket=branding&name=${orgId}/logo.jpg`)
      const data = await response.json()
      
      if (response.ok || response.status === 404) {
        setTests(prev => ({
          ...prev,
          storage: { 
            pass: true, 
            details: response.ok ? 'Signed URL created successfully' : 'Object not found (expected, API working)' 
          }
        }))
      } else {
        setTests(prev => ({
          ...prev,
          storage: { pass: false, details: `HTTP ${response.status}: ${data.error || 'Unknown error'}` }
        }))
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        storage: { pass: false, details: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` }
      }))
    }
  }

  const runRateLimitTest = async () => {
    setRateLimitTest({
      running: true,
      requestCount: 0,
      lastStatus: null,
      results: [],
    })

    const results: number[] = []
    
    for (let i = 1; i <= 6; i++) {
      setRateLimitTest(prev => ({ ...prev, requestCount: i }))
      
      try {
        const response = await fetch('/api/settings/email-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testEmail: 'test@example.com' }),
        })
        
        results.push(response.status)
        setRateLimitTest(prev => ({ ...prev, lastStatus: response.status, results: [...results] }))
        
        // Small delay between requests
        if (i < 6) await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        results.push(0) // Network error
        setRateLimitTest(prev => ({ ...prev, lastStatus: 0, results: [...results] }))
      }
    }

    setRateLimitTest(prev => ({ ...prev, running: false }))
  }

  const runAllClientTests = async () => {
    await runAppContextTest()
    await runStorageTest()
  }

  useEffect(() => {
    runAllClientTests()
  }, [])

  const getStatusIcon = (pass: boolean) => {
    return pass ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getStatusBadge = (pass: boolean) => {
    return (
      <Badge variant={pass ? "default" : "destructive"}>
        {pass ? "PASS" : "FAIL"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Test Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Auth Session</CardTitle>
              {getStatusIcon(tests.auth.pass)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(tests.auth.pass)}
              <p className="text-xs text-muted-foreground">{tests.auth.details}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">App Context</CardTitle>
              {getStatusIcon(tests.appContext.pass)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(tests.appContext.pass)}
              <p className="text-xs text-muted-foreground">{tests.appContext.details}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Features</CardTitle>
              {getStatusIcon(tests.featureBranding.pass && tests.featureInvitations.pass)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(tests.featureBranding.pass && tests.featureInvitations.pass)}
              <p className="text-xs text-muted-foreground">
                Branding: {tests.featureBranding.pass ? 'OK' : 'FAIL'}, 
                Invitations: {tests.featureInvitations.pass ? 'OK' : 'FAIL'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              {getStatusIcon(tests.storage.pass)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(tests.storage.pass)}
              <p className="text-xs text-muted-foreground">{tests.storage.details}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limit Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Rate Limit Test
          </CardTitle>
          <CardDescription>
            Test rate limiting on /api/settings/email-test (expected: 5 OK + 1 RATE_LIMITED)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runRateLimitTest} 
            disabled={rateLimitTest.running}
            className="w-full md:w-auto"
          >
            {rateLimitTest.running ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Testing... ({rateLimitTest.requestCount}/6)
              </>
            ) : (
              'Run Rate Limit Test'
            )}
          </Button>

          {rateLimitTest.results.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {rateLimitTest.results.map((status, index) => (
                  <Badge 
                    key={index} 
                    variant={status === 200 ? "default" : status === 429 ? "secondary" : "destructive"}
                  >
                    #{index + 1}: {status === 0 ? 'ERR' : status}
                  </Badge>
                ))}
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Result:</strong> {' '}
                  {rateLimitTest.results.filter(s => s === 200).length} successful, {' '}
                  {rateLimitTest.results.filter(s => s === 429).length} rate limited, {' '}
                  {rateLimitTest.results.filter(s => s !== 200 && s !== 429).length} errors
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expected: 5x HTTP 200 + 1x HTTP 429
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Auth Session</TableCell>
                <TableCell>{getStatusBadge(tests.auth.pass)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tests.auth.details}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">App Context</TableCell>
                <TableCell>{getStatusBadge(tests.appContext.pass)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tests.appContext.details}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Feature Gating (Branding)</TableCell>
                <TableCell>{getStatusBadge(tests.featureBranding.pass)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tests.featureBranding.details}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Feature Gating (Invitations)</TableCell>
                <TableCell>{getStatusBadge(tests.featureInvitations.pass)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tests.featureInvitations.details}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Storage Signed URL</TableCell>
                <TableCell>{getStatusBadge(tests.storage.pass)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tests.storage.details}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}