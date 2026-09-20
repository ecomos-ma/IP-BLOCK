import {db,cors,demoMode} from '../../../lib/db';
import {demoRules,demoStore} from '../../../lib/demo';
import {blockedByRule,normalizeIP,validHost,validIP} from '../../../lib/rules.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'}})}
export async function GET(request:Request){
 // Fail open on errors so a database outage does not hide every shop.
 const allow=()=>cors({decision:'allow'},200);
 try{
 const url=new URL(request.url);
 const storeId=url.searchParams.get('storeId')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(storeId))return allow();
 const origin=request.headers.get('origin');
 if(!origin)return allow();
 let host:string|null=null;try{host=validHost(new URL(origin).hostname)}catch{return allow()}
 const store=demoMode?demoStore(storeId):((await db().from('stores').select('hostname,status,license_expires_at').eq('id',storeId).maybeSingle()).data);
 const error=demoMode?null:undefined;
 if(error||!store||!host||host!==store.hostname||store.status!=='active'||(store.license_expires_at&&Date.parse(store.license_expires_at)<=Date.now()))return allow();
 // Production must use a proxy-controlled header. Demo accepts a local test header only.
 const trustedHeader=process.env.TRUSTED_CLIENT_IP_HEADER||'x-vercel-forwarded-for';
 const raw=demoMode?(request.headers.get('x-demo-ip')||request.headers.get('x-forwarded-for')||''):request.headers.get(trustedHeader)||'';
 const ip=normalizeIP(raw.split(',')[0]);
 if(!validIP(ip))return allow();
 const rules=demoMode?demoRules(storeId):((await db().from('ip_rules').select('ip,enabled,starts_at,expires_at').eq('store_id',storeId).eq('enabled',true).eq('ip',ip)).data||[]);
 const rulesError=demoMode?null:undefined;
 if(rulesError)return allow();
 const block=(rules||[]).some(rule=>blockedByRule(rule,ip));
 return cors({decision:block?'block':'allow'},200);
 }catch{return allow()}
}
