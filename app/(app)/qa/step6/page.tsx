'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, Play, FileText, Database, Globe } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

export default function QAStep6Page() {
  const { t } = useTranslation()

  const verificationChecks = [
    {
      category: t('qa.step6.categoryFunctions'),
      checks: [
        'All SECURITY DEFINER functions have search_path=public',
        'No functions missing security configuration'
      ]
    },
    {
      category: t('qa.step6.categoryRls'), 
      checks: [
        'Admin users can see roles from their org (COUNT>=1)',
        'Base users cannot see roles (COUNT=0)',
        'Proper tenant isolation enforced'
      ]
    },
    {
      category: t('qa.step6.categoryAudit'),
      checks: [
        'audit_events table exists with RLS policies',
        'settings.updated events logged for email tests',
        'user.invited events logged for invitations'
      ]
    },
    {
      category: t('qa.step6.categoryApi'),
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
          <h1 className="text-3xl font-bold">{t('qa.step6.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('qa.step6.subtitle')}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {t('qa.step6.adminOnly')}
        </Badge>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('qa.step6.verificationOverview')}
          </CardTitle>
          <CardDescription>
            {t('qa.step6.overviewDescription')}
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
              {t('qa.step6.sqlVerification')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('qa.step6.sqlDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('qa.step6.sqlDetails')}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              {t('qa.step6.viewSqlScript')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              {t('qa.step6.apiTests')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('qa.step6.apiDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('qa.step6.apiDetails')}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {t('qa.step6.runApiTests')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              {t('qa.step6.generateReport')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('qa.step6.reportDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('qa.step6.reportDetails')}
            </div>
            <Button variant="default" size="sm" className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('qa.step6.fullVerification')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* File Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('qa.step6.fileLocations')}</CardTitle>
          <CardDescription>
            {t('qa.step6.fileLocationsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">{t('qa.step6.verificationScripts')}</h4>
              <ul className="space-y-1 text-muted-foreground font-mono">
                <li>qa/sql/step6_verification.sql</li>
                <li>qa/scripts/step6_api_tests.js</li>
                <li>qa/scripts/run_step6_verification.sh</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">{t('qa.step6.outputFiles')}</h4>
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
          <CardTitle className="text-lg">{t('qa.step6.manualExecution')}</CardTitle>
          <CardDescription>
            {t('qa.step6.manualExecutionDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t('qa.step6.step1Sql')}</h4>
            <code className="block bg-muted p-3 rounded text-sm">
              psql $DATABASE_URL -f qa/sql/step6_verification.sql &gt; qa/sql/step6_verification.out.txt
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">{t('qa.step6.step2Api')}</h4>
            <code className="block bg-muted p-3 rounded text-sm">
              node qa/scripts/step6_api_tests.js
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">{t('qa.step6.step3Full')}</h4>
            <code className="block bg-muted p-3 rounded text-sm">
              chmod +x qa/scripts/run_step6_verification.sh<br />
              ./qa/scripts/run_step6_verification.sh
            </code>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <strong>{t('qa.step6.envRequired')}</strong>
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
            {t('qa.step6.backToQa')}
          </Button>
        </Link>
        <div className="space-x-2">
          <Link href="/qa/health">
            <Button variant="outline" size="sm">
              {t('qa.step6.healthCheck')}
            </Button>
          </Link>
          <Link href="/qa/whoami">
            <Button variant="outline" size="sm">
              {t('qa.step6.whoAmI')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}