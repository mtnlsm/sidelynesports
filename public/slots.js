/* Slots + Sidelyne FREE SPINS bonus. Every spin (and every free spin) is decided by the server (supabase/slots.sql); this file only plays the animation. */
(()=>{
/* Server ids of the 6 symbol tiers, lowest to highest pay. Each theme draws its own icon on every tier (see THEMES). */
const SYM=['soccer','ufc','nhl','mlb','nba','nfl'],H=56,DENOMS=[1,2,5,10,25,100],LNS=[1,3,5,9],CPLS=[1,2,3,5,10],MINBET=1,SAVER_STAKE=25,NR=5;
/* THEMES: s = [emoji,name] for each tier (low to high). bonus.m is for display only; the real multipliers live in supabase/slots.sql (slots_bonus_mults). */
const THEMES={
 og:{name:'Original',a:'var(--ab)',b:'var(--ab)',root:262,s:[['','Soccer'],['','UFC'],['','NHL'],['','MLB'],['','NBA'],['','NFL']],bonus:{name:'SIDELYNE BONUS',unit:'Free spin',m:[2,2,2,2,2,2],d:'3 Sidelynes = 6 free spins, and every line win pays ×2.'}},
 nfl:{name:'NFL',a:'#2f9e44',b:'#1b6b2e',root:262,s:[['🧤','Gloves'],['📣','Megaphone'],['🏟️','Stadium'],['🥇','Gold medal'],['🏆','Trophy'],['🏈','Football']],bonus:{name:'TOUCHDOWN DRIVE',unit:'Down',m:[1,1,2,2,3,3],d:'The multiplier climbs down the field. Get to the end zone for ×3.'}},
 nba:{name:'NBA',a:'#f2711c',b:'#c4510a',root:294,s:[['👟','Sneaker'],['⏱️','Shot clock'],['🏟️','Arena'],['🔥','Hot streak'],['🏆','Trophy'],['🏀','Basketball']],bonus:{name:'FAST BREAK',unit:'Possession',m:[1,1,1,1,2,2,2,2],d:'8 quick possessions. The second half of the run pays double.'}},
 nhl:{name:'NHL',a:'#22b8cf',b:'#0b7285',root:330,s:[['🧤','Glove'],['🥅','Net'],['⛸️','Skate'],['🚨','Goal horn'],['🏆','Cup'],['🏒','Hockey stick']],bonus:{name:'POWER PLAY',unit:'Shift',m:[3,3,3,3],d:'Only 4 shifts, but every single win is ×3.'}},
 mlb:{name:'MLB',a:'#2b59c3',b:'#173a8a',root:247,s:[['🧢','Cap'],['🌭','Hot dog'],['🧤','Mitt'],['🏟️','Ballpark'],['🏆','Trophy'],['⚾','Baseball']],bonus:{name:'HOME RUN DERBY',unit:'Swing',m:[1,1,1,1,1,1,1,1,1,1,1,10],d:'12 swings at ×1, then the last swing is a ×10 GRAND SLAM. Hang on for the finish.'}},
 ufc:{name:'UFC',a:'#c81d25',b:'#6d0f14',root:220,s:[['🥋','Gi'],['🔔','Bell'],['💪','Flex'],['🏅','Medal'],['🏆','Title belt'],['🥊','Knockout']],bonus:{name:'FIGHT NIGHT',unit:'Round',m:[1,2,2,3,4],d:'5 rounds and the pressure builds. Round 5 is the knockout at ×4.'}},
 cfb:{name:'College FB',a:'#b3203f',b:'#6e1126',root:350,s:[['🎺','Marching band'],['📣','Pep rally'],['🏟️','Stadium'],['🥇','Gold medal'],['🏆','Trophy'],['🏈','Football']],bonus:{name:'PLAYOFF RUN',unit:'Game',m:[1,2,3,6],d:'4 playoff games, and every round pays more. The National Championship is ×6.'}}};
/* BONUS SYMBOL ART: the scatter that triggers the bonus is the Sidelyne "S" on most machines, but NFL shows the Lombardi Trophy and College FB shows the National Championship trophy. Drawn as inline SVG so no image files are needed. */
const LOMBARDI=z=>`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="slLg" x1="0" x2="1"><stop offset="0" stop-color="#8d97a6"/><stop offset=".45" stop-color="#f6f8fb"/><stop offset="1" stop-color="#848e9d"/></linearGradient><linearGradient id="slLy" x1="0" x2="1"><stop offset="0" stop-color="#b98a12"/><stop offset=".5" stop-color="#ffe37a"/><stop offset="1" stop-color="#b98a12"/></linearGradient></defs><path d="M9.5 30.2h13l-1.4-3.6H10.9z" fill="url(#slLg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><rect x="10.6" y="27.2" width="10.8" height="1.7" rx=".6" fill="url(#slLy)"/><path d="M13 26.4l1.1-5.2h3.8l1.1 5.2z" fill="url(#slLg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M11.8 21.4h8.4l-1.2-2.3h-6z" fill="url(#slLg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><ellipse cx="16" cy="10.4" rx="5.7" ry="8.9" transform="rotate(-16 16 10.4)" fill="url(#slLg)" stroke="#59636f" stroke-width=".7"/><path d="M14.5 4.6l3.1 11.6" stroke="#59636f" stroke-width=".8" stroke-linecap="round"/><path d="M13.7 7.2l2.8-.7M14.4 9.6l2.9-.8M15 12l2.9-.8" stroke="#59636f" stroke-width=".7" stroke-linecap="round"/></svg>`;
const CFPT=z=>`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="slCg" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffe680"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><rect x="8.5" y="27" width="15" height="3.4" rx="1" fill="#1b1b1f" stroke="#000" stroke-width=".5"/><rect x="10.5" y="24.6" width="11" height="2.4" rx=".8" fill="url(#slCg)" stroke="#8a6508" stroke-width=".5"/><path d="M13.4 24.6l.8-5h3.6l.8 5z" fill="url(#slCg)" stroke="#8a6508" stroke-width=".6" stroke-linejoin="round"/><ellipse cx="16" cy="11" rx="4.6" ry="8.2" transform="rotate(-25 16 11)" fill="url(#slCg)" stroke="#8a6508" stroke-width=".6"/><path d="M13.4 14.2l5.2-6.4M14.6 12.6l1.1 1.1M15.8 11l1.1 1.1M17 9.4l1.1 1.1" fill="none" stroke="#8a6508" stroke-width=".6" stroke-linecap="round" opacity=".8"/></svg>`;
THEMES.nfl.sc={n:'Lombardi Trophy',p:'Lombardi Trophies',svg:LOMBARDI};
THEMES.cfb.sc={n:'National Championship trophy',p:'National Championship trophies',svg:CFPT};
const GR=(id,a,b,c)=>`<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
/* NBA: Larry O'Brien trophy, a silver basketball over a hoop on a tapered stem */
const OBRIEN=z=>`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs>${GR('slNg','#8d97a6','#f6f8fb','#848e9d')}<radialGradient id="slNb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffa45c"/><stop offset="1" stop-color="#d9570f"/></radialGradient></defs><path d="M9 30.4h14l-1.3-3H10.3z" fill="url(#slNg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M13.2 27.4c.6-4 .3-6.6-1.4-9.4h8.4c-1.7 2.8-2 5.4-1.4 9.4z" fill="url(#slNg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M8.8 18h14.4l-1.5-3.2h-11.4z" fill="url(#slNg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><circle cx="16" cy="8.4" r="6.6" fill="url(#slNb)" stroke="#8a3a08" stroke-width=".7"/><path d="M9.4 8.4h13.2M16 1.8v13.2M11.3 3.7c3 2.4 3 7.2 0 9.6M20.7 3.7c-3 2.4-3 7.2 0 9.6" fill="none" stroke="#7a3206" stroke-width=".7"/></svg>`;
/* MLB: Commissioner's Trophy, gold with a fan of pennants around a baseball */
const COMMISH=z=>`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs>${GR('slMg','#b8860b','#ffe680','#b8860b')}</defs><path d="M9.5 30.4h13l-1.2-3H10.7z" fill="url(#slMg)" stroke="#8a6508" stroke-width=".6" stroke-linejoin="round"/><path d="M13.4 27.4l.9-9h3.4l.9 9z" fill="url(#slMg)" stroke="#8a6508" stroke-width=".6" stroke-linejoin="round"/><g fill="url(#slMg)" stroke="#8a6508" stroke-width=".55" stroke-linejoin="round"><path d="M16 18L3.6 12.4l1.4-3z"/><path d="M16 18L5.4 8.4l2-2.6z"/><path d="M16 18L8.6 5.2 11.6 3.8z"/><path d="M16 18L13.2 2.6l3-.4z"/><path d="M16 18l5.4-14.4 2.9 1.2z"/><path d="M16 18l10-12.2 2.2 2.4z"/><path d="M16 18l13.6-5.2.2 3.2z"/></g><circle cx="16" cy="15.6" r="3.8" fill="#fff" stroke="#9aa0a8" stroke-width=".6"/><path d="M13.6 13.7c1 1.2 1 3.2 0 4.4M18.4 13.7c-1 1.2-1 3.2 0 4.4" fill="none" stroke="#d6322e" stroke-width=".7"/></svg>`;
/* NHL: the Stanley Cup, a tall silver bowl on stacked flared bands */
const CUP=z=>`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs>${GR('slHg','#8d97a6','#f6f8fb','#848e9d')}</defs><path d="M10 30.4h12l-.6-2.6h-10.8z" fill="url(#slHg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M11.4 27.8l.6-2.6h8l.6 2.6z" fill="url(#slHg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M12.2 25.2l.8-2.6h6l.8 2.6z" fill="url(#slHg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M13.4 22.6l.5-3.4h4.2l.5 3.4z" fill="url(#slHg)" stroke="#59636f" stroke-width=".6" stroke-linejoin="round"/><path d="M13.9 19.2c-3.6-.7-6.4-3.6-6.9-9.2l-.4-2.6h18.8L25 10c-.5 5.600-3.300 8.500-6.900 9.200z" fill="url(#slHg)" stroke="#59636f" stroke-width=".7" stroke-linejoin="round"/><path d="M5.8 7.4h20.4l-.5-2.4H6.300z" fill="url(#slHg)" stroke="#59636f" stroke-width=".7" stroke-linejoin="round"/><path d="M10 12h12M10.800 15h10.400" stroke="#59636f" stroke-width=".6" opacity=".6"/></svg>`;
/* UFC: championship belt, a gold center plate and side plates on a black strap */
const BELT=z=>`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs>${GR('slUg','#b8860b','#ffe680','#b8860b')}</defs><rect x="1" y="12.500" width="30" height="8" rx="1.500" fill="#1b1b1f" stroke="#000" stroke-width=".5"/><path d="M1 14.200h30M1 19.300h30" stroke="#d8b13a" stroke-width=".5" stroke-dasharray="1.200 1"/><rect x="2.600" y="13.600" width="4.600" height="5.800" rx="1" fill="url(#slUg)" stroke="#8a6508" stroke-width=".5"/><rect x="24.800" y="13.600" width="4.600" height="5.800" rx="1" fill="url(#slUg)" stroke="#8a6508" stroke-width=".5"/><ellipse cx="16" cy="16.500" rx="8.200" ry="9.800" fill="url(#slUg)" stroke="#8a6508" stroke-width=".8"/><ellipse cx="16" cy="16.500" rx="5.800" ry="7.300" fill="none" stroke="#8a6508" stroke-width=".6"/><circle cx="16" cy="16.500" r="3.600" fill="#c81d25" stroke="#8a6508" stroke-width=".6"/><path d="M16 13.800l.9 1.900 2.100.2-1.600 1.400.5 2-1.900-1.100-1.900 1.100.5-2-1.600-1.400 2.100-.2z" fill="#fff"/></svg>`;
THEMES.nba.sc={n:'Larry O’Brien Trophy',p:'Larry O’Brien Trophies',svg:OBRIEN};
THEMES.mlb.sc={n:'Commissioner’s Trophy',p:'Commissioner’s Trophies',svg:COMMISH};
THEMES.nhl.sc={n:'Stanley Cup',p:'Stanley Cups',svg:CUP};
THEMES.ufc.sc={n:'Championship Belt',p:'Championship Belts',svg:BELT};
/* the emoji fallback sets also had a trophy as a normal symbol; swap those so only the bonus symbol is a trophy or belt */
THEMES.nba.s[4]=['💍','Championship ring'];THEMES.nhl.s[4]=['💍','Championship ring'];THEMES.mlb.s[4]=['🎖️','Medal'];THEMES.ufc.s[4]=['🥇','Gold medal'];
/* the emoji fallback sets used a trophy emoji as a normal symbol; swap it so it can't be confused with the bonus trophy */
THEMES.nfl.s[4]=['💍','Championship ring'];THEMES.cfb.s[4]=['🎖️','Heisman medal'];
const SCN=()=>TH().sc?TH().sc.n:'Sidelyne',SCP=()=>TH().sc?TH().sc.p:'Sidelynes';
const TORDER=['og','nfl','nba','nhl','mlb','ufc','cfb'];
let theme='og';try{const t=localStorage.getItem('fx-slt');if(THEMES[t])theme=t}catch(e){}
const TH=()=>THEMES[theme];
/* TEAM LOGOS: the 6 symbols of each theme are real team logos (UFC = fighter photos), drawn by the app's own crest() from the ESPN images it already loads.
   Your favorite teams (the ★ ones) become the TOP symbols; the rest are filled from DEFT, then from any other team in that sport.
   If the team list has not loaded yet, the emoji set above is used instead. */
const SPF={nfl:['NFL'],nba:['NBA'],nhl:['NHL'],mlb:['MLB'],cfb:['CFB']};
const DEFT={nfl:['Chiefs','Cowboys','49ers','Eagles','Packers','Steelers'],nba:['Lakers','Warriors','Celtics','Knicks','Bulls','Heat'],nhl:['Rangers','Bruins','Maple Leafs','Blackhawks','Canadiens','Penguins'],mlb:['Orioles','Yankees','Dodgers','Red Sox','Cubs','Braves']};
let TSET=null;
/* UFC default fighters (after your favorites). Names must match public/js/fighters.js. */
const UFCTOP=['Sean Strickland',"Sean O'Malley",'Conor McGregor','Jon Jones','Islam Makhachev','Alex Pereira'];
/* NFL: all 32 teams are in the draw. Only 6 symbol tiers exist, so each time the machine opens (or you tap the NFL theme) your favorite teams take the top tiers and the rest are picked at random from the 32. */
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function teamSet(){if(theme==='og')return null;try{const out=[],seen=new Set(),add=t=>{if(t&&t.n&&!seen.has(t.n)&&out.length<6){seen.add(t.n);out.push(t)}};
 if(theme==='ufc'){(S.favF||[]).forEach(n=>add({n,sp:'UFC'}));shuf((typeof FIGHTERS!=='undefined'?FIGHTERS:[]).slice()).forEach(f=>add({n:f.n,sp:'UFC'}))}
 else{const pool=(typeof TEAMS!=='undefined'?TEAMS:[]).filter(t=>SPF[theme].includes(t.sp));if(pool.length<6)return null;
  (S.favT||[]).forEach(n=>add(pool.find(t=>t.n===n)));
  if(theme==='nfl'||theme==='nba'||theme==='mlb'||theme==='cfb')shuf(pool.slice()).forEach(add);
  else{DEFT[theme].forEach(k=>add(pool.find(t=>nm(t.n+' '+(t.full||'')).includes(nm(k)))));pool.forEach(add)}}
 if(out.length===6){preload(out);return out}return null}catch(e){return null}}
/* Logo image for a team. We do NOT use the app's crest() here: it lazy-loads, and lazy images inside the clipped, moving reels often never load.
   This loads eagerly, is preloaded when the machine opens, and falls back to the letter crest only if the image really fails. */
function logoSrc(t,z){try{const v=IMG[t.sp+'|'+t.n];if(!v||!/^https:\/\//.test(v.slice(1)))return null;const hs=v[0]==='h',u=v.slice(1),dk=!hs&&isDark()&&/\/teamlogos\/[^/]+\/500\//.test(u);return{src:imgUrl(dk?u.replace('/500/','/500-dark/'):u,z,hs),o:imgUrl(u,z,hs),dk,hs}}catch(e){return null}}
window.__slErr=im=>{if(im.dataset.d){im.removeAttribute('data-d');im.src=im.dataset.o;return}try{im.parentNode.innerHTML=crestSvg(im.dataset.n,im.dataset.sp,+im.dataset.z)}catch(e){im.remove()}};
function logo(t,z){if(t.sp!=='UFC')return helmetSvg(t.n,z);const L=logoSrc(t,z);if(!L)return crest(t.n,t.sp,z);
 return `<span class="cr ${L.hs?'hd':'lg'}" style="width:${z}px;height:${z}px"><img class="ok" src="${esc(L.src)}" data-o="${esc(L.o)}" data-n="${esc(t.n)}" data-sp="${t.sp}" data-z="${z}"${L.dk?' data-d="1"':''} alt="" decoding="sync" referrerpolicy="no-referrer" onerror="__slErr(this)"></span>`}
function preload(set){try{set.filter(t=>t.sp==='UFC').forEach(t=>[24,40].forEach(z=>{const L=logoSrc(t,z);if(L){const im=new Image();im.referrerPolicy='no-referrer';im.src=L.src}}))}catch(e){}}
/* tier index 0 (lowest) .. 5 (highest); the first team in the set is the top tier */
const tm=k=>TSET?TSET[5-SYM.indexOf(k)]:null;
const tn=k=>{const t=tm(k);return t?['',t.n]:(TH().s[SYM.indexOf(k)]||['?','?'])};
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
const LNAME=['Middle row','Top row','Bottom row','V shape','Peak','Step down','Step up','Arch','Bowl'];
const PAY={nfl:[34,110,500],nba:[22,70,300],mlb:[18,50,200],nhl:[14,40,140],ufc:[10,28,100],soccer:[8,22,70]};
const SZ=()=>{try{return matchMedia('(min-width:900px)').matches?44:36}catch(e){return 36}};
const sym=(k,z=SZ())=>k==='S'&&TH().sc?TH().sc.svg(Math.round(z*1.32)):k==='S'?`<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--ab)"/><path d="M22 10.5h-9.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 1 0 7H10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`:(theme==='og'?ic(k,z):tm(k)?logo(tm(k),Math.round(z*1.1)):`<span class="sl-em" style="font-size:${Math.round(z*.85)}px">${tn(k)[0]}</span>`);
const cell=k=>`<div class="sl-c" data-k="${k}">${sym(k)}</div>`;
const rnd=()=>SYM[Math.floor(Math.random()*SYM.length)];
const calm=()=>document.documentElement.classList.contains('rm');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let denom=1,lines=9,cpl=1,busy=false,wsv=0,cl=[.05,.5],declined=false;
let autoOn=false,autoLeft=0,stopBonus=true,stopBig=true,lastAt=0;

/* ---- sounds: built with WebAudio (no sound files). Modeled on a real casino machine: motor + reel ticks, mechanical stop clunks, coin payouts, bells and brass. ---- */
let actx=null,mst=null,nbuf0=null,muted=false,tickT=null,mot=null;try{muted=localStorage.getItem('fx-slm')==='1'}catch(e){}
const ac=()=>{if(muted)return null;try{if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx}catch(e){return null}};
const out=()=>{const c=ac();if(!c)return null;if(!mst){const cp=c.createDynamicsCompressor();cp.threshold.value=-20;cp.knee.value=12;cp.ratio.value=4;mst=c.createGain();mst.gain.value=.9;mst.connect(cp);cp.connect(c.destination)}return mst};
const nbuf=c=>{if(!nbuf0){const n=Math.floor(c.sampleRate*1.5),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;nbuf0=b}return nbuf0};
/* filtered noise burst (clicks, clunks, whooshes) */
function nz(t0,d,type,f1,f2,q,g,att){const c=ac(),o=out();if(!c||!o)return;const s=c.createBufferSource(),f=c.createBiquadFilter(),v=c.createGain(),t=c.currentTime+t0;s.buffer=nbuf(c);s.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f1,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+d);v.gain.setValueAtTime(.0001,t);v.gain.linearRampToValueAtTime(g,t+(att||.004));v.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(v);v.connect(o);s.start(t,Math.random());s.stop(t+d+.05)}
function tone(f,t0,d,type,g,f2){const c=ac(),o=out();if(!c||!o)return;const x=c.createOscillator(),v=c.createGain(),t=c.currentTime+t0;x.type=type||'sine';x.frequency.setValueAtTime(f,t);if(f2)x.frequency.exponentialRampToValueAtTime(f2,t+d);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(g||.1,t+.006);v.gain.exponentialRampToValueAtTime(.0001,t+d);x.connect(v);v.connect(o);x.start(t);x.stop(t+d+.03)}
/* bell: FM synthesis (the classic slot machine ding) */
function bell(f,t0,d,g){const c=ac(),o=out();if(!c||!o)return;const t=c.currentTime+t0,car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),v=c.createGain();car.type='sine';mod.type='sine';car.frequency.value=f;mod.frequency.value=f*3.51;mg.gain.setValueAtTime(f*2.4,t);mg.gain.exponentialRampToValueAtTime(f*.02,t+d*.7);mod.connect(mg);mg.connect(car.frequency);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(g,t+.003);v.gain.exponentialRampToValueAtTime(.0001,t+d);car.connect(v);v.connect(o);car.start(t);mod.start(t);car.stop(t+d+.05);mod.stop(t+d+.05)}
/* coin hitting the tray: a few inharmonic metal partials + a tiny click */
function clink(t0,g){const b=2300+Math.random()*1500;[[1,1,.11],[2.42,.55,.08],[3.87,.3,.06],[5.4,.15,.04]].forEach(p=>tone(b*p[0],t0,p[2],'sine',g*p[1]));nz(t0,.012,'highpass',5500,0,.7,g*.5,.001)}
function shower(n,span,g){for(let i=0;i<n;i++)clink(Math.pow(Math.random(),.8)*span,g*(.5+Math.random()*.5))}
/* brass section: detuned saws through a filter that opens up on the attack */
function brass(f,t0,d,g){const c=ac(),o=out();if(!c||!o)return;const t=c.currentTime+t0,fl=c.createBiquadFilter(),v=c.createGain();fl.type='lowpass';fl.Q.value=1.5;fl.frequency.setValueAtTime(500,t);fl.frequency.exponentialRampToValueAtTime(2600,t+.09);fl.frequency.exponentialRampToValueAtTime(1100,t+d);v.gain.setValueAtTime(.0001,t);v.gain.linearRampToValueAtTime(g,t+.035);v.gain.setValueAtTime(g,t+d*.65);v.gain.exponentialRampToValueAtTime(.0001,t+d);[-7,7].forEach(dt=>{const x=c.createOscillator();x.type='sawtooth';x.frequency.value=f;x.detune.value=dt;x.connect(fl);x.start(t);x.stop(t+d+.05)});fl.connect(v);v.connect(o)}
const SCALE=[0,2,4,7,9,12,14,16,19,21,24];
const note=i=>TH().root*Math.pow(2,SCALE[Math.min(i,SCALE.length-1)]/12);
const sfx={
 /* SPINNING REELS: a mechanical ratchet. Mid-range wooden "clack-clack-clack" ticks (short filtered-noise knocks with a little body), slightly irregular like real reels. No pitched beeps, no continuous noise, nothing shrill or low. */
 spinOn(){const c=ac(),o=out();if(!c||!o)return;sfx.spinOff();
  nz(0,.07,'bandpass',800,400,1.4,.3,.001);tone(190,0,.08,'sine',.12,110);
  let n=0;const go=()=>{const acc=n++%3===0;
   nz(0,.022,'bandpass',acc?1000:1250+Math.random()*250,0,3,acc?.3:.22,.001);tone(acc?300:380,0,.03,'sine',acc?.09:.05,acc?200:260);
   tickT=setTimeout(go,60+Math.random()*14)};go()},
 spinOff(){clearTimeout(tickT);tickT=null;mot=null},
 /* each reel locking in: a solid mechanical clunk */
 stop(i){nz(0,.055,'bandpass',750,320,1.3,.36,.001);tone(200,0,.1,'sine',.2,95);nz(0,.012,'bandpass',1800,0,2,.12,.001)},
 /* line win: coins in the tray + a bell run; bigger wins get a bigger shower, more bells and brass */
 win(l){if(l<=0){shower(3,.25,.05);bell(note(5),.05,.7,.08);return}
  if(l===1){shower(8,.7,.05);[5,7,9].forEach((s,i)=>bell(note(s),i*.11,.8,.08));return}
  if(l===2){shower(18,1.3,.055);[5,7,9,10].forEach((s,i)=>bell(note(s),i*.1,.9,.085));brass(note(2),.05,.5,.05);brass(note(5),.05,.5,.045);return}
  shower(34,2.3,.06);[5,7,9,10,9,10].forEach((s,i)=>bell(note(s),i*.09,1.1,.09));[0,2,5].forEach(s=>brass(note(s),0,.9,.055));brass(note(7),.5,.9,.05)},
 /* bonus triggered: rising whoosh, bell peal, brass stab */
 bonus(){nz(0,.9,'bandpass',200,2400,1.2,.1,.2);for(let k=0;k<5;k++){bell(note(7),.25+k*.2,1.2,.07);bell(note(9),.35+k*.2,1.2,.05)}[0,2,5].forEach(s=>brass(note(s),.9,.7,.05));[0,3,7].forEach(s=>brass(note(s+2),1.45,.9,.05))},
 coin(){clink(0,.035)},
 /* bonus finished: brass fanfare with a coin shower */
 bonusWin(){[[0,2,5],[2,4,7],[0,5,9]].forEach((ch,k)=>ch.forEach(s=>brass(note(s),k*.34,k===2?1.4:.36,.05)));shower(40,2.2,.055);[5,7,9,10,12].forEach((s,i)=>bell(note(s),1+i*.1,1.3,.08))},
 lose(){tone(392,0,.14,'sine',.06);tone(330,.14,.2,'sine',.05)},
 click(){nz(0,.02,'bandpass',2400,0,4,.06,.001);tone(500,0,.03,'square',.02)}};
/* BIGX = a "big win" is any win of this many times your TOTAL bet. It drives the BIG WIN banner, the louder win sound and the Stop on big win rule. */
const BIGX=10,MEGAX=40;
const lvl=(pay,st)=>!st?1:pay>=MEGAX*st?3:pay>=BIGX*st?2:pay>=4*st?1:0;
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
 /* Spin with the Web Animations API, not a CSS transition: the app's "prefers-reduced-motion" rule in style.css sets transition:none!important, which made the reels sit still and snap for anyone with OS-level reduced motion (Windows animation effects off, macOS/iOS Reduce Motion). The in-app Reduce motion switch still skips the spin (calm() above). */
 const dist=(n+3)*(st.firstElementChild.offsetHeight||H),ease='cubic-bezier(.2,.8,.2,1)';let done=false,anim=null;
 const fin=()=>{if(done)return;done=true;try{anim&&anim.cancel()}catch(e){}fin0()};
 try{anim=st.animate([{transform:'translateY(0)'},{transform:`translateY(-${dist}px)`}],{duration:dur,easing:ease,fill:'forwards'});anim.onfinish=fin}
 catch(e){st.style.transition=`transform ${dur}ms ${ease}`;st.style.transform=`translateY(-${dist}px)`;st.addEventListener('transitionend',ev=>{if(ev.target===st)fin()})}
 setTimeout(fin,dur+250)})}

function slCss(){if(document.getElementById('slx-css'))return;const st=document.createElement('style');st.id='slx-css';
 st.textContent=`.sl-wrap{--sla:#f5c542;--sla2:#e8a317}${TORDER.map(k=>`.sl-wrap[data-th="${k}"]{--sla:${THEMES[k].a};--sla2:${THEMES[k].b}}`).join('')}
.sl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.sl-top h3{margin:0}
.sl-th{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:4px 0 10px}.sl-th .chip{display:inline-flex;align-items:center;gap:4px;padding:6px 10px}.sl-th .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}
.sl-wrap .sl-reels{background:linear-gradient(160deg,color-mix(in srgb,var(--sla) 24%,var(--sf2)),var(--sf2));border-color:color-mix(in srgb,var(--sla) 55%,var(--bd))}
.sl-wrap .sl-fs{background:linear-gradient(90deg,var(--sla),var(--sla2));color:#fff}
.sl-wrap.fs .sl-reels{box-shadow:0 0 0 2px var(--sla),0 0 22px color-mix(in srgb,var(--sla) 55%,transparent),inset 0 2px 10px rgba(0,0,0,.18)}
.sl-wrap .sl-go{background:var(--sla);border-color:var(--sla);color:#fff}.sl-wrap .sl-go:disabled{opacity:.55}
.sl-wrap[data-th="og"] .sl-reels{background:var(--sf2);border-color:var(--bd)}.sl-wrap[data-th="og"] .sl-fs{background:linear-gradient(90deg,#f5c542,#e8a317);color:#3a2a00}.sl-wrap[data-th="og"].fs .sl-reels{box-shadow:0 0 0 2px #f5c542,0 0 20px rgba(245,197,66,.45),inset 0 2px 10px rgba(0,0,0,.18)}.sl-wrap[data-th="og"] .sl-th .chip.on,.sl-wrap[data-th="og"] .sl-auto .chip.on,.sl-wrap[data-th="og"] .sl-go{color:var(--abx,#fff)}.sl-c .cr{display:block}.sl-ptr .cr{flex:none}.sl-em{display:block;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.sl-reels{position:relative}.sl-pl{position:absolute;left:0;top:0;pointer-events:none;z-index:3;overflow:visible}
.sl-auto{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px}.sl-ar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px}.sl-th .chip{white-space:nowrap}.sl-auto .mu{font-size:12px}.sl-auto .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}`;
 document.head.appendChild(st)}

function openSlots(){
 if(!ME)return;slCss();TSET=teamSet();
 const start=Array.from({length:NR},()=>[rnd(),rnd(),rnd()]);
 const m=modal(`<div class="sl-wrap" data-th="${theme}"><div class="sl-top"><h3>Slots</h3><button class="chip" id="slmu" data-slmute></button></div><div class="sl-th" id="slth"></div><div class="sl-bal mu">Balance <b id="slb"></b> SP<span id="slcr"></span></div><div class="sl-fs" id="slfs" hidden></div><div class="sl-rw"><div class="sl-svp" id="slsv" hidden></div><div class="sl-reels" id="slr">${start.map(c=>`<div class="sl-reel"><div class="sl-strip">${col3(c)}</div></div>`).join('')}</div></div><div class="sl-msg" id="slm"></div><div class="sl-bets" style="flex-direction:column;align-items:center;gap:4px"><div class="mu" style="font-size:12px">Denom (SP per credit)</div><div class="seg" id="sld"></div><div class="mu" style="font-size:12px">Lines</div><div class="seg" id="sll"></div><div class="mu" style="font-size:12px">Credits per line</div><div class="seg" id="slc"></div><div class="row sp" style="width:100%;margin-top:4px"><span id="sltot" class="mu"></span><button class="chip" data-slmax>Max bet</button></div></div><button class="pri sl-go" id="slgo"></button><div class="sl-auto" id="slau"></div><button class="chip sl-svre" id="slsvre" data-svre hidden>Out of SP? Try a wager saver</button><button class="chip sl-info" id="slinfo">Paytable &amp; paylines</button><div class="sl-pt" id="slpt" hidden></div><p class="sl-rg"><b>Gambling can be addictive. Play responsibly.</b> Need help? Call <a href="tel:18004262537">1-800-GAMBLER</a> (1-800-426-2537) or text 800GAM, 24/7.</p></div>`);
 const ptHtml=()=>`<div class="sl-pth">Line pays (x credits bet per line, 3 / 4 / 5 in a row from the left)</div>${Object.keys(PAY).map(k=>`<div class="sl-ptr"><span>${sym(k,22)} ${tn(k)[1]}</span><b>${PAY[k].join(' / ')}</b></div>`).join('')}<div class="sl-ptr"><span>${sym('S',22)} ${SCN()} ×3 anywhere</span><b>${TH().name} bonus</b></div><div class="sl-pth" style="margin-top:12px">${TH().name} bonus: ${TH().bonus.name}</div><div class="sl-note">3 ${SCP()} anywhere start the bonus, and it costs nothing. ${TH().bonus.d} Free spin multipliers: ${TH().bonus.m.map(x=>'×'+x).join(' ')}. Land 3 more ${SCP()} during the bonus for another full round (up to ${theme==='og'?6:4} rounds). ${TSET?'The symbols are team logos, and your ★ favorite teams are the top symbols. ':''}Every machine has its own bonus. Total bet = denom × lines × credits per line. Bigger denoms bet more, win more, and pay back a little better.</div><div class="sl-pth" style="margin-top:12px">Paylines · play 1, 3, 5 or 9 (in this order)</div><div class="sl-lines">${LINES.map((l,i)=>`<div>${mini(l)}<small>${LNAME[i]}</small></div>`).join('')}</div>`;
 const $m=s=>m.querySelector(s),bal=v=>{$m('#slb').textContent=Number(v).toLocaleString();$m('#slcr').textContent=' · '+Math.floor(v/denom).toLocaleString()+' credits'};
 const fit=()=>{if(S.novas<MINBET)return;while(total()>S.novas){if(cpl>1)cpl=CPLS[CPLS.indexOf(cpl)-1];else if(lines>1)lines=LNS[LNS.indexOf(lines)-1];else if(denom>1)denom=DENOMS[DENOMS.indexOf(denom)-1];else break}};
 const lk=()=>busy||autoOn;
 const seg=(a,cur,at,lab,ok)=>a.map(v=>`<button data-${at}="${v}" class="${v===cur?'on':''}" ${lk()||!ok(v)?'disabled':''}>${lab(v)}</button>`).join('');
 const defMsg=()=>'<span>'+TH().name+' · 3 '+SCP()+' = '+TH().bonus.name+'!</span><small class="sl-sub">'+TH().bonus.d+'</small>';
 const uiExtra=()=>{$m('#slth').innerHTML=TORDER.map(k=>`<button class="chip ${k===theme?'on':''}" data-slth="${k}" ${lk()?'disabled':''}>${k==='og'?'🎰':THEMES[k].s[5][0]} ${THEMES[k].name}</button>`).join('');
  $m('#slmu').textContent=muted?'🔇 Sound off':'🔊 Sound on';
  $m('#slau').innerHTML=(autoOn?'':`<div class="sl-ar"><span class="mu">Auto spin</span>`+[10,25,50,100].map(n=>`<button class="chip" data-slau="${n}" ${busy||S.novas<total()&&!(wsv>0)?'disabled':''}>${n}</button>`).join('')+`</div>`)+`<div class="sl-ar"><button class="chip ${stopBonus?'on':''}" data-sltg="bonus" aria-pressed="${stopBonus}">${stopBonus?'✓ ':''}Stop on bonus</button><button class="chip ${stopBig?'on':''}" data-sltg="big" aria-pressed="${stopBig}" title="Any win of ${BIGX}× your total bet or more">${stopBig?'✓ ':''}Stop on big win</button></div>`};
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
 if(theme!=='og'&&!TSET){let tries=0;const iv=setInterval(()=>{if(!m.isConnected||TSET||++tries>30){clearInterval(iv);return}const ts=teamSet();if(!ts)return;clearInterval(iv);TSET=ts;if(!busy){m.querySelectorAll('.sl-strip').forEach(st=>{st.innerHTML=[...st.children].map(c=>cell(c.dataset.k)).join('')});$m('#slpt').innerHTML=ptHtml()}},1000)}
 FX_DB.rpc('slots_saver_status').then(q=>{if(q.error||!q.data)return;wsv=q.data.saver_spins||0;if(q.data.chance_max>0)cl=[+q.data.chance_min,+q.data.chance_max];if(m.isConnected)draw()}).catch(()=>{});
 m.addEventListener('click',e=>{const b=e.target.closest('[data-sld],[data-sll],[data-slc],[data-slmax]');if(e.target.closest('[data-slmute]')){muted=!muted;try{localStorage.setItem('fx-slm',muted?'1':'0')}catch(x){}if(!muted)sfx.click();draw();return}
  const tg=e.target.closest('[data-sltg]');if(tg){if(tg.dataset.sltg==='bonus')stopBonus=!stopBonus;else stopBig=!stopBig;draw();return}
  const th=e.target.closest('[data-slth]');if(th&&!busy&&!autoOn){theme=th.dataset.slth;try{localStorage.setItem('fx-slt',theme)}catch(x){}TSET=teamSet();$m('.sl-wrap').dataset.th=theme;m.querySelectorAll('.sl-strip').forEach(st=>{st.innerHTML=[...st.children].map(c=>cell(c.dataset.k)).join('')});$m('#slpt').innerHTML=ptHtml();$m('#slm').innerHTML=defMsg();sfx.click();draw();return}
  const au=e.target.closest('[data-slau]');if(au&&!busy&&!autoOn){autoLeft=+au.dataset.slau;autoOn=true;ac();draw();autoLoop();return}
  if(e.target.closest('#slgo')&&autoOn){autoOn=false;autoLeft=0;draw();return}
  if(b&&!busy&&!autoOn){if(b.dataset.sld)denom=+b.dataset.sld;else if(b.dataset.sll)lines=+b.dataset.sll;else if(b.dataset.slc)cpl=+b.dataset.slc;else{lines=9;cpl=10}draw();return}if(e.target.closest('#slinfo')){const p=$m('#slpt');if(p.hidden)p.innerHTML=ptHtml();p.hidden=!p.hidden;return}if(e.target.closest('[data-svgo]')){gamble();return}if(e.target.closest('[data-svno]')){declined=true;draw();return}if(e.target.closest('[data-svre]')){declined=false;draw();return}if(e.target.closest('#slgo'))spin(wsv>0)});
 const clearHi=()=>{m.querySelectorAll('.sl-c.hit,.sl-c.dim').forEach(c=>c.classList.remove('hit','dim'));m.querySelectorAll('.sl-pl').forEach(e=>e.remove())};
 /* draw each winning payline across the reels, so you can see exactly which line paid and how far it ran */
 const PLC=['#ffd43b','#4dabf7','#ff6b6b','#69db7c','#da77f2','#ffa94d','#3bc9db','#f783ac','#a9e34b'];
 const drawLines=(wins,reels)=>{try{const rs=[...reels.children];if(!rs.length)return;const W=reels.clientWidth,Ht=reels.clientHeight,ch=rs[0].clientHeight/3;
  const pts=(w)=>{const a=[];for(let c=0;c<w.count;c++){const r=rs[c];a.push((r.offsetLeft+r.offsetWidth/2).toFixed(1)+','+(r.offsetTop+(LINES[w.line][c]+.5)*ch).toFixed(1))}return a.join(' ')};
  const g=wins.map(w=>{const col=PLC[w.line%PLC.length],p=pts(w);return `<polyline points="${p}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${p}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}).join('');
  reels.insertAdjacentHTML('beforeend',`<svg class="sl-pl" width="${W}" height="${Ht}" viewBox="0 0 ${W} ${Ht}" aria-hidden="true">${g}</svg>`)}catch(e){}};
 /* a line that matched 3+ from the left but was not active (you played fewer than 9 lines) pays nothing: tell the player so it does not look like a missed win */
 const missHint=(g,ln)=>{if(!Array.isArray(g)||ln>=9)return'';const out=[];for(let i=ln;i<9;i++){const L=LINES[i],b=g[0]&&g[0][L[0]];if(!b||b==='S')continue;let n=1;while(n<5&&g[n]&&g[n][L[n]]===b)n++;if(n>=3)out.push(LNAME[i]+' '+n+'×')}return out.length?'<small class="sl-sub" style="color:var(--sla);font-weight:800">Not paid, line not active: '+out.join(', ')+'. Play 9 lines to cover them.</small>':''};
 const hilite=(wins,reels)=>{const rs=[...reels.children];const keep=new Set();wins.forEach(w=>{for(let c=0;c<w.count;c++)keep.add(c+','+LINES[w.line][c])});
  rs.forEach((r,c)=>[...r.firstElementChild.children].forEach((el,row)=>el.classList.add(keep.has(c+','+row)?'hit':'dim')));drawLines(wins,reels)};
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
  else msg.textContent=r.scatters===2?'So close! Two '+SCP()+'…':'No luck. Spin again!';
  if(r.kind!=='bonus'&&!free){const mh=missHint(r.reels,r.lines||lines);if(mh)msg.insertAdjacentHTML('beforeend',mh)}
  applyNovas(r.novas,r.payout>stake?'Slots win':null);busy=false;if(m.isConnected)draw();
  return{ok:true,payout:r.payout,stake,bonus:r.kind==='bonus'}}

 /* auto spin: keeps spinning with the current bet until the count runs out, you tap Stop, you run low on SP, or a stop rule hits */
 async function autoLoop(){let why='';
  while(autoOn&&autoLeft>0&&m.isConnected){
   if(!(wsv>0||S.novas>=total())){toast('Auto spin stopped: not enough SP');break}
   const res=await spin(wsv>0);
   if(!res||!res.ok)break;
   autoLeft--;
   if(res.bonus&&stopBonus){why='bonus round played';break}
   if(res.payout>=BIGX*res.stake&&stopBig){why='big win';break}
   if(!autoOn)break;
   if(m.isConnected)draw();
   await wait(Math.max(calm()?300:700,1150-(Date.now()-lastAt)))}
  autoOn=false;autoLeft=0;
  if(why&&m.isConnected){toast('Auto spin stopped: '+why);const mg=$m('#slm');if(mg)mg.insertAdjacentHTML('beforeend','<small class="sl-sub" style="color:var(--sla);font-weight:800">Auto spin stopped · '+why+'</small>')}
  if(m.isConnected)draw()}

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
 const winMsg=(wins,pay,st)=>{const best=wins.slice().sort((a,b)=>b.pay-a.pay)[0],tier=st?(pay>=MEGAX*st?'MEGA WIN! ':pay>=BIGX*st?'BIG WIN! ':''):'';return tier+(wins.length>1?wins.length+' lines! ':'')+'+'+pay.toLocaleString()+' SP<small class="sl-sub">'+(best?LNAME[best.line]+' · '+best.count+'× '+(tn(best.sym)[0]?tn(best.sym)[0]+' ':'')+tn(best.sym)[1]:'')+'</small>'};
 const countUp=(el,to,ms,snd)=>new Promise(res=>{const t0=performance.now();let lc=0;const tick=t=>{const p=ms?Math.min(1,(t-t0)/ms):1;if(snd&&t-lc>70){lc=t;sfx.coin()}el.textContent='+'+Math.round(to*p).toLocaleString()+' SP';p<1&&el.isConnected?requestAnimationFrame(tick):res()};requestAnimationFrame(tick)})}
document.addEventListener('click',e=>{if(e.target.closest('[data-slots]'))openSlots()});
window.openSlots=openSlots;
})();
