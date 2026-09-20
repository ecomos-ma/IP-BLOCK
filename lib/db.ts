import {createClient} from '@supabase/supabase-js';
import type {User} from '@supabase/supabase-js';
import {DEMO_OWNER_ID} from './demo';
export const demoMode=process.env.NODE_ENV!=='production'&&process.env.DEMO_MODE!=='false';
export function hasSupabaseConfig(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
export function db() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret) throw new Error('Server Supabase environment variables missing');
 return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function account(request:Request) {
 if(demoMode)return {id:DEMO_OWNER_ID,email:'demo@localhost'} as User;
 const match=/^Bearer (.+)$/i.exec(request.headers.get('authorization')||'');
 if(!match)return null;
 const client=db();
 const {data,error}=await client.auth.getUser(match[1]);
 if(error||!data.user)return null;
 const allowed=(process.env.SUPABASE_ALLOWED_OWNER_EMAILS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
 return allowed.length&&(!data.user.email||!allowed.includes(data.user.email.toLowerCase()))?null:data.user;
}
export function json(data:unknown,status=200) {
 return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
}
export function cors(data:unknown,status=200) {
 return Response.json(data,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
}
