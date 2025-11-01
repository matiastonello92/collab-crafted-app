'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { getPublicRecipePhotoUrl } from '@/utils/supabase/storage'

interface RecipeStepImageProps {
  photoUrl: string
  stepTitle: string
}

export function RecipeStepImage({ photoUrl, stepTitle }: RecipeStepImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const filePathToUrlMap = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!photoUrl) {
      setSignedUrl(null)
      setLoading(false)
      return
    }

    // If it's already a full URL, use it directly
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      setSignedUrl(photoUrl)
      setLoading(false)
      return
    }

    // Check if we already have this signedUrl cached
    const cachedUrl = filePathToUrlMap.current.get(photoUrl)
    if (cachedUrl) {
      setSignedUrl(cachedUrl)
      setLoading(false)
      return
    }

    // Otherwise load the image
    loadImage()
  }, [photoUrl])

  async function loadImage() {
    if (!photoUrl) {
      setSignedUrl(null)
      setLoading(false)
      return
    }

    // For filePath, build public URL using helper
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const publicUrl = getPublicRecipePhotoUrl(supabaseUrl, photoUrl)
    filePathToUrlMap.current.set(photoUrl, publicUrl)
    setSignedUrl(publicUrl)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="w-20 h-20 bg-muted animate-pulse rounded-md flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-muted-foreground">...</span>
      </div>
    )
  }

  if (!signedUrl) {
    return (
      <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-muted-foreground">N/A</span>
      </div>
    )
  }

  return (
    <img
      src={signedUrl}
      alt={stepTitle}
      className="w-20 h-20 object-cover rounded-md flex-shrink-0"
    />
  )
}

