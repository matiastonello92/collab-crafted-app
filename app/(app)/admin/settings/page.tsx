import { requireAdmin } from '@/lib/admin/guards'
import { AdminSettingsClient } from './AdminSettingsClient'

export default async function AdminSettingsPage() {
  // Server-side admin protection
  await requireAdmin()

  // Environment status (server-side only)
  const envStatus = {
    resendApiKey: !!process.env.RESEND_API_KEY,
    resendFrom: !!process.env.RESEND_FROM
  }

  return <AdminSettingsClient envStatus={envStatus} />
}