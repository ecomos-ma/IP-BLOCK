import { db, account, demoMode, json } from '../../../../lib/db';
import { demoStore, demoUpdateStore } from '../../../../lib/demo';
import { ownedStore } from '../../../../lib/ownership';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await ownedStore(request, id);
  if (access.error) return access.error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const change: Record<string, unknown> = {};
  if ('name' in body) change.name = String(body.name || '').slice(0, 120);
  if ('description' in body) change.description = String(body.description || '').slice(0, 500);
  if ('status' in body && (body.status === 'active' || body.status === 'suspended')) change.status = body.status;
  if ('block_message' in body) change.block_message = String(body.block_message || '').slice(0, 1000);
  if ('block_image_url' in body) change.block_image_url = String(body.block_image_url || '').slice(0, 2000);

  if (Object.keys(change).length === 0) return json({ error: 'No changes provided' }, 400);

  if (demoMode) {
    const updated = demoUpdateStore(id, change);
    return updated ? json({ store: updated }) : json({ error: 'Store not found' }, 404);
  }

  // Attempt 1: Direct update assuming columns exist
  const { data: directData, error: directError } = await db()
    .from('stores')
    .update(change)
    .eq('id', id)
    .select('id,hostname,name,description,status,license_expires_at,verified_at,verification_token')
    .single();

  if (!directError && directData) {
    return json({
      store: {
        ...directData,
        block_message: (change.block_message as string) || (directData as any).block_message || null,
        block_image_url: (change.block_image_url as string) || (directData as any).block_image_url || null,
      }
    });
  }

  // Attempt 2: Fallback if Postgres table lacks block_message / block_image_url columns
  const cleanChange: Record<string, unknown> = {};
  if ('name' in change) cleanChange.name = change.name;
  if ('status' in change) cleanChange.status = change.status;

  // Encode custom block settings into description JSON
  const { data: current } = await db().from('stores').select('description').eq('id', id).maybeSingle();
  let descMeta: Record<string, any> = {};
  try {
    descMeta = JSON.parse(current?.description || '{}');
  } catch {
    descMeta = { legacy: current?.description || '' };
  }

  if ('block_message' in change) descMeta.block_message = change.block_message;
  if ('block_image_url' in change) descMeta.block_image_url = change.block_image_url;
  if ('description' in change && typeof change.description === 'string') descMeta.text = change.description;

  cleanChange.description = JSON.stringify(descMeta);

  const { data: fallbackData, error: fallbackError } = await db()
    .from('stores')
    .update(cleanChange)
    .eq('id', id)
    .select('id,hostname,name,description,status,license_expires_at,verified_at,verification_token')
    .single();

  if (fallbackError) {
    console.error('[YCM] Store update error:', fallbackError);
    return json({ error: fallbackError.message || 'Could not update store' }, 500);
  }

  return json({
    store: {
      ...fallbackData,
      block_message: descMeta.block_message || null,
      block_image_url: descMeta.block_image_url || null,
    }
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await ownedStore(request, id);
  if (access.error) return access.error;

  if (demoMode) {
    // In demo mode simply return ok
    return json({ ok: true });
  }

  const { error } = await db().from('stores').delete().eq('id', id);
  return error ? json({ error: 'Could not delete store' }, 500) : json({ ok: true });
}