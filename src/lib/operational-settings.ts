import {supabaseAdmin} from '@/lib/supabase/server';
export async function getOperationalSettings(){
 const {data,error}=await supabaseAdmin.from('operational_settings').select('*').eq('id',true).single();
 if(error||!data)throw new Error('Unable to load operational settings');
 return data as {paid_orders_enabled:boolean;support_requests_enabled:boolean;version:number;updated_at:string};
}

