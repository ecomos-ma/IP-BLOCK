import { db, account, demoMode, json } from '../../../lib/db';
import { demoCodeDocs, demoCreateCodeDoc } from '../../../lib/demo';
import { ownedStore } from '../../../lib/ownership';
import type { DocType, ExecutionPhase, PageTarget } from '../../../lib/types';

export const runtime = 'nodejs';

const VALID_DOC_TYPES: DocType[] = [
  'header_css', 'header_js', 'footer_css', 'footer_js',
  'module_css', 'module_js', 'module_html', 'critical_css',
];
const VALID_PHASES: ExecutionPhase[] = ['critical', 'main', 'header', 'footer', 'async'];
const VALID_TARGETS: PageTarget[] = ['all', 'home', 'product', 'collection', 'cart', 'confirmation', 'pattern'];

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('storeId') || '';
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  if (demoMode) return json({ documents: demoCodeDocs(storeId) });

  const { data, error } = await db()
    .from('code_documents')
    .select('*')
    .eq('store_id', storeId)
    .order('priority', { ascending: true });

  return error ? json({ error: 'Could not list code documents' }, 500) : json({ documents: data || [] });
}

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const storeId = String(body.storeId || '');
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  const name = String(body.name || '').trim();
  if (!name) return json({ error: 'Name is required' }, 400);

  const doc_type = body.doc_type as DocType;
  if (!VALID_DOC_TYPES.includes(doc_type)) return json({ error: `Invalid doc_type: ${doc_type}` }, 400);

  const execution_phase = (body.execution_phase || 'main') as ExecutionPhase;
  if (!VALID_PHASES.includes(execution_phase)) return json({ error: `Invalid execution_phase: ${execution_phase}` }, 400);

  const page_target = (body.page_target || 'all') as PageTarget;
  if (!VALID_TARGETS.includes(page_target)) return json({ error: `Invalid page_target: ${page_target}` }, 400);

  const draft_content = String(body.draft_content || '');
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;
  const page_pattern = body.page_pattern ? String(body.page_pattern) : null;
  const priority = Number.isInteger(body.priority) ? body.priority : 50;

  if (demoMode) {
    const doc = demoCreateCodeDoc({
      store_id: storeId,
      name,
      doc_type,
      draft_content,
      published_content: '',
      enabled,
      execution_phase,
      page_target,
      page_pattern,
      priority,
    });
    return json({ document: doc }, 201);
  }

  const { data, error } = await db()
    .from('code_documents')
    .insert({
      store_id: storeId,
      name,
      doc_type,
      draft_content,
      published_content: draft_content,
      enabled,
      execution_phase,
      page_target,
      page_pattern,
      priority,
    })
    .select('*')
    .single();

  return error ? json({ error: 'Could not create code document' }, 500) : json({ document: data }, 201);
}
