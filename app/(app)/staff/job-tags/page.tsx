import { Metadata } from 'next'
import { JobTagsClient } from './JobTagsClient'

export const metadata: Metadata = {
  title: 'Job Tags | Gestione Ruoli',
  description: 'Gestisci i ruoli e le assegnazioni del personale per location',
}

export default function JobTagsPage() {
  return <JobTagsClient />
}
