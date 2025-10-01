import { Metadata } from 'next'
import { ComplianceSettingsClient } from './ComplianceSettingsClient'

export const metadata: Metadata = {
  title: 'Compliance Settings',
  description: 'Gestisci regole di compliance'
}

export default function ComplianceSettingsPage() {
  return <ComplianceSettingsClient />
}
