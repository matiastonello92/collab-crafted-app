'use client'

import { useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { PostCard } from './PostCard'
import type { Post } from '@/hooks/useInfiniteFeed'

interface SwipeablePostCardProps {
  post: Post
  currentUserId?: string | null
  onLike?: (postId: string) => Promise<void>
  onShare?: (postId: string) => Promise<void>
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function SwipeablePostCard({
  post,
  currentUserId,
  onLike,
  onShare,
  onSwipeLeft,
  onSwipeRight,
}: SwipeablePostCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  const bind = useGesture({
    onDrag: ({ movement: [mx], direction: [xDir], velocity: [vx] }) => {
      // Only on touch devices
      if (!('ontouchstart' in window)) return

      const threshold = 100
      const velocityThreshold = 0.5

      if (cardRef.current) {
        // Apply transform during drag
        cardRef.current.style.transform = `translateX(${mx}px) rotate(${mx * 0.05}deg)`
        cardRef.current.style.opacity = `${1 - Math.abs(mx) / 300}`

        // Show direction indicator
        if (Math.abs(mx) > 50) {
          setSwipeDirection(mx > 0 ? 'right' : 'left')
        } else {
          setSwipeDirection(null)
        }
      }
    },
    onDragEnd: ({ movement: [mx], velocity: [vx] }) => {
      if (!('ontouchstart' in window)) return

      const threshold = 100
      const velocityThreshold = 0.5

      const shouldSwipe = Math.abs(mx) > threshold || Math.abs(vx) > velocityThreshold

      if (cardRef.current) {
        if (shouldSwipe) {
          // Complete swipe animation
          const finalX = mx > 0 ? window.innerWidth : -window.innerWidth
          cardRef.current.style.transform = `translateX(${finalX}px) rotate(${finalX * 0.05}deg)`
          cardRef.current.style.opacity = '0'

          setTimeout(() => {
            if (mx > 0 && onSwipeRight) {
              onSwipeRight()
            } else if (mx < 0 && onSwipeLeft) {
              onSwipeLeft()
            }
          }, 300)
        } else {
          // Reset position
          cardRef.current.style.transform = ''
          cardRef.current.style.opacity = ''
        }
        
        setSwipeDirection(null)
      }
    },
  })

  return (
    <div
      {...bind()}
      ref={cardRef}
      className="relative touch-pan-y transition-transform"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Swipe indicators */}
      {swipeDirection === 'right' && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold">
          ❤️ Mi Piace
        </div>
      )}
      {swipeDirection === 'left' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
          🚫 Ignora
        </div>
      )}

      <PostCard
        post={post}
        currentUserId={currentUserId}
        onLike={onLike}
        onShare={onShare}
      />
    </div>
  )
}
