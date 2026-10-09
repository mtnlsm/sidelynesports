/* Slots + Sidelyne FREE SPINS bonus. Every spin (and every free spin) is decided by the server (supabase/slots.sql); this file only plays the animation. */
(()=>{
/* Server ids of the 6 symbol tiers, lowest to highest pay. Each theme draws its own icon on every tier (see THEMES). */
const SYM=['t1','t2','t3','t4','t5','t6'],H=56,DENOMS=[1,2,5,10,25,100],LNS=[1,3,5,9],CPLS=[1,2,3,5,10],MINBET=1,SAVER_STAKE=25,NR=5;
/* THEMES: s = [emoji,name] for each tier (low to high). bonus.m is for display only; the real multipliers live in supabase/slots.sql (slots_bonus_mults). */
const THEMES={
 classic:{name:'Lucky Classic',a:'var(--ab)',b:'var(--ab)',root:262,s:[['🍒','Cherry'],['🍋','Lemon'],['🔔','Bell'],['🍀','Clover'],['💎','Diamond'],['7️⃣','Lucky Seven']],sc:{e:'⭐',n:'Lucky Star',p:'Lucky Stars'},bonus:{name:'LUCKY SEVENS',unit:'Spin',m:[1,1,1,2,2,2,3],r:[3,3,3,3,3,3,3],d:'7 free spins. The multiplier steps up ×1, ×2, ×3 and the last spin pays ×3.'}},
 gold:{name:'Gold Rush',a:'#d9a21b',b:'#8a5a00',root:262,s:[['⛏️','Pickaxe'],['🪔','Lantern'],['🚂','Steam train'],['🧭','Compass'],['💎','Gem'],['💰','Gold sack']],sc:{e:'🪙',n:'Gold Nugget',p:'Gold Nuggets'},bonus:{name:'SHAFT BLAST',unit:'Blast',m:[1,1,1,1,2],r:[6,6,6,6,6],open:'THE SHAFT BLASTS OPEN',d:'Dynamite! The reels blast open from 3 rows to 6 rows deep for all 5 free spins, with a second set of paylines on the lower rows. The last blast pays ×2.'}},
 ocean:{name:'Ocean Treasure',a:'#14b8c4',b:'#0b6e80',root:294,s:[['🐚','Seashell'],['🦀','Crab'],['⚓','Anchor'],['🐙','Octopus'],['🦈','Shark'],['🐋','Whale']],sc:{e:'🦪',n:'Pearl Oyster',p:'Pearl Oysters'},bonus:{name:'PEARL DIVE',unit:'Dive',m:[1,1,1,1,1,2,2,3],r:[3,3,3,3,3,3,3,3],d:'8 dives, each one deeper. It pays ×1 near the surface, ×2 below, and ×3 on the ocean floor.'}},
 frozen:{name:'Frozen Fortune',a:'#4f9cf5',b:'#1d4f9e',root:330,s:[['🧊','Ice cube'],['☃️','Snowman'],['🐧','Penguin'],['🦌','Reindeer'],['🏔️','Glacier'],['❄️','Snowflake']],sc:{e:'🌌',n:'Aurora',p:'Auroras'},bonus:{name:'AURORA STORM',unit:'Storm',m:[2,4,6],r:[3,3,3],d:'Only 3 storms, but they build fast: ×2, ×4, then a ×6 whiteout.'}},
 west:{name:'Wild West',a:'#b45309',b:'#7c2d12',root:247,s:[['🌵','Cactus'],['🥾','Boot'],['🐎','Horse'],['🐂','Longhorn'],['🐍','Rattlesnake'],['🤠','Cowboy']],sc:{e:'📜',n:'Wanted Poster',p:'Wanted Posters'},bonus:{name:'BOUNTY HUNT',unit:'Chase',m:[1,1,1,1,4,4],r:[3,3,3,3,3,3],d:'6 chases. Four warm-up spins at ×1, then you catch the outlaw and the last two pay ×4.'}},
 dragon:{name:'Dragon Dynasty',a:'#dc2626',b:'#7f1d1d',root:220,s:[['🏮','Lantern'],['🎋','Bamboo'],['🐟','Koi'],['🍵','Tea'],['🐼','Panda'],['🐉','Dragon']],sc:{e:'🧧',n:'Red Envelope',p:'Red Envelopes'},bonus:{name:'LANTERN FESTIVAL',unit:'Lantern',m:[1,1,1,1,1,1,2,2,2],r:[3,3,3,3,3,3,3,3,3],d:'9 lanterns float up. The first 6 pay ×1, and the last 3 glow at ×2.'}},
 cosmic:{name:'Cosmic Voyage',a:'#7c3aed',b:'#3b1a8f',root:350,s:[['☄️','Comet'],['🛰️','Satellite'],['🪐','Ringed planet'],['👽','Alien'],['🌙','Moon'],['🚀','Rocket']],sc:{e:'🌠',n:'Shooting Star',p:'Shooting Stars'},bonus:{name:'SUPERNOVA',unit:'Pulse',m:[1,2,4,5],r:[3,3,3,3],d:'4 pulses and the star is about to go. ×1, ×2, ×4, then the supernova at ×5.'}}};
/* SYMBOL ART}}};
/* SYMBOL ART: every symbol is a glossy tile in the machine's colors with a glyph on it (higher tiers get a gold rim). The bonus scatter is a gold starburst medallion so it is easy to spot. All inline SVG, no image files. */
const tile=(e,i,z)=>{const rim=i>=4?'#ffd86b':'rgba(255,255,255,.35)',id='slt'+theme+i;return `<svg width="${z}" height="${z}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${TH().a}"/><stop offset="1" style="stop-color:${TH().b}"/></linearGradient></defs><rect x="2" y="2" width="36" height="36" rx="10" fill="url(#${id})" stroke="${rim}" stroke-width="${i>=4?2:1.2}"/><path d="M6 12Q6 5 14 5H26Q34 5 34 12Q20 17 6 12Z" fill="rgba(255,255,255,.22)"/><text x="20" y="27.500" text-anchor="middle" font-size="21" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${e}</text></svg>`};
const medal=(e,z)=>{const pts=[];for(let k=0;k<24;k++){const r=k%2?13.500:16,a=k*Math.PI/12;pts.push((16+r*Math.sin(a)).toFixed(1)+','+(16-r*Math.cos(a)).toFixed(1))}return `<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="slmd" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fff2a8"/><stop offset=".55" stop-color="#f5c542"/><stop offset="1" stop-color="#b8860b"/></radialGradient></defs><polygon points="${pts.join(' ')}" fill="url(#slmd)" stroke="#8a6508" stroke-width=".6"/><circle cx="16" cy="16" r="10.500" fill="#2a1b05" stroke="#ffe680" stroke-width="1"/><text x="16" y="21.500" text-anchor="middle" font-size="14" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${e}</text></svg>`};
const SCN=()=>TH().sc.n,SCP=()=>TH().sc.p;
const TORDER=['classic','gold','ocean','frozen','west','dragon','cosmic'];
let theme='classic';try{const t=localStorage.getItem('fx-slt');if(THEMES[t])theme=t}catch(e){}
const TH=()=>THEMES[theme];
const tn=k=>TH().s[SYM.indexOf(k)]||['?','?'];
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
const LNAME=['Middle row','Top row','Bottom row','V shape','Peak','Step down','Step up','Arch','Bowl'];
const PAY={t6:[34,110,500],t5:[22,70,300],t4:[18,50,200],t3:[14,40,140],t2:[10,28,100],t1:[8,22,70]};
const lineRow=(l,c)=>LINES[l%9][c]+(l>=9?3:0),lname=l=>LNAME[l%9]+(l>=9?' (lower reels)':'');
const SZ=()=>{try{return matchMedia('(min-width:900px)').matches?44:36}catch(e){return 36}};
const sym=(k,z=SZ())=>k==='S'?medal(TH().sc.e,Math.round(z*1.32)):tile(TH().s[SYM.indexOf(k)][0],SYM.indexOf(k),Math.round(z*1.1));
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
/* more building blocks (all WebAudio, no sound files) */
const glass=(f,t0,d,g)=>[[1,1,1],[2.76,.5,.6],[5.4,.25,.35]].forEach(p=>tone(f*p[0],t0,d*p[2],'sine',g*p[1]));
const gong=(f,t0,d,g)=>[[1,1],[1.5,.7],[2.02,.6],[2.76,.45],[3.9,.25]].forEach(p=>tone(f*p[0],t0,d,'sine',g*p[1],f*p[0]*.985));
const pluck=(f,t0,d,g)=>{tone(f,t0,d,'triangle',g,f*.99);tone(f*2,t0,d*.45,'sine',g*.45);nz(t0,.014,'bandpass',f*3,0,2,g*.6,.001)};
const boom=(t0,g)=>{tone(120,t0,.55,'sine',g,32);nz(t0,.6,'lowpass',1000,70,.7,g*.9,.004)};
const zap=(f1,f2,t0,d,g,ty)=>tone(f1,t0,d,ty||'sawtooth',g,f2);
const bubble=(t0,g)=>{const f=300+Math.random()*550;tone(f,t0,.075,'sine',g,f*2.3)};
const sparkle=(n,span,g)=>{for(let i=0;i<n;i++)tone(1800+Math.random()*3200,Math.random()*span,.12,'sine',g*(.4+Math.random()*.6))};
const jingle=(t0,g)=>{for(let k=0;k<5;k++){nz(t0+k*.032,.05,'highpass',6000+Math.random()*2000,0,1,g,.001);tone(3800+Math.random()*1600,t0+k*.032,.05,'sine',g*.4)}};
const gun=(t0,g)=>{nz(t0,.28,'lowpass',5200,180,.8,g,.001);tone(150,t0,.22,'sine',g*.8,40)};
const arp=(steps,t0,gap,fn)=>steps.forEach((s,i)=>fn(note(s),t0+i*gap,i));
/* spinning-reel loop: calls fn(n) every ms (+ up to j ms of wobble) until spinOff() */
const ticker=(fn,ms,j)=>{if(!ac()||!out())return;sfx.spinOff();let n=0;const go=()=>{fn(n++);tickT=setTimeout(go,ms+Math.random()*j)};go()};
/* EVERY MACHINE HAS ITS OWN SOUND SET, matched to its name:
   Lucky Classic = casino bells and brass, Gold Rush = pickaxe, rock and coin pours, dynamite, Ocean Treasure = bubbles, harp and whale song,
   Frozen Fortune = ice cracks, glass chimes and sleigh bells, Wild West = twangy guitar, spurs, church bell and gunshots,
   Dragon Dynasty = wood blocks, gongs, plucked strings and taiko drums, Cosmic Voyage = laser zaps, synth arps and warp whooshes. */
const SFX={
 classic:{
  /* SPINNING REELS: a mechanical ratchet. Mid-range wooden "clack-clack-clack" ticks, slightly irregular like real reels. */
  spinOn(){const c=ac(),o=out();if(!c||!o)return;sfx.spinOff();
   nz(0,.07,'bandpass',800,400,1.4,.3,.001);tone(190,0,.08,'sine',.12,110);
   let n=0;const go=()=>{const acc=n++%3===0;
    nz(0,.022,'bandpass',acc?1000:1250+Math.random()*250,0,3,acc?.3:.22,.001);tone(acc?300:380,0,.03,'sine',acc?.09:.05,acc?200:260);
    tickT=setTimeout(go,60+Math.random()*14)};go()},
  stop(i){nz(0,.055,'bandpass',750,320,1.3,.36,.001);tone(200,0,.1,'sine',.2,95);nz(0,.012,'bandpass',1800,0,2,.12,.001)},
  win(l){if(l<=0){shower(3,.25,.05);bell(note(5),.05,.7,.08);return}
   if(l===1){shower(8,.7,.05);[5,7,9].forEach((s,i)=>bell(note(s),i*.11,.8,.08));return}
   if(l===2){shower(18,1.3,.055);[5,7,9,10].forEach((s,i)=>bell(note(s),i*.1,.9,.085));brass(note(2),.05,.5,.05);brass(note(5),.05,.5,.045);return}
   shower(34,2.3,.06);[5,7,9,10,9,10].forEach((s,i)=>bell(note(s),i*.09,1.1,.09));[0,2,5].forEach(s=>brass(note(s),0,.9,.055));brass(note(7),.5,.9,.05)},
  bonus(){nz(0,.9,'bandpass',200,2400,1.2,.1,.2);for(let k=0;k<5;k++){bell(note(7),.25+k*.2,1.2,.07);bell(note(9),.35+k*.2,1.2,.05)}[0,2,5].forEach(s=>brass(note(s),.9,.7,.05));[0,3,7].forEach(s=>brass(note(s+2),1.45,.9,.05))},
  bonusWin(){[[0,2,5],[2,4,7],[0,5,9]].forEach((ch,k)=>ch.forEach(s=>brass(note(s),k*.34,k===2?1.4:.36,.05)));shower(40,2.2,.055);[5,7,9,10,12].forEach((s,i)=>bell(note(s),1+i*.1,1.3,.08))},
  lose(){tone(392,0,.14,'sine',.06);tone(330,.14,.2,'sine',.05)},
  click(){nz(0,.02,'bandpass',2400,0,4,.06,.001);tone(500,0,.03,'square',.02)},
  coin(){clink(0,.035)},
  expand(){nz(0,.8,'bandpass',200,2200,1.2,.1,.15);boom(.55,.12)}},
 /* GOLD RUSH: prospector banjo, anvil dings, brass and coin pours */
 gold:{
  spinOn(){ticker(n=>{const a=n%4===0;nz(0,.024,'bandpass',a?900:1300+Math.random()*200,0,3,a?.28:.2,.001);tone(a?240:330,0,.035,'sine',a?.09:.05,a?170:240);if(n%8===5)bell(1180,0,.25,.025)},64,12)},
  stop(i){nz(0,.055,'bandpass',750,320,1.3,.36,.001);tone(190,0,.1,'sine',.2,90);clink(.03,.05)},
  win(l){if(l<=0){shower(4,.3,.05);bell(note(5)*2,.05,.6,.06);return}
   if(l===1){shower(10,.7,.055);[5,7,9].forEach((s,i)=>pluck(note(s),i*.09,.5,.07));bell(880,.3,.7,.05);return}
   if(l===2){shower(22,1.4,.06);arp([2,4,7,9,12],0,.08,(f,t)=>pluck(f,t,.6,.07));[0,.3,.6].forEach(t=>bell(880,t,.8,.06));brass(note(2),.1,.6,.045);brass(note(5),.1,.6,.04);return}
   shower(40,2.4,.065);arp([0,2,4,7,9,12,14],0,.07,(f,t)=>pluck(f,t,.6,.07));[0,.25,.5,.75].forEach(t=>bell(880,t,1,.07));[0,2,5].forEach(s=>brass(note(s),.1,1,.055));brass(note(7),.6,.9,.05)},
  bonus(){for(let k=0;k<8;k++){bell(880,k*.17,.7,.07);bell(1320,k*.17+.04,.5,.035)}shower(18,1.4,.05);[0,2,5].forEach(s=>brass(note(s),1.1,.7,.05));[0,3,7].forEach(s=>brass(note(s+2),1.65,.9,.05))},
  bonusWin(){[[0,2,5],[2,4,7],[0,5,9]].forEach((ch,k)=>ch.forEach(s=>brass(note(s),k*.34,k===2?1.4:.36,.05)));shower(46,2.6,.06);[0,.25,.5,.75,1].forEach(t=>bell(880,1+t,1.1,.07))},
  lose(){tone(330,0,.16,'sine',.06);tone(262,.16,.22,'sine',.05)},
  click(){nz(0,.02,'bandpass',2000,0,4,.07,.001);tone(440,0,.03,'sine',.03)},
  coin(){clink(0,.04)},
  expand(){nz(0,.8,'bandpass',200,2000,1.2,.1,.2);for(let k=0;k<6;k++)bell(880,.4+k*.1,.6,.06);boom(.7,.1);shower(14,1,.05)}},
 /* OCEAN TREASURE: soft harp, glass drops, ship's bell, rolling swells */
 ocean:{
  spinOn(){ticker(n=>{nz(0,.02,'bandpass',n%3===0?950:1250,0,3,.16,.001);tone(n%3===0?280:350,0,.03,'sine',.06,220);if(n%7===4)glass(note([5,7,9,10][n%4])*2,0,.35,.018)},72,14)},
  stop(i){nz(0,.05,'bandpass',800,350,1.2,.26,.001);tone(200,0,.09,'sine',.16,100);pluck(note(5+i),.02,.4,.05)},
  win(l){if(l<=0){[5,7].forEach((s,i)=>pluck(note(s),i*.09,.45,.07));glass(note(9)*2,.15,.5,.03);return}
   const run=l===1?[5,7,9,10]:l===2?[2,4,7,9,12,14]:[0,2,4,7,9,12,14,16,19];
   arp(run,0,.085,(f,t)=>{pluck(f,t,.8,.075);tone(f*2,t,.4,'sine',.02)});
   nz(0,1+l*.4,'bandpass',250,900,.8,.045,.4);if(l>=2){glass(note(12)*2,.5,1,.04);glass(note(16)*2,.7,1,.035)}if(l>=3)[0,2,5].forEach(s=>tone(note(s),.2,1.8,'sine',.04))},
  bonus(){bell(330,0,2,.09);bell(330,.9,2,.07);nz(0,2,'bandpass',200,1400,.9,.09,.8);[0,2,5].forEach(s=>tone(note(s),.2,2.2,'sine',.045));arp([0,4,7,9,12,16],1.2,.11,(f,t)=>pluck(f,t,.9,.07))},
  bonusWin(){arp([0,2,4,7,9,12,14,16,19,21],0,.09,(f,t)=>pluck(f,t,1,.075));nz(0,2,'bandpass',250,1200,.9,.06,.6);[0,2,5].forEach(s=>tone(note(s),.5,2,'sine',.045));bell(330,1.2,1.8,.07)},
  lose(){pluck(note(5),0,.3,.05);pluck(note(2),.14,.4,.045)},
  click(){glass(note(9)*2,0,.2,.025)},
  coin(){glass(note(10)*2,0,.15,.02)},
  expand(){nz(0,1,'bandpass',200,1400,.9,.11,.4);bell(330,.3,1.6,.08);boom(.7,.07)}},
 /* FROZEN FORTUNE: ice crackle, glass chimes, sleigh bells, aurora shimmer */
 frozen:{
  spinOn(){ticker(n=>{nz(0,.02,'highpass',5000,0,1,.12,.001);tone(2600+Math.random()*900,0,.05,'sine',.05,2200);if(n%4===0)nz(0,.06,'bandpass',3200,0,3,.08,.001)},62,12)},
  stop(i){nz(0,.07,'highpass',3200,1500,.8,.3,.001);tone(1700,0,.12,'sine',.1,650);glass(note(5+(i%3)),.02,.4,.04)},
  win(l){if(l<=0){glass(note(7),0,.6,.05);jingle(.1,.04);return}
   const run=l===1?[5,7,9]:l===2?[5,7,9,10,12]:[5,7,9,10,12,14,16];
   arp(run,0,.1,(f,t)=>glass(f*2,t,.9,.05));for(let k=0;k<l*2+1;k++)jingle(k*.18,.04);if(l>=3)sparkle(20,1.5,.04)},
  bonus(){nz(0,1.6,'highpass',1500,8000,.7,.07,.5);[1,1.5,2,3,4].forEach(m=>{tone(note(0)*m*2,0,2.2,'sine',.045);tone(note(0)*m*2*1.005,.1,2.2,'sine',.035)});arp([9,10,12,14,16],.8,.14,(f,t)=>glass(f*2,t,1.1,.05));sparkle(18,1.8,.045)},
  bonusWin(){arp([5,7,9,10,12,14,16,17],0,.1,(f,t)=>glass(f*2,t,1.2,.055));for(let k=0;k<8;k++)jingle(k*.22,.04);sparkle(30,2.4,.04)},
  lose(){glass(note(7),0,.5,.04);glass(note(4),.18,.6,.035)},
  click(){glass(note(10),0,.18,.03)},
  coin(){tone(3200+Math.random()*800,0,.07,'sine',.035)},
  expand(){nz(0,1,'highpass',2000,8000,.8,.1,.3);sparkle(10,.8,.04)}},
 /* WILD WEST: revolver-cylinder clicks, spurs, twangy guitar, church bell, gunshots */
 west:{
  spinOn(){ticker(n=>{const a=n%6===0;nz(0,.014,'bandpass',a?1500:2300,0,4,a?.3:.2,.001);tone(a?260:420,0,.035,'square',a?.05:.03,a?180:300);if(n%6===3)jingle(0,.02)},66,12)},
  stop(i){nz(0,.06,'lowpass',900,200,1,.38,.001);tone(95,0,.14,'sine',.24,55);nz(.02,.02,'bandpass',2000,0,3,.1,.001)},
  win(l){if(l<=0){pluck(note(5),0,.55,.06);pluck(note(5)*1.5,.01,.4,.03);shower(3,.2,.04);return}
   const run=l===1?[2,4,7]:l===2?[2,4,7,9,12]:[0,2,4,7,9,12,14];
   arp(run,0,.1,(f,t)=>{pluck(f,t,.6,.07);pluck(f*1.5,t+.012,.4,.035)});shower(l*8,.4+l*.5,.05);jingle(.05,.05);if(l>=3){gun(.7,.12);gun(.95,.1)}},
  bonus(){nz(0,1.6,'bandpass',500,900,2,.05,.6);[0,.9,1.8].forEach(t=>bell(196,t,1.6,.11));gun(2.7,.2);zap(1800,300,2.9,.5,.04,'sine')},
  bonusWin(){arp([0,4,7,9,12,16],0,.12,(f,t)=>pluck(f,t,.7,.08));shower(30,2,.055);gun(.9,.16);gun(1.05,.14);jingle(1,.05);bell(392,1.4,1.4,.08)},
  lose(){tone(520,0,.5,'sine',.07,190);tone(525,0,.5,'triangle',.03,185)},
  click(){nz(0,.015,'bandpass',2200,0,4,.1,.001)},
  coin(){clink(0,.035)},
  expand(){nz(0,.8,'bandpass',300,1200,1,.1,.1);gun(.5,.16)}},
 /* DRAGON DYNASTY: wood blocks, temple gongs, plucked strings, taiko drums, firecrackers */
 dragon:{
  spinOn(){ticker(n=>{const hi=n%2;nz(0,.035,'bandpass',hi?1250:760,0,6,.26,.001);tone(hi?330:210,0,.06,'sine',.12,hi?250:150);if(n%8===0)tone(note(0)*2,0,.15,'triangle',.03)},80,14)},
  stop(i){tone(150,0,.2,'sine',.26,80);nz(0,.05,'bandpass',600,0,2,.18,.001);gong(note(0),.02,.5,.025)},
  win(l){if(l<=0){pluck(note(7),0,.5,.07);pluck(note(9),.1,.5,.06);return}
   const run=l===1?[5,7,9,12]:l===2?[2,4,7,9,12,14,16]:[0,2,4,7,9,12,14,16,19];
   arp(run,0,.07,(f,t)=>{pluck(f*2,t,.7,.07);tone(f*2,t,.3,'sine',.03)});if(l>=2)gong(note(0),0,2,.08);if(l>=3){boom(.3,.1);for(let k=0;k<12;k++)nz(.8+k*.045,.03,'bandpass',3000,0,2,.1,.001)}},
  bonus(){gong(note(0),0,3,.14);let t=.6;for(let k=0;k<14;k++){boom(t,.06+k*.006);t+=Math.max(.05,.18-k*.01)}zap(110,55,1.9,1.2,.07,'sawtooth');nz(1.9,1.3,'lowpass',700,150,1,.12,.2);gong(note(0)*1.5,2.6,2.5,.1)},
  bonusWin(){gong(note(0),0,3,.13);arp([0,2,4,7,9,12,14,16,19,21],.2,.08,(f,t)=>pluck(f*2,t,.8,.07));for(let k=0;k<30;k++)nz(.6+Math.random()*1.8,.025,'bandpass',2500+Math.random()*2000,0,2,.12,.001);gong(note(0)*1.5,1.3,2.5,.09)},
  lose(){gong(note(0),0,1.2,.05)},
  click(){nz(0,.03,'bandpass',900,0,6,.12,.001)},
  coin(){pluck(note(10),0,.2,.04)},
  expand(){gong(note(0),0,2,.1);boom(.1,.12)}},
 /* COSMIC VOYAGE: soft synth pads, glass pings and sparkle arps, smooth warp swells */
 cosmic:{
  spinOn(){ticker(n=>{const sc=[0,2,4,7,9,12,9,7][n%8];tone(note(sc)*2,0,.07,'triangle',.035);if(n%8===0)tone(note(0),0,.12,'sine',.07)},105,8)},
  stop(i){tone(note(0),0,.14,'sine',.2,note(0)*.6);glass(note(5+i)*2,.02,.45,.035);nz(0,.03,'bandpass',1500,0,2,.08,.001)},
  win(l){if(l<=0){glass(note(7)*2,0,.6,.05);glass(note(9)*2,.1,.6,.04);return}
   const run=l===1?[0,4,7,12]:l===2?[0,2,4,7,9,12,16]:[0,2,4,7,9,12,14,16,19,21];
   arp(run,0,.07,(f,t)=>{tone(f*2,t,.28,'triangle',.05);glass(f*4,t+.01,.4,.022)});sparkle(l*5,.5+l*.5,.035);if(l>=2)[0,4,7].forEach(s=>tone(note(s),.2,1.4,'sine',.04))},
  bonus(){nz(0,1.6,'bandpass',150,4200,1,.1,.5);[0,4,7,12].forEach((s,i)=>tone(note(s),.1+i*.12,2,'sine',.05));arp([0,4,7,12,16,19,24],1.1,.09,(f,t)=>{tone(f*2,t,.4,'triangle',.05);glass(f*4,t,.5,.025)});sparkle(14,1.8,.04)},
  bonusWin(){arp([0,4,7,12,7,12,16,19,24],0,.09,(f,t)=>{tone(f*2,t,.4,'triangle',.05);tone(f,t,.5,'sine',.04)});[0,4,7].forEach(s=>tone(note(s),.4,2.2,'sine',.045));nz(0,1.8,'bandpass',200,3500,1,.07,.5);sparkle(28,2.4,.04)},
  lose(){tone(note(4),0,.35,'sine',.06,note(0));glass(note(0)*2,.1,.4,.025)},
  click(){tone(note(9)*2,0,.06,'sine',.03)},
  coin(){glass(note(10)*2,0,.12,.02)},
  expand(){nz(0,1.2,'bandpass',150,4000,1,.1,.3);[0,4,7].forEach(s=>tone(note(s),0,1.2,'sine',.05));sparkle(8,.8,.035)}}};
const cur=()=>SFX[theme]||SFX.classic;
const sfx={spinOn:()=>cur().spinOn(),spinOff(){clearTimeout(tickT);tickT=null;mot=null},stop:i=>cur().stop(i),win:l=>cur().win(l),bonus:()=>cur().bonus(),coin:()=>cur().coin(),bonusWin:()=>cur().bonusWin(),lose:()=>cur().lose(),click:()=>cur().click(),expand:()=>cur().expand()};

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
 const R=final.length,prev=[...st.children].slice(-R).map(e=>e.dataset.k);while(prev.length<R)prev.push(rnd());
 const n=14+Math.floor(Math.random()*6);let h=col3(prev);for(let i=0;i<n;i++)h+=cell(rnd());h+=col3(final);
 st.style.transition='none';st.style.transform='translateY(0)';st.innerHTML=h;void st.offsetHeight;reel.classList.add('go');
 /* Spin with the Web Animations API, not a CSS transition: the app's "prefers-reduced-motion" rule in style.css sets transition:none!important, which made the reels sit still and snap for anyone with OS-level reduced motion (Windows animation effects off, macOS/iOS Reduce Motion). The in-app Reduce motion switch still skips the spin (calm() above). */
 const dist=(n+R)*(st.firstElementChild.offsetHeight||H),ease='cubic-bezier(.2,.8,.2,1)';let done=false,anim=null;
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
.sl-wrap[data-th="classic"] .sl-reels{background:var(--sf2);border-color:var(--bd)}.sl-wrap[data-th="classic"] .sl-fs{background:linear-gradient(90deg,#f5c542,#e8a317);color:#3a2a00}.sl-wrap[data-th="classic"].fs .sl-reels{box-shadow:0 0 0 2px #f5c542,0 0 20px rgba(245,197,66,.45),inset 0 2px 10px rgba(0,0,0,.18)}.sl-wrap[data-th="classic"] .sl-th .chip.on,.sl-wrap[data-th="classic"] .sl-auto .chip.on,.sl-wrap[data-th="classic"] .sl-go{color:var(--abx,#fff)}.sl-c .cr{display:block}.sl-ptr .cr{flex:none}.sl-em{display:block;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.sl-reels{position:relative}.sl-pl{position:absolute;left:0;top:0;pointer-events:none;z-index:3;overflow:visible}
.sl-auto{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px}.sl-ar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px}.sl-th .chip{white-space:nowrap}.sl-auto .mu{font-size:12px}.sl-auto .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}`;
 document.head.appendChild(st)}

function openSlots(){
 if(!ME)return;slCss();let rows=3;
 const start=Array.from({length:NR},()=>[rnd(),rnd(),rnd()]);
 const m=modal(`<div class="sl-wrap" data-th="${theme}"><div class="sl-top"><h3>Slots</h3><button class="chip" id="slmu" data-slmute></button></div><div class="sl-th" id="slth"></div><div class="sl-bal mu">Balance <b id="slb"></b> SP<span id="slcr"></span></div><div class="sl-fs" id="slfs" hidden></div><div class="sl-rw"><div class="sl-svp" id="slsv" hidden></div><div class="sl-reels" id="slr">${start.map(c=>`<div class="sl-reel"><div class="sl-strip">${col3(c)}</div></div>`).join('')}</div></div><div class="sl-msg" id="slm"></div><div class="sl-bets" style="flex-direction:column;align-items:center;gap:4px"><div class="mu" style="font-size:12px">Denom (SP per credit)</div><div class="seg" id="sld"></div><div class="mu" style="font-size:12px">Lines</div><div class="seg" id="sll"></div><div class="mu" style="font-size:12px">Credits per line</div><div class="seg" id="slc"></div><div class="row sp" style="width:100%;margin-top:4px"><span id="sltot" class="mu"></span><button class="chip" data-slmax>Max bet</button></div></div><button class="pri sl-go" id="slgo"></button><div class="sl-auto" id="slau"></div><button class="chip sl-svre" id="slsvre" data-svre hidden>Out of SP? Try a wager saver</button><button class="chip sl-info" id="slinfo">Paytable &amp; paylines</button><div class="sl-pt" id="slpt" hidden></div><p class="sl-rg"><b>Gambling can be addictive. Play responsibly.</b> Need help? Call <a href="tel:18004262537">1-800-GAMBLER</a> (1-800-426-2537) or text 800GAM, 24/7.</p></div>`);
 const ptHtml=()=>`<div class="sl-pth">Line pays (x credits bet per line, 3 / 4 / 5 in a row from the left)</div>${Object.keys(PAY).map(k=>`<div class="sl-ptr"><span>${sym(k,22)} ${tn(k)[1]}</span><b>${PAY[k].join(' / ')}</b></div>`).join('')}<div class="sl-ptr"><span>${sym('S',22)} ${SCN()} ×3 anywhere</span><b>${TH().name} bonus</b></div><div class="sl-pth" style="margin-top:12px">${TH().name} bonus: ${TH().bonus.name}</div><div class="sl-note">3 ${SCP()} anywhere start the bonus, and it costs nothing. ${TH().bonus.d} Free spin multipliers: ${TH().bonus.m.map(x=>'×'+x).join(' ')}.${TH().bonus.r.some(x=>x>3)?' The reels open up to 5 × 6, and the 9 paylines play again on the lower 3 rows (up to 18 lines).':''} Land 3 more ${SCP()} during the bonus for another full round (up to 4 rounds). Every machine has its own bonus. Total bet = denom × lines × credits per line. Bigger denoms bet more, win more, and pay back a little better.</div><div class="sl-pth" style="margin-top:12px">Paylines · play 1, 3, 5 or 9 (in this order)</div><div class="sl-lines">${LINES.map((l,i)=>`<div>${mini(l)}<small>${LNAME[i]}</small></div>`).join('')}</div>`;
 const $m=s=>m.querySelector(s),bal=v=>{$m('#slb').textContent=Number(v).toLocaleString();$m('#slcr').textContent=' · '+Math.floor(v/denom).toLocaleString()+' credits'};
 const setRows=async n=>{if(n===rows)return;const from=rows,rs=[...$m('#slr').children],hh=k=>`calc(var(--slh,56px)*${k})`;rows=n;
  const h0=rs.map(r=>r.offsetHeight);
  rs.forEach(r=>{const st=r.firstElementChild;st.style.transition='none';st.style.transform='none';const ks=[...st.children].map(e=>e.dataset.k).slice(0,n);while(ks.length<n)ks.push(rnd());st.innerHTML=col3(ks);r.style.height=hh(n)});
  if(n>from)sfx.expand();else sfx.click();
  if(calm())return;
  const an=rs.map((r,i)=>{try{return r.animate([{height:h0[i]+'px'},{height:r.offsetHeight+'px'}],{duration:750,easing:'cubic-bezier(.2,.8,.2,1)'}).finished}catch(e){return null}});
  await Promise.all(an.filter(Boolean).map(q=>q.catch(()=>{})));await wait(200)};
 const fit=()=>{if(S.novas<MINBET)return;while(total()>S.novas){if(cpl>1)cpl=CPLS[CPLS.indexOf(cpl)-1];else if(lines>1)lines=LNS[LNS.indexOf(lines)-1];else if(denom>1)denom=DENOMS[DENOMS.indexOf(denom)-1];else break}};
 const lk=()=>busy||autoOn;
 const seg=(a,cur,at,lab,ok)=>a.map(v=>`<button data-${at}="${v}" class="${v===cur?'on':''}" ${lk()||!ok(v)?'disabled':''}>${lab(v)}</button>`).join('');
 const defMsg=()=>'<span>'+TH().name+' · 3 '+SCP()+' = '+TH().bonus.name+'!</span><small class="sl-sub">'+TH().bonus.d+'</small>';
 const uiExtra=()=>{$m('#slth').innerHTML=TORDER.map(k=>`<button class="chip ${k===theme?'on':''}" data-slth="${k}" ${lk()?'disabled':''}>${THEMES[k].s[5][0]} ${THEMES[k].name}</button>`).join('');
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
 FX_DB.rpc('slots_saver_status').then(q=>{if(q.error||!q.data)return;wsv=q.data.saver_spins||0;if(q.data.chance_max>0)cl=[+q.data.chance_min,+q.data.chance_max];if(m.isConnected)draw()}).catch(()=>{});
 m.addEventListener('click',e=>{const b=e.target.closest('[data-sld],[data-sll],[data-slc],[data-slmax]');if(e.target.closest('[data-slmute]')){muted=!muted;try{localStorage.setItem('fx-slm',muted?'1':'0')}catch(x){}if(!muted)sfx.click();draw();return}
  const tg=e.target.closest('[data-sltg]');if(tg){if(tg.dataset.sltg==='bonus')stopBonus=!stopBonus;else stopBig=!stopBig;draw();return}
  const th=e.target.closest('[data-slth]');if(th&&!busy&&!autoOn){theme=th.dataset.slth;try{localStorage.setItem('fx-slt',theme)}catch(x){}$m('.sl-wrap').dataset.th=theme;m.querySelectorAll('.sl-strip').forEach(st=>{st.innerHTML=[...st.children].map(c=>cell(c.dataset.k)).join('')});$m('#slpt').innerHTML=ptHtml();$m('#slm').innerHTML=defMsg();sfx.click();draw();return}
  const au=e.target.closest('[data-slau]');if(au&&!busy&&!autoOn){autoLeft=+au.dataset.slau;autoOn=true;ac();draw();autoLoop();return}
  if(e.target.closest('#slgo')&&autoOn){autoOn=false;autoLeft=0;draw();return}
  if(b&&!busy&&!autoOn){if(b.dataset.sld)denom=+b.dataset.sld;else if(b.dataset.sll)lines=+b.dataset.sll;else if(b.dataset.slc)cpl=+b.dataset.slc;else{lines=9;cpl=10}draw();return}if(e.target.closest('#slinfo')){const p=$m('#slpt');if(p.hidden)p.innerHTML=ptHtml();p.hidden=!p.hidden;return}if(e.target.closest('[data-svgo]')){gamble();return}if(e.target.closest('[data-svno]')){declined=true;draw();return}if(e.target.closest('[data-svre]')){declined=false;draw();return}if(e.target.closest('#slgo'))spin(wsv>0)});
 const clearHi=()=>{m.querySelectorAll('.sl-c.hit,.sl-c.dim').forEach(c=>c.classList.remove('hit','dim'));m.querySelectorAll('.sl-pl').forEach(e=>e.remove())};
 /* draw each winning payline across the reels, so you can see exactly which line paid and how far it ran */
 const PLC=['#ffd43b','#4dabf7','#ff6b6b','#69db7c','#da77f2','#ffa94d','#3bc9db','#f783ac','#a9e34b'];
 const drawLines=(wins,reels)=>{try{const rs=[...reels.children];if(!rs.length)return;const W=reels.clientWidth,Ht=reels.clientHeight,ch=rs[0].clientHeight/rows;
  const pts=(w)=>{const a=[];for(let c=0;c<w.count;c++){const r=rs[c];a.push((r.offsetLeft+r.offsetWidth/2).toFixed(1)+','+(r.offsetTop+(lineRow(w.line,c)+.5)*ch).toFixed(1))}return a.join(' ')};
  const g=wins.map(w=>{const col=PLC[w.line%PLC.length],p=pts(w);return `<polyline points="${p}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${p}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}).join('');
  reels.insertAdjacentHTML('beforeend',`<svg class="sl-pl" width="${W}" height="${Ht}" viewBox="0 0 ${W} ${Ht}" aria-hidden="true">${g}</svg>`)}catch(e){}};
 /* a line that matched 3+ from the left but was not active (you played fewer than 9 lines) pays nothing: tell the player so it does not look like a missed win */
 const missHint=(g,ln)=>{if(!Array.isArray(g)||ln>=9)return'';const out=[];for(let i=ln;i<9;i++){const L=LINES[i],b=g[0]&&g[0][L[0]];if(!b||b==='S')continue;let n=1;while(n<5&&g[n]&&g[n][L[n]]===b)n++;if(n>=3)out.push(LNAME[i]+' '+n+'×')}return out.length?'<small class="sl-sub" style="color:var(--sla);font-weight:800">Not paid, line not active: '+out.join(', ')+'. Play 9 lines to cover them.</small>':''};
 const hilite=(wins,reels)=>{const rs=[...reels.children];const keep=new Set();wins.forEach(w=>{for(let c=0;c<w.count;c++)keep.add(c+','+lineRow(w.line,c))});
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
   $m('.sl-wrap').classList.remove('fs');$m('#slfs').hidden=true;clearHi();await setRows(3);if(!m.isConnected){applyNovas(r.novas,null);busy=false;return{ok:false}}reels.classList.add('win');
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
  const U=TH().bonus.unit,head=(n,x)=>{bar.innerHTML='<span>'+U+' <b>'+n+'</b> / '+total+(x?' · ×'+x:'')+(rows>3?' · 5 × '+rows:'')+'</span><span>Bonus win <b>+'+run.toLocaleString()+'</b> SP</span>'};
  wrap.classList.add('fs');bar.hidden=false;$m('#slgo').textContent='Free spins…';head(1,r.free.spins[0]&&r.free.spins[0].x);
  for(const f of r.free.spins){
   if(!m.isConnected)return false;
   clearHi();reels.className='sl-reels';msg.textContent='';
   if((f.rows||3)!==rows){reels.classList.add('bonus');msg.innerHTML=(TH().bonus.open||'THE REELS OPEN UP')+'<small class="sl-sub">5 reels × '+f.rows+' rows · lower rows pay too</small>';await setRows(f.rows||3);reels.classList.remove('bonus');if(!m.isConnected)return false;await wait(calm()?200:500);msg.textContent=''}
   head(f.n,f.x);
   sfx.spinOn();await Promise.all([...reels.children].map((el,i)=>runReel(el,f.reels[i],650+i*190).then(()=>sfx.stop(i))));sfx.spinOff();
   if(!m.isConnected)return false;
   if(f.wins.length)hilite(f.wins,reels);
   if(f.retrigger){const add=f.total-total;total=f.total;head(f.n,f.x);reels.classList.add('bonus');sfx.bonus();msg.innerHTML='+'+add+' FREE SPINS!<small class="sl-sub">'+total+' in total</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}await wait(calm()?400:1500);reels.classList.remove('bonus');if(!m.isConnected)return false}
   run=f.run;head(f.n,f.x);bal(S.novas-stake+(r.line_pay||0)+run);
   if(f.pay>0){reels.classList.add('win');sfx.win(lvl(f.pay,total0()));msg.innerHTML=winMsg(f.wins,f.pay,stake);try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}await wait(calm()?250:1150)}
   else await wait(calm()?150:500)}
  return m.isConnected}
 const winMsg=(wins,pay,st)=>{const best=wins.slice().sort((a,b)=>b.pay-a.pay)[0],tier=st?(pay>=MEGAX*st?'MEGA WIN! ':pay>=BIGX*st?'BIG WIN! ':''):'';return tier+(wins.length>1?wins.length+' lines! ':'')+'+'+pay.toLocaleString()+' SP<small class="sl-sub">'+(best?lname(best.line)+' · '+best.count+'× '+(tn(best.sym)[0]?tn(best.sym)[0]+' ':'')+tn(best.sym)[1]:'')+'</small>'};
 const countUp=(el,to,ms,snd)=>new Promise(res=>{const t0=performance.now();let lc=0;const tick=t=>{const p=ms?Math.min(1,(t-t0)/ms):1;if(snd&&t-lc>70){lc=t;sfx.coin()}el.textContent='+'+Math.round(to*p).toLocaleString()+' SP';p<1&&el.isConnected?requestAnimationFrame(tick):res()};requestAnimationFrame(tick)})}
document.addEventListener('click',e=>{if(e.target.closest('[data-slots]'))openSlots()});
window.openSlots=openSlots;
})();
