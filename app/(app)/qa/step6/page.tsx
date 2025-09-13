import { requireAdmin } from '@/lib/admin/guards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, Play, FileText, Database, Globe } from 'lucide-react'
import Link from 'next/link'

export default async function QAStep6Page() {
  // Only admins can access QA tools
  await requireAdmin()

  const verificationChecks = [
    {
      category: 'A) Functions Hardening',
      checks: [
        'All SECURITY DEFINER functions have search_path=public',
        'No functions missing security configuration'
      ]
    },
    {
      category: 'B) RLS Metadata RBAC', 
      checks: [
        'Admin users can see roles from their org (COUNT>=1)',
        'Base users cannot see roles (COUNT=0)',
        'Proper tenant isolation enforced'
      ]
    },
    {
      category: 'C) Audit Events',
      checks: [
        'audit_events table exists with RLS policies',
        'settings.updated events logged for email tests',
        'user.invited events logged for invitations'
      ]
    },
    {
      category: 'D) API Smoke Tests',
      checks: [
        'POST /api/settings/email-test returns 200 + messageId',
        'POST /api/v1/admin/invitations creates invitation + sends email',
        'Resend integration working properly'
      ]
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Step 6 Verification Suite</h1>
          <p className="text-muted-foreground mt-2">
            SaaS Hardening: RLS, Functions, Invitations & Email Integration
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Admin Only
        </Badge>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Verification Overview
          </CardTitle>
          <CardDescription>
            This suite validates that Step 6 implementation is fully operational with proper security hardening.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {verificationChecks.map((section, index) => (
            <div key={index} className="border-l-2 border-muted pl-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                {section.category}
              </h3>
              <ul className="space-y-1">
                {section.checks.map((check, checkIndex) => (
                  <li key={checkIndex} className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted flex-shrink-0" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              SQL Verification
            </CardTitle>
            <CardDescription className="text-sm">
              Run database integrity and security checks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Checks SECURITY DEFINER functions, RLS policies, and audit infrastructure
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View SQL Script
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              API Tests
            </CardTitle>
            <CardDescription className="text-sm">
              Test email and invitation endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Smoke tests for /api/settings/email-test and /api/v1/admin/invitations
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Run API Tests
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Generate Report
            </CardTitle>
            <CardDescription className="text-sm">
              Create comprehensive verification report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Combines SQL and API results into markdown report
            </div>
            <Button variant="default" size="sm" className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Full Verification
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* File Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">File Locations</CardTitle>
          <CardDescription>
            Key files for Step 6 verification suite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Verification Scripts</h4>
              <ul className="space-y-1 text-muted-foreground font-mono">
                <li>qa/sql/step6_verification.sql</li>
                <li>qa/scripts/step6_api_tests.js</li>
                <li>qa/scripts/run_step6_verification.sh</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Output Files</h4>
              <ul className="space-y-1 text-muted-foreground font-mono">
                <li>qa/sql/step6_verification.out.txt</li>
                <li>qa/http/step6_*.json</li>
                <li>docs/step6_verification_YYYYMMDD.md</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Execution Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manual Execution</CardTitle>
          <CardDescription>
            How to run the verification suite manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. SQL Verification</h4>
            <code className="block bg-muted p-3 rounded text-sm">
              psql $DATABASE_URL -f qa/sql/step6_verification.sql &gt; qa/sql/step6_verification.out.txt
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">2. API Tests</h4>
            <code className="block bg-muted p-3 rounded text-sm">
              node qa/scripts/step6_api_tests.js
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Full Suite</h4>
            <code className="block bg-muted p-3 rounded text-sm">
              chmod +x qa/scripts/run_step6_verification.sh<br />
              ./qa/scripts/run_step6_verification.sh
            </code>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <strong>Environment Variables Required:</strong>
                <ul className="mt-2 space-y-1 text-amber-700">
                  <li>• <code>DATABASE_URL</code> - PostgreSQL connection string</li>
                  <li>• <code>SITE_URL</code> - Application base URL</li>
                  <li>• <code>RESEND_API_KEY</code> - For email testing</li>
                  <li>• <code>ADMIN_USER_TOKEN</code> - Auth token for API tests</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href="/qa">
          <Button variant="outline">
            ← Back to QA Tools
          </Button>
        </Link>
        <div className="space-x-2">
          <Link href="/qa/health">
            <Button variant="outline" size="sm">
              Health Check
            </Button>
          </Link>
          <Link href="/qa/whoami">
            <Button variant="outline" size="sm">
              Who Am I
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}