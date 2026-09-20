import {createClient} from '@supabase/supabase-js';
import type {User} from '@supabase/supabase-js';
import {DEMO_OWNER_ID} from './demo';

export const demoMode = process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false';

export const DEFAULT_OWNER: User = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'owner@youcan-saas.local',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error('Server Supabase environment variables missing');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Always return an authorized owner user — no sign-in ever required */
export async function account(request: Request): Promise<User> {
  if (demoMode) return { id: DEMO_OWNER_ID, email: 'demo@localhost' } as User;
  const match = /^Bearer (.+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) return DEFAULT_OWNER;
  try {
    const client = db();
    const { data } = await client.auth.getUser(match[1]);
    if (data?.user) return data.user;
  } catch {
    // Ignore error and fall back to default owner
  }
  return DEFAULT_OWNER;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function cors(data: unknown, status = 200, origin = '*') {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function corsHeaders(origin = '*') {
  return {
    'Vary': 'Origin',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/** Write an audit log entry (production only — demo has its own helper) */
export async function writeAuditLog(
  storeId: string | null,
  actorId: string | null,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await db().from('audit_logs').insert({ store_id: storeId, actor_id: actorId, action, metadata });
  } catch {
    // Audit log failure must never break the main request
  }
}
