import {db,cors,demoMode} from '../../../lib/db';
import {demoRules,demoStore} from '../../../lib/demo';
import {blockedByRule,normalizeIP,validHost,validIP} from '../../../lib/rules.mjs';
import {trustedClientIP} from '../../../lib/client-ip';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'}})}
export async function GET(request:Request){
 // Fail open on errors so a database outage does not hide every shop.
 const allow=()=>cors({blocked:false,decision:'allow'},200);
 try{
 const url=new URL(request.url);
 const storeId=url.searchParams.get('storeId')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(storeId))return allow();
 const origin=request.headers.get('origin');
 if(!origin)return allow();
 let host:string|null=null;try{host=validHost(new URL(origin).hostname)}catch{return allow()}
  let rawStore = demoMode ? demoStore(storeId) : ((await db().from('stores').select('*').eq('id', storeId).maybeSingle()).data);
  if (!rawStore && !demoMode) {
    rawStore = ((await db().from('stores').select('hostname,status,license_expires_at,description').eq('id', storeId).maybeSingle()).data) as any;
  }
  const store = rawStore;
  const error = demoMode ? null : undefined;
  if (error || !store || !host || host !== store.hostname || store.status !== 'active' || (store.license_expires_at && Date.parse(store.license_expires_at) <= Date.now())) return allow();

  const ip = demoMode ? normalizeIP((request.headers.get('x-demo-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0]) : trustedClientIP(request);
  if (!validIP(ip)) return allow();

  const rules = demoMode ? demoRules(storeId) : ((await db().from('ip_rules').select('ip,enabled,starts_at,expires_at').eq('store_id', storeId).eq('enabled', true).eq('ip', ip)).data || []);
  const rulesError = demoMode ? null : undefined;
  if (rulesError) return allow();

  const block = (rules || []).some(rule => blockedByRule(rule, ip));

  let msg = (store as any)?.block_message || null;
  let img = (store as any)?.block_image_url || null;
  if (!msg && store?.description) {
    try {
      const meta = JSON.parse(store.description);
      if (meta.block_message) msg = meta.block_message;
      if (meta.block_image_url) img = meta.block_image_url;
    } catch {}
  }

  return cors({
    blocked: block,
    decision: block ? 'block' : 'allow',
    message: msg,
    image_url: img,
    ip: ip
  }, 200, origin);
 }catch{return allow()}
}
