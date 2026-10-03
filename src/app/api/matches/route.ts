import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Use the authenticated matching service.' }, { status: 410 }); }
