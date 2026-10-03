import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ error: 'Use the signed payment webhook endpoint.' }, { status: 410 }); }
