import { ModerationQueue } from '@/components/feed/ModerationQueue'

export default function ModerationPostsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Moderazione Post</h1>
          <p className="text-muted-foreground mt-2">
            Gestisci le segnalazioni e mantieni la community sicura
          </p>
        </div>
        
        <ModerationQueue />
      </div>
    </div>
  )
}
