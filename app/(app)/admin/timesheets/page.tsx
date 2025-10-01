import { Metadata } from 'next'
import TimesheetsClient from './TimesheetsClient'

export const metadata: Metadata = {
  title: 'Timesheets | Admin',
  description: 'Gestione riepilogo ore e periodi paga'
}

export default function TimesheetsPage() {
  return <TimesheetsClient />
}
