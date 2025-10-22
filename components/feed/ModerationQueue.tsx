'use client'

import { useState } from 'react'
import { usePostReports, type PostReport } from '@/hooks/usePostReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { AlertCircle, CheckCircle, Eye, EyeOff, XCircle } from 'lucide-react'

export function ModerationQueue() {
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending')
  const { reports, isLoading, canModerate, reviewReport } = usePostReports(
    activeTab === 'pending' ? 'pending' : undefined
  )
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  if (!canModerate) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Non hai i permessi per accedere alla coda di moderazione
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleReview = async (reportId: string, status: 'reviewed' | 'dismissed' | 'actioned') => {
    try {
      await reviewReport(reportId, status, reviewNotes)
      toast.success(`Segnalazione ${status === 'dismissed' ? 'respinta' : 'processata'}`)
      setReviewingId(null)
      setReviewNotes('')
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la revisione')
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">In Attesa</TabsTrigger>
          <TabsTrigger value="reviewed">Processate</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-12 w-12" />
                  <p>Nessuna segnalazione in attesa</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isReviewing={reviewingId === report.id}
                onReview={(status) => handleReview(report.id, status)}
                reviewNotes={reviewNotes}
                onReviewNotesChange={setReviewNotes}
                onStartReview={() => setReviewingId(report.id)}
                onCancelReview={() => {
                  setReviewingId(null)
                  setReviewNotes('')
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Storico segnalazioni processate (in sviluppo)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ReportCardProps {
  report: PostReport
  isReviewing: boolean
  onReview: (status: 'reviewed' | 'dismissed' | 'actioned') => void
  reviewNotes: string
  onReviewNotesChange: (notes: string) => void
  onStartReview: () => void
  onCancelReview: () => void
}

function ReportCard({
  report,
  isReviewing,
  onReview,
  reviewNotes,
  onReviewNotesChange,
  onStartReview,
  onCancelReview,
}: ReportCardProps) {
  const [isHiding, setIsHiding] = useState(false)

  const handleHidePost = async () => {
    setIsHiding(true)
    try {
      const response = await fetch(`/api/v1/posts/${report.post_id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Report: ${report.reason}` }),
      })

      if (!response.ok) throw new Error('Failed to hide post')

      toast.success('Post nascosto con successo')
      onReview('actioned')
    } catch (error) {
      toast.error('Errore durante l\'occultamento del post')
    } finally {
      setIsHiding(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">
                Segnalazione: {report.reason}
              </CardTitle>
              <Badge variant="outline" className="ml-auto">
                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: it })}
              </Badge>
            </div>

            {report.reporter && (
              <p className="text-sm text-muted-foreground">
                Segnalato da: {report.reporter.full_name}
              </p>
            )}

            {report.details && (
              <p className="text-sm">{report.details}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Post Content */}
        {report.post && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={report.post.author.avatar_url} />
                <AvatarFallback>
                  {report.post.author.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{report.post.author.full_name}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {report.post.content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Review Actions */}
        {!isReviewing ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleHidePost}
              disabled={isHiding}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Nascondi Post
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onStartReview}
            >
              <Eye className="h-4 w-4 mr-2" />
              Revisiona
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Note di revisione (opzionale)..."
              value={reviewNotes}
              onChange={(e) => onReviewNotesChange(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onReview('actioned')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Azione Presa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReview('dismissed')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Respingi
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelReview}
              >
                Annulla
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
