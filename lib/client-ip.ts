import {normalizeIP,validIP} from './rules.mjs';

export function trustedClientIP(request:Request):string|null {
 const configured=process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
 const headerNames=[configured,'x-vercel-forwarded-for','x-forwarded-for'].filter((value,index,array):value is string=>Boolean(value)&&array.indexOf(value)===index);
 const candidates=headerNames.map(name=>request.headers.get(name));
 for(const value of candidates){
  const first=normalizeIP(value?.split(',')[0]||'');
  if(validIP(first))return first;
 }
 return null;
}
