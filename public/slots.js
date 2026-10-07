/* Slots + Sidelyne FREE SPINS bonus. Every spin (and every free spin) is decided by the server (supabase/slots.sql); this file only plays the animation. */
(()=>{
const SYM=['nfl','nba','mlb','nhl','ufc','soccer'],H=56,BETS=[25,50,100,250,500],NR=5,FSN=6;
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
const LNAME=['Middle row','Top row','Bottom row','V shape','Peak','Step down','Step up','Arch','Bowl'];
const PAY={nfl:[34,110,500],nba:[22,70,300],mlb:[18,50,200],nhl:[14,40,140],ufc:[10,28,100],soccer:[8,22,70]};
const SPN={nfl:'NFL',nba:'NBA',mlb:'MLB',nhl:'NHL',ufc:'UFC',soccer:'Soccer'};
const sym=(k,z=36)=>k==='S'?`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--ab)"/><path d="M22 10.5h-9.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 1 0 7H10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`:ic(k,z);
const cell=k=>`<div class="sl-c" data-k="${k}">${sym(k)}</div>`;
const rnd=()=>SYM[Math.floor(Math.random()*SYM.length)];
const calm=()=>document.documentElement.classList.contains('rm');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let bet=25,busy=false,wsv=0,cl=[.05,.5],declined=false;
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

function openSlots(){
 if(!ME)return;
 const start=Array.from({length:NR},()=>[rnd(),rnd(),rnd()]);
 const m=modal(`<div class="sl-wrap"><h3>Slots</h3><div class="sl-bal mu">Balance <b id="slb"></b> SP</div><div class="sl-fs" id="slfs" hidden></div><div class="sl-rw"><div class="sl-svp" id="slsv" hidden></div><div class="sl-reels" id="slr">${start.map(c=>`<div class="sl-reel"><div class="sl-strip">${col3(c)}</div></div>`).join('')}</div></div><div class="sl-msg" id="slm">9 paylines · 3 Sidelynes = 6 FREE SPINS!</div><div class="sl-bets"><div class="seg" id="slbet"></div></div><button class="pri sl-go" id="slgo"></button><button class="chip sl-svre" id="slsvre" data-svre hidden>Out of SP? Try a wager saver</button><button class="chip sl-info" id="slinfo">Paytable &amp; paylines</button><div class="sl-pt" id="slpt" hidden><div class="sl-pth">Line pays (x line stake, 3 / 4 / 5 in a row from the left)</div>${Object.keys(PAY).map(k=>`<div class="sl-ptr"><span>${sym(k,22)} ${SPN[k]}</span><b>${PAY[k].join(' / ')}</b></div>`).join('')}<div class="sl-ptr"><span>${sym('S',22)} Sidelyne ×3 anywhere</span><b>6 free spins</b></div><div class="sl-pth" style="margin-top:12px">Free spins bonus</div><div class="sl-note">3 Sidelynes anywhere = 6 free spins at your bet, and they cost nothing. Every line win in free spins pays ×2. Land 3 more Sidelynes during the bonus for +6 free spins (up to 36). Bigger bet = bigger win: every prize is a multiple of your bet.</div><div class="sl-pth" style="margin-top:12px">Paylines · your bet is split over all 9</div><div class="sl-lines">${LINES.map((l,i)=>`<div>${mini(l)}<small>${LNAME[i]}</small></div>`).join('')}</div></div></div>`);
 const $m=s=>m.querySelector(s),bal=v=>{$m('#slb').textContent=Number(v).toLocaleString()};
 const draw=()=>{if(!BETS.includes(bet)||bet>S.novas&&S.novas>=25)bet=[...BETS].reverse().find(b=>b<=S.novas)||25;
  $m('#slbet').innerHTML=BETS.map(b=>`<button data-slbet="${b}" class="${b===bet?'on':''}" ${b>S.novas||busy?'disabled':''}>${b}</button>`).join('');
  const g=$m('#slgo');if(wsv>0){g.disabled=busy;g.textContent=busy?'Spinning…':'Free spin · wager saver'+(wsv>1?' ×'+wsv:'')}else{g.disabled=busy||S.novas<bet;g.textContent=busy?'Spinning…':S.novas<bet?'Not enough SP':'Spin · '+bet+' SP'}bal(S.novas);saverUI()};
 /* wager saver: out of SP (1 to 24) = stake your last SP for a chance at 1 free spin. The server decides (supabase/wager_saver.sql) */
 function saverUI(){const p=$m('#slsv'),n=S.novas,low=n>=1&&n<BETS[0]&&!busy&&wsv===0;$m('#slsvre').hidden=!(low&&declined);
  if(!low||declined){p.hidden=true;return}
  const w=Math.round((cl[0]+(cl[1]-cl[0])*(n-1)/(BETS[0]-2))*100);p.hidden=false;
  p.innerHTML=`<div class="sl-svc"><div class="sl-svh">Out of SP? <span>Try a wager saver</span></div><div class="sl-svo"><span class="w" style="flex:${w}">Win ${w}%</span><span class="l" style="flex:${100-w}">Lose ${100-w}%</span></div><p>Your ${n} SP is gone either way. <b>Win:</b> 1 free spin. <b>Lose:</b> nothing. More SP = better odds.</p><div class="sl-svb"><button class="pri" data-svgo>Gamble ${n} SP</button><button class="chip" data-svno>No thanks</button></div></div>`}
 async function gamble(){if(busy)return;busy=true;const n=S.novas,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();let r;
  try{const q=await FX_DB.rpc('slots_saver_gamble');if(q.error)throw q.error;r=q.data}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?'Wager saver not set up yet (run supabase/wager_saver.sql)':t;toast(msg.textContent);draw();return}
  wsv=r.saver_spins||0;applyNovas(r.novas,null);
  if(r.won){reels.classList.add('win');msg.innerHTML='WAGER SAVED!<small class="sl-sub">You won 1 free spin</small>';try{navigator.vibrate&&navigator.vibrate([40,30,40])}catch(e){}}
  else msg.innerHTML='No luck<small class="sl-sub">Your last '+n+' SP is gone</small>';
  busy=false;if(m.isConnected)draw()};
 draw();
 FX_DB.rpc('slots_saver_status').then(q=>{if(q.error||!q.data)return;wsv=q.data.saver_spins||0;if(q.data.chance_max>0)cl=[+q.data.chance_min,+q.data.chance_max];if(m.isConnected)draw()}).catch(()=>{});
 m.addEventListener('click',e=>{const b=e.target.closest('[data-slbet]');if(b&&!busy){bet=+b.dataset.slbet;draw();return}if(e.target.closest('#slinfo')){const p=$m('#slpt');p.hidden=!p.hidden;return}if(e.target.closest('[data-svgo]')){gamble();return}if(e.target.closest('[data-svno]')){declined=true;draw();return}if(e.target.closest('[data-svre]')){declined=false;draw();return}if(e.target.closest('#slgo'))spin(wsv>0)});
 const clearHi=()=>m.querySelectorAll('.sl-c.hit,.sl-c.dim').forEach(c=>c.classList.remove('hit','dim'));
 const hilite=(wins,reels)=>{const rs=[...reels.children];const keep=new Set();wins.forEach(w=>{for(let c=0;c<w.count;c++)keep.add(c+','+LINES[w.line][c])});
  rs.forEach((r,c)=>[...r.firstElementChild.children].forEach((el,row)=>el.classList.add(keep.has(c+','+row)?'hit':'dim')))};
 async function spin(free){if(busy||(!free&&S.novas<bet))return;busy=true;const stake=free?BETS[0]:bet,off=free?0:stake,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();bal(S.novas-off);
  let r;try{const q=await (free?FX_DB.rpc('slots_saver_spin'):FX_DB.rpc('slots_spin',{p_bet:stake}));if(q.error)throw q.error;r=q.data;if(free)wsv=r.saver_spins!=null?r.saver_spins:Math.max(0,wsv-1);if(!Array.isArray(r.reels)||r.reels.length!==NR)throw new Error('Slots changed: run the new supabase/slots.sql')}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?(free?'Wager saver not set up yet (run supabase/wager_saver.sql)':'Slots not set up yet (run supabase/slots.sql)'):t;toast(msg.textContent);bal(S.novas);draw();return}
  const rs=[...reels.children];await Promise.all(rs.map((el,i)=>runReel(el,r.reels[i],900+i*300)));
  if(!m.isConnected){applyNovas(r.novas,null);busy=false;return}
  const wins=r.wins||[];
  if(wins.length)hilite(wins,reels);
  if(r.kind==='bonus'&&r.free){
   reels.classList.add('bonus');msg.innerHTML='SIDELYNE BONUS!<small class="sl-sub">'+r.free.start+' FREE SPINS</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}
   await wait(calm()?400:1700);reels.classList.remove('bonus');
   if(!m.isConnected){applyNovas(r.novas,null);busy=false;return}
   const ok=await freeSpins(r,off);
   if(!ok){applyNovas(r.novas,null);busy=false;return}
   $m('.sl-wrap').classList.remove('fs');$m('#slfs').hidden=true;reels.classList.add('win');
   msg.innerHTML='<span id="slct">+0 SP</span><small class="sl-sub">BONUS TOTAL'+(r.line_pay?' · incl. '+r.line_pay.toLocaleString()+' SP from lines':'')+'</small>';
   await countUp($m('#slct'),r.payout,calm()?0:1400);await wait(calm()?200:700)}
  else if(r.payout>0){reels.classList.add('win');msg.innerHTML=winMsg(wins,r.payout);try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
  else msg.textContent=r.scatters===2?'So close! Two Sidelynes…':'No luck. Spin again!';
  applyNovas(r.novas,r.payout>stake?'Slots win':null);busy=false;if(m.isConnected)draw()}

 /* the bonus: the server already played every free spin, we replay them one after another */
 async function freeSpins(r,stake){
  const wrap=$m('.sl-wrap'),reels=$m('#slr'),msg=$m('#slm'),bar=$m('#slfs');
  let total=r.free.start,run=0;
  const head=n=>{bar.innerHTML='<span>Free spin <b>'+n+'</b> / '+total+'</span><span>Bonus win <b>+'+run.toLocaleString()+'</b> SP</span>'};
  wrap.classList.add('fs');bar.hidden=false;$m('#slgo').textContent='Free spins…';head(1);
  for(const f of r.free.spins){
   if(!m.isConnected)return false;
   clearHi();reels.className='sl-reels';msg.textContent='';head(f.n);
   await Promise.all([...reels.children].map((el,i)=>runReel(el,f.reels[i],650+i*190)));
   if(!m.isConnected)return false;
   if(f.wins.length)hilite(f.wins,reels);
   if(f.retrigger){total=f.total;head(f.n);reels.classList.add('bonus');msg.innerHTML='+'+FSN+' FREE SPINS!<small class="sl-sub">'+total+' in total</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}await wait(calm()?400:1500);reels.classList.remove('bonus');if(!m.isConnected)return false}
   run=f.run;head(f.n);bal(S.novas-stake+(r.line_pay||0)+run);
   if(f.pay>0){reels.classList.add('win');msg.innerHTML=winMsg(f.wins,f.pay);try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}await wait(calm()?250:1150)}
   else await wait(calm()?150:500)}
  return m.isConnected}
 const winMsg=(wins,pay)=>{const best=wins.slice().sort((a,b)=>b.pay-a.pay)[0];return (wins.length>1?wins.length+' lines! ':'')+'+'+pay.toLocaleString()+' SP<small class="sl-sub">'+(best?LNAME[best.line]+' · '+best.count+'× '+SPN[best.sym]:'')+'</small>'};
 const countUp=(el,to,ms)=>new Promise(res=>{const t0=performance.now(),tick=t=>{const p=ms?Math.min(1,(t-t0)/ms):1;el.textContent='+'+Math.round(to*p).toLocaleString()+' SP';p<1&&el.isConnected?requestAnimationFrame(tick):res()};requestAnimationFrame(tick)})}
document.addEventListener('click',e=>{if(e.target.closest('[data-slots]'))openSlots()});
window.openSlots=openSlots;
})();
