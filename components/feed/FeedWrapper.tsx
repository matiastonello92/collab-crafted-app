'use client';

import { useCallback, useRef } from 'react';
import { PostComposer } from './PostComposer';
import { FeedContainer } from './FeedContainer';

interface FeedWrapperProps {
  locationId?: string;
  userProfile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function FeedWrapper({ locationId, userProfile }: FeedWrapperProps) {
  const feedMutateRef = useRef<(() => void) | null>(null);

  const handlePostCreated = useCallback(() => {
    if (feedMutateRef.current) {
      feedMutateRef.current();
    }
  }, []);

  return (
    <div className="space-y-6">
      <PostComposer 
        locationId={locationId}
        userProfile={userProfile}
        onPostCreated={handlePostCreated}
      />
      <FeedContainer 
        locationId={locationId}
        mutateRef={feedMutateRef}
      />
    </div>
  );
}
