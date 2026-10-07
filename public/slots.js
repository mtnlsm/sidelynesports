/* Slots + Sidelyne FREE SPINS bonus. Every spin (and every free spin) is decided by the server (supabase/slots.sql); this file only plays the animation. */
(()=>{
/* Server ids of the 6 symbol tiers, lowest to highest pay. Each theme draws its own icon on every tier (see THEMES). */
const SYM=['soccer','ufc','nhl','mlb','nba','nfl'],H=56,DENOMS=[1,2,5,10,25,100],LNS=[1,3,5,9],CPLS=[1,2,3,5,10],MINBET=1,SAVER_STAKE=25,NR=5;
/* THEMES: s = [emoji,name] for each tier (low to high). bonus.m is for display only; the real multipliers live in supabase/slots.sql (slots_bonus_mults). */
const THEMES={
 nfl:{name:'NFL',a:'#2f9e44',b:'#1b6b2e',root:262,s:[['🧤','Gloves'],['📣','Megaphone'],['🏟️','Stadium'],['🥇','Gold medal'],['🏆','Trophy'],['🏈','Football']],bonus:{name:'TOUCHDOWN DRIVE',unit:'Down',m:[1,1,2,2,3,3],d:'The multiplier climbs down the field. Get to the end zone for ×3.'}},
 nba:{name:'NBA',a:'#f2711c',b:'#c4510a',root:294,s:[['👟','Sneaker'],['⏱️','Shot clock'],['🏟️','Arena'],['🔥','Hot streak'],['🏆','Trophy'],['🏀','Basketball']],bonus:{name:'FAST BREAK',unit:'Possession',m:[1,1,1,1,2,2,2,2],d:'8 quick possessions. The second half of the run pays double.'}},
 nhl:{name:'NHL',a:'#22b8cf',b:'#0b7285',root:330,s:[['🧤','Glove'],['🥅','Net'],['⛸️','Skate'],['🚨','Goal horn'],['🏆','Cup'],['🏒','Hockey stick']],bonus:{name:'POWER PLAY',unit:'Shift',m:[3,3,3,3],d:'Only 4 shifts, but every single win is ×3.'}},
 mlb:{name:'MLB',a:'#2b59c3',b:'#173a8a',root:247,s:[['🧢','Cap'],['🌭','Hot dog'],['🧤','Mitt'],['🏟️','Ballpark'],['🏆','Trophy'],['⚾','Baseball']],bonus:{name:'HOME RUN DERBY',unit:'Swing',m:[1,1,1,1,1,1,1,1,1,1,1,1],d:'12 swings at ×1. Lots of spins, lots of chances to connect.'}},
 ufc:{name:'UFC',a:'#c81d25',b:'#6d0f14',root:220,s:[['🥋','Gi'],['🔔','Bell'],['💪','Flex'],['🏅','Medal'],['🏆','Title belt'],['🥊','Knockout']],bonus:{name:'FIGHT NIGHT',unit:'Round',m:[1,2,2,3,4],d:'5 rounds and the pressure builds. Round 5 is the knockout at ×4.'}},
 soccer:{name:'Soccer',a:'#7b4fd6',b:'#4a2a9a',root:277,s:[['🧤','Keeper gloves'],['🥅','Goal'],['👟','Cleat'],['🟨','Yellow card'],['🏆','Trophy'],['⚽','Ball']],bonus:{name:'PENALTY SHOOTOUT',unit:'Kick',m:[1,1,2,3,5],d:'5 penalty kicks. The last one is sudden death at ×5.'}}};
const TORDER=['nfl','nba','nhl','mlb','ufc','soccer'];
let theme='nfl';try{const t=localStorage.getItem('fx-slt');if(THEMES[t])theme=t}catch(e){}
const TH=()=>THEMES[theme],tn=k=>TH().s[SYM.indexOf(k)]||['?','?'];
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
const LNAME=['Middle row','Top row','Bottom row','V shape','Peak','Step down','Step up','Arch','Bowl'];
const PAY={nfl:[34,110,500],nba:[22,70,300],mlb:[18,50,200],nhl:[14,40,140],ufc:[10,28,100],soccer:[8,22,70]};
const sym=(k,z=36)=>k==='S'?`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--ab)"/><path d="M22 10.5h-9.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 1 0 7H10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`:`<span class="sl-em" style="font-size:${Math.round(z*.85)}px">${tn(k)[0]}</span>`;
const cell=k=>`<div class="sl-c" data-k="${k}">${sym(k)}</div>`;
const rnd=()=>SYM[Math.floor(Math.random()*SYM.length)];
const calm=()=>document.documentElement.classList.contains('rm');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let denom=1,lines=9,cpl=1,busy=false,wsv=0,cl=[.05,.5],declined=false;
let autoOn=false,autoLeft=0,stopBonus=true,stopBig=true,lastAt=0;

/* ---- sounds: all made with the browser's WebAudio, no sound files needed ---- */
let actx=null,muted=false,tickT=null;try{muted=localStorage.getItem('fx-slm')==='1'}catch(e){}
const ac=()=>{if(muted)return null;try{if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx}catch(e){return null}};
function tone(f,t0,d,type,g,f2){const c=ac();if(!c)return;const o=c.createOscillator(),v=c.createGain(),t=c.currentTime+t0;o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);v.gain.setValueAtTime(0.0001,t);v.gain.exponentialRampToValueAtTime(g||.1,t+.012);v.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(v);v.connect(c.destination);o.start(t);o.stop(t+d+.03)}
function whoosh(d,f1,f2,g){const c=ac();if(!c)return;const n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=c.createBufferSource(),f=c.createBiquadFilter(),v=c.createGain(),t=c.currentTime;s.buffer=b;f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+d);v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(0.0001,t+d);s.connect(f);f.connect(v);v.connect(c.destination);s.start(t)}
const SCALE=[0,2,4,7,9,12,14,16,19,21,24];
const note=i=>TH().root*Math.pow(2,SCALE[Math.min(i,SCALE.length-1)]/12);
const sfx={
 spinOn(){if(!ac())return;whoosh(.7,250,1100,.07);clearInterval(tickT);tickT=setInterval(()=>tone(180+Math.random()*50,0,.03,'square',.025),85)},
 spinOff(){clearInterval(tickT);tickT=null},
 stop(i){tone(170+i*14,0,.13,'sine',.16,70);tone(900,0,.02,'square',.03)},
 win(l){const n=[3,5,8,11][l]||3;for(let i=0;i<n;i++)tone(note(i),i*.075,.18,l>1?'square':'triangle',l>1?.05:.09)},
 bonus(){whoosh(.9,200,1800,.1);for(let k=0;k<3;k++){tone(note(0),.15+k*.28,.24,'sawtooth',.06);tone(note(2),.15+k*.28,.24,'sawtooth',.05);tone(note(3),.15+k*.28,.24,'sawtooth',.05)}[7,9,10].forEach((s,i)=>tone(note(s),1+i*.12,.35,'square',.05))},
 coin(){tone(1500+Math.random()*500,0,.05,'sine',.04)},
 bonusWin(){const q=[0,2,3,5,3,5,7,9,7,9,10];q.forEach((s,i)=>tone(note(s),i*.09,.22,'square',.045));[0,2,3].forEach(s=>tone(note(s),q.length*.09,1,'triangle',.08));tone(note(10),q.length*.09,1,'sawtooth',.03)},
 lose(){tone(300,0,.25,'triangle',.07,120)},
 click(){tone(700,0,.04,'square',.03)}};
const lvl=(pay,st)=>!st?1:pay>=50*st?3:pay>=15*st?2:pay>=4*st?1:0;
const total=()=>denom*lines*cpl,dl=d=>String(d);
const col3=a=>a.map(cell).join('');
const mini=l=>`<svg width="60" height="36" viewBox="0 0 60 36" aria-hidden="true">${[0,1,2,3,4].map(c=>[0,1,2].map(r=>`<rect x="${c*12+1}" y="${r*12+1}" width="10" height="10" rx="2" fill="var(--bd)"/>`).join('')).join('')}<polyline fill="none" stroke="var(--ab)" stroke-width="2.4" stroke-linejoin="round" points="${l.map((r,c)=>`${c*12+6},${r*12+6}`).join(' ')}"/></svg>`;

/* each reel shows 3 symbols (top, middle, bottom); the strip scrolls and stops on the 3 final symbols */
function runReel(reel,final,dur){return new Promise(res=>{const st=reel.firstElementChild;
 const fin0=()=>{st.style.transition='none';st.style.transform='none';st.innerHTML=col3(final);reel.classList.remove('go');res()};
 if(calm())return fin0();
 const prev=[...st.children].slice(-3).map(e=>e.dataset.k);while(prev.length<3)prev.push(rnd());
 const n=14+Math.floor(Math.random()*6);let h=col3(prev);for(let i=0;i<n;i++)h+=cell(rnd());h+=col3(final);
 st.style.transition='none';st.style.transform='translateY(0)';st.innerHTML=h;void st.offsetHeight;reel.classList.add('go');
 st.style.transition=`transform ${dur}ms cubic-bezier(.2,.8,.2,1)`;st.style.transform=`translateY(-${(n+3)*H}px)`;
 let done=false;const fin=()=>{if(done)return;done=true;fin0()};st.addEventListener('transitionend',fin,{once:true});setTimeout(fin,dur+150)})}

function slCss(){if(document.getElementById('slx-css'))return;const st=document.createElement('style');st.id='slx-css';
 st.textContent=`.sl-wrap{--sla:#f5c542;--sla2:#e8a317}${TORDER.map(k=>`.sl-wrap[data-th="${k}"]{--sla:${THEMES[k].a};--sla2:${THEMES[k].b}}`).join('')}
.sl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.sl-top h3{margin:0}
.sl-th{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:4px 0 10px}.sl-th .chip{display:inline-flex;align-items:center;gap:4px;padding:6px 10px}.sl-th .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}
.sl-wrap .sl-reels{background:linear-gradient(160deg,color-mix(in srgb,var(--sla) 24%,var(--sf2)),var(--sf2));border-color:color-mix(in srgb,var(--sla) 55%,var(--bd))}
.sl-wrap .sl-fs{background:linear-gradient(90deg,var(--sla),var(--sla2));color:#fff}
.sl-wrap.fs .sl-reels{box-shadow:0 0 0 2px var(--sla),0 0 22px color-mix(in srgb,var(--sla) 55%,transparent),inset 0 2px 10px rgba(0,0,0,.18)}
.sl-wrap .sl-go{background:var(--sla);border-color:var(--sla);color:#fff}.sl-wrap .sl-go:disabled{opacity:.55}
.sl-em{display:block;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.sl-auto{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin-top:10px}.sl-auto .mu{font-size:12px}.sl-auto .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}`;
 document.head.appendChild(st)}

function openSlots(){
 if(!ME)return;slCss();
 const start=Array.from({length:NR},()=>[rnd(),rnd(),rnd()]);
 const m=modal(`<div class="sl-wrap" data-th="${theme}"><div class="sl-top"><h3>Slots</h3><button class="chip" id="slmu" data-slmute></button></div><div class="sl-th" id="slth"></div><div class="sl-bal mu">Balance <b id="slb"></b> SP<span id="slcr"></span></div><div class="sl-fs" id="slfs" hidden></div><div class="sl-rw"><div class="sl-svp" id="slsv" hidden></div><div class="sl-reels" id="slr">${start.map(c=>`<div class="sl-reel"><div class="sl-strip">${col3(c)}</div></div>`).join('')}</div></div><div class="sl-msg" id="slm"></div><div class="sl-bets" style="flex-direction:column;align-items:center;gap:4px"><div class="mu" style="font-size:12px">Denom (SP per credit)</div><div class="seg" id="sld"></div><div class="mu" style="font-size:12px">Lines</div><div class="seg" id="sll"></div><div class="mu" style="font-size:12px">Credits per line</div><div class="seg" id="slc"></div><div class="row sp" style="width:100%;margin-top:4px"><span id="sltot" class="mu"></span><button class="chip" data-slmax>Max bet</button></div></div><button class="pri sl-go" id="slgo"></button><div class="sl-auto" id="slau"></div><button class="chip sl-svre" id="slsvre" data-svre hidden>Out of SP? Try a wager saver</button><button class="chip sl-info" id="slinfo">Paytable &amp; paylines</button><div class="sl-pt" id="slpt" hidden></div></div>`);
 const ptHtml=()=>`<div class="sl-pth">Line pays (x credits bet per line, 3 / 4 / 5 in a row from the left)</div>${Object.keys(PAY).map(k=>`<div class="sl-ptr"><span>${sym(k,22)} ${tn(k)[1]}</span><b>${PAY[k].join(' / ')}</b></div>`).join('')}<div class="sl-ptr"><span>${sym('S',22)} Sidelyne ×3 anywhere</span><b>${TH().name} bonus</b></div><div class="sl-pth" style="margin-top:12px">${TH().name} bonus: ${TH().bonus.name}</div><div class="sl-note">3 Sidelynes anywhere starts the bonus, and it costs nothing. ${TH().bonus.d} Free spin multipliers: ${TH().bonus.m.map(x=>'×'+x).join(' ')}. Land 3 more Sidelynes during the bonus for another full round (up to 4 rounds). Every theme has its own bonus. Total bet = denom × lines × credits per line. Bigger denoms bet more, win more, and pay back a little better.</div><div class="sl-pth" style="margin-top:12px">Paylines · play 1, 3, 5 or 9 (in this order)</div><div class="sl-lines">${LINES.map((l,i)=>`<div>${mini(l)}<small>${LNAME[i]}</small></div>`).join('')}</div>`;
 const $m=s=>m.querySelector(s),bal=v=>{$m('#slb').textContent=Number(v).toLocaleString();$m('#slcr').textContent=' · '+Math.floor(v/denom).toLocaleString()+' credits'};
 const fit=()=>{if(S.novas<MINBET)return;while(total()>S.novas){if(cpl>1)cpl=CPLS[CPLS.indexOf(cpl)-1];else if(lines>1)lines=LNS[LNS.indexOf(lines)-1];else if(denom>1)denom=DENOMS[DENOMS.indexOf(denom)-1];else break}};
 const lk=()=>busy||autoOn;
 const seg=(a,cur,at,lab,ok)=>a.map(v=>`<button data-${at}="${v}" class="${v===cur?'on':''}" ${lk()||!ok(v)?'disabled':''}>${lab(v)}</button>`).join('');
 const defMsg=()=>'<span>'+TH().name+' · 3 Sidelynes = '+TH().bonus.name+'!</span><small class="sl-sub">'+TH().bonus.d+'</small>';
 const uiExtra=()=>{$m('#slth').innerHTML=TORDER.map(k=>`<button class="chip ${k===theme?'on':''}" data-slth="${k}" ${lk()?'disabled':''}>${THEMES[k].s[5][0]} ${THEMES[k].name}</button>`).join('');
  $m('#slmu').textContent=muted?'🔇 Sound off':'🔊 Sound on';
  $m('#slau').innerHTML=autoOn?'':`<span class="mu">Auto spin</span>`+[10,25,50,100].map(n=>`<button class="chip" data-slau="${n}" ${busy||S.novas<total()&&!(wsv>0)?'disabled':''}>${n}</button>`).join('')+`<button class="chip ${stopBonus?'on':''}" data-sltg="bonus" ${busy?'disabled':''}>Stop on bonus</button><button class="chip ${stopBig?'on':''}" data-sltg="big" ${busy?'disabled':''}>Stop on big win</button>`};
 const draw=()=>{fit();
  $m('#sld').innerHTML=seg(DENOMS,denom,'sld',dl,v=>v<=S.novas);
  $m('#sll').innerHTML=seg(LNS,lines,'sll',v=>v,v=>denom*v*cpl<=S.novas);
  $m('#slc').innerHTML=seg(CPLS,cpl,'slc',v=>v,v=>denom*lines*v<=S.novas);
  $m('#sltot').innerHTML='Total bet <b>'+total().toLocaleString()+' SP</b> · '+dl(denom)+' SP × '+lines+' line'+(lines>1?'s':'')+' × '+cpl+' credit'+(cpl>1?'s':'');
  const g=$m('#slgo');if(autoOn){g.disabled=false;g.textContent='Stop auto · '+autoLeft+' left'}else if(wsv>0){g.disabled=busy;g.textContent=busy?'Spinning…':'Free spin · wager saver'+(wsv>1?' ×'+wsv:'')}else{g.disabled=busy||S.novas<total();g.textContent=busy?'Spinning…':S.novas<total()?'Not enough SP':'Spin · '+total().toLocaleString()+' SP'}bal(S.novas);saverUI();uiExtra()};
 /* wager saver: out of SP (1 to 24) = stake your last SP for a chance at 1 free spin. The server decides (supabase/wager_saver.sql) */
 function saverUI(){const p=$m('#slsv'),n=S.novas,low=n>=1&&n<MINBET&&!busy&&wsv===0;$m('#slsvre').hidden=!(low&&declined);
  if(!low||declined){p.hidden=true;return}
  const w=Math.round((cl[0]+(cl[1]-cl[0])*(n-1)/23)*100);p.hidden=false;
  p.innerHTML=`<div class="sl-svc"><div class="sl-svh">Out of SP? <span>Try a wager saver</span></div><div class="sl-svo"><span class="w" style="flex:${w}">Win ${w}%</span><span class="l" style="flex:${100-w}">Lose ${100-w}%</span></div><p>Your ${n} SP is gone either way. <b>Win:</b> 1 free spin. <b>Lose:</b> nothing. More SP = better odds.</p><div class="sl-svb"><button class="pri" data-svgo>Gamble ${n} SP</button><button class="chip" data-svno>No thanks</button></div></div>`}
 async function gamble(){if(busy||autoOn)return;busy=true;const n=S.novas,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();let r;
  try{const q=await FX_DB.rpc('slots_saver_gamble');if(q.error)throw q.error;r=q.data}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?'Wager saver not set up yet (run supabase/wager_saver.sql)':t;toast(msg.textContent);draw();return}
  wsv=r.saver_spins||0;applyNovas(r.novas,null);
  if(r.won){sfx.win(1);reels.classList.add('win');msg.innerHTML='WAGER SAVED!<small class="sl-sub">You won 1 free spin</small>';try{navigator.vibrate&&navigator.vibrate([40,30,40])}catch(e){}}
  else{sfx.lose();msg.innerHTML='No luck<small class="sl-sub">Your last '+n+' SP is gone</small>'}
  busy=false;if(m.isConnected)draw()};
 $m('#slm').innerHTML=defMsg();draw();
 FX_DB.rpc('slots_saver_status').then(q=>{if(q.error||!q.data)return;wsv=q.data.saver_spins||0;if(q.data.chance_max>0)cl=[+q.data.chance_min,+q.data.chance_max];if(m.isConnected)draw()}).catch(()=>{});
 m.addEventListener('click',e=>{const b=e.target.closest('[data-sld],[data-sll],[data-slc],[data-slmax]');if(e.target.closest('[data-slmute]')){muted=!muted;try{localStorage.setItem('fx-slm',muted?'1':'0')}catch(x){}if(!muted)sfx.click();draw();return}
  const tg=e.target.closest('[data-sltg]');if(tg){if(tg.dataset.sltg==='bonus')stopBonus=!stopBonus;else stopBig=!stopBig;draw();return}
  const th=e.target.closest('[data-slth]');if(th&&!busy&&!autoOn){theme=th.dataset.slth;try{localStorage.setItem('fx-slt',theme)}catch(x){}$m('.sl-wrap').dataset.th=theme;m.querySelectorAll('.sl-strip').forEach(st=>{st.innerHTML=[...st.children].map(c=>cell(c.dataset.k)).join('')});$m('#slpt').innerHTML=ptHtml();$m('#slm').innerHTML=defMsg();sfx.click();draw();return}
  const au=e.target.closest('[data-slau]');if(au&&!busy&&!autoOn){autoLeft=+au.dataset.slau;autoOn=true;ac();draw();autoLoop();return}
  if(e.target.closest('#slgo')&&autoOn){autoOn=false;autoLeft=0;draw();return}
  if(b&&!busy&&!autoOn){if(b.dataset.sld)denom=+b.dataset.sld;else if(b.dataset.sll)lines=+b.dataset.sll;else if(b.dataset.slc)cpl=+b.dataset.slc;else{lines=9;cpl=10}draw();return}if(e.target.closest('#slinfo')){const p=$m('#slpt');if(p.hidden)p.innerHTML=ptHtml();p.hidden=!p.hidden;return}if(e.target.closest('[data-svgo]')){gamble();return}if(e.target.closest('[data-svno]')){declined=true;draw();return}if(e.target.closest('[data-svre]')){declined=false;draw();return}if(e.target.closest('#slgo'))spin(wsv>0)});
 const clearHi=()=>m.querySelectorAll('.sl-c.hit,.sl-c.dim').forEach(c=>c.classList.remove('hit','dim'));
 const hilite=(wins,reels)=>{const rs=[...reels.children];const keep=new Set();wins.forEach(w=>{for(let c=0;c<w.count;c++)keep.add(c+','+LINES[w.line][c])});
  rs.forEach((r,c)=>[...r.firstElementChild.children].forEach((el,row)=>el.classList.add(keep.has(c+','+row)?'hit':'dim')))};
 async function spin(free){if(busy||(!free&&S.novas<total()))return null;busy=true;lastAt=Date.now();const stake=free?SAVER_STAKE:total(),off=free?0:stake,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();bal(S.novas-off);
  let r;try{const q=await (free?FX_DB.rpc('slots_saver_spin'):FX_DB.rpc('slots_spin',{p_denom:denom,p_lines:lines,p_cpl:cpl,p_theme:theme}));if(q.error)throw q.error;r=q.data;if(free)wsv=r.saver_spins!=null?r.saver_spins:Math.max(0,wsv-1);if(!Array.isArray(r.reels)||r.reels.length!==NR)throw new Error('Slots changed: run the new supabase/slots.sql')}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?(free?'Wager saver not set up yet (run supabase/wager_saver.sql)':'Slots not set up yet (run supabase/slots.sql)'):t;toast(msg.textContent);bal(S.novas);draw();return{ok:false}}
  const rs=[...reels.children];sfx.spinOn();await Promise.all(rs.map((el,i)=>runReel(el,r.reels[i],900+i*300).then(()=>sfx.stop(i))));sfx.spinOff();
  if(!m.isConnected){applyNovas(r.novas,null);busy=false;return{ok:false}}
  const wins=r.wins||[];
  if(wins.length)hilite(wins,reels);
  if(r.kind==='bonus'&&r.free){
   reels.classList.add('bonus');sfx.bonus();msg.innerHTML=TH().bonus.name+'!<small class="sl-sub">'+r.free.start+' FREE SPINS</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}
   await wait(calm()?400:1700);reels.classList.remove('bonus');
   if(!m.isConnected){applyNovas(r.novas,null);busy=false;return{ok:false}}
   const ok=await freeSpins(r,off);
   if(!ok){applyNovas(r.novas,null);busy=false;return{ok:false}}
   $m('.sl-wrap').classList.remove('fs');$m('#slfs').hidden=true;reels.classList.add('win');
   msg.innerHTML='<span id="slct">+0 SP</span><small class="sl-sub">BONUS TOTAL'+(r.line_pay?' · incl. '+r.line_pay.toLocaleString()+' SP from lines':'')+'</small>';
   sfx.bonusWin();await countUp($m('#slct'),r.payout,calm()?0:1400,true);await wait(calm()?200:700)}
  else if(r.payout>0){reels.classList.add('win');sfx.win(lvl(r.payout,stake));msg.innerHTML=winMsg(wins,r.payout,stake);try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
  else msg.textContent=r.scatters===2?'So close! Two Sidelynes…':'No luck. Spin again!';
  applyNovas(r.novas,r.payout>stake?'Slots win':null);busy=false;if(m.isConnected)draw();
  return{ok:true,payout:r.payout,stake,bonus:r.kind==='bonus'}}

 /* auto spin: keeps spinning with the current bet until the count runs out, you tap Stop, you run low on SP, or a stop rule hits */
 async function autoLoop(){
  while(autoOn&&autoLeft>0&&m.isConnected){
   if(!(wsv>0||S.novas>=total())){toast('Auto spin stopped: not enough SP');break}
   const res=await spin(wsv>0);
   if(!res||!res.ok)break;
   autoLeft--;
   if(res.bonus&&stopBonus)break;
   if(res.payout>=15*res.stake&&stopBig)break;
   if(!autoOn)break;
   if(m.isConnected)draw();
   await wait(Math.max(calm()?300:700,1150-(Date.now()-lastAt)))}
  autoOn=false;autoLeft=0;if(m.isConnected)draw()}

 /* the bonus: the server already played every free spin, we replay them one after another */
 const total0=()=>r0bet;let r0bet=1;
 async function freeSpins(r,stake){r0bet=r.bet||1;
  const wrap=$m('.sl-wrap'),reels=$m('#slr'),msg=$m('#slm'),bar=$m('#slfs');
  let total=r.free.start,run=0;
  const U=TH().bonus.unit,head=(n,x)=>{bar.innerHTML='<span>'+U+' <b>'+n+'</b> / '+total+(x?' · ×'+x:'')+'</span><span>Bonus win <b>+'+run.toLocaleString()+'</b> SP</span>'};
  wrap.classList.add('fs');bar.hidden=false;$m('#slgo').textContent='Free spins…';head(1,r.free.spins[0]&&r.free.spins[0].x);
  for(const f of r.free.spins){
   if(!m.isConnected)return false;
   clearHi();reels.className='sl-reels';msg.textContent='';head(f.n,f.x);
   sfx.spinOn();await Promise.all([...reels.children].map((el,i)=>runReel(el,f.reels[i],650+i*190).then(()=>sfx.stop(i))));sfx.spinOff();
   if(!m.isConnected)return false;
   if(f.wins.length)hilite(f.wins,reels);
   if(f.retrigger){const add=f.total-total;total=f.total;head(f.n,f.x);reels.classList.add('bonus');sfx.bonus();msg.innerHTML='+'+add+' FREE SPINS!<small class="sl-sub">'+total+' in total</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}await wait(calm()?400:1500);reels.classList.remove('bonus');if(!m.isConnected)return false}
   run=f.run;head(f.n,f.x);bal(S.novas-stake+(r.line_pay||0)+run);
   if(f.pay>0){reels.classList.add('win');sfx.win(lvl(f.pay,total0()));msg.innerHTML=winMsg(f.wins,f.pay,stake);try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}await wait(calm()?250:1150)}
   else await wait(calm()?150:500)}
  return m.isConnected}
 const winMsg=(wins,pay,st)=>{const best=wins.slice().sort((a,b)=>b.pay-a.pay)[0],tier=st?(pay>=50*st?'MEGA WIN! ':pay>=15*st?'BIG WIN! ':''):'';return tier+(wins.length>1?wins.length+' lines! ':'')+'+'+pay.toLocaleString()+' SP<small class="sl-sub">'+(best?LNAME[best.line]+' · '+best.count+'× '+tn(best.sym)[0]+' '+tn(best.sym)[1]:'')+'</small>'};
 const countUp=(el,to,ms,snd)=>new Promise(res=>{const t0=performance.now();let lc=0;const tick=t=>{const p=ms?Math.min(1,(t-t0)/ms):1;if(snd&&t-lc>70){lc=t;sfx.coin()}el.textContent='+'+Math.round(to*p).toLocaleString()+' SP';p<1&&el.isConnected?requestAnimationFrame(tick):res()};requestAnimationFrame(tick)})}
document.addEventListener('click',e=>{if(e.target.closest('[data-slots]'))openSlots()});
window.openSlots=openSlots;
})();
