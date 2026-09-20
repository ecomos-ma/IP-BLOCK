import { createClient } from '@supabase/supabase-js';
import { db, demoMode, json } from '../../../../lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Enter a valid email address' }, 400);
  }

  // Check allowlist if configured
  const allowed = (process.env.SUPABASE_ALLOWED_OWNER_EMAILS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length > 0 && !allowed.includes(email)) {
    return json({ error: 'This email is not authorized as a platform owner' }, 403);
  }

  if (demoMode) {
    return json({
      message: 'Demo mode active — instant sign in',
      session: { access_token: 'demo-token', refresh_token: 'demo-refresh' },
      user: { id: 'demo-owner', email },
    });
  }

  try {
    const admin = db();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return json({ error: 'Supabase credentials not configured' }, 500);
    }

    // 1. Create user if not existing with email_confirm = true (no confirmation email sent)
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    }).catch(() => {});

    // 2. Generate magiclink OTP server-side (no email dispatched to user inbox)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkErr || !linkData?.properties?.email_otp) {
      return json({ error: linkErr?.message || 'Could not generate instant login session' }, 500);
    }

    // 3. Exchange OTP server-side to get session token directly
    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: sessionData, error: sessionErr } = await anonClient.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    });

    if (sessionErr || !sessionData.session) {
      return json({ error: sessionErr?.message || 'Could not verify session' }, 500);
    }

    return json({
      message: 'Instant login successful',
      session: sessionData.session,
      user: sessionData.user,
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Server error during sign in' }, 500);
  }
}
