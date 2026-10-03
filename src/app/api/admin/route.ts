import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
export async function GET() {
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ isAdmin: false, error: 'Unauthorized' }, { status: 401 });
  if (!access.isAdmin) return NextResponse.json({ isAdmin: false, mfa_required: access.mfaRequired, error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ isAdmin: true, role: access.role }, { headers: { 'Cache-Control': 'no-store' } });
}
