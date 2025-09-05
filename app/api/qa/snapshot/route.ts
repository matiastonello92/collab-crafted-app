import { NextResponse } from 'next/server';
import { getAuthSnapshot } from '@/lib/server/auth-snapshot';

export async function GET() {
  const snapshot = await getAuthSnapshot();
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
