import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ error: 'Use the supported authentication flow.' }, { status: 410 }); }
