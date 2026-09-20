import {demoMode,hasSupabaseConfig,json} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){return json({mode:demoMode?'demo':hasSupabaseConfig()?'production':'setup'});}