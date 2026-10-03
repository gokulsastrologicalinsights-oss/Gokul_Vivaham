import { NextResponse } from 'next/server';

// Liveness only: never exposes credentials, member data, or provider responses.
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
