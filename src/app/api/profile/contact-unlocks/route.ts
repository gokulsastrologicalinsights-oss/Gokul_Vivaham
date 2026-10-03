import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const user = await authLib.getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const { data: unlocks, error: err } = await supabaseAdmin
      .from('contact_unlocks')
      .select(`
        *,
        profile:profiles(
          id,
          profile_id,
          first_name,
          last_name,
          gender,
          age,
          rasi,
          star,
          caste,
          user_id
        )
      `)
      .eq('user_id', userRow.id)
      .order('unlocked_at', { ascending: false });

    if (err) {
      console.error('Error fetching contact unlocks:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    // For each unlock, fetch the candidate's actual phone & email from users table
    const enrichedUnlocks = await Promise.all(
      (unlocks || []).map(async (u: any) => {
        if (!u.profile?.user_id) return u;
        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('email, mobile_number')
          .eq('id', u.profile.user_id)
          .maybeSingle();

        return {
          ...u,
          phone: targetUser?.mobile_number || 'N/A',
          email: targetUser?.email || 'N/A'
        };
      })
    );

    return NextResponse.json({ success: true, unlocks: enrichedUnlocks });
  } catch (err: any) {
    console.error('Contact unlocks GET route error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
