import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guards'

export const dynamic = 'force-dynamic'

export default async function QAIndexPage() {
  await requireAdmin()
  return (
    <div className="container mx-auto py-8 space-y-4">
      <h1 className="text-3xl font-bold">QA Tools</h1>
      <ul className="list-disc pl-4 space-y-2">
        <li><Link href="/qa/whoami">Who Am I</Link></li>
        <li><Link href="/qa/health">Health Check</Link></li>
      </ul>
    </div>
  )
}
