/* Slots + Sidelyne FREE SPINS bonus. Every spin (and every free spin) is decided by the server (supabase/slots.sql); this file only plays the animation. */
(()=>{
/* Server ids of the 6 symbol tiers, lowest to highest pay. Each theme draws its own icon on every tier (see THEMES). */
const SYM=['t1','t2','t3','t4','t5','t6'],H=56,MINBET=1,MAXBET=100000,SAVER_STAKE=25,NR=5;
/* THEMES: s = [emoji,name] for each tier (low to high). bonus.m is for display only; the real multipliers live in supabase/slots.sql (slots_bonus_mults). */
const THEMES={
 classic:{name:'Lucky Classic',a:'var(--ab)',b:'var(--ab)',root:262,s:[['🍒','Cherry'],['🍋','Lemon'],['🔔','Bell'],['🍀','Clover'],['💎','Diamond'],['7️⃣','Lucky Seven']],sc:{e:'⭐',n:'Lucky Star',p:'Lucky Stars'},bonus:{name:'LUCKY SEVENS',unit:'Spin',m:[1,1,1,2,2,2,3],r:[3,3,3,3,3,3,3],d:'7 free spins. The multiplier steps up ×1, ×2, ×3 and the last spin pays ×3.'}},
 gold:{name:'Gold Rush',a:'#d9a21b',b:'#8a5a00',root:262,s:[['⛏️','Pickaxe'],['🪔','Lantern'],['🚂','Steam train'],['🧭','Compass'],['💎','Gem'],['💰','Gold sack']],sc:{e:'🪙',n:'Gold Nugget',p:'Gold Nuggets'},bonus:{name:'SHAFT BLAST',unit:'Blast',m:[1,1,1,1,2],r:[6,6,6,6,6],open:'THE SHAFT BLASTS OPEN',d:'Dynamite! The reels blast open from 3 rows to 6 rows deep for all 5 free spins, with a second set of paylines on the lower rows. The last blast pays ×2.'}},
 ocean:{name:'Ocean Treasure',a:'#14b8c4',b:'#0b6e80',root:294,s:[['🐚','Seashell'],['🦀','Crab'],['⚓','Anchor'],['🐙','Octopus'],['🦈','Shark'],['🐋','Whale']],sc:{e:'🦪',n:'Pearl Oyster',p:'Pearl Oysters'},bonus:{name:'PEARL DIVE',unit:'Dive',m:[1,1,1,1,1,2,2,3],r:[3,3,3,3,3,3,3,3],d:'8 dives, each one deeper. It pays ×1 near the surface, ×2 below, and ×3 on the ocean floor.'}},
 frozen:{name:'Frozen Fortune',a:'#4f9cf5',b:'#1d4f9e',root:330,s:[['🧊','Ice cube'],['☃️','Snowman'],['🐧','Penguin'],['🦌','Reindeer'],['🏔️','Glacier'],['❄️','Snowflake']],sc:{e:'🌌',n:'Aurora',p:'Auroras'},bonus:{name:'AURORA STORM',unit:'Storm',m:[2,4,6],r:[3,3,3],d:'Only 3 storms, but they build fast: ×2, ×4, then a ×6 whiteout.'}},
 west:{name:'Wild West',a:'#b45309',b:'#7c2d12',root:247,s:[['🌵','Cactus'],['🥾','Boot'],['🐎','Horse'],['🐂','Longhorn'],['🐍','Rattlesnake'],['🤠','Cowboy']],sc:{e:'📜',n:'Wanted Poster',p:'Wanted Posters'},bonus:{name:'BOUNTY HUNT',unit:'Chase',m:[1,1,1,1,4,4],r:[3,3,3,3,3,3],d:'6 chases. Four warm-up spins at ×1, then you catch the outlaw and the last two pay ×4.'}},
 dragon:{name:'Dragon Dynasty',a:'#dc2626',b:'#7f1d1d',root:220,s:[['🏮','Lantern'],['🎋','Bamboo'],['🐟','Koi'],['🍵','Tea'],['🐼','Panda'],['🐉','Dragon']],sc:{e:'🧧',n:'Red Envelope',p:'Red Envelopes'},bonus:{name:'LANTERN FESTIVAL',unit:'Lantern',m:[1,1,1,1,1,1,2,2,2],r:[3,3,3,3,3,3,3,3,3],d:'9 lanterns float up. The first 6 pay ×1, and the last 3 glow at ×2.'}},
 cosmic:{name:'Cosmic Voyage',a:'#7c3aed',b:'#3b1a8f',root:350,s:[['☄️','Comet'],['🛰️','Satellite'],['🪐','Ringed planet'],['👽','Alien'],['🌙','Moon'],['🚀','Rocket']],sc:{e:'🌠',n:'Shooting Star',p:'Shooting Stars'},bonus:{name:'SUPERNOVA',unit:'Pulse',m:[1,2,4,5],r:[3,3,3,3],d:'4 pulses and the star is about to go. ×1, ×2, ×4, then the supernova at ×5.'}},
 candy:{name:'Sugar Rush',a:'#ec4899',b:'#9d174d',root:392,s:[['🍬','Candy'],['🍭','Lollipop'],['🧁','Cupcake'],['🍩','Donut'],['🍦','Ice cream'],['🎂','Cake']],sc:{e:'🎟️',n:'Golden Ticket',p:'Golden Tickets'},bonus:{name:'SWEET STREAK',unit:'Treat',m:[1,2,3,3,3],r:[3,3,3,3,3],d:'5 treats and the sugar keeps building: ×1, ×2, then three straight spins at ×3.'}},
 viking:{name:'Viking Voyage',a:'#64748b',b:'#1e293b',root:233,s:[['🪓','Axe'],['🛡️','Shield'],['⛵','Longship'],['🍺','Mead'],['🐺','Wolf'],['🔨','Mjölnir']],sc:{e:'📯',n:'Battle Horn',p:'Battle Horns'},bonus:{name:'RAGNAROK',unit:'Raid',m:[2,2,2,3],r:[3,3,3,6],open:'THE SHIELD WALL OPENS',d:'4 raids. Three at ×2, then the shield wall breaks open to 6 rows deep for a final ×3 raid.'}},
 egypt:{name:"Pharaoh's Gold",a:'#ca8a04',b:'#78350f',root:277,s:[['🪲','Scarab'],['🐫','Camel'],['🏺','Urn'],['🔺','Pyramid'],['👁️','Eye of Horus'],['👑','Pharaoh']],sc:{e:'🗝️',n:'Golden Key',p:'Golden Keys'},bonus:{name:'SANDS OF TIME',unit:'Chamber',m:[1,1,1,1,1,1],r:[6,6,6,6,6,6],open:'THE TOMB OPENS',d:'The tomb opens and the reels grow from 3 rows to 6 rows deep for all 6 free spins, with a second set of paylines on the lower rows.'}},
 jungle:{name:'Jungle Jackpot',a:'#16a34a',b:'#14532d',root:311,s:[['🍌','Banana'],['🦜','Parrot'],['🐒','Monkey'],['🐍','Snake'],['🐯','Tiger'],['🦍','Gorilla']],sc:{e:'🗿',n:'Golden Idol',p:'Golden Idols'},bonus:{name:'STAMPEDE',unit:'Charge',m:[1,1,2,4,4],r:[3,3,3,3,3],d:'5 charges. The herd warms up at ×1, then ×2, and the last two stampede at ×4.'}},
 neon:{name:'Neon Nights',a:'#d946ef',b:'#4c1d95',root:370,s:[['🎲','Dice'],['🃏','Joker'],['🍸','Martini'],['🎤','Mic'],['🎰','Jackpot'],['🤑','High roller']],sc:{e:'🌃',n:'City Lights',p:'City Lights'},bonus:{name:'OVERDRIVE',unit:'Gear',m:[1,2,3,6],r:[3,3,3,3],d:'4 gears and the engine screams: ×1, ×2, ×3, then a ×6 redline.'}},
 spooky:{name:'Haunted Manor',a:'#f97316',b:'#431407',root:208,s:[['🕸️','Cobweb'],['🦇','Bat'],['🎃','Pumpkin'],['👻','Ghost'],['🧛','Vampire'],['💀','Skull']],sc:{e:'🕯️',n:'Haunted Candle',p:'Haunted Candles'},bonus:{name:'THE HAUNTING',unit:'Fright',m:[1,1,1,1,1,1,1,1,2,2],r:[3,3,3,3,3,3,3,3,3,3],d:'10 frights. Eight quiet creeps at ×1 and then the manor wakes up for two ×2 finishers.'}},
 pirate:{name:'Pirate Plunder',a:'#b91c1c',b:'#450a0a',root:247,s:[['🦜','Parrot'],['🗡️','Cutlass'],['🧭','Compass'],['🗺️','Treasure map'],['🏴‍☠️','Jolly Roger'],['🪙','Doubloon']],sc:{e:'🏝️',n:'Treasure Island',p:'Treasure Islands'},bonus:{name:'BROADSIDE',unit:'Cannon',m:[1,1,1,1,2,2,4],r:[3,3,3,3,3,3,3],d:'7 cannon shots. Four warm-up volleys at ×1, two at ×2, and the final broadside pays ×4.'}},
 magic:{name:"Wizard's Realm",a:'#6366f1',b:'#1e1b4b',root:330,s:[['🕯️','Candle'],['📖','Spellbook'],['🔮','Crystal ball'],['🧪','Potion'],['🦉','Owl'],['🧙','Wizard']],sc:{e:'🪄',n:'Magic Wand',p:'Magic Wands'},bonus:{name:'SPELLBOUND',unit:'Spell',m:[2,2,3,5],r:[3,3,3,3],d:'4 spells that grow stronger. ×2, ×2, ×3, then the grand spell at ×5.'}},
 luau:{name:'Tropical Luau',a:'#f59e0b',b:'#b45309',root:392,s:[['🍍','Pineapple'],['🥥','Coconut'],['🌺','Hibiscus'],['🏄','Surfer'],['🌋','Volcano'],['🦜','Macaw']],sc:{e:'🌴',n:'Palm Tree',p:'Palm Trees'},bonus:{name:'LAVA FLOW',unit:'Eruption',m:[1,1,1,1,1,1,3,3],r:[3,3,3,3,3,3,3,3],d:'8 eruptions. Six slow at ×1, then the volcano blows and the last two pay ×3.'}},
 racing:{name:'Turbo Racer',a:'#ef4444',b:'#1f2937',root:370,s:[['🛞','Tire'],['⛽','Fuel'],['🏁','Flag'],['🏎️','Race car'],['🏆','Trophy'],['🏍️','Superbike']],sc:{e:'🚦',n:'Green Light',p:'Green Lights'},bonus:{name:'CHECKERED FLAG',unit:'Lap',m:[1,1,2,2,2,4],r:[3,3,3,3,3,3],d:'6 laps and the pace keeps rising: ×1, ×1, three at ×2, and the final lap at ×4.'}},
 olympus:{name:'Gods of Olympus',a:'#3b82f6',b:'#1e3a8a',root:196,s:[['🍇','Grapes'],['🏺','Amphora'],['🏛️','Temple'],['🦅','Eagle'],['🔱','Trident'],['⚡','Zeus']],sc:{e:'🌩️',n:'Storm Cloud',p:'Storm Clouds'},bonus:{name:'THUNDER OF ZEUS',unit:'Bolt',m:[2,2,20],r:[3,3,3],d:'3 bolts from the sky. Two warm-up strikes at ×2, then Zeus hurls the final thunderbolt and it pays ×20. Rare to trigger, huge when it lands.'}},
 heist:{name:'Diamond Heist',a:'#0d9488',b:'#042f2e',root:185,s:[['🔦','Flashlight'],['🔑','Key'],['🕶️','Shades'],['🚗','Getaway car'],['💎','Diamond'],['🏦','Vault']],sc:{e:'🚨',n:'Alarm',p:'Alarms'},bonus:{name:'VAULT CRACK',unit:'Safe',m:[2,2,7],r:[3,3,6],open:'THE VAULT DOOR BLASTS OPEN',d:'3 safes. Two quick cracks at ×2, then the vault door blasts open to 6 rows deep and the last safe pays ×7 on both sets of paylines.'}},
 pinball:{name:'OG Pinball',a:'#e11d48',b:'#312e81',root:220,s:[['🔴','Pop bumper'],['🎯','Drop target'],['🔔','Bell'],['⭐','Rollover star'],['🏆','High score'],['🎱','Steel ball']],sc:{e:'💎',n:'Pinball Diamond',p:'Pinball Diamonds'},bonus:{name:'PINBALL BONUS',unit:'Shot',m:[1,1,1,3,6],r:[3,3,3,3,3],d:'A diamond on the right reel launches the pinball bonus: pull the plunger and shoot the ball into the pockets or the bonus hole. Bets of 100+ chips get 2 shots and 1,000+ chips get 5 shots.'}}};
/* SYMBOL ART: every symbol is a glossy tile in the machine's colors with a glyph on it (higher tiers get a gold rim). The bonus scatter is a gold starburst medallion so it is easy to spot. All inline SVG, no image files. */
const tile=(e,i,z)=>{const rim=i>=4?'#ffd86b':'rgba(255,255,255,.35)',id='slt'+theme+i;return `<svg width="${z}" height="${z}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${TH().a}"/><stop offset="1" style="stop-color:${TH().b}"/></linearGradient></defs><rect x="2" y="2" width="36" height="36" rx="10" fill="url(#${id})" stroke="${rim}" stroke-width="${i>=4?2:1.2}"/><path d="M6 12Q6 5 14 5H26Q34 5 34 12Q20 17 6 12Z" fill="rgba(255,255,255,.22)"/>${e==='7️⃣'?`<text x="20" y="29" text-anchor="middle" font-size="26" font-weight="900" font-family="Georgia,'Times New Roman',serif" fill="#ef233c" stroke="#fff" stroke-width="1.4" paint-order="stroke">7</text>`:`<text x="20" y="27.500" text-anchor="middle" font-size="21" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${e}</text>`}</svg>`};
const medal=(e,z)=>{const pts=[];for(let k=0;k<24;k++){const r=k%2?13.500:16,a=k*Math.PI/12;pts.push((16+r*Math.sin(a)).toFixed(1)+','+(16-r*Math.cos(a)).toFixed(1))}return `<svg width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="slmd" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fff2a8"/><stop offset=".55" stop-color="#f5c542"/><stop offset="1" stop-color="#b8860b"/></radialGradient></defs><polygon points="${pts.join(' ')}" fill="url(#slmd)" stroke="#8a6508" stroke-width=".6"/><circle cx="16" cy="16" r="10.500" fill="#2a1b05" stroke="#ffe680" stroke-width="1"/><text x="16" y="21.500" text-anchor="middle" font-size="14" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${e}</text></svg>`};
const SCN=()=>TH().sc.n,SCP=()=>TH().sc.p;
const TORDER=['classic','gold','ocean','frozen','west','dragon','cosmic','candy','viking','egypt','jungle','neon','spooky','pirate','magic','luau','racing','olympus','heist','pinball'];
let theme='classic';try{const t=localStorage.getItem('fx-slt');if(THEMES[t])theme=t}catch(e){}
const TH=()=>THEMES[theme];
const tn=k=>TH().s[SYM.indexOf(k)]||['?','?'];
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
const LNAME=['Middle row','Top row','Bottom row','V shape','Peak','Step down','Step up','Arch','Bowl'];
const PAY={t6:[34,110,500],t5:[22,70,300],t4:[18,50,200],t3:[14,40,140],t2:[10,28,100],t1:[8,22,70]};
/* OG Pinball is 3 reels x 1 row with ONE payline (supabase/Slots-3.sql, slots_play_p). useP is on while a pinball spin is being shown. */
const PLINES=[[0,0,0]],PNAME=['Payline'],PK=1.61;
let useP=false;
const nrNow=()=>theme==='pinball'?3:5,baseRows=()=>theme==='pinball'?1:3;
const lineRow=(l,c)=>useP?PLINES[l%PLINES.length][c]:LINES[l%9][c]+(l>=9?3:0),lname=l=>useP?PNAME[l%PNAME.length]:LNAME[l%9]+(l>=9?' (lower reels)':'');
const SZ=()=>{try{if(theme==='pinball')return Math.max(40,Math.min(70,Math.floor(((window.innerWidth||375)-132)/3*.62)));return matchMedia('(min-width:900px)').matches?44:36}catch(e){return 36}};
const sym=(k,z=SZ())=>k==='S'?medal(TH().sc.e,Math.round(z*1.32)):tile(TH().s[SYM.indexOf(k)][0],SYM.indexOf(k),Math.round(z*1.1));
const cell=k=>`<div class="sl-c" data-k="${k}">${sym(k)}</div>`;
const rnd=()=>SYM[Math.floor(Math.random()*SYM.length)];
const calm=()=>document.documentElement.classList.contains('rm');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let bet=10,lines=9,busy=false,wsv=0,cl=[.05,.5],declined=false,turbo=false;
try{const b=parseInt(localStorage.getItem('fx-slbet'),10);if(b>=1)bet=Math.min(b,MAXBET);turbo=localStorage.getItem('fx-slturbo')==='1'}catch(e){}
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
/* mk: builds a full sound set from a few parts. tick/stop/inst/fx/bonus/bw/lose/click/coin/expand = the machine's own sounds, runs = note runs for win sizes 0 to 3, gap = seconds between notes */
const mk=o=>({spinOn(){ticker(o.tick,o.ms,12)},stop:o.stop,
 win(l){const run=o.runs[Math.min(l,3)];arp(run,0,o.gap,o.inst);o.fx(l)},bonus:o.bonus,bonusWin:o.bw,lose:o.lose,click:o.click,coin:o.coin,expand:o.expand});
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
  expand(){nz(0,1.2,'bandpass',150,4000,1,.1,.3);[0,4,7].forEach(s=>tone(note(s),0,1.2,'sine',.05));sparkle(8,.8,.035)}},
 /* The 6 newer machines are built from one recipe (mk) so each one gets the full set: spin loop, reel stops, 4 win sizes, bonus intro, bonus win, lose, click, coin, expand. */
 candy:mk({tick:n=>{nz(0,.02,'bandpass',n%3===0?1500:2100,0,3,.14,.001);tone(n%3===0?520:660,0,.04,'sine',.05,n%3===0?420:540);if(n%5===2)glass(note(9+n%3)*2,0,.2,.02)},ms:68,
  stop:i=>{nz(0,.04,'bandpass',1400,700,1.5,.22,.001);tone(420,0,.09,'sine',.14,210);glass(note(5+i)*2,.02,.35,.04)},
  inst:(f,t)=>{glass(f*2,t,.5,.06);tone(f*4,t,.12,'triangle',.02)},gap:.075,runs:[[5,7],[5,7,9,12],[2,4,7,9,12,14,16],[0,2,4,7,9,12,14,16,19,21]],fx:l=>{sparkle(l*6,.4+l*.5,.04);if(l>=2)shower(l*8,1,.045)},
  bonus:()=>{nz(0,1.2,'bandpass',300,3600,1,.08,.4);arp([0,2,4,7,9,12,14,16],.2,.1,(f,t)=>glass(f*2,t,.6,.05));sparkle(16,1.6,.04);[0,4,7].forEach(s=>brass(note(s),1.2,.8,.04))},
  bw:()=>{arp([0,4,7,9,12,16,19,21,24],0,.08,(f,t)=>glass(f*2,t,.8,.06));shower(30,2,.05);sparkle(26,2.2,.04);[0,4,7].forEach(s=>brass(note(s),.9,1.1,.045))},
  lose:()=>{glass(note(7)*2,0,.3,.04);tone(note(2),.12,.35,'sine',.04,note(0))},click:()=>glass(note(10)*2,0,.12,.025),coin:()=>glass(note(11)*2,0,.1,.02),
  expand:()=>{nz(0,.9,'bandpass',300,3000,1,.09,.3);sparkle(10,.8,.04)}}),
 /* VIKING VOYAGE: war drums, oars and longhorns, shield clashes, thunder */
 viking:mk({tick:n=>{const a=n%4===0;nz(0,.03,'lowpass',a?500:900,0,2,a?.3:.16,.001);tone(a?95:140,0,.07,'sine',a?.16:.07,a?60:100);if(n%8===6)nz(0,.05,'bandpass',2500,0,3,.07,.001)},ms:82,
  stop:i=>{boom(0,.16);nz(0,.05,'bandpass',1800,900,2,.2,.001);tone(2400,.01,.05,'square',.02)},
  inst:(f,t)=>{brass(f,t,.35,.045);boom(t,.03)},gap:.11,runs:[[0,5],[0,2,5,7],[0,2,5,7,9,12],[0,2,5,7,9,12,14,17]],fx:l=>{if(l>=1)boom(.05,.08);if(l>=2)[0,.18,.36].forEach(t=>boom(t+.4,.08));if(l>=3)shower(14,1.2,.05)},
  bonus:()=>{let t=0;for(let k=0;k<10;k++){boom(t,.07+k*.008);t+=.17-k*.008}brass(note(0),1.1,1.3,.07);brass(note(5),1.1,1.3,.06);nz(1.1,1.4,'lowpass',900,200,1,.1,.1)},
  bw:()=>{[[0,5],[2,7],[0,5,9]].forEach((ch,k)=>ch.forEach(s=>brass(note(s),k*.4,k===2?1.5:.4,.055)));[0,.4,.8,1.2].forEach(t=>boom(t,.12));shower(26,2,.05)},
  lose:()=>{boom(0,.12);tone(note(0),.1,.5,'sine',.05,note(0)*.7)},click:()=>nz(0,.03,'lowpass',700,0,2,.12,.001),coin:()=>clink(0,.03),
  expand:()=>{nz(0,.8,'lowpass',200,1200,1,.12,.2);boom(.6,.14)}}),
 /* PHARAOH'S GOLD: oud-style plucks, finger cymbals, sand hiss, temple gongs */
 egypt:mk({tick:n=>{nz(0,.045,'highpass',5500,0,.8,n%2?.1:.06,.002);if(n%4===0)tone(note([0,2,4,2][n/4%4|0])*2,0,.1,'triangle',.04);if(n%2)tone(3300,0,.03,'sine',.03)},ms:70,
  stop:i=>{nz(0,.05,'bandpass',700,350,1.3,.24,.001);tone(180,0,.1,'sine',.14,100);bell(note(7+i%3)*2,.02,.3,.025)},
  inst:(f,t)=>{pluck(f,t,.55,.075);pluck(f*1.5,t+.02,.35,.03)},gap:.09,runs:[[0,4],[0,2,4,7],[0,2,4,7,9,12,14],[0,2,4,7,9,12,14,16,19]],fx:l=>{[...Array(l*3+1)].forEach((_,k)=>bell(3000+k*140,k*.09,.35,.03));if(l>=2)gong(note(0),.1,1.6,.07)},
  bonus:()=>{gong(note(0),0,3,.13);nz(0,1.8,'bandpass',900,300,.8,.07,.6);arp([0,2,4,7,9,12],.8,.12,(f,t)=>pluck(f,t,.7,.07));gong(note(0)*1.5,2,2.4,.09)},
  bw:()=>{gong(note(0),0,3,.12);arp([0,2,4,7,9,12,14,16,19,21],.2,.08,(f,t)=>{pluck(f,t,.8,.07);bell(f*2,t,.4,.025)});shower(34,2.4,.055);gong(note(7),1.4,2.4,.08)},
  lose:()=>{pluck(note(4),0,.45,.06);pluck(note(0),.16,.6,.05)},click:()=>bell(2800,0,.12,.03),coin:()=>bell(3600,0,.1,.03),
  expand:()=>{nz(0,1.1,'highpass',3000,800,.8,.09,.3);gong(note(0),.2,1.8,.09);boom(.9,.1)}}),
 /* JUNGLE JACKPOT: bongos, marimba, birdsong, rainforest rattles */
 jungle:mk({tick:n=>{const hi=n%2;tone(hi?330:210,0,.06,'sine',.13,hi?250:150);nz(0,.025,'bandpass',hi?2200:1100,0,3,.16,.001);if(n%6===3)tone(1800+Math.random()*900,0,.07,'sine',.03,2700)},ms:74,
  stop:i=>{tone(150,0,.12,'sine',.2,80);nz(0,.04,'bandpass',900,0,2,.18,.001);tone(note(7+i)*2,.02,.18,'triangle',.04)},
  inst:(f,t)=>{tone(f*2,t,.22,'triangle',.07,f*1.98);tone(f*4,t,.07,'sine',.025)},gap:.075,runs:[[2,4],[0,2,4,7],[0,2,4,7,9,12,14],[0,2,4,7,9,12,14,16,19,21]],fx:l=>{[...Array(l*3+2)].forEach((_,k)=>tone(1500+Math.random()*1800,.05+k*.08,.08,'sine',.035,2800+Math.random()*900));if(l>=2){boom(.1,.08);for(let k=0;k<10;k++)nz(.5+k*.05,.03,'bandpass',3000,0,2,.08,.001)}},
  bonus:()=>{for(let k=0;k<16;k++){tone(k%2?330:210,k*.1,.07,'sine',.12,k%2?250:150);nz(k*.1,.025,'bandpass',k%2?2200:1100,0,3,.14,.001)}[...Array(6)].forEach((_,k)=>tone(1600+k*260,1.2+k*.15,.12,'sine',.04,3000));boom(1.7,.14);arp([0,2,4,7],1.7,.1,(f,t)=>tone(f*2,t,.3,'triangle',.07))},
  bw:()=>{arp([0,2,4,7,9,12,14,16,19,21],0,.07,(f,t)=>{tone(f*2,t,.28,'triangle',.07,f*1.98);boom(t,.025)});shower(28,2,.05);[...Array(10)].forEach((_,k)=>tone(1500+Math.random()*2000,1+k*.12,.1,'sine',.035,3000))},
  lose:()=>{tone(330,0,.14,'triangle',.06,220);tone(220,.14,.3,'triangle',.05,150)},click:()=>tone(420,0,.05,'sine',.08,300),coin:()=>tone(note(10)*2,0,.08,'triangle',.04),
  expand:()=>{nz(0,.9,'bandpass',400,1800,1,.1,.2);boom(.5,.12)}}),
 /* NEON NIGHTS: dance floor kick, synth stabs, laser zaps, arcade chimes */
 neon:mk({tick:n=>{if(n%4===0)tone(120,0,.09,'sine',.18,45);nz(0,.02,'highpass',7000,0,1,n%2?.1:.05,.001);if(n%2===1)tone(note([0,0,4,7][n>>1&3])*2,0,.06,'square',.03)},ms:78,
  stop:i=>{tone(note(0)*2,0,.12,'sawtooth',.06,note(0));nz(0,.04,'bandpass',2400,0,2,.12,.001);boom(0,.09)},
  inst:(f,t)=>{tone(f*2,t,.16,'sawtooth',.045);tone(f*2.01,t,.16,'square',.025)},gap:.065,runs:[[0,7],[0,4,7,12],[0,4,7,12,16,19,24],[0,4,7,12,16,19,24,28]],fx:l=>{zap(300,2400,0,.25,.045,'sawtooth');if(l>=2)zap(2400,200,.3,.4,.04,'square');if(l>=3)shower(16,1.4,.05)},
  bonus:()=>{[0,.45,.9,1.35].forEach(t=>{tone(120,t,.14,'sine',.22,45);zap(200,3000,t+.1,.3,.05,'sawtooth')});arp([0,4,7,12,16,19,24],1.4,.07,(f,t)=>tone(f*2,t,.2,'sawtooth',.05));sparkle(14,1.8,.04)},
  bw:()=>{arp([0,4,7,12,7,12,16,19,24,28],0,.07,(f,t)=>{tone(f*2,t,.22,'sawtooth',.05);tone(f,t,.3,'square',.025)});[0,.28,.56,.84,1.12].forEach(t=>tone(120,t,.14,'sine',.2,45));shower(30,2,.05);sparkle(24,2.2,.04)},
  lose:()=>{zap(700,120,0,.4,.05,'sawtooth')},click:()=>tone(note(9)*2,0,.05,'square',.03),coin:()=>tone(note(11)*2,0,.06,'square',.025),
  expand:()=>{zap(200,3200,0,.9,.06,'sawtooth');boom(.8,.1)}}),
 /* HAUNTED MANOR: creaks, organ, bats, ghostly wails, thunder */
 spooky:mk({tick:n=>{nz(0,.03,'bandpass',n%3===0?420:700+Math.random()*300,0,5,n%3===0?.2:.12,.001);tone(n%3===0?110:150,0,.06,'triangle',.1,n%3===0?80:110);if(n%9===5)tone(1500+Math.random()*500,0,.12,'sine',.025,900)},ms:84,
  stop:i=>{nz(0,.07,'bandpass',500,200,3,.22,.001);tone(95,0,.16,'sine',.2,50);if(i===4)tone(1100,.04,.3,'sine',.03,500)},
  inst:(f,t)=>{tone(f,t,.4,'sawtooth',.03);tone(f*1.01,t,.4,'sine',.04);tone(f*.5,t,.45,'sine',.04)},gap:.12,runs:[[0,3],[0,3,7,10],[0,3,7,10,12,15],[0,3,7,10,12,15,19,22]],fx:l=>{if(l>=1)tone(900,0,.5,'sine',.035,1400);if(l>=2)boom(.4,.1);if(l>=3){tone(1400,.5,.9,'sine',.04,500);nz(.5,1,'bandpass',300,1500,1,.05,.3)}},
  bonus:()=>{[0,.9,1.8].forEach(t=>bell(165,t,1.8,.1));nz(0,2.4,'bandpass',200,900,1,.06,.8);tone(1200,1,1.4,'sine',.04,400);boom(2.6,.18);[0,3,7].forEach(s=>tone(note(s),2.6,1.6,'sawtooth',.03))},
  bw:()=>{arp([0,3,7,10,12,15,19,22],0,.1,(f,t)=>{tone(f,t,.5,'sawtooth',.03);tone(f,t,.55,'sine',.05)});bell(165,1,1.8,.09);shower(24,2,.045);sparkle(14,2,.03)},
  lose:()=>{tone(1000,0,.6,'sine',.05,260);boom(.1,.06)},click:()=>nz(0,.03,'bandpass',600,0,5,.1,.001),coin:()=>glass(note(10)*2,0,.12,.02),
  expand:()=>{nz(0,1.2,'bandpass',200,1000,1,.1,.4);tone(1200,.4,.9,'sine',.04,350);boom(.9,.14)}})};
SFX.pirate=SFX.west;SFX.magic=SFX.spooky;SFX.luau=SFX.jungle;SFX.racing=SFX.neon;
/* GODS OF OLYMPUS: harp plucks, brass fanfares, rolling thunder and lightning cracks */
SFX.olympus=mk({tick:n=>{const a=n%4===0;nz(0,.02,'bandpass',a?700:1500,0,3,a?.22:.14,.001);tone(a?160:300,0,.05,'sine',a?.12:.05,a?110:240);if(n%9===5)nz(0,.08,'highpass',6000,0,1,.05,.001)},ms:66,
 stop:i=>{boom(0,.14);pluck(note(5+i),.02,.5,.05);nz(0,.03,'bandpass',2200,0,2,.1,.001)},
 inst:(f,t)=>{pluck(f*2,t,.6,.06);brass(f,t,.3,.035)},gap:.085,runs:[[5,7],[0,5,7,9],[0,2,5,7,9,10],[0,2,4,5,7,8,9,10]],
 fx:l=>{if(l>=1)zap(2600,200,.05,.25,.04,'sawtooth');if(l>=2){nz(.05,.5,'highpass',3000,800,.7,.12,.002);boom(.2,.1)}if(l>=3){[.5,.9,1.3].forEach(t=>{nz(t,.35,'highpass',3500,500,.7,.14,.002);boom(t+.05,.12)});shower(18,1.6,.05);[0,2,5].forEach(s=>brass(note(s),.4,1.2,.05))}},
 bonus:()=>{nz(0,2.6,'lowpass',500,90,.8,.14,.8);[0,1,1.9].forEach(t=>boom(t,.16));[0,4,7,12].forEach((s,i)=>tone(note(s),.3+i*.15,2.4,'sine',.045));zap(3000,150,2.5,.5,.07,'sawtooth');nz(2.5,.6,'highpass',2500,500,.6,.18,.002);boom(2.55,.2);[0,2,5,9].forEach(s=>brass(note(s),2.7,1.2,.05))},
 bw:()=>{[[0,2,5],[2,4,7],[0,5,9,12]].forEach((ch,k)=>ch.forEach(s=>brass(note(s),k*.34,k===2?1.6:.36,.05)));[0,.4,.8].forEach(t=>{nz(t,.35,'highpass',3500,500,.7,.14,.002);boom(t,.12)});arp([0,2,4,5,7,8,9,10],.3,.09,(f,t)=>pluck(f*2,t,.8,.06));shower(36,2.4,.055);sparkle(20,2.2,.04)},
 lose:()=>{tone(note(4),0,.4,'sine',.06,note(0));boom(.1,.05)},click:()=>tone(note(9)*2,0,.05,'triangle',.03),coin:()=>clink(0,.035),
 expand:()=>{boom(0,.12);nz(0,.8,'bandpass',200,1600,1,.09,.3)}});
/* DIAMOND HEIST: safe-dial clicks, lock bolts, alarm sirens, cash-register bells and coin showers */
SFX.heist=mk({tick:n=>{const a=n%5===0;nz(0,.012,'bandpass',a?2600:3600,0,6,a?.26:.16,.001);tone(a?900:1500,0,.02,'square',a?.025:.015)},ms:58,
 stop:i=>{nz(0,.05,'bandpass',900,300,2,.34,.001);tone(140,0,.1,'sine',.22,70);nz(.03,.02,'highpass',5000,0,1,.1,.001);clink(.04,.04)},
 inst:(f,t)=>{tone(f,t,.18,'triangle',.06,f*.98);tone(f*2,t+.01,.1,'square',.015);nz(t,.01,'bandpass',3000,0,3,.05,.001)},gap:.07,runs:[[3,5],[0,2,4,6],[0,2,4,5,7,9,10],[0,1,2,3,4,5,6,7,8,9,10]],
 fx:l=>{shower(l*8+4,.4+l*.5,.05);if(l>=2)bell(2093,.05,.6,.04);if(l>=3)for(let k=0;k<4;k++){tone(880,k*.4,.2,'square',.03,1180);tone(1180,k*.4+.2,.2,'square',.03,880)}},
 bonus:()=>{let t=0;for(let k=0;k<16;k++){nz(t,.012,'bandpass',3200,0,6,.2,.001);tone(1400,t,.02,'square',.02);t+=Math.max(.04,.16-k*.008)}nz(t,.08,'bandpass',800,300,2,.4,.001);boom(t,.2);for(let k=0;k<6;k++){tone(880,t+.2+k*.3,.15,'square',.04,1250);tone(1250,t+.35+k*.3,.15,'square',.04,880)}[0,3,7].forEach(s=>brass(note(s),t+.2,1.6,.04))},
 bw:()=>{bell(2093,0,1.4,.08);bell(2637,.15,1.4,.07);shower(44,2.6,.06);arp([0,2,4,5,7,9,10],.2,.07,(f,t)=>pluck(f*2,t,.6,.07));[0,2,5].forEach(s=>brass(note(s),.1,.5,.05));[0,3,7].forEach(s=>brass(note(s+2),.7,1.3,.05));sparkle(16,2,.035)},
 lose:()=>{tone(300,0,.5,'sawtooth',.04,150);tone(300,0,.5,'sine',.05,150)},click:()=>nz(0,.012,'bandpass',3200,0,6,.1,.001),coin:()=>clink(0,.04),
 expand:()=>{boom(0,.2);nz(0,1.4,'bandpass',90,500,2,.14,.3);for(let k=0;k<5;k++)nz(.3+k*.18,.04,'bandpass',900,300,2,.3,.001);boom(1.2,.16);shower(14,1,.05)}});
/* OG PINBALL: electromechanical bells, pop-bumper boings, flipper thunks, score-reel chatter and the replay knocker. pull() is the plunger lever. */
const knock=(t,g)=>{nz(t,.07,'lowpass',1800,200,1,g,.001);tone(110,t,.14,'sine',g*.9,55)};
SFX.pinball=mk({tick:n=>{nz(0,.02,'bandpass',1500+Math.random()*600,0,3,.15,.001);tone(n%2?420:540,0,.03,'square',.03,n%2?330:440);if(n%6===3)bell(1976+Math.random()*400,0,.3,.04);if(n%9===7)tone(300,0,.09,'square',.04,800)},ms:62,
 stop:i=>{nz(0,.04,'bandpass',1000,400,2,.3,.001);tone(180,0,.08,'square',.12,100);bell(note(5+i)*2,.02,.35,.05)},
 inst:(f,t)=>{bell(f*4,t,.35,.05);tone(f*2,t,.06,'square',.03,f*3)},gap:.075,runs:[[5,7],[5,7,9,12],[2,4,7,9,10,9],[0,2,4,7,9,10,9,10]],
 fx:l=>{for(let k=0;k<l+1;k++)tone(300,k*.09,.1,'square',.05,800);if(l>=2)[0,1,2,3,4,5].forEach(k=>bell(2093+k*180,.1+k*.06,.5,.05));if(l>=3){[.3,.5,.7].forEach(t=>knock(t,.2));shower(20,1.6,.05)}},
 bonus:()=>{[0,.45,.9].forEach(t=>{knock(t,.2);nz(t+.05,.12,'bandpass',2200,900,3,.1,.001)});arp([0,2,4,5,7,8,9,10],1.3,.07,(f,t)=>{tone(f*2,t,.12,'square',.04,f*2.5);bell(f*4,t,.25,.03)});[0,1,2,3,4,5,6,7].forEach(k=>bell(1760+k*150,2,.8,.04));knock(2,.22);knock(2.2,.22)},
 bw:()=>{for(let k=0;k<44;k++)nz(k*.045,.025,'bandpass',2200+Math.random()*1200,0,4,.1,.001);[0,.35,.7,1.05].forEach(t=>knock(t,.2));arp([0,2,4,5,7,8,9,10],.2,.08,(f,t)=>{bell(f*4,t,.5,.06);tone(f*2,t,.1,'square',.03,f*3)});shower(40,2.4,.055);sparkle(14,2,.035)},
 lose:()=>{tone(220,0,.5,'sawtooth',.04,90);tone(220,0,.5,'sine',.05,90)},click:()=>nz(0,.015,'bandpass',2400,0,4,.08,.001),coin:()=>bell(2637,0,.2,.03),
 expand:()=>{knock(0,.15);nz(0,.6,'bandpass',300,1800,1,.08,.2)}});
SFX.pinball.pull=()=>{for(let k=0;k<10;k++){nz(k*.05,.02,'bandpass',600+k*90,0,4,.16,.001);tone(110+k*8,k*.05,.05,'sawtooth',.02)}nz(.49,.08,'lowpass',2500,300,1,.35,.001);tone(95,.49,.18,'sine',.3,45);tone(500,.5,.3,'triangle',.06,1800);nz(.52,.35,'bandpass',500,2500,1,.07,.05)};
const cur=()=>SFX[theme]||SFX.classic;
const sfx={spinOn:()=>cur().spinOn(),spinOff(){clearTimeout(tickT);tickT=null;mot=null},stop:i=>cur().stop(i),win:l=>cur().win(l),bonus:()=>cur().bonus(),coin:()=>cur().coin(),bonusWin:()=>cur().bonusWin(),lose:()=>cur().lose(),click:()=>cur().click(),expand:()=>cur().expand(),pull(){const c=cur();c.pull&&c.pull()}};

/* BIGX = a "big win" is any win of this many times your TOTAL bet. It drives the BIG WIN banner, the louder win sound and the Stop on big win rule. */
const BIGX=10,MEGAX=40;
const lvl=(pay,st)=>!st?1:pay>=MEGAX*st?3:pay>=BIGX*st?2:pay>=4*st?1:0;
const total=()=>bet,fmt=n=>Number(n).toLocaleString();
const col3=a=>a.map(cell).join('');
const mini=(l,R=3)=>`<svg width="${l.length*12}" height="${R*12}" viewBox="0 0 ${l.length*12} ${R*12}" aria-hidden="true">${l.map((_,c)=>c).map(c=>Array.from({length:R},(_,r)=>r).map(r=>`<rect x="${c*12+1}" y="${r*12+1}" width="10" height="10" rx="2" fill="var(--bd)"/>`).join('')).join('')}<polyline fill="none" stroke="var(--ab)" stroke-width="2.4" stroke-linejoin="round" points="${l.map((r,c)=>`${c*12+6},${r*12+6}`).join(' ')}"/></svg>`;

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
.sl-th{display:flex;flex-wrap:nowrap;justify-content:flex-start;gap:6px;margin:4px 0 10px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.sl-th::-webkit-scrollbar{display:none}.sl-th .chip{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;flex:none;white-space:nowrap}.sl-th .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}
.sl-wrap .sl-reels{background:linear-gradient(160deg,color-mix(in srgb,var(--sla) 24%,var(--sf2)),var(--sf2));border-color:color-mix(in srgb,var(--sla) 55%,var(--bd))}
.sl-wrap .sl-fs{background:linear-gradient(90deg,var(--sla),var(--sla2));color:#fff}
.sl-wrap.fs .sl-reels{box-shadow:0 0 0 2px var(--sla),0 0 22px color-mix(in srgb,var(--sla) 55%,transparent),inset 0 2px 10px rgba(0,0,0,.18)}
.sl-wrap .sl-go{background:var(--sla);border-color:var(--sla);color:#fff}.sl-wrap .sl-go:disabled{opacity:.55}
.sl-wrap[data-th="classic"] .sl-reels{background:var(--sf2);border-color:var(--bd)}.sl-wrap[data-th="classic"] .sl-fs{background:linear-gradient(90deg,#f5c542,#e8a317);color:#3a2a00}.sl-wrap[data-th="classic"].fs .sl-reels{box-shadow:0 0 0 2px #f5c542,0 0 20px rgba(245,197,66,.45),inset 0 2px 10px rgba(0,0,0,.18)}.sl-wrap[data-th="classic"] .sl-th .chip.on,.sl-wrap[data-th="classic"] .sl-auto .chip.on,.sl-wrap[data-th="classic"] .sl-go{color:var(--abx,#fff)}.sl-c .cr{display:block}.sl-ptr .cr{flex:none}.sl-em{display:block;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.sl-reels{position:relative}.sl-pl{position:absolute;left:0;top:0;pointer-events:none;z-index:3;overflow:visible}
.sl-auto{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px}.sl-ar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px}.sl-auto .mu{font-size:12px}.sl-auto .chip.on{background:var(--sla);border-color:var(--sla);color:#fff}
.sl-bal{display:flex;justify-content:center;align-items:center;gap:6px}.sl-bal b{font:800 18px var(--fd,inherit);color:var(--tx)}
.sl-bp{margin:6px 0 10px;text-align:left}
.sl-bl{display:flex;justify-content:space-between;align-items:baseline;font:700 12px var(--fd,inherit);letter-spacing:.06em;text-transform:uppercase;color:var(--mu);margin-bottom:6px}.sl-bl small{font:500 11px var(--fb,inherit);letter-spacing:0;text-transform:none}
.sl-bi{display:flex;align-items:center;gap:6px;padding:6px;border-radius:14px;background:var(--sf2);border:1px solid var(--bd)}.sl-bi:focus-within{border-color:var(--sla)}
.sl-bi input{flex:1;min-width:0;border:0!important;background:transparent!important;font:800 20px var(--fd,inherit)!important;color:var(--tx);padding:6px 4px!important;outline:none;box-shadow:none!important;text-align:left}
.sl-coin{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff2a8,#f5c542 55%,#b8860b);color:#3a2a00;font:900 11px var(--fd,inherit);flex:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
.sl-bi .chip{min-height:34px;padding:6px 12px;font-weight:800;flex:none}
.sl-bq{display:flex;gap:6px;margin-top:6px;overflow-x:auto;scrollbar-width:none}.sl-bq::-webkit-scrollbar{display:none}.sl-bq .chip{flex:none}
.sl-lev{display:none}
.sl-wrap[data-th="pinball"] .sl-rw{display:flex;justify-content:center;align-items:stretch;gap:8px}
.sl-wrap[data-th="pinball"] .sl-rw .sl-reels{flex:0 1 auto;margin:0}
.sl-wrap .sl-rw.pb>.sl-reels,.sl-wrap .sl-rw.pb>.sl-lev{display:none}
.sl-pb{width:100%;max-width:360px;margin:0 auto}.sl-pb svg{display:block}
.sl-wrap[data-th="pinball"] .sl-lev{display:block;position:relative;flex:none;width:34px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sl-lev-groove{position:absolute;left:12px;right:12px;top:0;bottom:6px;border-radius:99px;background:linear-gradient(90deg,#0b0b14,#2a2a3c 50%,#0b0b14);box-shadow:inset 0 0 4px #000,0 0 0 1px rgba(255,255,255,.18)}
.sl-lev-arm{position:absolute;left:50%;width:8px;margin-left:-4px;top:18px;bottom:14px;border-radius:4px;background:linear-gradient(90deg,#8b93a1,#f1f5f9 45%,#6b7280);box-shadow:0 0 2px rgba(0,0,0,.6)}
.sl-lev-ball{position:absolute;left:50%;top:18px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0,#fca5a5 14%,#ef4444 40%,#7f1d1d 100%);box-shadow:0 3px 6px rgba(0,0,0,.5),inset 0 -3px 5px rgba(0,0,0,.35);z-index:2}
.sl-lev-base{position:absolute;left:3px;right:3px;bottom:0;height:16px;border-radius:8px;background:linear-gradient(180deg,#e5e7eb,#6b7280);box-shadow:0 2px 4px rgba(0,0,0,.5)}
.sl-lev:active .sl-lev-ball{filter:brightness(1.15)}
.sl-wrap[data-th="pinball"] .sl-reels{background:radial-gradient(circle at 15% 20%,rgba(244,63,94,.35),transparent 34%),radial-gradient(circle at 85% 80%,rgba(99,102,241,.4),transparent 38%),repeating-linear-gradient(45deg,#1e1b4b 0 10px,#241f5c 10px 20px);border:3px solid #cbd5e1;border-radius:20px;box-shadow:0 0 0 2px #1e1b4b,0 0 18px rgba(244,63,94,.35),inset 0 2px 12px rgba(0,0,0,.55)}
.sl-wrap[data-th="pinball"] .sl-reel{background:rgba(10,8,30,.55);border-color:rgba(203,213,225,.45);height:var(--slh,56px)}
.sl-wrap[data-th="pinball"].fs .sl-reels{box-shadow:0 0 0 2px var(--sla),0 0 22px color-mix(in srgb,var(--sla) 55%,transparent),inset 0 2px 10px rgba(0,0,0,.4)}

.sl-wrap[data-th=\"pinball\"]{--slh:min(112px,calc((100vw - 132px)/3))}
.sl-wrap[data-th=\"pinball\"] .sl-reels{padding:14px 12px;gap:8px;position:relative}
.sl-wrap[data-th=\"pinball\"] .sl-reel{border-width:2px;border-radius:12px;background:linear-gradient(180deg,#0a0820,#1d1850 50%,#0a0820)}
.sl-wrap[data-th=\"pinball\"] .sl-reel::after{background:linear-gradient(180deg,rgba(0,0,0,.6),transparent 30%,transparent 70%,rgba(0,0,0,.6)),linear-gradient(90deg,rgba(255,255,255,.12),transparent 25%,transparent 75%,rgba(255,255,255,.1))}
.sl-wrap[data-th=\"pinball\"] .sl-reel:last-child{box-shadow:inset 0 0 0 2px rgba(251,191,36,.7),0 0 12px rgba(251,191,36,.35)}
.sl-wrap[data-th=\"pinball\"] .sl-reels::before,.sl-wrap[data-th=\"pinball\"] .sl-reels::after{content:\"\";position:absolute;top:50%;margin-top:-8px;border-top:8px solid transparent;border-bottom:8px solid transparent;z-index:4;pointer-events:none;filter:drop-shadow(0 0 4px #f43f5e)}
.sl-wrap[data-th=\"pinball\"] .sl-reels::before{left:1px;border-left:9px solid #f43f5e}
.sl-wrap[data-th=\"pinball\"] .sl-reels::after{right:1px;border-right:9px solid #f43f5e}
.sl-pb svg{max-height:68vh}
.sl-wrap:has(.sl-rw.pb) .sl-th,.sl-wrap:has(.sl-rw.pb) .sl-bal{display:none}
.sl-pbbp{transform-box:fill-box;transform-origin:center}
.sl-pbbp.hit{animation:pbhit .38s ease-out}
@keyframes pbhit{0%{transform:scale(1)}30%{transform:scale(1.2);filter:brightness(1.9) drop-shadow(0 0 8px #fff)}100%{transform:scale(1)}}
@keyframes pbblink{50%{filter:brightness(2.2) drop-shadow(0 0 6px #fff)}}
.sl-pbrl.on circle{fill:#fde047;stroke:#fff;filter:drop-shadow(0 0 5px #fde047)}
.sl-pbpk.lit rect{fill:#e11d48;opacity:1;stroke:#fff}.sl-pbpk.lit text{fill:#fff}
.sl-pbch.lit rect{fill:#b45309;stroke:#fff}.sl-pbch.lit text{fill:#fff}
.sl-pbpk.hit,.sl-pbch.hit,#pbsc.hit{animation:pbblink .25s 3}
.sl-pbring{animation:pbring 1.3s ease-in-out infinite}@keyframes pbring{50%{opacity:.3}}
.sl-pbgo{display:block;width:100%;margin-top:8px;padding:15px 12px;border-radius:14px;border:2px solid #cbd5e1;background:#1e1b4b;color:#fff;font:900 14px var(--fd,inherit);letter-spacing:.08em;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;position:sticky;bottom:0;z-index:6;box-shadow:0 -6px 14px rgba(0,0,0,.25)}
.sl-pbgo i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#f43f5e,#f59e0b);opacity:.9}
.sl-pbgo span{position:relative}.sl-pbgo:disabled{opacity:.6}
.sl-spc{color:var(--mu);font-weight:700;font-size:12px}`;
 document.head.appendChild(st)}

/* ---- OG Pinball bonus physics (headless). The server picks where each ball ends; we search for a physically
   simulated shot that really ends there, then replay it. ---- */
const PB={W:360,H:612,C:[180,185],R:160,BR:8,LX:20,RX:340,LANE:316,G:640,DT:1/240,
 FL:505,PT:440,PCW:296/5,
 BUMP:[{x:104,y:238,r:19},{x:182,y:214,r:19},{x:246,y:270,r:19}],
 PEGS:[[58,318],[128,330],[198,312],[238,326],[92,380],[165,392],[236,388]],
 SAUCER:{x:170,y:352,rc:12},
 ORDER:[0,1,3,2,4],
 SEG:[[20,258,84,304],[316,318,262,364]]};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* power 0..1. want = {kind:'u',pos:0..4} or {kind:'c'} or null (just simulate). steer = {k} optional gentle homing. */
function pbRun(power,seed,want,steer){
 const rnd=mulberry(seed),P=PB,r=P.BR,G=P.G,dt=P.DT;
 const v0=(832+power*60)*(1+(rnd()-.5)*.03);
 let x=329,y=468,vx=(rnd()-.5)*10,vy=-v0;
 const xs=[x],ys=[y],ev=[];let step=0,res=null,rest=0,slow=0;
 const tx=want?(want.kind==='c'?P.SAUCER.x:20+P.PCW*(want.pos+.5)):0;
 const maxSteps=Math.round(26/dt);
 const segs=[]; // vertical dividers
 for(let k=1;k<5;k++)segs.push([20+P.PCW*k,P.PT,P.FL]);
 const posts=[];for(let k=1;k<5;k++)posts.push([20+P.PCW*k,P.PT,3.5]);
 while(step<maxSteps){
  step++;
  vy+=G*dt;
  if(steer&&y>260&&y<430&&vy>0){vx+=steer.k*(tx-x)*dt}
  x+=vx*dt;y+=vy*dt;
  // arc (top)
  if(y<P.C[1]){const dx=x-P.C[0],dy=y-P.C[1],d=Math.hypot(dx,dy),lim=P.R-r;
   if(d>lim){const nx=dx/d,ny=dy/d;x=P.C[0]+nx*lim;y=P.C[1]+ny*lim;const vn=vx*nx+vy*ny;if(vn>0){vx-=(1+.18)*vn*nx;vy-=(1+.18)*vn*ny;if(vn>140)ev.push([step,'w',0,Math.min(1,vn/500)])}}}
  else{
   // left wall / right outer wall
   if(x<P.LX+r){x=P.LX+r;if(vx<0){if(-vx>120)ev.push([step,'w',0,Math.min(1,-vx/500)]);vx=-vx*.3}}
   if(x>P.RX-r){x=P.RX-r;if(vx>0){vx=-vx*.3}}
  }
  // lane inner wall (x=316, from y=205 down to 500): ball in lane or in field
  if(y>200){
   if(x>P.LANE-2&&x<P.LANE+2+r+2&&x>P.LANE){ // right side of wall
    if(x<P.LANE+2+r){x=P.LANE+2+r;if(vx<0)vx=-vx*.2}}
   else if(x<=P.LANE&&x>P.LANE-2-r){ // left side of wall
    if(x>P.LANE-2-r){x=P.LANE-2-r;if(vx>0)vx=-vx*.3}}
  }
  // top cap of lane wall
  {const cx=P.LANE,cy=205,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);if(d<r+2&&d>0){const nx=dx/d,ny=dy/d;x=cx+nx*(r+2);y=cy+ny*(r+2);const vn=vx*nx+vy*ny;if(vn<0){vx-=1.3*vn*nx;vy-=1.3*vn*ny}}}
  // one-way gate at the top of the shooter lane: a ball coming back round the arc is turned away
  if(x>304&&y<205&&y>90&&vy>0&&vx>-1e9){x=304;vx=-Math.abs(vx)*.5-40;vy*=.7;ev.push([step,'g',0,.5])}
  // pop bumpers
  for(let i=0;i<P.BUMP.length;i++){const b=P.BUMP[i],dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy),L=b.r+r;
   if(d<L&&d>0){const nx=dx/d,ny=dy/d;x=b.x+nx*L;y=b.y+ny*L;const vn=vx*nx+vy*ny;if(vn<0){vx-=2*vn*nx;vy-=2*vn*ny}
    const sp=Math.hypot(vx,vy),want2=Math.max(sp*1.02,420+rnd()*90);vx+=nx*(want2-Math.max(0,vn))*.9;vy+=ny*(want2-Math.max(0,vn))*.9;
    ev.push([step,'b',i,1])}}
  // slanted rubber guides on the side walls
  for(const g of P.SEG){const ax=g[0],ay=g[1],bx=g[2],by=g[3],ex=bx-ax,ey=by-ay,l2=ex*ex+ey*ey;let t=((x-ax)*ex+(y-ay)*ey)/l2;t=Math.max(0,Math.min(1,t));const cx=ax+ex*t,cy=ay+ey*t,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy),L=r+2.5;
   if(d<L&&d>0){const nx=dx/d,ny=dy/d;x=cx+nx*L;y=cy+ny*L;const vn=vx*nx+vy*ny;if(vn<0){vx-=(1+.5)*vn*nx;vy-=(1+.5)*vn*ny;if(vn<-90)ev.push([step,'g',0,Math.min(1,-vn/450)])}}}
  // pegs
  for(let i=0;i<P.PEGS.length;i++){const p=P.PEGS[i],dx=x-p[0],dy=y-p[1],d=Math.hypot(dx,dy),L=5+r;
   if(d<L&&d>0){const nx=dx/d,ny=dy/d;x=p[0]+nx*L;y=p[1]+ny*L;const vn=vx*nx+vy*ny;if(vn<0){vx-=(1+.55)*vn*nx;vy-=(1+.55)*vn*ny;ev.push([step,'p',i,Math.min(1,-vn/400)])}}}
  // divider posts (round tops) & walls
  for(const q of posts){const dx=x-q[0],dy=y-q[1],d=Math.hypot(dx,dy),L=q[2]+r;
   if(d<L&&d>0){const nx=dx/d,ny=dy/d;x=q[0]+nx*L;y=q[1]+ny*L;const vn=vx*nx+vy*ny;if(vn<0){vx-=(1+.4)*vn*nx;vy-=(1+.4)*vn*ny;ev.push([step,'p',9,Math.min(1,-vn/400)])}}}
  for(const s of segs){if(y>s[1]&&y<s[2]){const dx=x-s[0];if(Math.abs(dx)<2+r){const sg=dx>=0?1:-1;x=s[0]+sg*(2+r);if(vx*sg<0)vx=-vx*.35}}}
  // pocket floor
  if(y>P.FL-r&&x<P.LANE){y=P.FL-r;if(vy>0){if(vy>90)ev.push([step,'f',0,Math.min(1,vy/500)]);vy=-vy*.32;vx*=.85}}
  // lane floor / plunger rest
  if(x>P.LANE&&y>470){y=470;if(vy>0)vy=-vy*.1}
  // saucer capture
  const S=P.SAUCER;if(Math.hypot(x-S.x,y-S.y)<S.rc&&y<P.PT){res={kind:'c',idx:0};xs.push(x);ys.push(y);ev.push([step,'s',0,1]);break}
  // anti-stall nudge
  const sp=Math.hypot(vx,vy);if(sp<12&&y<P.FL-r-2){slow++;if(slow>60){vx+=(rnd()-.5)*160;vy-=40+rnd()*60;slow=0}}else slow=0;
  xs.push(x);ys.push(y);
  // landed in a pocket
  if(y>P.PT+10&&x<P.LANE&&x>P.LX){const pos=Math.max(0,Math.min(4,Math.floor((x-20)/P.PCW)));res={kind:'u',pos};
   if(Math.abs(vy)<35&&y>P.FL-r-1.5){rest++;if(rest>50)break}else rest=0;
   if(step>maxSteps-5)break}
  // fell out of lane back down: invalid (power too low)
  if(x>P.LANE&&y>=469&&step>100&&vy>=0){res={kind:'bad'};break}
 }
 return {xs,ys,ev,res,steps:step,dt};
}
function pbOk(r,want){if(!r.res)return false;if(want.kind==='c')return r.res.kind==='c';return r.res.kind==='u'&&r.res.pos===want.pos}
/* find a seed whose physics lands the ball in the wanted spot */
function pbFind(power,want,budgetMs){
 const t0=Date.now();let n=0,base=(Math.random()*1e9)|0;
 while(Date.now()-t0<budgetMs&&n<4000){const r=pbRun(power,base+n,want,null);n++;if(pbOk(r,want))return {tr:r,tries:n,steered:false}}
 for(const k of [25,60,140,300,700]){for(let j=0;j<12;j++){const r=pbRun(power,base+n+j,want,{k});if(pbOk(r,want))return {tr:r,tries:n+j,steered:true}}n+=12}
 return null}

const shortN=n=>n>=1000?(n/1000)+'K':String(n),QUICK=[10,50,100,500,1000,5000,10000];
function openSlots(startTheme){
 if(!ME)return;slCss();let rows=3;
 if(startTheme&&THEMES[startTheme]&&!busy&&!autoOn){theme=startTheme;try{localStorage.setItem('fx-slt',theme)}catch(e){}}
 rows=baseRows();const start=Array.from({length:nrNow()},()=>Array.from({length:rows},rnd));
 const m=modal(`<div class="sl-wrap" data-th="${theme}"><div class="sl-top"><h3 id="slname"></h3><button class="chip" id="slmu" data-slmute></button></div><div class="sl-th" id="slth"></div><div class="sl-bal"><span class="mu">Balance</span> <b id="slb"></b> <span class="sl-spc">chips</span> <button class="chip sl-cx" data-cx aria-label="Exchange SP and chips">Exchange</button></div><div class="sl-fs" id="slfs" hidden></div><div class="sl-rw"><div class="sl-svp" id="slsv" hidden></div><div class="sl-reels" id="slr">${start.map(c=>`<div class="sl-reel"><div class="sl-strip">${col3(c)}</div></div>`).join('')}</div><div class="sl-lev" id="sllev" role="button" aria-label="Pull the lever to spin"><i class="sl-lev-groove"></i><i class="sl-lev-arm"></i><i class="sl-lev-ball"></i><i class="sl-lev-base"></i></div></div><div class="sl-msg" id="slm"></div><div class="sl-bp"><div class="sl-bl"><span>Bet amount</span><small id="sltot"></small></div><div class="sl-bi"><span class="sl-coin" aria-hidden="true">\ud83e\ude99</span><input id="slbet" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="go" aria-label="Bet amount in chips"><button class="chip" data-slhalf aria-label="Halve bet">½</button><button class="chip" data-sldbl aria-label="Double bet">2×</button><button class="chip" data-slmax>Max</button></div><div class="sl-bq" id="slq"></div></div><button class="pri sl-go" id="slgo"></button><div class="sl-auto" id="slau"></div><button class="chip sl-svre" id="slsvre" data-svre hidden>Out of chips? Try a wager saver</button><button class="chip sl-info" id="slinfo">Paytable &amp; paylines</button><div class="sl-pt" id="slpt" hidden></div><p class="sl-rg"><b>Free play only. Chips and SP have no cash value. Gambling can be addictive. Play responsibly.</b> Need help? Call <a href="tel:18004262537">1-800-GAMBLER</a> (1-800-426-2537) or text 800GAM, 24/7.</p></div>`);
 const ptHtml=()=>{const P=theme==='pinball';return `<div class="sl-pth">Line pays (× your bet, ${P?'3 in a row':'3 / 4 / 5 in a row from the left'})</div>${Object.keys(PAY).map(k=>`<div class="sl-ptr"><span>${sym(k,22)} ${tn(k)[1]}</span><b>${P?'×'+(PAY[k][0]*PK).toFixed(1):PAY[k].map(x=>'×'+(x/9).toFixed(1)).join(' / ')}</b></div>`).join('')}<div class="sl-ptr"><span>${sym('S',22)} ${SCN()} ${P?'on the right reel':'×3 anywhere'}</span><b>${TH().name} bonus</b></div><div class="sl-pth" style="margin-top:12px">${TH().name} bonus: ${TH().bonus.name}</div>${P?`<div class="sl-note">Land a ${SCN()} on the right reel to launch the bonus. It costs nothing. You get 1 shot on bets up to 99 chips, 2 shots from 100 chips and 5 shots from 1,000 chips. You pull the plunger yourself (hold, then release) and the ball runs round the arch, bounces off the pop bumpers and pegs, and drops into a pocket worth ×0.5, ×1, ×2, ×3 or ×1 your bet, or into the BONUS HOLE, which sends it to the bonus chamber. The chamber fills from left to right and pays ×5, ×10, ×20, ×100 and ×200, so the biggest prize needs all 5 balls in the chamber. How hard you pull never changes what you win. OG Pinball is 3 reels × 1 row with a single payline: line up all 3 symbols to win, and your whole bet rides on that line. Bigger bets pay back a little better. Bets run from ${fmt(MINBET)} to ${fmt(MAXBET)} chips.</div>`:`<div class="sl-note">3 ${SCP()} anywhere start the bonus, and it costs nothing. ${TH().bonus.d} Free spin multipliers: ${TH().bonus.m.map(x=>'×'+x).join(' ')}.${TH().bonus.r.some(x=>x>3)?' The reels open up to 5 × 6, and the 9 paylines play again on the lower 3 rows (up to 18 lines).':''} Land 3 more ${SCP()} during the bonus for another full round (up to 4 rounds). Every machine has its own bonus. All 9 paylines are always active and each one stakes 1/9 of your bet. Bigger bets pay back a little better (about 88% on tiny bets up to about 96% from 9,000 chips). Bets run from ${fmt(MINBET)} to ${fmt(MAXBET)} chips.</div>`}<div class="sl-pth" style="margin-top:12px">Paylines</div><div class="sl-lines">${(P?PLINES:LINES).map((l,i)=>`<div>${mini(l,P?1:3)}<small>${(P?PNAME:LNAME)[i]}</small></div>`).join('')}</div>`};
 const $m=s=>m.querySelector(s),bal=v=>{$m('#slb').textContent=fmt(v)};
 /* the reel count depends on the machine: OG Pinball has 3 reels, every other machine has 5 */
 const fitReels=n=>{const R=$m('#slr');if(!R)return;R.querySelectorAll('.sl-pl').forEach(e=>e.remove());let k=R.querySelectorAll('.sl-reel').length;while(k>n){R.querySelectorAll('.sl-reel')[--k].remove()}while(k<n){const d=document.createElement('div');d.className='sl-reel';d.innerHTML='<div class="sl-strip">'+col3(Array.from({length:rows},rnd))+'</div>';if(rows!==baseRows())d.style.height=`calc(var(--slh,56px)*${rows})`;R.appendChild(d);k++}};
 const setRows=async n=>{if(n===rows)return;const from=rows,rs=[...$m('#slr').children],hh=k=>`calc(var(--slh,56px)*${k})`;rows=n;
  const h0=rs.map(r=>r.offsetHeight);
  rs.forEach(r=>{const st=r.firstElementChild;st.style.transition='none';st.style.transform='none';const ks=[...st.children].map(e=>e.dataset.k).slice(0,n);while(ks.length<n)ks.push(rnd());st.innerHTML=col3(ks);r.style.height=hh(n)});
  if(n>from)sfx.expand();else sfx.click();
  if(calm())return;
  const an=rs.map((r,i)=>{try{return r.animate([{height:h0[i]+'px'},{height:r.offsetHeight+'px'}],{duration:750,easing:'cubic-bezier(.2,.8,.2,1)'}).finished}catch(e){return null}});
  await Promise.all(an.filter(Boolean).map(q=>q.catch(()=>{})));await wait(200)};
 /* keep the bet inside 1..max and never above what you can afford */
 const clampBet=()=>{bet=Math.max(MINBET,Math.min(MAXBET,Math.floor(bet)||MINBET));if(S.chips>=MINBET&&bet>S.chips)bet=S.chips};
 const saveBet=()=>{try{localStorage.setItem('fx-slbet',String(bet))}catch(e){}};
 const lk=()=>busy||autoOn;
 const defMsg=()=>theme==='pinball'?'<span>'+TH().name+' · '+SCN()+' on the right reel = '+TH().bonus.name+'!</span><small class="sl-sub">'+TH().bonus.d+'</small>':'<span>'+TH().name+' · 3 '+SCP()+' = '+TH().bonus.name+'!</span><small class="sl-sub">'+TH().bonus.d+'</small>';
 const goBtn=()=>{const g=$m('#slgo');if(autoOn){g.disabled=false;g.textContent='Stop auto · '+(autoLeft===Infinity?'∞':autoLeft+' left')}else if(wsv>0){g.disabled=busy;g.textContent=busy?'Spinning…':'Free spin · wager saver'+(wsv>1?' ×'+wsv:'')}else{const ok=bet>=MINBET&&bet<=S.chips;g.disabled=busy||!ok;g.textContent=busy?'Spinning…':bet<MINBET?'Enter a bet':S.chips<bet?'Not enough chips':'Spin · '+fmt(bet)+' chips'}
  $m('#sltot').textContent='Min '+fmt(MINBET)+' · Max '+fmt(Math.min(MAXBET,Math.max(S.chips,MINBET)))};
 const uiExtra=()=>{$m('#slname').textContent=TH().name;
  $m('#slth').innerHTML=TORDER.map(k=>`<button class="chip ${k===theme?'on':''}" data-slth="${k}" aria-label="${THEMES[k].name}" ${lk()?'disabled':''}>${THEMES[k].s[5][0]==='7️⃣'?'<b style="color:#ef233c;font:900 17px Georgia,serif;-webkit-text-stroke:.6px #fff">7</b>':THEMES[k].s[5][0]}${k===theme?' '+THEMES[k].name:''}</button>`).join('');
  $m('#slmu').textContent=muted?'🔇 Sound off':'🔊 Sound on';
  $m('#slq').innerHTML=QUICK.map(v=>`<button class="chip ${v===bet?'on':''}" data-slq="${v}" ${lk()||v>S.chips?'disabled':''}>${shortN(v)}</button>`).join('');
  const bi=$m('#slbet');bi.disabled=lk();m.querySelectorAll('[data-slhalf],[data-sldbl],[data-slmax]').forEach(b=>b.disabled=lk());
  $m('#slau').innerHTML=(autoOn?'':`<div class="sl-ar"><span class="mu">Auto spin</span>`+[5,10,25,'inf'].map(n=>`<button class="chip" data-slau="${n}" ${n==='inf'?'title="Spin until you run out of chips or stop" aria-label="Infinite auto spin"':''} ${busy||(S.chips<bet&&!(wsv>0))?'disabled':''}>${n==='inf'?'∞':n}</button>`).join('')+`</div>`)+`<div class="sl-ar"><button class="chip ${turbo?'on':''}" data-sltg="turbo" aria-pressed="${turbo}">${turbo?'✓ ':''}Turbo</button><button class="chip ${stopBonus?'on':''}" data-sltg="bonus" aria-pressed="${stopBonus}">${stopBonus?'✓ ':''}Stop on bonus</button><button class="chip ${stopBig?'on':''}" data-sltg="big" aria-pressed="${stopBig}" title="Any win of ${BIGX}× your total bet or more">${stopBig?'✓ ':''}Stop on big win</button></div>`};
 const draw=()=>{clampBet();const bi=$m('#slbet');if(document.activeElement!==bi)bi.value=String(bet);goBtn();bal(S.chips);saverUI();uiExtra()};
 /* wager saver: out of chips (1 to 24) = stake your last chips for a chance at 1 free spin. The server decides (supabase/wager_saver.sql) */
 function saverUI(){const p=$m('#slsv'),n=S.chips,low=false&&n>=1&&n<MINBET&&!busy&&wsv===0;$m('#slsvre').hidden=!(low&&declined);
  if(!low||declined){p.hidden=true;return}
  const w=Math.round((cl[0]+(cl[1]-cl[0])*(n-1)/23)*100);p.hidden=false;
  p.innerHTML=`<div class="sl-svc"><div class="sl-svh">Out of chips? <span>Try a wager saver</span></div><div class="sl-svo"><span class="w" style="flex:${w}">Win ${w}%</span><span class="l" style="flex:${100-w}">Lose ${100-w}%</span></div><p>Your ${n} chips is gone either way. <b>Win:</b> 1 free spin. <b>Lose:</b> nothing. More chips = better odds.</p><div class="sl-svb"><button class="pri" data-svgo>Gamble ${n} chips</button><button class="chip" data-svno>No thanks</button></div></div>`}
 async function gamble(){if(busy||autoOn)return;busy=true;const n=S.chips,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();let r;
  try{const q=await FX_DB.rpc('slots_saver_gamble');if(q.error)throw q.error;r=q.data}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?'Wager saver not set up yet (run supabase/wager_saver.sql)':t;toast(msg.textContent);draw();return}
  wsv=r.saver_spins||0;applyChips(r.chips,null);
  if(r.won){sfx.win(1);reels.classList.add('win');msg.innerHTML='WAGER SAVED!<small class="sl-sub">You won 1 free spin</small>';try{navigator.vibrate&&navigator.vibrate([40,30,40])}catch(e){}}
  else{sfx.lose();msg.innerHTML='No luck<small class="sl-sub">Your last '+n+' chips is gone</small>'}
  busy=false;if(m.isConnected)draw()};
 $m('#slm').innerHTML=defMsg();draw();
 FX_DB.rpc('slots_saver_status').then(q=>{if(q.error||!q.data)return;wsv=q.data.saver_spins||0;if(q.data.chance_max>0)cl=[+q.data.chance_min,+q.data.chance_max];if(m.isConnected)draw()}).catch(()=>{});
 const setBet=v=>{bet=v;clampBet();saveBet();sfx.click();draw()};
 const switchTheme=k=>{theme=k;try{localStorage.setItem('fx-slt',theme)}catch(x){}$m('.sl-wrap').dataset.th=theme;rows=baseRows();fitReels(nrNow());clearHi();m.querySelectorAll('.sl-reel').forEach(r=>{r.style.height='';r.firstElementChild.style.transform='none';r.firstElementChild.innerHTML=col3(Array.from({length:rows},rnd))});$m('#slpt').innerHTML=ptHtml();$m('#slm').innerHTML=defMsg();sfx.click();draw();const on=$m('#slth .chip.on');if(on)on.scrollIntoView({inline:'center',block:'nearest'})};
 m.addEventListener('click',e=>{
  if(e.target.closest('[data-slmute]')){muted=!muted;try{localStorage.setItem('fx-slm',muted?'1':'0')}catch(x){}if(!muted)sfx.click();draw();return}
  const tg=e.target.closest('[data-sltg]');if(tg){const w=tg.dataset.sltg;if(w==='bonus')stopBonus=!stopBonus;else if(w==='big')stopBig=!stopBig;else{turbo=!turbo;try{localStorage.setItem('fx-slturbo',turbo?'1':'0')}catch(x){}}draw();return}
  const th=e.target.closest('[data-slth]');if(th&&!busy&&!autoOn){switchTheme(th.dataset.slth);return}
  const au=e.target.closest('[data-slau]');if(au&&!busy&&!autoOn){autoLeft=au.dataset.slau==='inf'?Infinity:+au.dataset.slau;autoOn=true;ac();draw();autoLoop();return}
  if(e.target.closest('#slgo')&&autoOn){autoOn=false;autoLeft=0;draw();return}
  if(!busy&&!autoOn){
   if(e.target.closest('[data-slhalf]'))return setBet(Math.max(MINBET,Math.floor(bet/2)));
   if(e.target.closest('[data-sldbl]'))return setBet(bet*2);
   if(e.target.closest('[data-slmax]'))return setBet(Math.min(MAXBET,S.chips));
   const q=e.target.closest('[data-slq]');if(q)return setBet(+q.dataset.slq)}
  if(e.target.closest('#slinfo')){const p=$m('#slpt');if(p.hidden)p.innerHTML=ptHtml();p.hidden=!p.hidden;return}
  if(e.target.closest('[data-svgo]')){gamble();return}if(e.target.closest('[data-svno]')){declined=true;draw();return}if(e.target.closest('[data-svre]')){declined=false;draw();return}
  if(e.target.closest('#sllev')){if(!busy&&!autoOn&&theme==='pinball')spin(wsv>0);return}
  if(e.target.closest('#slgo'))spin(wsv>0)});
 /* typing a bet: update as you type, tidy up when you leave the box */
 m.addEventListener('input',e=>{if(e.target.id!=='slbet')return;const v=parseInt(e.target.value.replace(/[^\d]/g,''),10);bet=Number.isFinite(v)?Math.min(v,MAXBET):0;if(bet>0&&String(bet)!==e.target.value)e.target.value=String(bet);goBtn()});
 m.addEventListener('change',e=>{if(e.target.id==='slbet'){clampBet();saveBet();draw()}});
 const onCx=()=>{if(!m.isConnected)document.removeEventListener('fx-chips',onCx);else if(!busy&&!autoOn)draw()};document.addEventListener('fx-chips',onCx);
 m.addEventListener('keydown',e=>{if(e.target.id==='slbet'&&e.key==='Enter'){e.preventDefault();e.target.blur();if(!busy&&!autoOn&&bet>=MINBET&&bet<=S.chips)spin(wsv>0)}});
 const clearHi=()=>{m.querySelectorAll('.sl-c.hit,.sl-c.dim').forEach(c=>c.classList.remove('hit','dim'));m.querySelectorAll('.sl-pl').forEach(e=>e.remove())};
 /* draw each winning payline across the reels, so you can see exactly which line paid and how far it ran */
 const PLC=['#ffd43b','#4dabf7','#ff6b6b','#69db7c','#da77f2','#ffa94d','#3bc9db','#f783ac','#a9e34b'];
 const drawLines=(wins,reels)=>{try{const rs=[...reels.children];if(!rs.length)return;const W=reels.clientWidth,Ht=reels.clientHeight,ch=rs[0].clientHeight/rows;
  const pts=(w)=>{const a=[];for(let c=0;c<w.count;c++){const r=rs[c];a.push((r.offsetLeft+r.offsetWidth/2).toFixed(1)+','+(r.offsetTop+(lineRow(w.line,c)+.5)*ch).toFixed(1))}return a.join(' ')};
  const g=wins.map(w=>{const col=PLC[w.line%PLC.length],p=pts(w);return `<polyline points="${p}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${p}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}).join('');
  reels.insertAdjacentHTML('beforeend',`<svg class="sl-pl" width="${W}" height="${Ht}" viewBox="0 0 ${W} ${Ht}" aria-hidden="true">${g}</svg>`)}catch(e){}};
 const hilite=(wins,reels)=>{const rs=[...reels.children];const keep=new Set();wins.forEach(w=>{for(let c=0;c<w.count;c++)keep.add(c+','+lineRow(w.line,c))});
  rs.forEach((r,c)=>[...r.firstElementChild.children].forEach((el,row)=>el.classList.add(keep.has(c+','+row)?'hit':'dim')));drawLines(wins,reels)};
 /* turbo shortens the animation only; the server still spaces spins about a second apart */
 const T=n=>turbo?Math.round(n*.45):n;
 /* pinball lever: the red ball is pulled down the track (the arm shortens), springs back with a little bounce, and the reels launch when it lets go */
 const pullLever=()=>{const L=$m('#sllev');if(theme!=='pinball'||!L||calm())return null;const A=L.querySelector('.sl-lev-arm'),B=L.querySelector('.sl-lev-ball'),mx=Math.max(40,L.clientHeight-46),kf=[{top:'18px',offset:0},{top:mx+'px',offset:.6},{top:'8px',offset:.82},{top:'18px',offset:1}],o={duration:T(780),easing:'ease-in-out'};try{sfx.pull();A.animate(kf,o);return B.animate(kf,o).finished.catch(()=>{})}catch(e){return null}};
 async function spin(free){if(busy||(!free&&(S.chips<bet||bet<MINBET)))return null;if(free&&theme==='pinball'){toast('Switch to another machine to use your free spin');return null}busy=true;const gap=1100-(Date.now()-lastAt);if(gap>0)await wait(gap);lastAt=Date.now();useP=theme==='pinball'&&!free;const NRS=nrNow();fitReels(NRS);const stake=free?SAVER_STAKE:bet,off=free?0:stake,msg=$m('#slm'),reels=$m('#slr');reels.className='sl-reels';clearHi();msg.textContent='';draw();bal(S.chips-off);const lv=pullLever();
  let r;try{const q=await (free?FX_DB.rpc('slots_saver_spin'):FX_DB.rpc('slots_spin',{p_bet:bet,p_theme:theme}));if(q.error)throw q.error;r=q.data;if(free)wsv=r.saver_spins!=null?r.saver_spins:Math.max(0,wsv-1);if(!Array.isArray(r.reels)||r.reels.length!==NRS)throw new Error('Slots changed: run the new supabase/slots.sql')}catch(err){busy=false;const t=String(err.message||err);msg.textContent=/function|schema/i.test(t)?(free?'Wager saver not set up yet (run supabase/wager_saver.sql)':'Slots not set up yet (run supabase/slots.sql)'):t;toast(msg.textContent);bal(S.chips);draw();return{ok:false}}
  if(lv)await lv;const rs=[...reels.children];sfx.spinOn();await Promise.all(rs.map((el,i)=>runReel(el,r.reels[i],T(900)+i*T(300)).then(()=>sfx.stop(i))));sfx.spinOff();
  if(!m.isConnected){applyChips(r.chips,null);busy=false;return{ok:false}}
  const wins=r.wins||[];
  if(wins.length)hilite(wins,reels);
  if(r.kind==='bonus'&&r.free){
   reels.classList.add('bonus');sfx.bonus();msg.innerHTML=TH().bonus.name+'!<small class="sl-sub">'+r.free.start+(r.free.pinball?(r.free.start>1?' PINBALL SHOTS':' PINBALL SHOT'):' FREE SPINS')+'</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}
   await wait(calm()?400:T(1700));reels.classList.remove('bonus');
   if(!m.isConnected){applyChips(r.chips,null);busy=false;return{ok:false}}
   const ok=r.free.pinball?await pinballBonus(r,off):await freeSpins(r,off);
   if(!ok){applyChips(r.chips,null);busy=false;return{ok:false}}
   $m('.sl-wrap').classList.remove('fs');$m('#slfs').hidden=true;clearHi();await setRows(baseRows());if(!m.isConnected){applyChips(r.chips,null);busy=false;return{ok:false}}reels.classList.add('win');
   msg.innerHTML='<span id="slct">+0 chips</span><small class="sl-sub">BONUS TOTAL'+(r.line_pay?' · incl. '+fmt(r.line_pay)+' chips from lines':'')+' · '+xTxt(r.payout,stake)+'</small>';
   sfx.bonusWin();await countUp($m('#slct'),r.payout,calm()?0:T(1400),true);await wait(calm()?200:T(700))}
  else if(r.payout>0){reels.classList.add('win');sfx.win(lvl(r.payout,stake));msg.innerHTML=winMsg(wins,r.payout,stake);try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
  else msg.textContent=r.scatters===2?'So close! Two '+SCP()+'…':'No luck. Spin again!';
  applyChips(r.chips,r.payout>stake?'Slots win':null);busy=false;if(m.isConnected)draw();
  return{ok:true,payout:r.payout,stake,bonus:r.kind==='bonus'}}

 /* auto spin: keeps spinning with the current bet until the count runs out, you tap Stop, you run low on chips, or a stop rule hits */
 async function autoLoop(){let why='';
  while(autoOn&&autoLeft>0&&m.isConnected){
   if(!(wsv>0||S.chips>=bet)){toast('Auto spin stopped: not enough chips');break}
   const res=await spin(wsv>0);
   if(!res||!res.ok)break;
   autoLeft--;
   if(res.bonus&&stopBonus){why='bonus round played';break}
   if(res.payout>=BIGX*res.stake&&stopBig){why='big win';break}
   if(!autoOn)break;
   if(m.isConnected)draw();
   await wait(calm()||turbo?150:500)}
  autoOn=false;autoLeft=0;
  if(why&&m.isConnected){toast('Auto spin stopped: '+why);const mg=$m('#slm');if(mg)mg.insertAdjacentHTML('beforeend','<small class="sl-sub" style="color:var(--sla);font-weight:800">Auto spin stopped · '+why+'</small>')}
  if(m.isConnected)draw()}


  /* PINBALL BONUS (modeled on IGT Pinball). The server decides where every ball ends (supabase/Slots-3.sql, slots_pb_play). For each shot we run a real physics
    simulation (pbRun: gravity, arc, pop bumpers, pegs, rubber guides, pocket dividers) with a hidden random seed until the simulated ball ends exactly where the server said,
    then replay that run. You pull the plunger yourself; the pull strength changes the launch, never the prize. */
 const PBX=[0.5,1,2,3,1],PBC=[5,10,20,100,200];
 async function pinballBonus(r,stake){r0bet=r.bet||1;
  const wrap=$m('.sl-wrap'),rw=$m('.sl-rw'),msg=$m('#slm'),bar=$m('#slfs'),sh=r.free.shots,N=sh.length,P=PB;
  const fx=v=>'×'+(Math.round(v*10)/10),px=i=>20+P.PCW*(i+.5),posOf=idx=>P.ORDER.indexOf(idx);
  let g='';
  g+='<defs><radialGradient id="pbg" cx=".34" cy=".28" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#b6c0cf"/><stop offset="1" stop-color="#1e293b"/></radialGradient>'
   +'<linearGradient id="pbf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1646"/><stop offset=".55" stop-color="#241a5e"/><stop offset="1" stop-color="#0f0c2e"/></linearGradient>'
   +'<radialGradient id="pbb" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fecdd3"/><stop offset=".35" stop-color="#f43f5e"/><stop offset="1" stop-color="#7f1d33"/></radialGradient>'
   +'<radialGradient id="pbh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".7" stop-color="#05030f"/><stop offset="1" stop-color="#1e1b4b"/></radialGradient>'
   +'<pattern id="pbs" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1" fill="#fff" opacity=".35"/><circle cx="17" cy="14" r="1.2" fill="#a5b4fc" opacity=".35"/><circle cx="9" cy="22" r=".8" fill="#fff" opacity=".25"/></pattern>'
   +'<clipPath id="pbclip"><rect x="2" y="2" width="356" height="608" rx="24"/></clipPath></defs>';
  g+='<rect x="2" y="2" width="356" height="608" rx="24" fill="#0b0920" stroke="#cbd5e1" stroke-width="3"/>';
  // playfield: arch-shaped glass
  g+='<path d="M20 185A160 160 0 0 1 340 185V540H316V505H20Z" fill="url(#pbf)"/><path d="M20 185A160 160 0 0 1 340 185V540H316V505H20Z" fill="url(#pbs)"/>';
  g+='<text id="pbt1" x="168" y="118" text-anchor="middle" font-size="34" font-weight="900" letter-spacing="3" fill="#f43f5e" opacity=".9" style="paint-order:stroke" stroke="#fff" stroke-width="1.2">PINBALL</text>';
  g+='<text id="pbt2" x="168" y="140" text-anchor="middle" font-size="11" font-weight="800" letter-spacing="7" fill="#fde68a">BONUS ROUND</text>';
  g+='<circle cx="168" cy="95" r="0" fill="none"/>';
  // arc and lane walls
  g+='<path d="M20 505V185A160 160 0 0 1 340 185V540" fill="none" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/><path d="M20 505V185A160 160 0 0 1 340 185V540" fill="none" stroke="#6366f1" stroke-width="1.4" opacity=".8" transform="translate(0,0)"/>';
  g+='<path d="M316 205V540" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>';
  g+='<path d="M334 130l-14-10" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" id="pbgate"/>';
  // rollover lights that chase along the arc
  for(let k=0;k<6;k++){const a=(-165+k*30)*Math.PI/180,lx=P.C[0]+146*Math.cos(a),ly=P.C[1]+146*Math.sin(a);g+='<g id="pbr'+k+'" class="sl-pbrl"><circle cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'" r="5" fill="#3b2a6b" stroke="#a5b4fc" stroke-width="1.3"/></g>'}
  // side rubber guides
  P.SEG.forEach(s=>{g+='<line x1="'+s[0]+'" y1="'+s[1]+'" x2="'+s[2]+'" y2="'+s[3]+'" stroke="#be123c" stroke-width="5" stroke-linecap="round"/><line x1="'+s[0]+'" y1="'+s[1]+'" x2="'+s[2]+'" y2="'+s[3]+'" stroke="#fda4af" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>'});
  // pop bumpers
  const bc=['#f43f5e','#f59e0b','#22d3ee'];
  P.BUMP.forEach((b,i)=>{g+='<g id="pbp'+i+'" class="sl-pbbp"><circle cx="'+b.x+'" cy="'+b.y+'" r="'+(b.r+5)+'" fill="'+bc[i]+'" opacity=".2" class="sl-pbglow"/><circle cx="'+b.x+'" cy="'+b.y+'" r="'+(b.r+1)+'" fill="#111827" stroke="'+bc[i]+'" stroke-width="3"/><circle cx="'+b.x+'" cy="'+b.y+'" r="'+(b.r-6)+'" fill="'+bc[i]+'" class="sl-pbcap"/><circle cx="'+(b.x-4)+'" cy="'+(b.y-5)+'" r="4" fill="#fff" opacity=".55"/></g>'});
  // pegs
  P.PEGS.forEach(p=>{g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6.5" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/><circle cx="'+(p[0]-1.5)+'" cy="'+(p[1]-1.8)+'" r="2" fill="#fff" opacity=".8"/>'});
  // bonus hole
  const S=P.SAUCER;g+='<g id="pbsc"><circle cx="'+S.x+'" cy="'+S.y+'" r="20" fill="none" stroke="#fbbf24" stroke-width="3" class="sl-pbring"/><circle cx="'+S.x+'" cy="'+S.y+'" r="16" fill="url(#pbh)" stroke="#fde68a" stroke-width="1.5"/><text x="'+S.x+'" y="'+(S.y-26)+'" text-anchor="middle" font-size="9" font-weight="900" letter-spacing="1.6" fill="#fbbf24">BONUS HOLE</text></g>';
  // pockets
  for(let k=1;k<5;k++){const x=20+P.PCW*k;g+='<line x1="'+x+'" y1="'+P.PT+'" x2="'+x+'" y2="'+P.FL+'" stroke="#e2e8f0" stroke-width="4"/><circle cx="'+x+'" cy="'+P.PT+'" r="4.5" fill="#fda4af" stroke="#be123c" stroke-width="1.5"/>'}
  for(let k=0;k<5;k++){const idx=P.ORDER[k],v=PBX[idx];g+='<g id="pbu'+idx+'" class="sl-pbpk"><rect x="'+(px(k)-P.PCW/2+3)+'" y="'+(P.PT+8)+'" width="'+(P.PCW-6)+'" height="'+(P.FL-P.PT-9)+'" rx="6" fill="'+(v>=3?'#7c2d12':v>=2?'#5b21b6':'#312e81')+'" opacity=".55" stroke="#94a3b8" stroke-width="1.3"/><text x="'+px(k)+'" y="'+(P.PT+34)+'" text-anchor="middle" font-size="17" font-weight="900" fill="'+(v>=3?'#fbbf24':'#fff')+'">'+fx(v)+'</text></g>'}
  g+='<rect x="20" y="'+P.FL+'" width="296" height="6" fill="#e2e8f0"/>';
  // bonus chamber (lower section)
  g+='<text x="168" y="528" text-anchor="middle" font-size="10" font-weight="900" letter-spacing="2.5" fill="#fca5a5">BONUS CHAMBER</text><path d="M168 531v7" stroke="#fbbf24" stroke-width="2"/>';
  for(let k=0;k<5;k++)g+='<g id="pbc'+k+'" class="sl-pbch"><rect x="'+(px(k)-P.PCW/2+3)+'" y="542" width="'+(P.PCW-6)+'" height="56" rx="8" fill="#0b0b1e" stroke="#fbbf24" stroke-width="2"/><text x="'+px(k)+'" y="'+(k===4?566:566)+'" text-anchor="middle" font-size="'+(PBC[k]>=100?14:15)+'" font-weight="900" fill="#fbbf24">'+fx(PBC[k])+'</text></g>';
  // shooter lane + plunger
  g+='<g id="pbpl"><rect x="326" y="478" width="6" height="44" fill="#94a3b8"/><path d="M322 486h14M322 494h14M322 502h14M322 510h14M322 518h14" stroke="#64748b" stroke-width="2.2"/><rect x="321" y="478" width="16" height="6" rx="2" fill="#e2e8f0"/><circle cx="329" cy="530" r="9" fill="#ef4444" stroke="#fecaca" stroke-width="2" id="pbknob" style="cursor:pointer"/></g>';
  // balls
  g+='<g id="pbball" transform="translate(329,468)"><g id="pbtr"></g><ellipse cx="3" cy="5" rx="7" ry="5" fill="#000" opacity=".35"/><circle r="8" fill="url(#pbg)"/><circle cx="-2.6" cy="-3" r="2.2" fill="#fff" opacity=".85"/></g>';
  rw.insertAdjacentHTML('beforeend','<div class="sl-pb" id="slpb"><svg viewBox="0 0 360 612" width="100%" aria-label="Pinball bonus playfield">'+g+'</svg><button class="sl-pbgo" id="slpbgo" type="button"><i id="slpbpw"></i><span id="slpbtx">HOLD TO PULL THE PLUNGER</span></button></div>');
  rw.classList.add('pb');wrap.classList.add('fs');bar.hidden=false;
  const svg=rw.querySelector('#slpb svg'),ballG=svg.querySelector('#pbball'),plG=svg.querySelector('#pbpl'),go=rw.querySelector('#slpbgo'),pw=rw.querySelector('#slpbpw'),gtx=rw.querySelector('#slpbtx'),$s=id=>svg.querySelector(id);
  const ghosts=[];for(let k=0;k<5;k++){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('r',String(7-k*1.1));c.setAttribute('fill','#e2e8f0');c.setAttribute('opacity','0');$s('#pbtr').appendChild(c);ghosts.push(c)}
  let run=0,hist=[];
  const head=n=>{bar.innerHTML='<span>'+TH().bonus.unit+' <b>'+n+'</b> / '+N+'</span><span>Bonus win <b>+'+fmt(run)+'</b> chips</span>'};
  const put=(x,y)=>{ballG.setAttribute('transform','translate('+x.toFixed(1)+','+y.toFixed(1)+')');hist.unshift([x,y]);if(hist.length>12)hist.pop();ghosts.forEach((c,k)=>{const h=hist[(k+1)*2];if(h){c.setAttribute('cx',(h[0]-x).toFixed(1));c.setAttribute('cy',(h[1]-y).toFixed(1));c.setAttribute('opacity',String(.22-k*.04))}else c.setAttribute('opacity','0')})};
  const say=(a,b,col)=>{const t1=$s('#pbt1'),t2=$s('#pbt2');if(!t1||!t2)return;t1.textContent=a;t1.setAttribute('font-size',a.length>10?'25':a.length>8?'30':'34');t1.setAttribute('fill',col||'#f43f5e');t2.textContent=b||'';t2.setAttribute('letter-spacing',(b||'').length>18?'1.2':(b||'').length>12?'3':'6')};
  const clearTrail=()=>{hist=[];ghosts.forEach(c=>c.setAttribute('opacity','0'))};
  const pull=(p)=>{plG.setAttribute('transform','translate(0,'+(p*38).toFixed(1)+')')};
  const flash=(el,cls,ms)=>{if(!el)return;el.classList.remove(cls);void el.getBoundingClientRect();el.classList.add(cls);setTimeout(()=>el&&el.classList.remove(cls),ms||450)};
  // sounds for the playfield
  const snd={
   bump:()=>{bell(1250+Math.random()*350,0,.3,.05);tone(520,0,.12,'square',.06,190);nz(0,.03,'bandpass',900,0,3,.18,.001)},
   peg:s=>{nz(0,.018,'bandpass',2100+Math.random()*900,0,5,.04+.09*s,.001)},
   wall:s=>{nz(0,.06,'lowpass',900,180,1,.03+.08*s,.002)},
   guide:s=>{nz(0,.05,'bandpass',500,200,2,.08+.1*s,.001);tone(210,0,.05,'square',.04,120)},
   floor:s=>{nz(0,.045,'bandpass',700,260,2,.08+.14*s,.001);tone(170,0,.07,'sine',.09,90)},
   hole:()=>{tone(700,0,.5,'sawtooth',.05,90);for(let k=0;k<5;k++)bell(1500+k*220,.05+k*.07,.4,.04);knock(.4,.18)},
   charge:p=>{nz(0,.02,'bandpass',500+p*1400,0,4,.1,.001);tone(100+p*180,0,.04,'sawtooth',.02)},
   shoot:p=>{nz(0,.07,'lowpass',2600,300,1,.3,.001);tone(95,0,.18,'sine',.28,42);nz(.04,.3,'bandpass',500+p*400,2400,1,.06,.05)},
   light:()=>{bell(1900,0,.12,.025)},land:()=>{knock(0,.18);bell(1568,.02,.4,.05)}};
  // shoot: hold the button or the knob, release to launch. Returns the pull strength 0..1.
  const getPower=()=>new Promise(res=>{
   let t0=0,held=false,done=false,raf=0,lastTick=0,idle,startAt=performance.now();
   const finish=p=>{if(done)return;done=true;clearTimeout(idle);cancelAnimationFrame(raf);go.removeEventListener('pointerdown',dn);$s('#pbknob').removeEventListener('pointerdown',dn);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);go.disabled=true;pw.style.width='0%';res(p)};
   const pwr=()=>Math.min(1,(performance.now()-t0)/T(850));
   const tick=t=>{if(done||!held)return;const p=pwr();pull(p);pw.style.width=(p*100)+'%';if(t-lastTick>75){lastTick=t;snd.charge(p)}raf=requestAnimationFrame(tick)};
   const dn=e=>{if(done||held)return;if(e&&e.preventDefault)e.preventDefault();held=true;t0=performance.now();clearTimeout(idle);gtx.textContent='RELEASE TO SHOOT';raf=requestAnimationFrame(tick)};
   const up=()=>{if(done||!held)return;const p=pwr();held=false;pull(0);finish(p)};
   const kd=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat&&!e.target.closest('input,textarea')){e.preventDefault();dn()}},ku=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();up()}};
   go.disabled=false;gtx.textContent='HOLD TO PULL THE PLUNGER';pw.style.width='0%';
   go.addEventListener('pointerdown',dn);$s('#pbknob').addEventListener('pointerdown',dn);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);
   const auto=calm()||autoOn;idle=setTimeout(()=>{if(!held){gtx.textContent='SHOOTING…';pull(.8);setTimeout(()=>{pull(0);finish(.8)},T(350))}},auto?T(650):9000)});
  const along=(pts,ms)=>new Promise(res=>{if(calm()||!ms){put(...pts[pts.length-1]);return res()}
   const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const tot=L[L.length-1],t0=performance.now();
   const step=t=>{if(!m.isConnected)return res();let p=Math.max(0,Math.min(1,(t-t0)/ms));p=p*p;const d=p*tot;let i=1;while(i<L.length-1&&L[i]<d)i++;const f=(d-L[i-1])/((L[i]-L[i-1])||1);put(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f);p<1?requestAnimationFrame(step):res()};requestAnimationFrame(step)});
  const lights=[];const lt=[];for(let k=0;k<6;k++){const a=(-165+k*30)*Math.PI/180;lights.push([P.C[0]+146*Math.cos(a),P.C[1]+146*Math.sin(a)])}
  const replay=(tr)=>new Promise(res=>{
   const xs=tr.xs,ys=tr.ys,ev=tr.ev,spd=turbo?1.8:1,t0=performance.now();let ei=0;
   const frame=t=>{if(!m.isConnected)return res(false);const k=Math.max(0,Math.min(xs.length-1,((t-t0)/1000)*(1/tr.dt)*spd)),i=Math.max(0,Math.min(xs.length-2,Math.floor(k))),f=k-i;
    if(xs.length>1)put(xs[i]+(xs[i+1]-xs[i])*f,ys[i]+(ys[i+1]-ys[i])*f);
    while(ei<ev.length&&ev[ei][0]<=k){const e=ev[ei++];if(e[1]==='b'){snd.bump();flash($s('#pbp'+e[2]),'hit',380)}else if(e[1]==='p')snd.peg(e[3]);else if(e[1]==='w')snd.wall(e[3]);else if(e[1]==='g')snd.guide(e[3]);else if(e[1]==='f')snd.floor(e[3])}
    for(let q=0;q<6;q++){if(Math.hypot(xs[i]-lights[q][0],ys[i]-lights[q][1])<15&&!lt[q]){lt[q]=1;snd.light();const el=$s('#pbr'+q);if(el){el.classList.add('on');setTimeout(()=>el.classList.remove('on'),900)}setTimeout(()=>{lt[q]=0},900)}}
    if(k>=xs.length-1)res(true);else requestAnimationFrame(frame)};requestAnimationFrame(frame)});
  // find a real simulated shot that ends where the server decided
  const shoot=(power,q)=>{const want=q.kind==='c'?{kind:'c'}:{kind:'u',pos:posOf(q.idx)};let f=pbFind(power,want,260);
   if(!f){for(let t=0;t<40&&!f;t++){const s=pbRun(power,(Math.random()*1e9)|0,want,{k:900+t*80});if(pbOk(s,want))f={tr:s}}}
   return f?f.tr:null};
  head(1);msg.innerHTML=TH().bonus.name+'!<small class="sl-sub">'+N+(N>1?' shots':' shot')+' · you pull the plunger</small>';say('PINBALL BONUS',N+(N>1?' SHOTS':' SHOT'),'#f43f5e');
  await wait(calm()?200:T(700));
  for(const q of sh){
   if(!m.isConnected)return false;
   head(q.n);clearTrail();pull(0);put(329,468);ballG.style.opacity=1;
   msg.innerHTML='SHOT '+q.n+' OF '+N+'<small class="sl-sub">Hold the plunger, release to shoot</small>';say('SHOT '+q.n+' OF '+N,'HOLD & RELEASE THE PLUNGER');
   const power=await getPower();if(!m.isConnected)return false;gtx.textContent='BALL IN PLAY…';
   const tr=shoot(power,q);
   snd.shoot(power);
   let landed=true;
   if(tr){ if(calm()){put(tr.xs[tr.xs.length-1],tr.ys[tr.ys.length-1])} else landed=await replay(tr); }
   else{ // (never expected) show the ball dropping straight into the chosen spot
    if(q.kind==='c')await along([[329,468],[329,60],[170,40],[170,330]],T(900));else await along([[329,468],[329,60],[px(posOf(q.idx)),60],[px(posOf(q.idx)),488]],T(1100))}
   if(!m.isConnected||landed===false)return false;
   run=q.run;head(q.n);
   if(q.kind==='c'){
    flash($s('#pbsc'),'hit',700);snd.hole();ballG.style.opacity=0;clearTrail();
    msg.innerHTML='BONUS HOLE!<small class="sl-sub">the ball drops into the bonus chamber</small>';say('BONUS HOLE!','DROPS INTO THE CHAMBER','#fbbf24');
    await wait(calm()?150:T(550));if(!m.isConnected)return false;
    put(168,540);ballG.style.opacity=1;
    await along([[168,540],[168,566],[px(q.idx),574]],T(calm()?0:700));
    const el=$s('#pbc'+q.idx);if(el){el.classList.add('lit');flash(el,'hit',700)}
   }else{
    const el=$s('#pbu'+q.idx);if(el){el.classList.add('lit');flash(el,'hit',700)}
   }
   snd.land();sfx.coin();
   msg.innerHTML=(q.kind==='c'?'BONUS CHAMBER! ':'')+'+'+fmt(q.pay)+' chips<small class="sl-sub">'+fx(q.mult)+' your bet'+(q.kind==='c'?' · chamber slot '+(q.idx+1)+' of 5':'')+'</small>';
   say('+'+fmt(q.pay),fx(q.mult)+' YOUR BET'+(q.kind==='c'?' · CHAMBER '+(q.idx+1)+'/5':''),q.kind==='c'?'#fbbf24':'#4ade80');
   bal(S.chips-stake+(r.line_pay||0)+run);
   await wait(calm()?200:T(1100));
   if(!m.isConnected)return false;
   ballG.style.opacity=0;
   svg.querySelectorAll('.sl-pbpk.lit').forEach(e=>e.classList.remove('lit'));
  }
  await wait(calm()?150:T(500));
  const bd=$m('#slpb');if(bd)bd.remove();rw.classList.remove('pb');
  return m.isConnected}

 /* the bonus: the server already played every free spin, we replay them one after another */
 const total0=()=>r0bet;let r0bet=1;
 async function freeSpins(r,stake){r0bet=r.bet||1;
  const wrap=$m('.sl-wrap'),reels=$m('#slr'),msg=$m('#slm'),bar=$m('#slfs');
  let total=r.free.start,run=0;
  const U=TH().bonus.unit,head=(n,x)=>{bar.innerHTML='<span>'+U+' <b>'+n+'</b> / '+total+(x?' · ×'+x:'')+(rows>3?' · 5 × '+rows:'')+'</span><span>Bonus win <b>+'+fmt(run)+'</b> chips</span>'};
  wrap.classList.add('fs');bar.hidden=false;$m('#slgo').textContent='Free spins…';head(1,r.free.spins[0]&&r.free.spins[0].x);
  for(const f of r.free.spins){
   if(!m.isConnected)return false;
   clearHi();reels.className='sl-reels';msg.textContent='';
   if((f.rows||baseRows())!==rows){reels.classList.add('bonus');msg.innerHTML=(TH().bonus.open||'THE REELS OPEN UP')+'<small class="sl-sub">5 reels × '+f.rows+' rows · lower rows pay too</small>';await setRows(f.rows||3);reels.classList.remove('bonus');if(!m.isConnected)return false;await wait(calm()?200:T(500));msg.textContent=''}
   head(f.n,f.x);
   sfx.spinOn();await Promise.all([...reels.children].map((el,i)=>runReel(el,f.reels[i],T(650)+i*T(190)).then(()=>sfx.stop(i))));sfx.spinOff();
   if(!m.isConnected)return false;
   if(f.wins.length)hilite(f.wins,reels);
   if(f.retrigger){const add=f.total-total;total=f.total;head(f.n,f.x);reels.classList.add('bonus');sfx.bonus();msg.innerHTML='+'+add+' FREE SPINS!<small class="sl-sub">'+total+' in total</small>';try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}await wait(calm()?400:T(1500));reels.classList.remove('bonus');if(!m.isConnected)return false}
   run=f.run;head(f.n,f.x);bal(S.chips-stake+(r.line_pay||0)+run);
   if(f.pay>0){reels.classList.add('win');sfx.win(lvl(f.pay,total0()));msg.innerHTML=winMsg(f.wins,f.pay,total0());try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}await wait(calm()?250:T(1150))}
   else await wait(calm()?150:T(500))}
  return m.isConnected}
 const xTxt=(pay,st)=>st?(Math.round(pay/st*10)/10)+'×':'';
 const winMsg=(wins,pay,st)=>{const best=wins.slice().sort((a,b)=>b.pay-a.pay)[0],tier=st?(pay>=MEGAX*st?'MEGA WIN! ':pay>=BIGX*st?'BIG WIN! ':''):'';return tier+(wins.length>1?wins.length+' lines! ':'')+'+'+fmt(pay)+' chips<small class="sl-sub">'+xTxt(pay,st)+' your bet'+(best?' · '+lname(best.line)+' · '+best.count+'× '+(tn(best.sym)[0]?tn(best.sym)[0]+' ':'')+tn(best.sym)[1]:'')+'</small>'};
 const countUp=(el,to,ms,snd)=>new Promise(res=>{const t0=performance.now();let lc=0;const tick=t=>{const p=ms?Math.min(1,(t-t0)/ms):1;if(snd&&t-lc>70){lc=t;sfx.coin()}el.textContent='+'+fmt(Math.round(to*p))+' chips';p<1&&el.isConnected?requestAnimationFrame(tick):res()};requestAnimationFrame(tick)})}
document.addEventListener('click',e=>{if(e.target.closest('[data-slots]'))openSlots()});
window.openSlots=openSlots;window.SL_THEMES=THEMES;window.SL_ORDER=TORDER;
})();
