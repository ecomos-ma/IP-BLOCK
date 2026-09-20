import { db, demoMode, json } from '../../../../lib/db';
import { demoCustomerRule, demoDeleteCustomerRule, demoUpdateCustomerRule } from '../../../../lib/demo';
import { ownedStore } from '../../../../lib/ownership';
import { normalizeCustomerValue } from '../../../../lib/customer-rules';

export const runtime = 'nodejs';

async function locateRule(request: Request, id: string) {
  if (demoMode) {
    const rule = demoCustomerRule(id);
    if (!rule) return { error: json({ error: 'Customer rule not found' }, 404) };
    return { rule };
  }

  const { data } = await db().from('customer_rules').select('*').eq('id', id).maybeSingle();
  if (!data) return { error: json({ error: 'Customer rule not found' }, 404) };

  const access = await ownedStore(request, data.store_id);
  if (access.error) return { error: access.error };

  return { rule: data };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const located = await locateRule(request, id);
  if (located.error) return located.error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const change: Record<string, unknown> = {};
  if ('enabled' in body && typeof body.enabled === 'boolean') change.enabled = body.enabled;
  if ('reason' in body) change.reason = String(body.reason || '').slice(0, 250);
  if ('expires_at' in body) change.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;
  if ('value' in body) {
    const val = String(body.value).trim();
    if (val) {
      change.value = val;
      change.normalized_value = normalizeCustomerValue(located.rule!.rule_type, val);
    }
  }

  if (Object.keys(change).length === 0) return json({ error: 'No changes provided' }, 400);

  if (demoMode) {
    const rule = demoUpdateCustomerRule(id, change);
    return rule ? json({ rule }) : json({ error: 'Could not update rule' }, 500);
  }

  const { data, error } = await db()
    .from('customer_rules')
    .update(change)
    .eq('id', located.rule!.id)
    .select('*')
    .single();

  return error ? json({ error: 'Could not update rule' }, 500) : json({ rule: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const located = await locateRule(request, id);
  if (located.error) return located.error;

  if (demoMode) {
    return json({ ok: demoDeleteCustomerRule(id) });
  }

  const { error } = await db().from('customer_rules').delete().eq('id', located.rule!.id);
  return error ? json({ error: 'Could not delete rule' }, 500) : json({ ok: true });
}
