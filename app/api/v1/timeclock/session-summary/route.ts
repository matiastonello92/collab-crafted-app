import { NextResponse } from 'next/server'
import { getTodaySessionSummary } from '@/lib/shifts/time-clock-logic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const locationId = searchParams.get('locationId')
  const orgId = searchParams.get('orgId')

  if (!userId || !locationId || !orgId) {
    return NextResponse.json(
      { error: 'Missing required parameters: userId, locationId, orgId' },
      { status: 400 }
    )
  }

  try {
    const summary = await getTodaySessionSummary(userId, locationId, orgId)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting session summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
