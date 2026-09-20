import { db, account, demoMode, json, writeAuditLog } from '../../../lib/db';
import { demoCodeDocs, demoCreateRelease, demoReleases, demoAppendAudit } from '../../../lib/demo';
import { ownedStore } from '../../../lib/ownership';
import { buildAssets, buildManifest, contentHash } from '../../../lib/release-builder';
import type { CodeDocument } from '../../../lib/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('storeId') || '';
  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  if (demoMode) return json({ releases: demoReleases(storeId) });

  const { data, error } = await db()
    .from('releases')
    .select('*')
    .eq('store_id', storeId)
    .order('version_number', { ascending: false });

  return error ? json({ error: 'Could not list releases' }, 500) : json({ releases: data });
}

export async function POST(request: Request) {
  const user = await account(request);
  if (!user) return json({ error: 'Sign in required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const storeId = String(body.storeId || '');
  const notes = String(body.notes || 'Published release').slice(0, 500);

  const access = await ownedStore(request, storeId);
  if (access.error) return access.error;

  let docs: CodeDocument[];
  if (demoMode) {
    docs = demoCodeDocs(storeId);
  } else {
    const { data, error } = await db().from('code_documents').select('*').eq('store_id', storeId);
    if (error) return json({ error: 'Could not fetch code documents' }, 500);
    docs = (data || []) as CodeDocument[];
  }

  // 1. Copy draft_content to published_content for all documents of this store
  const publishedDocs = docs.map(doc => ({
    ...doc,
    published_content: doc.draft_content,
  }));

  if (demoMode) {
    // In demo mode update local state
    docs.forEach(doc => { doc.published_content = doc.draft_content; });
  } else {
    // DB batch update draft -> published
    for (const doc of docs) {
      await db().from('code_documents').update({ published_content: doc.draft_content }).eq('id', doc.id);
    }
  }

  // 2. Build assets
  const assets = buildAssets(publishedDocs);

  // 3. Map hashes
  const assetHashMap = new Map<string, string>();
  const assetEntries: Array<{ content: string; type: 'css' | 'js' | 'html'; hash: string }> = [];

  if (assets.mainCss) {
    const h = contentHash(assets.mainCss);
    assetHashMap.set(assets.mainCss, h);
    assetEntries.push({ content: assets.mainCss, type: 'css', hash: h });
  }
  if (assets.headerJs) {
    const h = contentHash(assets.headerJs);
    assetHashMap.set(assets.headerJs, h);
    assetEntries.push({ content: assets.headerJs, type: 'js', hash: h });
  }
  if (assets.footerJs) {
    const h = contentHash(assets.footerJs);
    assetHashMap.set(assets.footerJs, h);
    assetEntries.push({ content: assets.footerJs, type: 'js', hash: h });
  }
  for (const m of assets.modules) {
    if (m.content) {
      const h = contentHash(m.content);
      assetHashMap.set(m.content, h);
      assetEntries.push({ content: m.content, type: m.type, hash: h });
    }
  }

  // 4. Calculate next version number
  let nextVersion = 1;
  if (demoMode) {
    const existing = demoReleases(storeId);
    nextVersion = existing.length > 0 ? Math.max(...existing.map(r => r.version_number)) + 1 : 1;
  } else {
    const { data } = await db()
      .from('releases')
      .select('version_number')
      .eq('store_id', storeId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) nextVersion = data.version_number + 1;
  }

  // 5. Build manifest
  const manifest = buildManifest(storeId, nextVersion, assets, assetHashMap);

  if (demoMode) {
    const release = demoCreateRelease({
      store_id: storeId,
      version_number: nextVersion,
      published_by: user.id,
      published_at: new Date().toISOString(),
      is_active: true,
      notes,
      manifest,
    });
    demoAppendAudit({
      store_id: storeId,
      actor_id: user.id,
      action: 'release.published',
      metadata: { version: nextVersion, notes },
    });
    return json({ release }, 201);
  }

  // Production DB insert release & release_assets
  await db().from('releases').update({ is_active: false }).eq('store_id', storeId);

  const { data: release, error: relErr } = await db()
    .from('releases')
    .insert({
      store_id: storeId,
      version_number: nextVersion,
      published_by: user.id,
      published_at: new Date().toISOString(),
      is_active: true,
      notes,
      manifest,
    })
    .select('*')
    .single();

  if (relErr) return json({ error: 'Could not create release record' }, 500);

  // Insert assets
  for (const entry of assetEntries) {
    await db().from('release_assets').upsert({
      store_id: storeId,
      release_id: release.id,
      asset_type: entry.type,
      content_hash: entry.hash,
      content: entry.content,
      content_length: Buffer.byteLength(entry.content, 'utf8'),
    }, { onConflict: 'store_id,content_hash' });
  }

  await writeAuditLog(storeId, user.id, 'release.published', { version: nextVersion, notes });

  return json({ release }, 201);
}
