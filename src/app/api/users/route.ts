import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Use the protected administrator member API.' }, { status: 410 }); }
