import { db, account, demoMode, json, writeAuditLog } from '../../../../../lib/db';
import { demoActivateRelease, demoAppendAudit } from '../../../../../lib/demo';
import { ownedStore } from '../../../../../lib/ownership';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await account(request);

  if (demoMode) {
    const activated = demoActivateRelease(id);
    if (!activated) return json({ error: 'Release not found' }, 404);
    demoAppendAudit({
      store_id: activated.store_id,
      actor_id: user.id,
      action: 'release.rollback',
      metadata: { version: activated.version_number, releaseId: id },
    });
    return json({ release: activated, message: `Rollback to version ${activated.version_number} successful` });
  }

  const { data: release } = await db().from('releases').select('id,store_id,version_number').eq('id', id).maybeSingle();
  if (!release) return json({ error: 'Release not found' }, 404);

  const access = await ownedStore(request, release.store_id);
  if (access.error) return access.error;

  await db().from('releases').update({ is_active: false }).eq('store_id', release.store_id);
  const { data: activated, error } = await db()
    .from('releases')
    .update({ is_active: true })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return json({ error: 'Could not activate release' }, 500);

  await writeAuditLog(release.store_id, user.id, 'release.rollback', { version: release.version_number, releaseId: id });

  return json({ release: activated, message: `Rollback to version ${release.version_number} successful` });
}
