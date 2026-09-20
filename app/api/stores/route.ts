import {randomUUID} from 'node:crypto';
import {db,account,demoMode,json} from '../../../lib/db';
import {demoCreateStore,demoStores} from '../../../lib/demo';
import {validHost} from '../../../lib/rules.mjs';
export const runtime='nodejs';
export async function GET(request:Request){
 const user=await account(request); if(!user)return json({error:'Sign in required'},401);
 if(demoMode)return json({stores:demoStores()});
 const {data,error}=await db().from('stores').select('id,hostname,status,license_expires_at,created_at').eq('owner_id',user.id).order('created_at',{ascending:false});
 return error?json({error:'Could not list stores'},500):json({stores:data});
}
export async function POST(request:Request){
 const user=await account(request);if(!user)return json({error:'Sign in required'},401);
 let body;try{body=await request.json()}catch{return json({error:'Invalid JSON'},400)}
 const hostname=validHost(body.hostname);if(!hostname)return json({error:'Enter a valid hostname without path'},400);
 if(demoMode){try{return json({store:demoCreateStore(hostname)},201)}catch{return json({error:'Domain already registered'},409)}}
 const {data,error}=await db().from('stores').insert({id:randomUUID(),hostname,owner_id:user.id,status:'active',license_expires_at:null}).select('id,hostname,status,license_expires_at').single();
 if(error)return json({error:error.code==='23505'?'Domain already registered':'Could not create store'},error.code==='23505'?409:500);
 return json({store:data},201);
}
