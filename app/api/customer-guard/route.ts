import { cors, db, demoMode } from '../../../lib/db';
import { demoCustomerRules } from '../../../lib/demo';
import { customerRuleMatches } from '../../../lib/customer-rules';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: Request) {
  const allow = () => cors({ blocked: false, decision: 'allow' }, 200);

  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId') || '';

    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(storeId)) return allow();

    const phone = url.searchParams.get('phone') || undefined;
    const name = url.searchParams.get('name') || undefined;
    const address = url.searchParams.get('address') || undefined;

    if (!phone && !name && !address) return allow();

    let rules;
    if (demoMode) {
      rules = demoCustomerRules(storeId);
    } else {
      const { data, error } = await db()
        .from('customer_rules')
        .select('rule_type,normalized_value,enabled,expires_at')
        .eq('store_id', storeId)
        .eq('enabled', true);

      if (error || !data) return allow();
      rules = data;
    }

    const blocked = rules.some(rule => customerRuleMatches(rule, { phone, name, address }));
    return cors({ blocked, decision: blocked ? 'block' : 'allow' }, 200);
  } catch {
    return allow();
  }
}
