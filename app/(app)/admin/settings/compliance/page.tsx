import { Metadata } from 'next'
import { ComplianceSettingsClient } from './ComplianceSettingsClient'
import { getTranslation } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation()
  return {
    title: t('compliance.title'),
    description: t('compliance.description'),
  }
}

export default function ComplianceSettingsPage() {
  return <ComplianceSettingsClient />
}
