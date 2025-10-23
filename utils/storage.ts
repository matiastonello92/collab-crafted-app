export function getStorageUrl(path: string): string {
  if (!path) return '';
  
  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/post-media/${path}`;
}
