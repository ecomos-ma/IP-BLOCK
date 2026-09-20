import { randomUUID } from 'node:crypto';
import { db, account, demoMode, json } from '../../../../../lib/db';
import { demoStore, demoUpdateStore } from '../../../../../lib/demo';
import { ownedStore } from '../../../../../lib/ownership';
import { isIP } from 'node:net';

export const runtime = 'nodejs';

function isPrivateIP(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[2] === 254) return true;
    if (parts[0] === 0) return true;
  }
  return false;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await ownedStore(request, id);
  if (access.error) return access.error;

  let token = access.store.verification_token;
  if (!token) {
    token = randomUUID();
    if (demoMode) {
      demoUpdateStore(id, { verification_token: token });
    } else {
      await db().from('stores').update({ verification_token: token }).eq('id', id);
    }
  }

  return json({
    storeId: access.store.id,
    hostname: access.store.hostname,
    verified_at: access.store.verified_at || null,
    verification_token: token,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await ownedStore(request, id);
  if (access.error) return access.error;

  const store = access.store;
  let token = store.verification_token;
  if (!token) {
    token = randomUUID();
    if (demoMode) {
      demoUpdateStore(id, { verification_token: token });
    } else {
      await db().from('stores').update({ verification_token: token }).eq('id', id);
    }
  }

  if (demoMode) {
    const verified_at = new Date().toISOString();
    demoUpdateStore(id, { verified_at });
    return json({ verified: true, verified_at, message: 'Store verified successfully (Demo Mode)' });
  }

  // SSRF check on hostname
  const hostname = store.hostname.toLowerCase();
  if (isIP(hostname) && isPrivateIP(hostname)) {
    return json({ error: 'Cannot verify private IP or internal addresses' }, 400);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const targetUrl = `https://${hostname}/`;
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'YouCan-CodeManager-Verifier/1.0' },
    });
    clearTimeout(timeout);

    const html = await res.text();
    const headerToken = res.headers.get('x-youcan-site-verification');

    const metaMatch = html.includes(`name="youcan-site-verification"`) || html.includes(token);
    const verified = Boolean((headerToken && headerToken.includes(token)) || metaMatch);

    if (!verified) {
      return json({
        verified: false,
        error: `Verification token not found on https://${hostname}/. Add <meta name="youcan-site-verification" content="${token}"> to your store header code and retry.`,
      }, 400);
    }

    const verified_at = new Date().toISOString();
    await db().from('stores').update({ verified_at }).eq('id', id);

    return json({ verified: true, verified_at, message: 'Store ownership verified successfully!' });
  } catch (err: unknown) {
    return json({
      verified: false,
      error: `Could not connect to https://${hostname}/: ${(err as Error).message}. Ensure your store is online and accessible.`,
    }, 500);
  }
}
