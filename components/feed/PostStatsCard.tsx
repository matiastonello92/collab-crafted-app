'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Eye, TrendingUp } from 'lucide-react'
import { usePostStats } from '@/hooks/usePostAnalytics'

interface PostStatsCardProps {
  postId: string
}

interface Stats {
  views: number
  unique_views: number
  clicks: number
  engagement_rate: number
}

export function PostStatsCard({ postId }: PostStatsCardProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { fetchStats } = usePostStats(postId)

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true)
      const data = await fetchStats()
      if (data) {
        setStats(data.stats)
      }
      setIsLoading(false)
    }

    loadStats()
  }, [postId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiche Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Statistiche Post
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            icon={<Eye className="h-4 w-4" />}
            label="Visualizzazioni"
            value={stats.unique_views}
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Tasso Coinvolgimento"
            value={`${stats.engagement_rate}%`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  )
}
