import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withAuth } from '@/lib/with-auth';

// Server-side only — the ACCESS_CODE env var is never sent to the browser.
// Set it in .env.local: ACCESS_CODE=your-secret-passphrase
const ACCESS_CODE = process.env.ACCESS_CODE;

export const POST = withAuth(async (request, user) => {
  if (!ACCESS_CODE) {
    return NextResponse.json({ error: 'Access codes are not configured on this server.' }, { status: 503 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { code } = body;

  if (!code) {
    return NextResponse.json({ error: 'Missing code.' }, { status: 400 });
  }

  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(code.trim());
  const b = Buffer.from(ACCESS_CODE.trim());
  const isValid = a.length === b.length && timingSafeEqual(a, b);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 403 });
  }

  // Derive userId from the authenticated session — never trust client input.
  const userId = user.id;

  // Grant access by setting subscription_status = 'access' in the profile.
  // Must use the service role key to bypass RLS.
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({ subscription_status: 'access' })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: 'Failed to activate access. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}, { rateLimitMax: 5, rateLimitWindowMs: 300_000 });
