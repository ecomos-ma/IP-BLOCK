import {db,account,json} from './db';
import {demoStore} from './demo';
import {demoMode} from './db';
export async function ownedStore(request:Request,storeId:string){
 const user=await account(request);
 if(!user)return {error:json({error:'Sign in required'},401)};
 if(demoMode){const store=demoStore(storeId);return store?{store,user}:{error:json({error:'Store not found'},404)}}
 const {data,error}=await db().from('stores').select('id,hostname,owner_id,status,license_expires_at').eq('id',storeId).eq('owner_id',user.id).maybeSingle();
 if(error)return {error:json({error:'Database error'},500)};
 if(!data)return {error:json({error:'Store not found'},404)};
 return {store:data,user};
}
