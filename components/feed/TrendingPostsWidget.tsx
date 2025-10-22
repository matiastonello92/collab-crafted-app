'use client'

import { useTrendingPosts } from '@/hooks/useTrendingPosts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface TrendingPostsWidgetProps {
  locationId?: string
  limit?: number
}

export function TrendingPostsWidget({ locationId, limit = 5 }: TrendingPostsWidgetProps) {
  const { posts, isLoading, canView } = useTrendingPosts(locationId, limit)

  if (!canView) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Post Popolari
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessun post di tendenza
          </p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/feed?postId=${post.id}`}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback>
                  {post.author.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {post.author.full_name}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.content}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>❤️ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                  <span>🔄 {post.shares_count}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
