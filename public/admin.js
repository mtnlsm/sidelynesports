/* ===== ADMIN DASHBOARD (needs supabase/admin.sql + admin2.sql) =====
   Tabs: Reports, Posts, Users, Props, Shop. Every action calls a database function that re-checks is_admin(). */
const AD={tab:'reports',q:{},txt:{},users:{},shop:{},props:{},tm:0};
const adFail=e=>toast('Failed: '+((e&&e.message)||e));
const adTab=[['reports','Reports'],['posts','Posts'],['users','Users'],['props','Props'],['shop','Shop']];
const adClean=s=>String(s||'').replace(/[^\w @.\-]/g,'').trim();
const adWho=u=>u?`<div class="row" style="min-width:0;gap:8px">${avHtml(u,30)}<div style="min-width:0"><b>${esc(u.display_name||u.username)}</b> <span class="mu">@${esc(u.username)}</span></div></div>`:'<span class="mu">Deleted user</span>';

async function loadAdmin(){
  const box=$('#adm');if(!box||!isAdmin())return;
  box.innerHTML=`<div class="adm-stats" id="ad-stats"></div><div class="ad-tabs">${adTab.map(([k,v])=>`<button class="chip ${AD.tab===k?'on':''}" data-ad="tab" data-id="${k}">${v}<span class="ad-n" id="adn-${k}"></span></button>`).join('')}</div><div id="ad-body"></div>`;
  adStats();adShow(AD.tab);
}
async function adStats(){
  try{
    const cnt=t=>FX_DB.from(t).select('*',{count:'exact',head:true});
    const[u,p,c,r]=await Promise.all([cnt('profiles'),cnt('posts'),cnt('comments'),cnt('reports')]);
    const el=$('#ad-stats');if(el)el.innerHTML=[['Users',u.count],['Posts',p.count],['Comments',c.count],['Reports',r.count]].map(([l,n])=>`<div class="glass"><b>${n??0}</b><span class="mu">${l}</span></div>`).join('');
    const bn=$('#adn-reports');if(bn)bn.textContent=r.count?' '+r.count:'';
  }catch(e){}
}
function adShow(t){
  AD.tab=t;document.querySelectorAll('.ad-tabs .chip').forEach(b=>b.classList.toggle('on',b.dataset.id===t));
  const body=$('#ad-body');if(!body)return;
  const search={posts:'Search posts…',users:'Search name or @username…',props:'Search player or matchup…'}[t];
  body.innerHTML=(search?`<input data-ads="${t}" placeholder="${search}" value="${esc(AD.q[t]||'')}" autocomplete="off" style="margin-bottom:10px;font-size:16px">`:'')+'<div id="ad-list"><div class="sk"></div></div>';
  adList(t);
}
async function adList(t){
  const el=$('#ad-list');if(!el)return;
  try{el.innerHTML=await({reports:adReports,posts:adPosts,users:adUsers,props:adProps,shop:adShopList}[t])()}
  catch(e){el.innerHTML=`<div class="glass card"><b>Couldn't load this</b><p class="mu">${esc((e&&e.message)||e)}</p><p class="mu">Did you run supabase/admin.sql and admin2.sql?</p></div>`}
}
const adBtn=(a,id,label,cls='',extra='')=>`<button class="chip ${cls}" data-ad="${a}" data-id="${esc(id)}" ${extra}>${label}</button>`;

/* ---- Reports: grouped by what was reported, with the content shown ---- */
async function adReports(){
  const r=await FX_DB.from('reports').select('*').order('created_at',{ascending:false}).limit(300);if(r.error)throw r.error;
  const G={};r.data.forEach(x=>{const k=x.target_type+'|'+x.target_id;(G[k]=G[k]||{t:x.target_type,id:x.target_id,items:[]}).items.push(x)});
  const L=Object.values(G).sort((a,b)=>b.items.length-a.items.length||Date.parse(b.items[0].created_at)-Date.parse(a.items[0].created_at));
  if(!L.length)return'<div class="glass card"><b>All clear</b><p class="mu">No open reports.</p></div>';
  const ids=t=>L.filter(g=>g.t===t).map(g=>g.id),sel='id,body,user_id,created_at,profiles!user_id(id,username,display_name,avatar_url)';
  const[po,cm,us]=await Promise.all([
    ids('post').length?FX_DB.from('posts').select(sel).in('id',ids('post')):{data:[]},
    ids('comment').length?FX_DB.from('comments').select(sel).in('id',ids('comment')):{data:[]},
    ids('user').length?FX_DB.from('profiles').select('id,username,display_name,avatar_url,bio,role,novas,created_at').in('id',ids('user')):{data:[]}]);
  const M={post:Object.fromEntries((po.data||[]).map(x=>[x.id,x])),comment:Object.fromEntries((cm.data||[]).map(x=>[x.id,x])),user:Object.fromEntries((us.data||[]).map(x=>[x.id,x]))};
  (us.data||[]).forEach(u=>AD.users[u.id]=u);
  return L.map(g=>{
    const o=M[g.t][g.id],why=g.items.filter(x=>x.reason).slice(0,3).map(x=>`<div class="mu">“${esc(x.reason)}”</div>`).join('')||'<div class="mu">No reason given</div>';
    let content,acts;
    if(!o){content='<p class="mu" style="margin:10px 0">This was already removed.</p>';acts=adBtn('dismiss',g.t+'|'+g.id,'Clear report')}
    else if(g.t==='user'){content=`<div style="margin:10px 0">${adWho(o)}${o.bio?`<p class="mu" style="margin-top:6px;overflow-wrap:anywhere">${esc(o.bio)}</p>`:''}</div>`;acts=adBtn('dismiss',g.t+'|'+g.id,'Keep')+adBtn('user',g.id,'Manage user','')}
    else{AD.txt[g.id]=o.body;content=`<div style="margin:10px 0">${adWho(o.profiles)}<p style="margin-top:6px;overflow-wrap:anywhere;white-space:pre-wrap" class="ad-quote">${esc(o.body)}</p></div>`;
      acts=adBtn('dismiss',g.t+'|'+g.id,'Keep')+adBtn('edit'+g.t,g.id,'Edit')+adBtn('rdel',g.t+'|'+g.id,'Delete '+g.t,'danger')}
    return`<div class="glass card ad-rep"><div class="row sp"><span class="chip glass">${esc(g.t)}</span><span class="mu">${g.items.length>1?g.items.length+' reports · ':''}${ago(g.items[0].created_at)}</span></div>${content}<div class="ad-why">${why}</div><div class="ad-act">${acts}</div></div>`}).join('');
}

/* ---- Posts: browse/search all posts, edit, delete, open their comments ---- */
async function adPosts(){
  let q=FX_DB.from('posts').select('id,body,sport,created_at,user_id,profiles!user_id(id,username,display_name,avatar_url),comments(count)').order('created_at',{ascending:false}).limit(40);
  const s=adClean(AD.q.posts);if(s)q=q.ilike('body','%'+s+'%');
  const r=await q;if(r.error)throw r.error;
  if(!r.data.length)return'<div class="glass card"><p class="mu">No posts found.</p></div>';
  return r.data.map(p=>{AD.txt[p.id]=p.body;const n=(p.comments&&p.comments[0]&&p.comments[0].count)||0;
    return`<div class="glass card"><div class="row sp">${adWho(p.profiles)}<span class="mu">${ago(p.created_at)}</span></div><p style="margin:8px 0;overflow-wrap:anywhere;white-space:pre-wrap">${esc(p.body)}</p><div class="ad-act">${adBtn('editpost',p.id,'Edit')}${adBtn('comments',p.id,'Comments · '+n)}${adBtn('pdel',p.id,'Delete','danger')}</div><div id="adc-${esc(p.id)}"></div></div>`}).join('');
}
async function adComments(pid){
  const box=document.getElementById('adc-'+pid);if(!box)return;
  if(box.dataset.open){box.innerHTML='';delete box.dataset.open;return}
  box.dataset.open='1';box.innerHTML='<div class="sk"></div>';
  const r=await FX_DB.from('comments').select('id,body,created_at,profiles!user_id(id,username,display_name,avatar_url)').eq('post_id',pid).order('created_at',{ascending:true}).limit(100);
  if(r.error){box.innerHTML='<p class="mu">Could not load comments.</p>';return}
  box.innerHTML=`<div style="margin-top:10px;border-top:1px solid var(--bd);padding-top:6px">${r.data.map(c=>{AD.txt[c.id]=c.body;return`<div class="pk" style="align-items:flex-start"><div style="min-width:0;flex:1">${adWho(c.profiles)}<div style="margin-top:4px;overflow-wrap:anywhere;white-space:pre-wrap">${esc(c.body)}</div></div><div class="ad-act" style="flex-direction:column">${adBtn('editcomment',c.id,'Edit')}${adBtn('cdel',c.id,'Delete','danger',`data-p="${esc(pid)}"`)}</div></div>`}).join('')||'<p class="mu">No comments.</p>'}</div>`;
}

/* ---- Users ---- */
async function adUsers(){
  let q=FX_DB.from('profiles').select('id,username,display_name,avatar_url,banner_url,bio,role,novas,created_at,flair').order('created_at',{ascending:false}).limit(40);
  const s=adClean(AD.q.users);if(s)q=q.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`);
  const r=await q;if(r.error)throw r.error;
  r.data.forEach(u=>AD.users[u.id]=u);
  if(!r.data.length)return'<div class="glass card"><p class="mu">No users found.</p></div>';
  return`<div class="glass card">${r.data.map(u=>`<div class="pk"><div style="min-width:0">${adWho(u)}<div class="mu" style="margin-top:2px">${(u.novas||0).toLocaleString()} SP · joined ${ago(u.created_at)}${u.role==='admin'?' · <span class="badge-ad">Admin</span>':''}${u.flair==='og'?' · '+flr(u):''}</div></div>${adBtn('user',u.id,'Manage')}</div>`).join('')}</div>`;
}
function adUserModal(id){
  const u=AD.users[id];if(!u)return;
  const m=modal(`<h3>${esc(u.display_name||u.username)}</h3><div class="mu" style="margin-bottom:10px">@${esc(u.username)} · ${(u.novas||0).toLocaleString()} SP</div>
<label>Username</label><input id="au-un" maxlength="20" value="${esc(u.username)}" autocapitalize="off">
<label style="margin-top:8px;display:block">Display name</label><input id="au-dn" maxlength="40" value="${esc(u.display_name||'')}">
<label style="margin-top:8px;display:block">Bio</label><textarea id="au-bio" rows="3" maxlength="280">${esc(u.bio||'')}</textarea>
<div class="row" style="margin:10px 0;flex-wrap:wrap"><label class="row" style="gap:6px;text-transform:none"><input type="checkbox" id="au-ca" style="width:auto"> Remove avatar</label><label class="row" style="gap:6px;text-transform:none"><input type="checkbox" id="au-cb" style="width:auto"> Remove banner</label></div>
<button class="pri" id="au-save">Save profile</button>
<div style="border-top:1px solid var(--bd);margin:14px 0 10px;padding-top:12px"><b>Adjust SP</b><div class="row" style="margin-top:8px;gap:8px"><input id="au-sp" type="number" inputmode="numeric" placeholder="+100 or -50" style="flex:1;min-width:0;font-size:16px"><button class="chip" id="au-go">Apply</button></div><input id="au-why" maxlength="60" placeholder="Reason (optional)" style="margin-top:8px;font-size:16px"></div>
<div style="border-top:1px solid var(--bd);margin:14px 0 10px;padding-top:12px"><b>OG badge</b><div class="mu" style="margin:4px 0 8px">A gold crown badge next to their name. They can equip or remove it in the SP Shop.</div><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${flr({flair:'og'})}<button class="chip" id="au-og">Give OG</button><button class="chip" id="au-ogx">Remove OG</button></div></div>
<div style="border-top:1px solid var(--bd);margin:14px 0 10px;padding-top:12px"><b>Reset stats</b><div class="mu" style="margin:4px 0 8px">Puts this account back to brand new: 0 SP, level 1, no leaderboard stats, no streaks, no picks, no slot stats, no badges, and the daily SP resets. Their profile, posts and follows stay.</div><label class="row" style="gap:6px;text-transform:none;margin-bottom:8px"><input type="checkbox" id="au-rs-shop" style="width:auto"> Also remove shop items (flair, OG badge, borders, themes)</label><button class="chip danger" id="au-reset">Reset stats</button></div>
<div class="ad-act" style="border-top:1px solid var(--bd);padding-top:12px">${u.id===ME.id?'':`<button class="chip" id="au-role">${u.role==='admin'?'Remove admin':'Make admin'}</button><button class="chip danger" id="au-del">Delete account</button>`}</div>`);
  const done=msg=>{m.remove();toast(msg);if(S.tab==='admin')loadAdmin()};
  m.querySelector('#au-save').onclick=async()=>{const r=await FX_DB.rpc('admin_update_profile',{p_user:id,p_username:m.querySelector('#au-un').value,p_display:m.querySelector('#au-dn').value,p_bio:m.querySelector('#au-bio').value,p_clear_avatar:m.querySelector('#au-ca').checked,p_clear_banner:m.querySelector('#au-cb').checked});if(r.error)return adFail(r.error);done('Profile saved')};
  m.querySelector('#au-go').onclick=async()=>{const d=parseInt(m.querySelector('#au-sp').value,10);if(!d)return toast('Enter an amount like 100 or -50');const r=await FX_DB.rpc('admin_adjust_sp',{p_user:id,p_delta:d,p_reason:m.querySelector('#au-why').value});if(r.error)return adFail(r.error);done('SP updated. They now have '+Number(r.data).toLocaleString())};
  m.querySelector('#au-og').onclick=async()=>{const r=await FX_DB.rpc('admin_set_og',{p_user:id,p_on:true});if(r.error)return adFail(r.error);done('OG badge given to @'+u.username)};
  m.querySelector('#au-ogx').onclick=async()=>{const r=await FX_DB.rpc('admin_set_og',{p_user:id,p_on:false});if(r.error)return adFail(r.error);done('OG badge removed from @'+u.username)};
  m.querySelector('#au-reset').onclick=async()=>{const sh=m.querySelector('#au-rs-shop').checked;if(!confirm('Reset ALL stats for @'+u.username+'? SP, level, leaderboard, picks, slot stats, badges and daily SP go back to 0'+(sh?', and their shop items are removed':'')+'. This cannot be undone.'))return;const r=await FX_DB.rpc('admin_reset_user',{p_user:id,p_shop:sh});if(r.error)return adFail(r.error);done('@'+u.username+' was reset to base');if(id===ME.id)setTimeout(()=>location.reload(),700)};
  const ro=m.querySelector('#au-role');if(ro)ro.onclick=async()=>{const r=await FX_DB.rpc('admin_set_role',{p_user:id,p_role:u.role==='admin'?'user':'admin'});if(r.error)return adFail(r.error);done(u.role==='admin'?'Admin removed':'Admin added')};
  const de=m.querySelector('#au-del');if(de)de.onclick=async()=>{if(!confirm('Delete @'+u.username+' and everything they posted? This cannot be undone.'))return;const r=await FX_DB.rpc('admin_delete_user',{p_user:id});if(r.error)return adFail(r.error);done('Account deleted')};
}

/* ---- Props ---- */
async function adProps(){
  let q=FX_DB.from('props').select('id,sport,matchup,subject,stat_label,line,starts_at,status').eq('status','open').order('starts_at',{ascending:true}).limit(50);
  const s=adClean(AD.q.props);if(s)q=q.or(`subject.ilike.%${s}%,matchup.ilike.%${s}%`);
  const r=await q;if(r.error)throw r.error;
  r.data.forEach(p=>AD.props[p.id]=p);
  if(!r.data.length)return'<div class="glass card"><p class="mu">No open props.</p></div>';
  return`<div class="glass card">${r.data.map(p=>`<div class="pk"><div style="min-width:0"><b>${esc(p.subject)}</b> <span class="mu">${esc(p.stat_label)}</span><div class="mu">Line ${esc(p.line)} · ${esc(p.matchup||p.sport)} · ${new Date(p.starts_at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div></div><div class="ad-act">${adBtn('propline',p.id,'Edit line')}${adBtn('propvoid',p.id,'Cancel','danger')}</div></div>`).join('')}</div>`;
}

/* ---- Shop ---- */
async function adShopList(){
  const r=await FX_DB.from('shop_items').select('*').order('sort',{ascending:true});if(r.error)throw r.error;
  r.data.forEach(i=>AD.shop[i.id]=i);
  return`<div class="glass card">${r.data.map(i=>`<div class="pk" style="${i.active?'':'opacity:.55'}"><div style="min-width:0"><b>${esc(i.name)}</b> <span class="mu">${esc(i.kind)}${i.active?'':' · hidden'}</span><div class="mu">${Number(i.price).toLocaleString()} SP</div></div>${adBtn('shop',i.id,'Edit')}</div>`).join('')||'<p class="mu">No items.</p>'}</div>`;
}

/* ---- text edit modal for posts/comments (works from the admin page AND the live feed) ---- */
function adEditText(kind,id,pid){
  let cur=AD.txt[id];
  if(cur==null){if(kind==='post'){const p=typeof findPost==='function'?findPost(id):null;cur=p&&p.body}else{const L=(S.cm&&S.cm[pid])||[];const c=L.find(x=>x.id===id);cur=c&&c.body}}
  const max=kind==='post'?1000:500,m=modal(`<h3>Edit ${kind}</h3><textarea id="ae-t" rows="5" maxlength="${max}">${esc(cur||'')}</textarea><button class="pri" id="ae-s" style="margin-top:10px">Save</button>`);
  m.querySelector('#ae-s').onclick=async()=>{const v=m.querySelector('#ae-t').value.trim();if(!v)return toast('Can\'t be empty');const r=await FX_DB.rpc(kind==='post'?'admin_edit_post':'admin_edit_comment',{p_id:id,p_body:v});if(r.error)return adFail(r.error);
    AD.txt[id]=v;
    if(kind==='post'){[...(S.feed||[]),...((S.up&&S.up.posts)||[])].filter(x=>x.id===id).forEach(x=>x.body=v);try{redraw()}catch(e){}}
    else if(pid&&S.cm&&S.cm[pid]){S.cm[pid].filter(x=>x.id===id).forEach(x=>x.body=v);try{paintThread(pid)}catch(e){}}
    m.remove();toast('Saved');if(S.tab==='admin')adList(AD.tab)};
}

/* ---- one click handler for every admin button ---- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-ad]');if(!b||!isAdmin())return;
  const a=b.dataset.ad,id=b.dataset.id;
  try{
  if(a==='tab')return adShow(id);
  if(a==='user')return adUserModal(id);
  if(a==='editpost')return adEditText('post',id);
  if(a==='editcomment')return adEditText('comment',id);
  if(a==='editcm')return adEditText('comment',id,b.dataset.p);
  if(a==='comments')return adComments(id);
  if(a==='dismiss'||a==='rdel'){
    const[t,tid]=id.split('|');
    if(a==='rdel'&&!confirm('Delete this '+t+'? This cannot be undone.'))return;
    const r=await FX_DB.rpc('admin_resolve_report',{p_type:t,p_target:tid,p_delete:a==='rdel'});if(r.error)return adFail(r.error);
    toast(a==='rdel'?'Deleted and report cleared':'Report cleared');adStats();return adList('reports')}
  if(a==='pdel'){if(!confirm('Delete this post and its comments?'))return;const r=await FX_DB.from('posts').delete().eq('id',id).select('id');if(r.error)return adFail(r.error);toast('Post deleted');adStats();return adList('posts')}
  if(a==='cdel'){if(!confirm('Delete this comment?'))return;const r=await FX_DB.from('comments').delete().eq('id',id).select('id');if(r.error)return adFail(r.error);toast('Comment deleted');const p=b.dataset.p,box=document.getElementById('adc-'+p);if(box){delete box.dataset.open;adComments(p)}return}
  if(a==='propline'){const p=AD.props[id];if(!p)return;const m=modal(`<h3>Edit line</h3><div class="mu" style="margin-bottom:8px">${esc(p.subject)} · ${esc(p.stat_label)}</div><input id="ap-l" type="number" step="0.5" inputmode="decimal" value="${esc(p.line)}" style="font-size:16px"><button class="pri" id="ap-s" style="margin-top:10px">Save</button>`);
    m.querySelector('#ap-s').onclick=async()=>{const v=parseFloat(m.querySelector('#ap-l').value);if(isNaN(v))return toast('Enter a number');const r=await FX_DB.rpc('admin_set_prop_line',{p_id:id,p_line:v});if(r.error)return adFail(r.error);m.remove();toast('Line updated');adList('props')};return}
  if(a==='propvoid'){if(!confirm('Cancel this prop? Everyone who picked it gets their stake back.'))return;const r=await FX_DB.rpc('admin_void_prop',{p_id:id});if(r.error)return adFail(r.error);toast('Prop cancelled, stakes refunded');return adList('props')}
  if(a==='shop'){const i=AD.shop[id];if(!i)return;const m=modal(`<h3>Edit item</h3><label>Name</label><input id="as-n" maxlength="40" value="${esc(i.name)}"><label style="margin-top:8px;display:block">Price (SP)</label><input id="as-p" type="number" min="0" inputmode="numeric" value="${esc(i.price)}" style="font-size:16px"><label class="row" style="gap:6px;margin:10px 0;text-transform:none"><input type="checkbox" id="as-a" style="width:auto" ${i.active?'checked':''}> Visible in shop</label><button class="pri" id="as-s">Save</button>`);
    m.querySelector('#as-s').onclick=async()=>{const r=await FX_DB.rpc('admin_update_shop_item',{p_id:id,p_name:m.querySelector('#as-n').value,p_price:parseInt(m.querySelector('#as-p').value,10)||0,p_active:m.querySelector('#as-a').checked});if(r.error)return adFail(r.error);m.remove();toast('Item saved');adList('shop')};return}
  }catch(err){adFail(err)}
});
document.addEventListener('input',e=>{const i=e.target.closest('[data-ads]');if(!i||!isAdmin())return;const t=i.dataset.ads;AD.q[t]=i.value;clearTimeout(AD.tm);AD.tm=setTimeout(()=>adList(t),300)});
