import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/guards/requirePlatformAdmin'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure platform admin access for all routes in this group
  try {
    await requirePlatformAdmin()
  } catch (error) {
    // Redirect to access denied page instead of throwing
    redirect('/platform/access-denied')
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}