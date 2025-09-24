'use server'

import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { revalidatePath } from 'next/cache'

export async function getAppSetting(key: string) {
  const supabase = await createSupabaseUserClient()
  
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw new Error(`Failed to get setting ${key}: ${error.message}`)
  }
  
  return data?.value || {}
}

export async function setAppSetting(key: string, value: any) {
  // Admin guard
  await requireOrgAdmin()
  
  const supabase = await createSupabaseUserClient()
  
  const { error } = await supabase
    .from('app_settings')
    .upsert({ 
      key, 
      value: typeof value === 'object' ? value : { value }
    })
  
  if (error) {
    throw new Error(`Failed to set setting ${key}: ${error.message}`)
  }
}

export async function uploadLogo(formData: FormData) {
  // Admin guard
  await requireOrgAdmin()
  
  const supabase = await createSupabaseUserClient()
  const file = formData.get('logo') as File
  
  if (!file) {
    throw new Error('No file provided')
  }
  
  // Get org context for proper path
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()
  
  if (!profile?.org_id) {
    throw new Error('User org not found')
  }
  
  // Use org-based path: branding/<org_id>/logo.jpg
  const key = `${profile.org_id}/logo.jpg`
  
  const { data, error } = await supabase.storage
    .from('branding')
    .upload(key, file, {
      upsert: true,
      contentType: file.type
    })
  
  if (error) {
    throw new Error(`Failed to upload logo: ${error.message}`)
  }
  
  // Get signed URL directly from Supabase instead of internal API call
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from('branding')
    .createSignedUrl(key, 900) // 15 minutes
  
  if (signedError) {
    throw new Error(`Failed to create signed URL: ${signedError.message}`)
  }
  
  // Save to app_settings
  await setAppSetting('branding', { logo_url: signedUrlData.signedUrl })
  
  return signedUrlData.signedUrl
}