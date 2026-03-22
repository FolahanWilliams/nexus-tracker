import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side only — the ACCESS_CODE env var is never sent to the browser.
// Set it in .env.local: ACCESS_CODE=your-secret-passphrase
const ACCESS_CODE = process.env.ACCESS_CODE;

export async function POST(req: NextRequest) {
  if (!ACCESS_CODE) {
    return NextResponse.json({ error: 'Access codes are not configured on this server.' }, { status: 503 });
  }

  let body: { code?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { code, userId } = body;

  if (!code || !userId) {
    return NextResponse.json({ error: 'Missing code or userId.' }, { status: 400 });
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = code.trim() === ACCESS_CODE.trim();

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 403 });
  }

  // Grant access by setting subscription_status = 'access' in the profile.
  // Must use the service role key to bypass RLS — same pattern as the Stripe webhook route.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: 'access' })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: 'Failed to activate access. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
