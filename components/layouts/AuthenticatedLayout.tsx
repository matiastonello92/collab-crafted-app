import AuthenticatedLayoutClient from '@/components/layouts/AuthenticatedLayoutClient'
import { getAppBootstrap } from '@/lib/server/app-bootstrap'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getAppBootstrap()
  return <AuthenticatedLayoutClient bootstrap={bootstrap}>{children}</AuthenticatedLayoutClient>
}
