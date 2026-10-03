import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Use the authenticated subscription service.' }, { status: 410 }); }
