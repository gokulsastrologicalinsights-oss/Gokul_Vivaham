import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const visibility = z.enum(['all_members', 'liked_and_premium']);
const settingsInput = z.object({
  profilePhotoVisibility: visibility,
  albumPhotoVisibility: visibility,
}).strict();

async function getAccountId(authUserId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function GET() {
  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accountId = await getAccountId(user.id);
    if (!accountId) return NextResponse.json({ error: 'Member account not found.' }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('profile_photo_visibility,album_photo_visibility')
      .eq('user_id', accountId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

    return NextResponse.json({
      profilePhotoVisibility: data.profile_photo_visibility ?? 'all_members',
      albumPhotoVisibility: data.album_photo_visibility ?? 'all_members',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Photo settings read failed:', error);
    return NextResponse.json({ error: 'Unable to load photo settings.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = settingsInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid visibility option.' }, { status: 400 });

  try {
    const accountId = await getAccountId(user.id);
    if (!accountId) return NextResponse.json({ error: 'Member account not found.' }, { status: 404 });

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        profile_photo_visibility: parsed.data.profilePhotoVisibility,
        album_photo_visibility: parsed.data.albumPhotoVisibility,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', accountId);

    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Photo settings save failed:', error);
    return NextResponse.json({ error: 'Unable to save photo settings.' }, { status: 500 });
  }
}
