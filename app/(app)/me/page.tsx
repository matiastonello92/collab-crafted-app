import { redirect } from 'next/navigation'

export default function MePage() {
  redirect('/settings?tab=roles')
}