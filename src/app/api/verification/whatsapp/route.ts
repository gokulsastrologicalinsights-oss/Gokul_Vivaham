import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { normalizeStoredVerificationPhone, normalizeVerificationPhone } from '@/lib/verification/phone';
import { supabaseAdmin } from '@/lib/supabase/server';

const WHATSAPP_NUMBER = '919342366513';

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);
  if (originUrl.origin === requestUrl.origin) return true;

  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  return process.env.NODE_ENV !== 'production'
    && originUrl.protocol === 'http:'
    && requestUrl.protocol === 'http:'
    && originUrl.port === requestUrl.port
    && localHosts.has(originUrl.hostname)
    && localHosts.has(requestUrl.hostname);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 });
  }
  if (typeof body.phone !== 'string' || !body.phone.trim()) {
    return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 });
  }

  let requestedPhone: string;
  try {
    requestedPhone = normalizeVerificationPhone(body.phone);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enter a valid phone number with country code.' },
      { status: 400 },
    );
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from('users')
    .select('id,email,mobile_number')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (accountError || !account) {
    console.error('Could not load the authenticated member for profile verification', accountError);
    return NextResponse.json({ error: 'We could not load your registered phone number. Please try again.' }, { status: 500 });
  }

  const storedPhone = normalizeStoredVerificationPhone(account.mobile_number);
  if (account.mobile_number?.trim() && !storedPhone) {
    return NextResponse.json(
      { error: 'Your account does not have a valid registered phone number. Please update your profile first.' },
      { status: 409 },
    );
  }
  if (storedPhone && requestedPhone !== storedPhone) {
    return NextResponse.json({ error: 'Enter the phone number registered on your profile.' }, { status: 422 });
  }

  const { data: result, error: requestError } = await supabaseAdmin.rpc('create_profile_verification_request', {
    actor: user.id,
    requested_phone: requestedPhone,
  });
  if (requestError || !result) {
    console.error('Could not create profile verification request', requestError);
    const databaseMessage = requestError?.message || '';
    const missingSchema = /does not exist|could not find the function|schema cache/i.test(databaseMessage);
    const memberMissing = /member (account|profile) not found/i.test(databaseMessage);
    return NextResponse.json({
      error: missingSchema
        ? 'Profile verification storage is not ready. Apply the profile contact verification migration and try again.'
        : memberMissing
          ? 'Your member profile could not be found. Please sign in again and retry.'
          : 'We could not save your verification request. Please retry. If the problem continues, contact support.',
    }, { status: missingSchema ? 503 : 409 });
  }

  const { data: profile } = account
    ? await supabaseAdmin.from('profiles').select('profile_id,first_name,last_name').eq('user_id', account.id).maybeSingle()
    : { data: null };
  if (!account || !profile) return NextResponse.json({ error: 'Member profile not found.' }, { status: 404 });

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.user_metadata?.full_name || 'Member';
  const message = [
    'Hello Gokul Vivaham Team,',
    '',
    'I have registered on Gokul Vivaham and am contacting you to verify my mobile number and email address.',
    '',
    `My Profile ID: ${profile.profile_id || 'Not assigned'}`,
    `My Name: ${name}`,
    `My Registered Mobile Number: ${requestedPhone}`,
    `My Registered Email ID: ${account.email || user.email || 'Not provided'}`,
    '',
    'Please guide me through the verification process and verify my profile after confirming my details.',
    '',
    'Thank you.',
  ].join('\n');

  return NextResponse.json({
    success: true,
    request: Array.isArray(result) ? result[0] : result,
    whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    notice: 'Opening WhatsApp does not prove that the message was sent or received. An administrator must review and approve your request.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
