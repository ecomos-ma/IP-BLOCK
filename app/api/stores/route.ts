import { randomUUID } from 'node:crypto';
import { db, account, demoMode, json } from '../../../lib/db';
import { validHost } from '../../../lib/rules.mjs';
import { demoCreateStore, demoStores } from '../../../lib/demo';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (demoMode) return json({ stores: demoStores() });

  const { data, error } = await db()
    .from('stores')
    .select('id,hostname,name,description,status,license_expires_at,verified_at,verification_token,created_at')
    .order('created_at', { ascending: false });

  return error ? json({ error: 'Could not list stores' }, 500) : json({ stores: data || [] });
}

export async function POST(request: Request) {
  let body: { hostname?: string; name?: string; description?: string };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const hostname = validHost(body.hostname);
  if (!hostname) return json({ error: 'Enter a valid hostname (e.g. shop.youcan.shop or myshop.com)' }, 400);

  const name = String(body.name ?? hostname).slice(0, 120);
  const description = String(body.description ?? '').slice(0, 500);
  const verificationToken = randomUUID();

  if (demoMode) {
    try {
      return json({ store: demoCreateStore(hostname, name, description) }, 201);
    } catch {
      return json({ error: 'Domain already registered' }, 409);
    }
  }

  // Get or provision a valid user ID in auth.users to satisfy foreign key constraint
  const user = await account(request);
  let ownerId = user.id;

  try {
    const { data: userList } = await db().auth.admin.listUsers();
    if (userList?.users && userList.users.length > 0) {
      const match = userList.users.find(u => u.id === user.id);
      ownerId = match ? match.id : userList.users[0].id;
    } else {
      const { data: newUser } = await db().auth.admin.createUser({
        email: 'owner@youcan-saas.local',
        email_confirm: true,
      });
      if (newUser?.user) ownerId = newUser.user.id;
    }
  } catch {
    // Fallback if listUsers is not supported
  }

  const { data, error } = await db()
    .from('stores')
    .insert({
      id: randomUUID(),
      hostname,
      name,
      description,
      owner_id: ownerId,
      status: 'active',
      license_expires_at: null,
      verification_token: verificationToken,
    })
    .select('id,hostname,name,description,status,license_expires_at,verified_at,verification_token')
    .single();

  if (error) {
    if (error.code === '23505') {
      return json({ error: 'Domain already registered' }, 409);
    }
    return json({ error: `Could not create store: ${error.message}` }, 500);
  }

  return json({ store: data }, 201);
}
