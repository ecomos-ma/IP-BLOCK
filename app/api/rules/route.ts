import { db, account, demoMode, json } from '../../../lib/db';
import { demoCreateRule, demoRules } from '../../../lib/demo';
import { ownedStore } from '../../../lib/ownership';
import { validIP, normalizeIP, expiryFromHours } from '../../../lib/rules.mjs';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('storeId') || '';
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  if (demoMode) return json({ rules: demoRules(storeId) });

  const { data, error } = await db()
    .from('ip_rules')
    .select('id,ip,enabled,starts_at,expires_at,note,created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  return error ? json({ error: 'Could not list rules' }, 500) : json({ rules: data || [] });
}

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const storeId = String(body.storeId || '');
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  if (!validIP(body.ip)) return json({ error: 'Invalid IPv4/IPv6 address' }, 400);
  if (typeof body.enabled !== 'boolean') return json({ error: 'enabled must be boolean' }, 400);

  let expires_at: null | string = null;
  try {
    expires_at = expiryFromHours(body.durationHours ?? null);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const note = String(body.note || '').slice(0, 250);

  if (demoMode) {
    try {
      return json({
        rule: demoCreateRule({
          store_id: access.store.id,
          ip: normalizeIP(body.ip),
          enabled: body.enabled,
          starts_at: new Date().toISOString(),
          expires_at,
          note,
        }),
      }, 201);
    } catch {
      return json({ error: 'Could not create rule (duplicate IP?)' }, 409);
    }
  }

  const { data, error } = await db()
    .from('ip_rules')
    .insert({
      store_id: access.store.id,
      ip: normalizeIP(body.ip),
      enabled: body.enabled,
      starts_at: new Date().toISOString(),
      expires_at,
      note,
    })
    .select('id,ip,enabled,starts_at,expires_at,note')
    .single();

  return error ? json({ error: 'Could not create rule (duplicate IP?)' }, 409) : json({ rule: data }, 201);
}
