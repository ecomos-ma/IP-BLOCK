import { db, demoMode, json } from '../../../../lib/db';
import { demoDeleteRule, demoRule, demoUpdateRule } from '../../../../lib/demo';
import { ownedStore } from '../../../../lib/ownership';
import { expiryFromHours } from '../../../../lib/rules.mjs';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

async function locate(request: Request, context: Context) {
  const { id } = await context.params;
  if (demoMode) {
    const rule = demoRule(id);
    if (!rule) return { error: json({ error: 'Rule not found' }, 404) };
    return { rule };
  }

  const { data } = await db().from('ip_rules').select('id,store_id').eq('id', id).maybeSingle();
  if (!data) return { error: json({ error: 'Rule not found' }, 404) };

  const access = await ownedStore(request, data.store_id);
  if (access.error) return { error: access.error };

  return { rule: data };
}

export async function PATCH(request: Request, context: Context) {
  const located = await locate(request, context);
  if (located.error) return located.error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const change: Record<string, unknown> = {};
  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') return json({ error: 'enabled must be boolean' }, 400);
    change.enabled = body.enabled;
  }
  if ('durationHours' in body) {
    try {
      change.expires_at = expiryFromHours(body.durationHours);
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  }
  if ('note' in body) change.note = String(body.note || '').slice(0, 250);

  if (Object.keys(change).length === 0) return json({ error: 'No changes' }, 400);

  if (demoMode) {
    const rule = demoUpdateRule(located.rule!.id, change as { enabled?: boolean; expires_at?: string | null; note?: string });
    return rule ? json({ rule }) : json({ error: 'Could not update rule' }, 500);
  }

  const { data, error } = await db()
    .from('ip_rules')
    .update(change)
    .eq('id', located.rule!.id)
    .select('id,ip,enabled,expires_at,note')
    .single();

  return error ? json({ error: 'Could not update rule' }, 500) : json({ rule: data });
}

export async function DELETE(request: Request, context: Context) {
  const located = await locate(request, context);
  if (located.error) return located.error;

  if (demoMode) return json({ ok: demoDeleteRule(located.rule!.id) });

  const { error } = await db().from('ip_rules').delete().eq('id', located.rule!.id);
  return error ? json({ error: 'Could not delete rule' }, 500) : json({ ok: true });
}
