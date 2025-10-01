import { NextResponse } from 'next/server'

/**
 * @deprecated This QA endpoint is deprecated.
 * It relied on the deprecated checkOrgAdmin() function and org_id cookie.
 * Use /api/qa/whoami instead for user/org information.
 */
export async function GET() {
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Use /api/qa/whoami instead.',
    deprecated: true,
    alternative: '/api/qa/whoami'
  }, { status: 410 })
}