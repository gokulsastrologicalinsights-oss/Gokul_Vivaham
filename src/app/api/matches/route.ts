import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { createRequestClient } from '@/lib/supabase/server';
import { withAuthorizedCardPhotos } from '@/lib/profile-card-photos';

const input = z.object({
  ageMin: z.coerce.number().int().min(18).max(120).optional(),
  ageMax: z.coerce.number().int().min(18).max(120).optional(),
  religion: z.string().max(100).optional(), caste: z.string().max(100).optional(),
  rasi: z.string().max(100).optional(), star: z.string().max(100).optional(),
  padam: z.string().max(10).optional(), location: z.string().max(100).optional(),
  profession: z.string().max(100).optional(),
  featured: z.enum(['true','false']).optional(), recent: z.enum(['true','false']).optional(),
  shortlisted: z.enum(['true','false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
}).strict();

export async function GET(request: Request) {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = input.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid search filters.' }, { status: 400 });
  const { limit, offset, ...filters } = parsed.data;
  try {
    const client = await createRequestClient();
    const { data, error } = await client.rpc('discover_profile_cards', { filters, page_size: limit, page_offset: offset });
    if (error) {
      if (error.code === '42501') return NextResponse.json({ error: 'Search access denied.', upgrade_required: true }, { status: 403 });
      throw error;
    }
    const result = data as { profiles: Array<Record<string, unknown> & { user_id: string }>; total: number; eligibleGender: string | null };
    const profiles = await withAuthorizedCardPhotos(result.profiles, access);
    return NextResponse.json({ ...result, profiles }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Matches API failed', error);
    return NextResponse.json({ error: 'Could not load matches.' }, { status: 503 });
  }
}
