'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface RecipeStepImageProps {
  photoUrl: string
  stepTitle: string
}

export function RecipeStepImage({ photoUrl, stepTitle }: RecipeStepImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadImage()
  }, [photoUrl])

  async function loadImage() {
    if (!photoUrl) {
      setLoading(false)
      return
    }

    // If it's already a full URL, use it directly
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      setSignedUrl(photoUrl)
      setLoading(false)
      return
    }

    // For filePath, build public URL directly (bucket is public)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/recipe-photos/${photoUrl}`
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

