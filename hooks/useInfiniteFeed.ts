'use client';

import useSWRInfinite from 'swr/infinite';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';

export interface Post {
  id: string;
  content: string;
  media_urls?: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string }>;
  visibility: 'location' | 'organization';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  is_liked_by_me: boolean;
  created_at: string;
  edited_at?: string;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  mentions?: Array<{
    id: string;
    mentioned_user?: { id: string; full_name: string };
    mentioned_org?: { org_id: string; name: string };
  }>;
}

interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
}

interface UseInfiniteFeedOptions {
  locationId?: string;
  limit?: number;
  filter?: 'all' | 'pinned' | 'archived';
  authorId?: string;
}

const fetcher = async (url: string): Promise<FeedResponse> => {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }

  return response.json();
};

export function useInfiniteFeed(options: UseInfiniteFeedOptions = {}) {
  const { permissions } = usePermissions(options.locationId);
  const canView = hasPermission(permissions, 'posts:view');

  const getKey = (pageIndex: number, previousPageData: FeedResponse | null) => {
    // No permission, don't fetch
    if (!canView) return null;

    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // First page
    const params = new URLSearchParams();
    if (options.locationId) params.set('locationId', options.locationId);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.filter && options.filter !== 'all') params.set('filter', options.filter);
    if (options.authorId) params.set('authorId', options.authorId);

    // Add cursor for subsequent pages
    if (previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor);
    }

    return `/api/v1/posts?${params.toString()}`;
  };

  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<FeedResponse>(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      dedupingInterval: 30000, // 30s
    }
  );

  // Flatten posts from all pages
  const posts = data?.flatMap(page => page.posts) ?? [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.posts.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.nextCursor === null);

  const loadMore = () => {
    if (!isLoadingMore && !isReachingEnd) {
      setSize(size + 1);
    }
  };

  return {
    posts,
    isLoading,
    isLoadingMore,
    isValidating,
    isEmpty,
    isReachingEnd,
    error,
    loadMore,
    mutate,
    canView,
  };
}
