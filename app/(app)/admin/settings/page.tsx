import { requireAdmin } from '@/lib/admin/guards'
import { AdminSettingsClient } from './AdminSettingsClient'
import { getAppSetting } from '@/app/actions/app-settings'

export default async function AdminSettingsPage() {
  // Server-side admin protection
  await requireAdmin()

  // Environment status (server-side only)
  const envStatus = {
    resendApiKey: !!process.env.RESEND_API_KEY,
    resendFrom: !!process.env.RESEND_FROM
  }

  // Load app settings
  const [branding, business, access, banner] = await Promise.all([
    getAppSetting('branding'),
    getAppSetting('business'), 
    getAppSetting('access'),
    getAppSetting('banner')
  ])

  const appSettings = {
    branding,
    business,
    access,
    banner
  }

  return <AdminSettingsClient envStatus={envStatus} appSettings={appSettings} />
}