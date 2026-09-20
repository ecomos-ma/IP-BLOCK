import {db,account,json} from './db';
import {demoStore} from './demo';
import {demoMode} from './db';

export async function ownedStore(request:Request, storeId:string){
 const user = await account(request);
 if(demoMode){
   const store = demoStore(storeId);
   return store ? {store, user} : {error: json({error:'Store not found'}, 404)};
 }
 const {data, error} = await db()
   .from('stores')
   .select('id,hostname,name,description,owner_id,status,license_expires_at,verified_at,verification_token')
   .eq('id', storeId)
   .maybeSingle();

 if(error) return {error: json({error:'Database error'}, 500)};
 if(!data) return {error: json({error:'Store not found'}, 404)};
 return {store: data, user};
}
