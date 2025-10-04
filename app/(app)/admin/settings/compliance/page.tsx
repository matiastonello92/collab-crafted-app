import { Metadata } from 'next'
import { ComplianceSettingsClient } from './ComplianceSettingsClient'

export const metadata: Metadata = {
  title: 'Compliance Settings',
  description: 'metadata.complianceSettings'
}

export default function ComplianceSettingsPage() {
  return <ComplianceSettingsClient />
}
