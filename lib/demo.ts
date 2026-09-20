import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {randomUUID} from 'node:crypto';

type DemoStore = {
 id: string;
 owner_id: string;
 hostname: string;
 status: 'active' | 'suspended';
 license_expires_at: string | null;
 created_at: string;
};
export type DemoRule = {
 id: string;
 store_id: string;
 ip: string;
 enabled: boolean;
 starts_at: string;
 expires_at: string | null;
 note: string;
 created_at: string;
};
type DemoState = {stores: DemoStore[]; rules: DemoRule[]};

export const DEMO_OWNER_ID = 'demo-owner';
export const DEMO_STORE_ID = '00000000-0000-4000-8000-000000000001';
const file = join(process.cwd(), '.data', 'demo-store.json');

function initialState(): DemoState {
 const now = new Date().toISOString();
 return {
  stores: [{id:DEMO_STORE_ID,owner_id:DEMO_OWNER_ID,hostname:'demo.example.com',status:'active',license_expires_at:null,created_at:now}],
  rules: [{id:'00000000-0000-4000-8000-000000000002',store_id:DEMO_STORE_ID,ip:'196.118.93.179',enabled:true,starts_at:now,expires_at:new Date(Date.now()+86_400_000).toISOString(),note:'Seeded 24-hour demo block',created_at:now}]
 };
}
function read(): DemoState {
 try{return JSON.parse(readFileSync(file,'utf8')) as DemoState}catch{
  const state=initialState();mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(state,null,2));return state;
 }
}
function write(state:DemoState){mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(state,null,2));}
export function demoStores(){return read().stores}
export function demoStore(storeId:string){return read().stores.find(store=>store.id===storeId) ?? null}
export function demoRules(storeId:string){return read().rules.filter(rule=>rule.store_id===storeId).sort((a,b)=>b.created_at.localeCompare(a.created_at))}
export function demoCreateStore(hostname:string){
 const state=read();
 if(state.stores.some(store=>store.hostname===hostname))throw new Error('duplicate');
 const store:DemoStore={id:randomUUID(),owner_id:DEMO_OWNER_ID,hostname,status:'active',license_expires_at:null,created_at:new Date().toISOString()};
 state.stores.push(store);write(state);return store;
}
export function demoCreateRule(input:Omit<DemoRule,'id'|'created_at'>){
 const state=read();
 if(state.rules.some(rule=>rule.store_id===input.store_id&&rule.ip===input.ip))throw new Error('duplicate');
 const rule:DemoRule={...input,id:randomUUID(),created_at:new Date().toISOString()};state.rules.push(rule);write(state);return rule;
}
export function demoRule(ruleId:string){return read().rules.find(rule=>rule.id===ruleId) ?? null}
export function demoUpdateRule(ruleId:string,change:Partial<Pick<DemoRule,'enabled'|'expires_at'|'note'>>){
 const state=read();const rule=state.rules.find(item=>item.id===ruleId);if(!rule)return null;Object.assign(rule,change);write(state);return rule;
}
export function demoDeleteRule(ruleId:string){const state=read();const before=state.rules.length;state.rules=state.rules.filter(rule=>rule.id!==ruleId);write(state);return before!==state.rules.length}
