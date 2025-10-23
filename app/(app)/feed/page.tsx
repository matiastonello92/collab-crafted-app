import { FeedContainer } from '@/components/feed/FeedContainer'
import { TrendingPostsWidget } from '@/components/feed/TrendingPostsWidget'
import { PostComposer } from '@/components/feed/PostComposer'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function FeedPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProfile = undefined;
  
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      userProfile = {
        id: profile.id,
        full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        avatar_url: profile.avatar_url,
      };
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Feed</h1>
          <div className="space-y-6">
            <PostComposer userProfile={userProfile} />
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
