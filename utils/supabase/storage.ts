import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get signed URL for recipe photo from file path
 * @param supabase - Supabase client
 * @param filePath - Path to file in storage bucket (e.g., "org_id/recipe_123.jpg")
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getSignedRecipePhotoUrl(
  supabase: SupabaseClient,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!filePath) return null
  
  // If already a full URL, return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  const { data, error } = await supabase.storage
    .from('recipe-photos')
    .createSignedUrl(filePath, expiresIn)
  
  if (error) {
    console.error('Signed URL error:', error)
    return null
  }
  
  return data.signedUrl
}

/**
 * Get public URL for recipe photo (if bucket is public)
 */
export function getPublicRecipePhotoUrl(
  supabaseUrl: string,
  filePath: string
): string {
  if (!filePath) return ''
  
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }
  
  return `${supabaseUrl}/storage/v1/object/public/recipe-photos/${filePath}`
}
