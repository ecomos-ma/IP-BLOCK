# YouCan IP Protection SaaS — working starter project

This builds a dashboard, Supabase-backed store/rule APIs, an IP-decision endpoint, and a remotely hosted browser-side visual guard. **It does not provide genuine network-level IP blocking**: YouCan content can arrive before this script runs, and a visitor can bypass JavaScript. Keep this distinction when selling the service.

## Requirements
Node.js 20+, a Supabase project, a Next.js hosting provider with a trusted forwarding proxy (example: Vercel). YouCan theme must permit Additional Header HTML/JS and cross-origin requests to your API.

## Local demo mode
The repository runs in local demo mode by default during `npm run dev`; no Supabase account, password, or keys are needed. Demo data is stored server-side in `.data/demo-store.json` and is never used when `NODE_ENV=production`.

```text
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`. The dashboard shows a **LOCAL DEMO MODE** badge, seeds `demo.example.com`, and includes an enabled 24-hour rule for `196.118.93.179`. You can add stores, create 1-hour, 24-hour, 7-day, 30-day, and permanent rules, toggle rules, delete rules, and copy a generated installation snippet. Delete `.data/demo-store.json` to reset demo data.

## Production Supabase mode
1. Run `supabase/001_schema.sql`, then `supabase/002_saas_tables.sql`, in the Supabase SQL Editor.
2. In Supabase Authentication → Providers, enable Email and configure email delivery and the redirect URL for your deployed dashboard.
3. Copy `.env.example` to the deployment environment and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the server-only `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL` to the HTTPS deployment URL. Set `DEMO_MODE=false` and `NEXT_PUBLIC_DEMO_MODE=false`.
4. Optionally set `SUPABASE_ALLOWED_OWNER_EMAILS` to a comma-separated allowlist. The first authorized email can use the dashboard's passwordless sign-in link; no password or pre-created owner account is required.
5. Configure the trusted proxy to overwrite `TRUSTED_CLIENT_IP_HEADER` (default `x-vercel-forwarded-for`) with the real client IP. Do not expose the origin directly or trust arbitrary browser-supplied forwarding headers.
6. Deploy, open `/dashboard`, enter the authorized email, and follow the magic link. The server verifies the Supabase token and every store/rule operation checks ownership.
7. Copy the generated installation snippet into the beginning of YouCan Additional Header Code. It uses the actual deployment URL and public store ID.

If production Supabase variables are missing, `/dashboard` shows a setup page instead of crashing or looping. Service-role credentials must remain server-only and must never use a `NEXT_PUBLIC_` prefix.

Validation commands are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Do not run `npm run dev` and `npm run build` concurrently because both write the `.next` directory.

## HTTP endpoints
- `GET /api/stores` / `POST /api/stores` — dashboard user (Bearer Supabase access token).
- `GET /api/rules?storeId=<uuid>` / `POST /api/rules` — authenticated store owner.
- `PATCH /api/rules/<uuid>` / `DELETE /api/rules/<uuid>` — authenticated store owner.
- `GET /api/guard?storeId=<uuid>` — public, returns `{"decision":"allow"|"block"}`. Validates request Origin against configured store hostname and reads visitor IP from *trusted proxy headers*. Returns Allow on API/database/identity failure.
- `/guard.js` — hosted browser-side loader, does not expose rules.

## Important security and product caveats
- Do not trust user-supplied `X-Forwarded-For`. Configure deployment proxy to overwrite these headers. If proxy trust cannot be assured, use provider's trusted request-IP API instead.
- Store IDs are public identifiers, **not secret API keys**. Rule editing requires verified Supabase user tokens, checks store ownership, uses service-role only on server.
- No server-side WAF: blocking is cosmetic and bypassable, and the site may transmit content before the JavaScript response. For actual access prevention use a supported edge/WAF integration.
- Browser Origin is an advisory browser cross-origin check, not cryptographic proof of domain ownership. Before selling licenses implement explicit domain verification, payment webhooks, abuse limits, audit logs, subscription management and support for YouCan theme constraints.
- API rules and personal data stay in Supabase instead of being embedded in public JS. This starter intentionally manages *only IPs*, not customer names, phones or addresses.
- A truly restricted license must be provisioned/updated server-side; the dashboard only shows status, and admins need to manage subscription status via a protected internal workflow.
- YouCan script-injection behavior and actual store checkout must be tested against your deployed store; tests here cover rule logic, not live YouCan integration.
