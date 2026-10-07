/* Slots + Sidelyne pinball bonus. The spin result comes from the server (supabase/slots.sql); this file only plays the animation. */
(()=>{
const SYM=['nfl','nba','mlb','nhl','ufc','soccer'],H=56,BETS=[25,50,100,250],NR=5;
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
const LNAME=['Middle row','Top row','Bottom row','V shape','Peak','Step down','Step up','Arch','Bowl'];
const PAY={nfl:[34,110,500],nba:[22,70,300],mlb:[18,50,200],nhl:[14,40,140],ufc:[10,28,100],soccer:[8,22,70]};
const SPN={nfl:'NFL',nba:'NBA',mlb:'MLB',nhl:'NHL',ufc:'UFC',soccer:'Soccer'};
const sym=(k,z=36)=>k==='S'?`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--ab)"/><path d="M22 10.5h-9.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 1 0 7H10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`:ic(k,z);
const cell=k=>`<div class="sl-c" data-k="${k}">${sym(k)}</div>`;
const rnd=()=>SYM[Math.floor(Math.random()*SYM.length)];
const calm=()=>document.documentElement.classList.contains('rm');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let bet=25,busy=false;
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

/* Sidelyne bonus: a ball drops through pegs and bumpers and always lands in the 1,000 SP slot */
function pinball(host){return new Promise(done=>{
 const box=document.createElement('div');box.className='sl-pin';box.innerHTML='<div class="sl-pin-t">SIDELYNE BONUS</div><canvas width="300" height="380" aria-label="Pinball bonus"></canvas><div class="sl-pin-r"></div>';host.append(box);
 const cv=box.querySelector('canvas'),x=cv.getContext('2d'),out=box.querySelector('.sl-pin-r'),W=300,HT=380;
 const cs=getComputedStyle(document.documentElement),ab=cs.getPropertyValue('--ab').trim()||'#17934f',mu=cs.getPropertyValue('--mu').trim()||'#888';
 const pegs=[];for(let r=0;r<7;r++)for(let i=0;i<(r%2?5:6);i++)pegs.push({x:(r%2?55:25)+i*50,y:80+r*34,r:4,k:0});
 const bump=[{x:80,y:130,r:15,l:0},{x:220,y:130,r:15,l:0},{x:150,y:210,r:15,l:0}];
 const ball={x:150+(Math.random()*40-20),y:10,vx:Math.random()*2-1,vy:0,r:7};
 let last=performance.now(),frames=0,landed=false,pts=0;
 const finish=async()=>{if(landed)return;landed=true;draw();const t0=performance.now();await new Promise(r=>{const tick=t=>{const p=Math.min(1,(t-t0)/900);out.textContent='+'+Math.round(1000*p).toLocaleString()+' SP';p<1?requestAnimationFrame(tick):r()};requestAnimationFrame(tick)});try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}await wait(1100);box.remove();done()};
 const hitC=(c,rest,kick)=>{const dx=ball.x-c.x,dy=ball.y-c.y,d=Math.hypot(dx,dy),m=ball.r+c.r;if(d>=m||d===0)return false;const nx=dx/d,ny=dy/d;ball.x=c.x+nx*m;ball.y=c.y+ny*m;const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx=(ball.vx-(1+rest)*dot*nx)+(Math.random()-.5)*.6;ball.vy=(ball.vy-(1+rest)*dot*ny)}if(kick){ball.vx+=nx*kick;ball.vy+=ny*kick}return true};
 const step=()=>{frames++;const ghost=frames>420;ball.vy+=.2;ball.vx*=.999;ball.x+=ball.vx;ball.y+=ball.vy;
  if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx)*.7}if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx)*.7}
  if(!ghost){pegs.forEach(p=>{if(hitC(p,.55,0))p.k=8});bump.forEach(b=>{if(hitC(b,.9,3.2)){b.l=14;pts++;try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}}})}
  if(ball.y>HT-70||ghost)ball.vx+=(150-ball.x)*(ghost?.02:.006);
  if(ball.vy>9)ball.vy=9;if(ball.y>=HT-16){ball.y=HT-16;finish()}};
 const draw=()=>{x.clearRect(0,0,W,HT);
  pegs.forEach(p=>{x.beginPath();x.arc(p.x,p.y,p.r+(p.k>0?2:0),0,7);x.fillStyle=p.k>0?'#f5c542':mu;x.fill();if(p.k>0)p.k--});
  bump.forEach(b=>{x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fillStyle=b.l>0?'#f5c542':ab;x.shadowColor=b.l>0?'#f5c542':'transparent';x.shadowBlur=b.l>0?18:0;x.fill();x.shadowBlur=0;x.fillStyle='#fff';x.font='800 11px sans-serif';x.textAlign='center';x.fillText('S',b.x,b.y+4);if(b.l>0)b.l--});
  x.fillStyle=ab;x.globalAlpha=landed?1:.85;x.fillRect(100,HT-12,100,12);x.globalAlpha=1;x.fillStyle='#fff';x.font='800 10px sans-serif';x.textAlign='center';x.fillText('1,000 SP',150,HT-3);
  x.beginPath();x.arc(ball.x,ball.y,ball.r,0,7);x.fillStyle='#f5c542';x.shadowColor='#f5c542';x.shadowBlur=14;x.fill();x.shadowBlur=0};
 const loop=t=>{if(landed)return;if(!cv.isConnected){landed=true;done();return}const n=Math.min(3,Math.max(1,Math.round((t-last)/16.67)));last=t;for(let i=0;i<n&&!landed;i++)step();draw();if(!landed)requestAnimationFrame(loop)};
 if(calm()){ball.y=HT;finish()}else requestAnimationFrame(loop)})}

function openSlots(){
 if(!ME)return;
 const start=Array.from({length:NR},()=>[rnd(),rnd(),rnd()]);
 const m=modal(`<div class="sl-wrap"><h3>Slots</h3><div class="sl-bal mu">Balance <b id="slb"></b> SP</div><div class="sl-reels" id="slr">${start.map(c=>`<div class="sl-reel"><div class="sl-strip">${col3(c)}</div></div>`).join('')}</div><div class="sl-msg" id="slm">9 paylines · 3+ Sidelynes anywhere = 1,000 SP bonus!</div><div class="sl-bets"><div class="seg" id="slbet"></div></div><button class="pri sl-go" id="slgo"></button><button class="chip sl-info" id="slinfo">Paytable &amp; paylines</button><div class="sl-pt" id="slpt" hidden><div class="sl-pth">Line pays (x line stake, 3 / 4 / 5 in a row from the left)</div>${Object.keys(PAY).map(k=>`<div class="sl-ptr"><span>${sym(k,22)} ${SPN[k]}</span><b>${PAY[k].join(' / ')}</b></div>`).join('')}<div class="sl-ptr"><span>${sym('S',22)} Sidelyne ×3+ anywhere</span><b>1,000 SP</b></div><div class="sl-pth" style="margin-top:12px">Paylines · your bet is split over all 9</div><div class="sl-lines">${LINES.map((l,i)=>`<div>${mini(l)}<small>${LNAME[i]}</small></div>`).join('')}</div></div></div>`);
 const $m=s=>m.querySelector(s),bal=v=>{$m('#slb').textContent=Number(v).toLocaleString()};
 const draw=()=>{if(!BETS.includes(bet)||bet>S.novas&&S.novas>=25)bet=[...BETS].reverse().find(b=>b<=S.novas)||25;
  $m('#slbet').innerHTML=BETS.map(b=>`<button data-slbet="${b}" class="${b===bet?'on':''}" ${b>S.novas||busy?'disabled':''}>${b}</button>`).join('');
  const g=$m('#slgo');g.disabled=busy||S.novas<bet;g.textContent=busy?'Spinning…':S.novas<bet?'Not enough SP':'Spin · '+bet+' SP';bal(S.novas)};
 draw();
 m.addEventListener('click',e=>{const b=e.target.closest('[data-slbet]');if(b&&!busy){bet=+b.dataset.slbet;draw();return}if(e.target.closest('#slinfo')){const p=$m('#slpt');p.hidden=!p.hidden;return}if(e.target.closest('#slgo'))spin()});
 const clearHi=()=>m.querySelectorAll('.sl-c.hit,.sl-c.dim').forEach(c=>c.classList.remove('hit','dim'));
 const hilite=(wins,reels)=>{const rs=[...reels.children];const keep=new Set();wins.forEach(w=>{for(let c=0;c<w.count;c++)keep.add(c+','+LINES[w.line][c])});
  rs.forEach((r,c)=>[...r.firstElementChild.children].forEach((el,row)=>el.classList.add(keep.has(c+','+row)?'hit':'dim')))};
 async function spin(){if(busy||S.novas<bet)return;busy=true;const stake=bet,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();bal(S.novas-stake);
  let r;try{const q=await FX_DB.rpc('slots_spin',{p_bet:stake});if(q.error)throw q.error;r=q.data;if(!Array.isArray(r.reels)||r.reels.length!==NR)throw new Error('Slots changed: run the new supabase/slots.sql')}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?'Slots not set up yet (run supabase/slots.sql)':t;toast(msg.textContent);bal(S.novas);draw();return}
  const rs=[...reels.children];await Promise.all(rs.map((el,i)=>runReel(el,r.reels[i],900+i*300)));
  if(!m.isConnected){applyNovas(r.novas,null);busy=false;return}
  const wins=r.wins||[],lineTotal=wins.reduce((a,w)=>a+w.pay,0);
  if(wins.length)hilite(wins,reels);
  if(r.kind==='bonus'){reels.classList.add('bonus');msg.textContent='SIDELYNE!';await wait(calm()?300:1500);reels.classList.remove('bonus');await pinball($m('.sl-wrap'))}
  else if(r.payout>0){reels.classList.add('win');const best=wins.slice().sort((a,b)=>b.pay-a.pay)[0];msg.innerHTML=(wins.length>1?wins.length+' lines! ':'')+'+'+r.payout.toLocaleString()+' SP<small class="sl-sub">'+(best?LNAME[best.line]+' · '+best.count+'× '+SPN[best.sym]:'')+'</small>';try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
  else msg.textContent=r.scatters===2?'So close! Two Sidelynes…':'No luck. Spin again!';
  if(r.kind==='bonus'&&m.isConnected)msg.innerHTML='+1,000 SP bonus!'+(lineTotal?'<small class="sl-sub">+ '+lineTotal.toLocaleString()+' SP from lines</small>':'');
  applyNovas(r.novas,r.payout>stake?'Slots win':null);busy=false;if(m.isConnected)draw()}}
document.addEventListener('click',e=>{if(e.target.closest('[data-slots]'))openSlots()});
window.openSlots=openSlots;
})();
