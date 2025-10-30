'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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

    // Otherwise, fetch signed URL from file path
    try {
      const response = await fetch('/api/v1/recipes/photo-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: photoUrl })
      })

      if (response.ok) {
        const { signedUrl: url } = await response.json()
        setSignedUrl(url)
      }
    } catch (error) {
      console.error('Error loading image:', error)
    } finally {
      setLoading(false)
    }
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

