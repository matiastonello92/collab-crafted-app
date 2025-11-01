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
    // For filePath, build public URL using helper
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const publicUrl = getPublicRecipePhotoUrl(supabaseUrl, photoUrl)
    filePathToUrlMap.current.set(photoUrl, publicUrl)
    setSignedUrl(publicUrl)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="w-48 h-36 flex items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!signedUrl) {
    return (
      <div className="w-48 h-36 flex items-center justify-center bg-muted text-muted-foreground text-xs">
        Foto non disponibile
      </div>
    )
  }

  return (
    <img 
      src={signedUrl} 
      alt={stepTitle}
      className="w-48 h-36 object-cover"
    />
  )
}

