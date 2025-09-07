export function getAppOrigin() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '')
  if (envUrl) return envUrl
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3000'
}

export function getEmailRedirectTo() {
  return `${getAppOrigin()}/auth/callback`
}