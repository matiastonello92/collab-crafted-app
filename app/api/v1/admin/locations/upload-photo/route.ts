import { NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/admin/guards"
import { createSupabaseServerClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { hasAccess } = await checkAdminAccess()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    
    // Get user session for org context
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.org_id) {
      return NextResponse.json({ error: 'User org not found' }, { status: 403 })
    }
    
    // Generate filename with org path: photos/<org_id>/photo_<timestamp>.<ext>
    const fileExt = file.name.split('.').pop()
    const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${profile.org_id}/${fileName}`

    // Upload to Supabase Storage (photos bucket)
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Get signed URL instead of public URL
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('photos')
      .createSignedUrl(filePath, 900) // 15 minutes

    if (signedError) {
      console.error('Signed URL error:', signedError)
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}