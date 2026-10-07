// Supabase client (browser). Uses ONLY the public publishable/anon key. Never put the service-role key here.
const FX_SUPABASE_URL='https://xxmqyaxnchygtmfhcpim.supabase.co';
const FX_SUPABASE_KEY='sb_publishable_Bdg_oaHyFU4mly6vbH7fDA_ogv3zD9t';
window.FX_DB=null;
window.fxInitSupabase=async()=>{
  try{
    if(!window.supabase)throw new Error('supabase-js failed to load');
    window.FX_DB=window.supabase.createClient(FX_SUPABASE_URL,FX_SUPABASE_KEY);
  }catch(e){console.error('Supabase init failed:',e)}
  return window.FX_DB;
};
