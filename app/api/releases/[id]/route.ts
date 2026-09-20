import { db, demoMode, json } from '../../../../lib/db';
import { demoReleases } from '../../../../lib/demo';
import { ownedStore } from '../../../../lib/ownership';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (demoMode) {
    const release = demoReleases('').find(r => r.id === id);
    if (!release) return json({ error: 'Release not found' }, 404);
    return json({ release });
  }

  const { data: release } = await db().from('releases').select('*').eq('id', id).maybeSingle();
  if (!release) return json({ error: 'Release not found' }, 404);

  const access = await ownedStore(request, release.store_id);
  if (access.error) return access.error;

  return json({ release });
}
