// DEPRECATED: Shift assignments no longer require confirmation
// This endpoint is kept for backward compatibility but returns 410 Gone

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { 
      error: 'Endpoint deprecated',
      message: 'Shift assignments no longer require confirmation. All shifts are directly assigned.'
    },
    { status: 410 } // Gone
  )
}
