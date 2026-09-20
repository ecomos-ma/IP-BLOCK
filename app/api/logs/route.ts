import { db, account, demoMode, json } from '../../../lib/db';
import { demoAuditLogs } from '../../../lib/demo';
import { ownedStore } from '../../../lib/ownership';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('storeId') || '';
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  if (demoMode) return json({ logs: demoAuditLogs(storeId) });

  const { data, error } = await db()
    .from('audit_logs')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100);

  return error ? json({ error: 'Could not fetch activity logs' }, 500) : json({ logs: data || [] });
}
