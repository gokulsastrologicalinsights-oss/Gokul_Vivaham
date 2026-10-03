import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';

const document = z.object({ type: z.enum(['id_proof','horoscope']), documentUrl: z.string().min(1).max(250), documentType: z.string().min(1).max(100) }).strict();
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = document.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid document details' }, { status: 400 });
  const { type, documentUrl, documentType } = parsed.data;
  const { data, error } = await supabaseAdmin.rpc('submit_member_document', { actor: user.id, kind: type, path: documentUrl, label: documentType });
  if (error) return NextResponse.json({ error: 'Document is missing, unavailable, or already approved. Upload your own document and retry.' }, { status: 409 });
  return NextResponse.json({ id: data, success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
