// Username login. Looks up the email for a username server-side (the email is never sent to the browser),
// signs in with it, and returns the session tokens. Needs SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
const out=(c,b)=>({statusCode:c,headers:{'content-type':'application/json'},body:JSON.stringify(b)});
exports.handler=async(ev)=>{
  if(ev.httpMethod!=='POST')return out(405,{error:'Method not allowed'});
  const URL=require('./_url').supabaseUrl(),SR=process.env.SUPABASE_SERVICE_ROLE_KEY,ANON=process.env.SUPABASE_ANON_KEY;
  if(!URL||!SR||!ANON)return out(500,{error:'Login is not configured on the server.'});
  let b;try{b=JSON.parse(ev.body||'{}')}catch(e){return out(400,{error:'Bad request'})}
  const u=String(b.username||'').trim().toLowerCase().replace(/^@/,''),pw=String(b.password||'');
  const bad=out(401,{error:'Incorrect username or password.'});
  if(!/^[a-z0-9_]{3,20}$/.test(u)||!pw)return bad;
  try{
    const sr={apikey:SR,Authorization:'Bearer '+SR};
    const p=await fetch(`${URL}/rest/v1/profiles?select=id&username=eq.${u}&limit=1`,{headers:sr}).then(r=>r.json());
    if(!Array.isArray(p)||!p[0])return bad;
    const usr=await fetch(`${URL}/auth/v1/admin/users/${p[0].id}`,{headers:sr}).then(r=>r.json());
    if(!usr||!usr.email)return bad;
    const r=await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:ANON,'content-type':'application/json'},body:JSON.stringify({email:usr.email,password:pw})});
    const j=await r.json();
    if(!r.ok){return /confirm/i.test(j.error_code||j.msg||j.error_description||'')?out(401,{error:'Please confirm your email first, then log in.'}):bad}
    return out(200,{access_token:j.access_token,refresh_token:j.refresh_token});
  }catch(e){return out(500,{error:'Login failed. Try again.'})}
};
