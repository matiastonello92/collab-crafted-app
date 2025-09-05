import { NextResponse } from "next/server";
import { getAuthSnapshot } from "@/lib/server/authContext";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  try {
    const snap = await getAuthSnapshot();
    return NextResponse.json({ permissions: snap.permissions }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'internal' }, { status: 500 });
  }
}

