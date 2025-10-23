import { FeedContainer } from '@/components/feed/FeedContainer'
import { TrendingPostsWidget } from '@/components/feed/TrendingPostsWidget'
import { PostComposer } from '@/components/feed/PostComposer'

export default function FeedPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Feed</h1>
          <div className="space-y-6">
            <PostComposer />
            <FeedContainer />
          </div>
        </div>
        
        <div className="hidden lg:block space-y-6">
          <TrendingPostsWidget limit={5} />
        </div>
      </div>
    </div>
  )
}
