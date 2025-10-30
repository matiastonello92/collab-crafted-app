import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { getSignedRecipePhotoUrl } from '@/utils/supabase/storage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/recipes/photo-url
 * Generate signed URL from file path
 */
export async function POST(request: Request) {
  try {
    const { filePath } = await request.json()
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const signedUrl = await getSignedRecipePhotoUrl(supabase, filePath)
    
    if (!signedUrl) {
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl })
  } catch (error) {
    console.error('Photo URL error:', error)
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }
}
