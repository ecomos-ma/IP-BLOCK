import { db, demoMode } from '../../../../../../lib/db';
import { demoReleases } from '../../../../../../lib/demo';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ storeId: string; hash: string }> }) {
  const { storeId, hash } = await context.params;

  if (!hash || hash.length < 6) {
    return new Response('Invalid hash', { status: 400 });
  }

  if (demoMode) {
    // In demo mode, reconstruct content from active release manifest or stored assets
    const releases = demoReleases(storeId);
    for (const rel of releases) {
      if (rel.manifest) {
        if (rel.manifest.mainCssHash === hash) {
          return assetResponse(rel.manifest.criticalCss || '/* css asset */', 'text/css');
        }
      }
    }
    return new Response('/* asset placeholder */', {
      status: 200,
      headers: {
        'Content-Type': hash.endsWith('.js') ? 'application/javascript' : 'text/css',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  try {
    const { data: asset } = await db()
      .from('release_assets')
      .select('asset_type,content')
      .eq('store_id', storeId)
      .eq('content_hash', hash)
      .maybeSingle();

    if (!asset) {
      return new Response('Asset not found', { status: 404 });
    }

    const contentType = asset.asset_type === 'css' ? 'text/css'
      : asset.asset_type === 'js' ? 'application/javascript'
      : 'text/plain';

    return assetResponse(asset.content, contentType);
  } catch {
    return new Response('Server error', { status: 500 });
  }
}

function assetResponse(content: string, contentType: string) {
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': contentType + '; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
