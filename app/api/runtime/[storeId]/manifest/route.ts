import { cors, db, demoMode } from '../../../../../lib/db';
import { demoActiveRelease } from '../../../../../lib/demo';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await context.params;

  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(storeId)) {
    return cors({ manifest: null, error: 'Invalid storeId' }, 400);
  }

  if (demoMode) {
    const rel = demoActiveRelease(storeId);
    return cors({ manifest: rel ? rel.manifest : null }, 200);
  }

  try {
    const { data: release } = await db()
      .from('releases')
      .select('manifest')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .maybeSingle();

    return Response.json(
      { manifest: release ? release.manifest : null },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch {
    return cors({ manifest: null }, 200);
  }
}
