import { db, account, demoMode, json } from '../../../../lib/db';
import { demoCodeDoc, demoDeleteCodeDoc, demoUpdateCodeDoc } from '../../../../lib/demo';
import { ownedStore } from '../../../../lib/ownership';

export const runtime = 'nodejs';

async function locateDoc(request: Request, id: string) {
  if (demoMode) {
    const doc = demoCodeDoc(id);
    if (!doc) return { error: json({ error: 'Document not found' }, 404) };
    return { doc };
  }

  const { data } = await db().from('code_documents').select('*').eq('id', id).maybeSingle();
  if (!data) return { error: json({ error: 'Document not found' }, 404) };

  const access = await ownedStore(request, data.store_id);
  if (access.error) return { error: access.error };

  return { doc: data };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const located = await locateDoc(request, id);
  if (located.error) return located.error;
  return json({ document: located.doc });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const located = await locateDoc(request, id);
  if (located.error) return located.error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const change: Record<string, unknown> = {};
  if ('name' in body) change.name = String(body.name).trim();
  if ('draft_content' in body) {
    change.draft_content = String(body.draft_content);
    if (!('published_content' in body) || body.published_content === undefined) {
      change.published_content = String(body.draft_content);
    }
  }
  if ('published_content' in body) change.published_content = String(body.published_content);
  if ('enabled' in body && typeof body.enabled === 'boolean') change.enabled = body.enabled;
  if ('execution_phase' in body) change.execution_phase = body.execution_phase;
  if ('page_target' in body) change.page_target = body.page_target;
  if ('page_pattern' in body) change.page_pattern = body.page_pattern ? String(body.page_pattern) : null;
  if ('priority' in body && Number.isInteger(body.priority)) change.priority = body.priority;

  if (Object.keys(change).length === 0) return json({ error: 'No changes provided' }, 400);

  if (demoMode) {
    const doc = demoUpdateCodeDoc(id, change);
    return doc ? json({ document: doc }) : json({ error: 'Could not update document' }, 500);
  }

  const { data, error } = await db()
    .from('code_documents')
    .update(change)
    .eq('id', id)
    .select('*')
    .single();

  return error ? json({ error: 'Could not update document' }, 500) : json({ document: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const located = await locateDoc(request, id);
  if (located.error) return located.error;

  if (demoMode) {
    return json({ ok: demoDeleteCodeDoc(id) });
  }

  const { error } = await db().from('code_documents').delete().eq('id', id);
  return error ? json({ error: 'Could not delete document' }, 500) : json({ ok: true });
}
