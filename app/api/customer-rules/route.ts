import { db, account, demoMode, json } from '../../../lib/db';
import { demoCustomerRules, demoCreateCustomerRule } from '../../../lib/demo';
import { ownedStore } from '../../../lib/ownership';
import { normalizeCustomerValue } from '../../../lib/customer-rules';
import type { CustomerRuleType } from '../../../lib/types';

export const runtime = 'nodejs';

const VALID_TYPES: CustomerRuleType[] = ['phone', 'name', 'address', 'address_contains'];

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('storeId') || '';
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  if (demoMode) return json({ rules: demoCustomerRules(storeId) });

  const { data, error } = await db()
    .from('customer_rules')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  return error ? json({ error: 'Could not list customer rules' }, 500) : json({ rules: data });
}

export async function POST(request: Request) {
  const user = await account(request);
  if (!user) return json({ error: 'Sign in required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const storeId = String(body.storeId || '');
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  const rule_type = body.rule_type as CustomerRuleType;
  if (!VALID_TYPES.includes(rule_type)) return json({ error: `Invalid rule_type: ${rule_type}` }, 400);

  const rawValue = String(body.value || '').trim();
  if (!rawValue) return json({ error: 'Value is required' }, 400);

  const normalized_value = normalizeCustomerValue(rule_type, rawValue);
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;
  const reason = String(body.reason || '').slice(0, 250);
  const expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;

  if (demoMode) {
    const rule = demoCreateCustomerRule({
      store_id: storeId,
      rule_type,
      value: rawValue,
      normalized_value,
      enabled,
      reason,
      expires_at,
    });
    return json({ rule }, 201);
  }

  const { data, error } = await db()
    .from('customer_rules')
    .insert({
      store_id: storeId,
      rule_type,
      value: rawValue,
      normalized_value,
      enabled,
      reason,
      expires_at,
    })
    .select('*')
    .single();

  return error ? json({ error: 'Could not create customer rule' }, 500) : json({ rule: data }, 201);
}
