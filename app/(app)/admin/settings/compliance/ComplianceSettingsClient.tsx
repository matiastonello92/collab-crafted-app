'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { AlertTriangle, Save } from 'lucide-react'
import type { ComplianceRule } from '@/types/compliance'
import { useTranslation } from '@/lib/i18n'

export function ComplianceSettingsClient() {
  const { t } = useTranslation()
  const supabase = useSupabase()
  const [rules, setRules] = useState<ComplianceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  async function fetchRules() {
    try {
      setLoading(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!profile?.org_id) throw new Error('No org_id')

      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('rule_key')

      if (error) throw error
      setRules(data || [])
    } catch (err: any) {
      console.error('Error fetching rules:', err)
      toast.error(t('toast.compliance.errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(rule: ComplianceRule, updates: Partial<ComplianceRule>) {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('compliance_rules')
        .update(updates)
        .eq('id', rule.id)

      if (error) throw error

      toast.success(t('toast.compliance.ruleUpdated'))
      fetchRules()
    } catch (err: any) {
      console.error('Error updating rule:', err)
      toast.error(t('toast.compliance.errorUpdating'))
    } finally {
      setSaving(false)
    }
  }

  function handleThresholdChange(rule: ComplianceRule, hours: number) {
    const updated = { ...rule, threshold_value: { hours } }
    setRules(rules.map(r => r.id === rule.id ? updated : r))
  }

  if (loading) {
    return <div className="text-muted-foreground">{t('compliance.loading')}</div>
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('compliance.title')}</h1>
        <p className="text-muted-foreground">
          {t('compliance.description')}
        </p>
      </div>

      <Card className="border-warning">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-1" />
            <div>
              <CardTitle>{t('compliance.legalDisclaimerTitle')}</CardTitle>
              <CardDescription className="mt-1">
                {t('compliance.legalDisclaimerDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {rules.map(rule => (
          <Card key={rule.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{rule.display_name}</span>
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(checked) => handleSave(rule, { is_active: checked })}
                />
              </CardTitle>
              {rule.description && (
                <CardDescription>{rule.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor={`threshold-${rule.id}`}>
                    {t('compliance.thresholdLabel')}
                  </Label>
                  <Input
                    id={`threshold-${rule.id}`}
                    type="number"
                    min="1"
                    max="24"
                    value={rule.threshold_value.hours}
                    onChange={(e) => handleThresholdChange(rule, parseInt(e.target.value) || 1)}
                    disabled={!rule.is_active}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={() => handleSave(rule, { threshold_value: rule.threshold_value })}
                  disabled={saving || !rule.is_active}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('compliance.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
