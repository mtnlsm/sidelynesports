/* SP Casino: the hub page (Slots + Blackjack) and the Blackjack table. Every card is dealt by the server (supabase/blackjack.sql); this file only draws what comes back. */
(()=>{
const TABLES=[
 ['classic','Classic 21','6 decks · dealer stands on 17 · blackjack pays 3:2'],
 ['original','Sidelyne 21','Blackjack pays 7:5 · Five-card Charlie wins · late surrender'],
 ['exposed','Double Exposure','Both dealer cards face up · dealer wins ties · blackjack pays 1:1'],
 ['strip','Vegas Strip','4 decks · split up to 4 hands · late surrender'],
 ['single','Single Deck','1 deck · blackjack pays 7:5 · double on 9, 10, 11'],
];
const MINBET=1,MAXBET=100000,fmt=n=>Number(n).toLocaleString();
const SUIT={S:'\u2660',H:'\u2665',D:'\u2666',C:'\u2663'},RES={win:'Win',blackjack:'Blackjack!',charlie:'5-card Charlie!',push:'Push',lose:'Lose',bust:'Bust',surrender:'Surrendered'};
let bet=10;try{const b=parseInt(localStorage.getItem('fx-bjbet'),10);if(b>=1)bet=Math.min(b,MAXBET)}catch(e){}
let lastT='classic';try{const t=localStorage.getItem('fx-bjt');if(TABLES.some(x=>x[0]===t))lastT=t}catch(e){}

/* per-table look: gradient, a pair of showcase cards, and short rule tags */
const TLOOK={
 classic:{g:['#1f7a4a','#0b3d25'],c:['A\u2660','K\u2665'],t:['6 decks','Pays 3:2','Stand on 17']},
 original:{g:['#7c3aed','#2e1065'],c:['5\u2663','5\u2666'],t:['Pays 7:5','5-card Charlie','Surrender']},
 exposed:{g:['#0ea5e9','#0c3a63'],c:['K\u2666','A\u2665'],t:['Dealer face up','Pays 1:1','Dealer wins ties']},
 strip:{g:['#e11d48','#4c0519'],c:['A\u2663','J\u2660'],t:['4 decks','Split to 4','Surrender']},
 single:{g:['#f59e0b','#78350f'],c:['A\u2665','9\u2660'],t:['1 deck','Pays 7:5','Double 9-11']}};
const GLOOK={
 vp:{g:['#0ea5a4','#134e4a'],c:['J\u2660','J\u2665'],t:['Jacks or Better','Royal pays 800\u00d7','Hold & draw'],n:'Video Poker',b:'Deal me in'},
 tc:{g:['#be185d','#500724'],c:['Q\u2665','Q\u2663'],t:['Ante + Play','Pair Plus side bet','Beat the dealer'],n:'Three Card Poker',b:'Deal me in'},
 hc:{g:['#1d4ed8','#172554'],c:['A\u2666','A\u2660'],t:['Flop first','Call 2\u00d7 or fold','Dealer needs 4s'],n:"Texas Hold'em",b:'Deal me in'},
 cf:{g:['#ca8a04','#713f12'],t:['50/50','Pays 1.95\u00d7','Instant'],n:'Heads or Tails',b:'Flip it'}};
function hcss(){if(document.getElementById('czcss'))return;const s=document.createElement('style');s.id='czcss';s.textContent=`
.cz-hero{position:relative;overflow:hidden;border-radius:20px;padding:22px 20px;margin-bottom:14px;color:#fff;background:radial-gradient(120% 140% at 0 0,#7c3aed 0,#3b1a8f 45%,#150a35 100%);box-shadow:0 10px 30px rgba(60,20,140,.35)}
.cz-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 100% 0,rgba(255,216,107,.28),transparent 60%);pointer-events:none}
.cz-hero h2{margin:0;font-size:26px;letter-spacing:.02em}.cz-hero p{margin:4px 0 14px;opacity:.85;max-width:420px}
.cz-bal{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,216,107,.5);font-weight:800}
.cz-bal b{color:#ffd86b;font-size:17px}
.cz-fl{position:absolute;right:14px;top:8px;font-size:54px;line-height:1;display:flex;gap:6px;opacity:.9;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4))}
.cz-fl span{display:block;animation:czf 4s ease-in-out infinite}.cz-fl span:nth-child(2){animation-delay:-1s}.cz-fl span:nth-child(3){animation-delay:-2s}.cz-fl span:nth-child(4){animation-delay:-3s}
@keyframes czf{50%{transform:translateY(-8px) rotate(6deg)}}
.rm .cz-fl span,.rm .cz-m,.rm .cz-t{animation:none!important;transition:none!important}
.cz-sh{display:flex;align-items:center;justify-content:space-between;margin:18px 2px 10px}
.cz-sh h3{margin:0;font-size:17px;display:flex;align-items:center;gap:8px}.cz-sh .mu{font-size:12px}
.cz-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.cz-m{position:relative;overflow:hidden;border:0;border-radius:18px;padding:14px 12px 12px;min-height:150px;color:#fff;text-align:left;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end;box-shadow:0 6px 16px rgba(0,0,0,.28);transition:transform .18s,box-shadow .18s}
.cz-m:hover,.cz-m:focus-visible{transform:translateY(-4px) scale(1.02);box-shadow:0 12px 26px rgba(0,0,0,.4)}
.cz-m:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.22),transparent 45%);pointer-events:none}
.cz-m:after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);pointer-events:none}
.cz-ic{position:absolute;top:10px;left:12px;right:12px;display:flex;align-items:flex-start;justify-content:space-between}
.cz-big{font-size:46px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45))}.cz-sm{font-size:22px;opacity:.9;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
.cz-m b{font-size:15px;position:relative;text-shadow:0 1px 3px rgba(0,0,0,.45)}.cz-m small{position:relative;opacity:.85;font-size:11px;margin-top:2px}
.cz-pl{position:relative;margin-top:8px;align-self:flex-start;padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.35);font:800 11px system-ui;letter-spacing:.06em;text-transform:uppercase}
.cz-quick{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(255,216,107,.18),rgba(255,216,107,.04));border:1px solid rgba(255,216,107,.4)}
.cz-quick b{display:block}.cz-quick .mu{font-size:12px}
.cz-tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.cz-t{position:relative;overflow:hidden;border:0;border-radius:18px;padding:14px;min-height:150px;color:#fff;text-align:left;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.28);transition:transform .18s,box-shadow .18s}
.cz-t:hover,.cz-t:focus-visible{transform:translateY(-4px);box-shadow:0 12px 26px rgba(0,0,0,.4)}
.cz-t:before{content:"";position:absolute;inset:0;background:radial-gradient(80% 60% at 85% 10%,rgba(255,255,255,.22),transparent 60%);pointer-events:none}
.cz-t:after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);pointer-events:none}
.cz-t b{display:block;font-size:17px;position:relative;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.cz-tags{position:relative;display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 10px;max-width:62%}
.cz-tags span{font:700 10.5px system-ui;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.22)}
.cz-cd{position:absolute;right:14px;top:16px;width:92px;height:96px}
.cz-k{position:absolute;width:56px;height:78px;border-radius:9px;background:#fff;color:#111;font:800 19px/1 system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 6px 14px rgba(0,0,0,.45)}
.cz-k.r{color:#d11}.cz-k:nth-child(1){left:0;top:10px;transform:rotate(-10deg)}.cz-k:nth-child(2){right:0;top:0;transform:rotate(9deg)}
.cz-k i{font-style:normal;font-size:22px}
.cz-coin{position:absolute;right:16px;top:18px;width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f5c542 45%,#b8860b);border:3px solid #8a6508;box-shadow:0 8px 16px rgba(0,0,0,.45);display:grid;place-items:center;font-size:38px;transform:rotate(-12deg)}
.cz-note{margin:14px 2px 4px}`;document.head.append(s)}

window.casinoHub=function(){
 if(!age18())return `<div class="glass card rw"><div class="rw-h">SP Casino</div><p class="mu" style="margin:6px 0 12px">The casino is for adults only. Confirm you are 18 or older to play. SP has no cash value.</p><button class="pri" data-age18 style="padding:8px 18px;min-height:40px">I am 18 or older</button></div>`;
 hcss();
 const th=window.SL_THEMES||{},ord=window.SL_ORDER||Object.keys(th);
 const hero=`<div class="cz-hero"><div class="cz-fl" aria-hidden="true"><span>\u2660\ufe0f</span><span>\u2665\ufe0f</span><span>\ud83c\udfb2</span><span>\ud83c\udfb0</span></div><h2>SP Casino</h2><p>Slots, blackjack, poker and coin flip. Free play, every card and spin decided on the server.</p><div class="cz-bal"><span>\ud83e\ude99</span><span>Balance</span><b>${fmt(S.novas||0)}</b><span>SP</span></div></div>`;
 const slots=ord.filter(k=>th[k]).map(k=>{const t=th[k];return `<button class="cz-m" data-slotsth="${k}" style="background:linear-gradient(150deg,${t.a},${t.b})" aria-label="Play ${t.name}"><span class="cz-ic"><span class="cz-big">${t.s[5][0]}</span><span class="cz-sm">${t.sc.e}</span></span><b>${t.name}</b><small>Bonus: ${t.bonus.name}</small><span class="cz-pl">Play</span></button>`}).join('');
 const tabs=TABLES.map(t=>{const L=TLOOK[t[0]];return `<button class="cz-t" data-bj="${t[0]}" style="background:linear-gradient(150deg,${L.g[0]},${L.g[1]})" aria-label="Play ${t[1]}"><span class="cz-cd" aria-hidden="true">${L.c.map(c=>`<span class="cz-k ${/[\u2665\u2666]/.test(c)?'r':''}"><span>${c.slice(0,-1)}</span><i>${c.slice(-1)}</i></span>`).join('')}</span><b>${t[1]}</b><span class="cz-tags">${L.t.map(x=>`<span>${x}</span>`).join('')}</span><span class="cz-pl" style="display:inline-block">Deal me in</span></button>`}).join('');
 const gt=k=>{const L=GLOOK[k];return `<button class="cz-t" data-cg="${k}" style="background:linear-gradient(150deg,${L.g[0]},${L.g[1]})" aria-label="Play ${L.n}">${L.c?`<span class="cz-cd" aria-hidden="true">${L.c.map(c=>`<span class="cz-k ${/[\u2665\u2666]/.test(c)?'r':''}"><span>${c.slice(0,-1)}</span><i>${c.slice(-1)}</i></span>`).join('')}</span>`:'<span class="cz-coin" aria-hidden="true">\ud83d\udc51</span>'}<b>${L.n}</b><span class="cz-tags">${L.t.map(x=>`<span>${x}</span>`).join('')}</span><span class="cz-pl" style="display:inline-block">${L.b}</span></button>`};
 return `${hero}
 <div class="cz-sh"><h3>\ud83c\udfb0 Slots</h3><span class="mu">${ord.length} machines \u00b7 9 paylines \u00b7 3 bonus symbols = free spins</span></div>
 <div class="cz-quick"><div><b>Sidelyne Slots</b><span class="mu">Jump back into your last machine.</span></div><button class="pri" data-slots style="padding:8px 20px;min-height:42px">Quick play</button></div>
 <div class="cz-g">${slots}</div>
 <div class="cz-sh"><h3>\u2660\ufe0f Blackjack</h3><span class="mu">5 tables \u00b7 fresh shoe every hand</span></div>
 <div class="cz-tg">${tabs}</div>
 <div class="cz-sh"><h3>\ud83c\udccf Poker</h3><span class="mu">3 games \u00b7 played against the dealer</span></div>
 <div class="cz-tg">${['vp','tc','hc'].map(k=>gt(k)).join('')}</div>
 <div class="cz-sh"><h3>\ud83e\ude99 Coin Flip</h3><span class="mu">Heads or tails, double or nothing (almost)</span></div>
 <div class="cz-tg">${gt('cf')}</div>
 <p class="mu cz-note">Free play only. SP has no cash value.</p>`};

function css(){if(document.getElementById('bjcss'))return;const s=document.createElement('style');s.id='bjcss';s.textContent=`
.bj{text-align:center}.bj h3{margin:0 0 4px}.bj-bal{margin-bottom:8px}
.bj-t{border-radius:16px;padding:12px 8px;background:radial-gradient(ellipse at 50% 0,#1f7a4a,#0f4a2c);color:#fff;margin:8px 0}
.bj-l{font:700 12px var(--fd,inherit);letter-spacing:.06em;text-transform:uppercase;opacity:.85;margin:6px 0 4px}
.bj-h{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;min-height:70px}
.bj-hd{padding:6px;border-radius:12px;border:2px solid transparent}.bj-hd.cur{border-color:#ffd86b}
.bj-c{width:44px;height:62px;border-radius:7px;background:#fff;color:#111;font:800 16px/1 system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.bj-c.r{color:#d11}.bj-c.back{background:repeating-linear-gradient(45deg,#2b4acb,#2b4acb 5px,#1d33a0 5px,#1d33a0 10px);color:transparent;border:2px solid #fff}
.bj-c small{font-size:15px}.bj-m{min-height:34px;margin:6px 0;font-weight:800}
.bj-a{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0}.bj-a button{min-width:84px;min-height:44px}
.bj-bi{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}.bj-bi input{width:110px;font-size:16px;text-align:center}
.bj-r{font:800 12px system-ui;margin-top:4px}`;document.head.append(s)}

const card=(c,hide)=>{if(hide)return '<div class="bj-c back">?</div>';const r=c[0]==='T'?'10':c[0],s=c[1];return `<div class="bj-c ${s==='H'||s==='D'?'r':''}"><span>${r}</span><small>${SUIT[s]}</small></div>`};

function openBlackjack(variant){
 if(!ME)return;if(!age18()){toast('Confirm you are 18+ in the SP Casino tab first');return}
 css();if(!TABLES.some(t=>t[0]===variant))variant=lastT;lastT=variant;try{localStorage.setItem('fx-bjt',variant)}catch(e){}
 const tname=()=>TABLES.find(t=>t[0]===lastT)[1];
 const m=modal('<div class="bj" id="bjw"></div>');let g=null,busy=false,msg='';
 const w=m.querySelector('#bjw');
 const err=e=>{const t=String(e&&e.message||e||'');return /function|schema|does not exist/i.test(t)?'Blackjack is not set up yet (run supabase/blackjack.sql)':t};
 const setNovas=n=>{if(typeof n==='number')applyNovas(n,null)};
 async function call(fn,args){if(busy)return;busy=true;draw();try{const q=await FX_DB.rpc(fn,args);if(q.error)throw q.error;g=q.data;if(g)setNovas(g.novas);msg=''}catch(e){msg=err(e);toast(msg)}busy=false;if(m.isConnected)draw()}
 function hand(h,i,live){const cur=live&&g.cur===i&&!h.done;return `<div class="bj-hd ${cur?'cur':''}"><div class="bj-h" style="min-height:0">${h.cards.map(c=>card(c)).join('')}</div><div class="bj-r">${h.total}${h.soft&&!h.done?' (soft)':''} · ${fmt(h.bet)} SP${h.result?' · '+(RES[h.result]||h.result)+(h.pay>0?' +'+fmt(h.pay):''):''}</div></div>`}
 function draw(){
  const bal=fmt(S.novas);let h=`<h3>${tname()}</h3><div class="bj-bal"><span class="mu">Balance</span> <b>${bal}</b> SP</div>`;
  if(g){
   const live=!g.done;
   h+=`<div class="bj-t"><div class="bj-l">Dealer${g.dealer_total!=null?' · '+g.dealer_total:''}</div><div class="bj-h">${g.dealer.map(c=>card(c)).join('')}${g.hidden?card('',true):''}</div><div class="bj-l">You</div><div class="bj-h">${g.hands.map((x,i)=>hand(x,i,live)).join('')}</div></div>`;
   if(live)h+=`<div class="bj-a">${g.actions.map(a=>`<button class="${a==='hit'||a==='stand'?'pri':'chip'}" data-bja="${a}" ${busy?'disabled':''}>${a[0].toUpperCase()+a.slice(1)}</button>`).join('')}</div>`;
   else{const p=g.payout||0,w=g.wagered||0,net=p-w;h+=`<div class="bj-m">${net>0?'You won +'+fmt(net)+' SP':net===0?'Push. Bet returned.':'You lost '+fmt(-net)+' SP'}</div>`}
  }else h+=`<div class="bj-t"><div class="bj-m">${msg?msg:'Set your bet and deal.'}</div></div>`;
  if(!g||g.done){
   h+=`<div class="bj-bi"><button class="chip" data-bjb="half">\u00bd</button><input id="bjbet" inputmode="numeric" value="${bet}" aria-label="Bet amount"><button class="chip" data-bjb="dbl">2\u00d7</button><button class="chip" data-bjb="max">Max</button></div><div class="bj-a"><button class="pri" data-bjdeal ${busy||bet<MINBET||bet>S.novas?'disabled':''}>${g?'Deal again':'Deal'}</button></div><div class="row hs" style="justify-content:center">${TABLES.map(t=>`<button class="chip ${t[0]===lastT?'on':''}" data-bjt="${t[0]}">${t[1]}</button>`).join('')}</div>`}
  w.innerHTML=h}
 const clamp=()=>{bet=Math.max(MINBET,Math.min(MAXBET,Math.floor(bet)||MINBET));try{localStorage.setItem('fx-bjbet',bet)}catch(e){}};
 m.addEventListener('input',e=>{if(e.target.id!=='bjbet')return;const v=parseInt(e.target.value.replace(/\D/g,''),10);bet=Number.isFinite(v)?Math.min(v,MAXBET):0;const b=w.querySelector('[data-bjdeal]');if(b)b.disabled=busy||bet<MINBET||bet>S.novas});
 m.addEventListener('change',e=>{if(e.target.id==='bjbet'){clamp();draw()}});
 m.addEventListener('click',e=>{
  const a=e.target.closest('[data-bja]');if(a){call('bj_act',{p_action:a.dataset.bja});return}
  if(e.target.closest('[data-bjdeal]')){clamp();if(bet>S.novas){toast('Not enough SP');return}g=null;call('bj_start',{p_variant:lastT,p_bet:bet});return}
  const t=e.target.closest('[data-bjt]');if(t&&!busy){lastT=t.dataset.bjt;try{localStorage.setItem('fx-bjt',lastT)}catch(x){}g=null;draw();return}
  const b=e.target.closest('[data-bjb]');if(b){bet=b.dataset.bjb==='half'?Math.floor(bet/2):b.dataset.bjb==='dbl'?bet*2:Math.min(MAXBET,S.novas);clamp();draw()}});
 draw();
 /* resume a hand that was still in progress (refresh or closed window never loses a hand) */
 FX_DB.rpc('bj_state').then(q=>{if(q.error||!q.data||!m.isConnected)return;g=q.data;lastT=g.variant||lastT;setNovas(g.novas);draw()}).catch(()=>{});
}
/* ---- Coin Flip, Video Poker, Three Card Poker, Texas Hold'em (server: supabase/casino_games.sql) ---- */
const MINB={cf:10,vp:1,tc:1,tcpp:0,hc:1},DIV={tc:2,hc:3};
const bets={};try{Object.assign(bets,JSON.parse(localStorage.getItem('fx-czbets')||'{}'))}catch(e){}
const B=k=>{const v=bets[k];return Number.isFinite(v)&&v>=MINB[k]?Math.min(v,MAXBET):(MINB[k]===0?0:10)};
const SB=(k,v)=>{bets[k]=Math.max(MINB[k],Math.min(MAXBET,Math.floor(v)||MINB[k]));try{localStorage.setItem('fx-czbets',JSON.stringify(bets))}catch(e){}};
const betBox=(k,label)=>`<div class="cg-bet"><span class="mu">${label}</span><button class="chip" data-cgb="${k}:h">\u00bd</button><input class="cg-in" data-bi="${k}" inputmode="numeric" value="${B(k)}" aria-label="${label}"><button class="chip" data-cgb="${k}:d">2\u00d7</button><button class="chip" data-cgb="${k}:m">Max</button></div>`;
function bindBets(m,redraw){
 m.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.bi;if(!k)return;const v=parseInt(e.target.value.replace(/\D/g,''),10);bets[k]=Number.isFinite(v)?Math.min(v,MAXBET):0});
 m.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.bi;if(!k)return;SB(k,bets[k]);e.target.value=B(k)});
 m.addEventListener('click',e=>{const b=e.target.closest('[data-cgb]');if(!b)return;const[k,op]=b.dataset.cgb.split(':'),v=B(k);
  SB(k,op==='h'?Math.floor(v/2):op==='d'?v*2:k==='tcpp'?Math.max(0,S.novas-2*B('tc')):Math.floor(S.novas/(DIV[k]||1)));redraw()})}
const gcss=()=>{if(document.getElementById('cgcss'))return;const s=document.createElement('style');s.id='cgcss';s.textContent=`
.cg-coinw{perspective:600px;height:136px;display:grid;place-items:center;margin:8px 0}
.cg-coin{width:112px;height:112px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f5c542 45%,#b8860b);border:4px solid #8a6508;box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 0 0 4px rgba(255,255,255,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#5a3d00;font-weight:900}
.cg-coin span{font-size:46px;line-height:1}.cg-coin small{font-size:11px;letter-spacing:.14em}
.cg-coin.spin{animation:cgs 1.2s cubic-bezier(.2,.7,.3,1)}
@keyframes cgs{from{transform:rotateY(0) translateY(0)}40%{transform:rotateY(900deg) translateY(-34px)}to{transform:rotateY(1800deg) translateY(0)}}
.rm .cg-coin.spin{animation:none}
.cg-sides{display:flex;gap:8px;justify-content:center;margin:6px 0}
.cg-side{flex:1;max-width:150px;min-height:46px;border-radius:12px;font-weight:800;border:2px solid var(--bd);background:transparent;color:inherit;cursor:pointer}
.cg-side.on{border-color:#ffd86b;background:rgba(255,216,107,.16)}
.cg-hist{display:flex;gap:4px;justify-content:center;margin-top:8px;flex-wrap:wrap}
.cg-hist i{font:800 11px system-ui;font-style:normal;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff}
.cg-hist .w{background:#16a34a}.cg-hist .l{background:#dc2626}
.cg-bet{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;margin:6px 0}.cg-in{width:100px;font-size:16px;text-align:center}
.cg .bj-m{color:inherit}.bj-t .bj-m{color:#fff}
.cg-hold{background:none;border:0;padding:0;cursor:pointer;color:inherit;display:flex;flex-direction:column;align-items:center;gap:4px}
.cg-hold:disabled{cursor:default}
.cg-hold .bj-c{width:54px;height:76px;transition:transform .15s}
.cg-hold.held .bj-c{outline:3px solid #ffd86b;transform:translateY(-6px)}
.cg-ht{font:800 10px system-ui;letter-spacing:.08em;color:#ffd86b;min-height:12px}
.cg-pt{margin-top:10px;font-size:12px;text-align:left}
.cg-pt div{display:flex;justify-content:space-between;padding:4px 10px;border-radius:8px}
.cg-pt .hit{background:rgba(255,216,107,.25);font-weight:800}
.cg-ex{font-size:12px;opacity:.85;margin-top:2px}`;document.head.append(s)};
function shell(){css();gcss();const m=modal('<div class="bj cg" id="cgw"></div>');return{m,w:m.querySelector('#cgw')}}
const need18=()=>{if(!ME)return true;if(!age18()){toast('Confirm you are 18+ in the SP Casino tab first');return true}return false};
const cap=s=>s[0].toUpperCase()+s.slice(1),sleep=ms=>new Promise(r=>setTimeout(r,ms)),calm=()=>document.documentElement.classList.contains('rm');
async function rpc(fn,args){const q=await FX_DB.rpc(fn,args);if(q.error)throw q.error;return q.data}
const errM=e=>{const t=String(e&&e.message||e||'');return /function|schema|does not exist|relation/i.test(t)?'This game is not set up yet (run supabase/casino_games.sql)':t};
const balRow=()=>`<div class="bj-bal"><span class="mu">Balance</span> <b>${fmt(S.novas)}</b> SP</div>`;
const backs=n=>Array.from({length:n},()=>card('',true)).join('');

/* COIN FLIP */
function openCoin(){
 if(need18())return;const{m,w}=shell();let side='heads',busy=false,face='heads',msg='',hist=[];
 const F={heads:'\ud83d\udc51',tails:'\ud83e\udd85'};
 const draw=()=>{w.innerHTML=`<h3>Heads or Tails</h3>${balRow()}<div class="cg-coinw"><div class="cg-coin" id="cgcoin"><span>${F[face]}</span><small>${face.toUpperCase()}</small></div></div><div class="bj-m">${msg||'Pick a side and flip. Wins pay 1.95\u00d7.'}</div><div class="cg-sides">${['heads','tails'].map(s=>`<button class="cg-side ${side===s?'on':''}" data-cfs="${s}" ${busy?'disabled':''}>${F[s]} ${cap(s)}</button>`).join('')}</div>${betBox('cf','Bet (min 10)')}<div class="bj-a"><button class="pri" data-cfgo ${busy?'disabled':''}>Flip coin</button></div><div class="cg-hist">${hist.map(h=>`<i class="${h.w?'w':'l'}">${h.r==='heads'?'H':'T'}</i>`).join('')}</div>`};
 async function go(){const bet=B('cf');if(busy)return;if(bet<10){toast('Minimum bet is 10 SP');return}if(bet>S.novas){toast('Not enough SP');return}
  busy=true;msg='Flipping\u2026';draw();let r;
  try{r=await rpc('coin_flip',{p_bet:bet,p_side:side})}catch(e){busy=false;msg=errM(e);if(m.isConnected)draw();toast(msg);return}
  const c=m.querySelector('#cgcoin');
  if(c&&!calm()){c.classList.add('spin');await sleep(620);if(m.isConnected)c.innerHTML=`<span>${F[r.result]}</span><small>${r.result.toUpperCase()}</small>`;await sleep(600)}
  if(!m.isConnected){applyNovas(r.novas,null);return}
  face=r.result;hist.unshift({r:r.result,w:r.win});hist=hist.slice(0,12);
  msg=r.win?`${cap(r.result)}! You won +${fmt(r.payout-bet)} SP`:`${cap(r.result)}. You lost ${fmt(bet)} SP`;
  busy=false;applyNovas(r.novas,r.payout>bet?'Casino win':null);draw()}
 bindBets(m,draw);
 m.addEventListener('click',e=>{const s=e.target.closest('[data-cfs]');if(s&&!busy){side=s.dataset.cfs;draw();return}if(e.target.closest('[data-cfgo]'))go()});
 draw()}

/* VIDEO POKER (Jacks or Better) */
const VPT=[['Royal flush',800],['Straight flush',50],['Four of a kind',25],['Full house',8],['Flush',5],['Straight',4],['Three of a kind',3],['Two pair',2],['Jacks or better',1]];
function openVP(){
 if(need18())return;const{m,w}=shell();let g=null,res=null,holds=[0,0,0,0,0],busy=false,msg='';
 function draw(){const cur=res||g;
  const top=res?(res.payout>0?`${res.name}! +${fmt(res.payout-res.bet)} SP`:'No win. Better luck next hand.'):g?'Tap cards to HOLD, then draw.':(msg||'Set your bet and deal.');
  let h=`<h3>Video Poker \u00b7 Jacks or Better</h3>${balRow()}<div class="bj-t"><div class="bj-m">${top}</div><div class="bj-h">${cur?cur.hand.map((c,i)=>`<button class="cg-hold ${(res?res.holds[i]:holds[i])?'held':''}" data-vph="${i}" ${g&&!busy?'':'disabled'}>${card(c)}<span class="cg-ht">${(res?res.holds[i]:holds[i])?'HELD':''}</span></button>`).join(''):backs(5)}</div></div>`;
  h+=g?`<div class="bj-a"><button class="pri" data-vpdraw ${busy?'disabled':''}>Draw</button></div>`:betBox('vp','Bet')+`<div class="bj-a"><button class="pri" data-vpdeal ${busy?'disabled':''}>${res?'Deal again':'Deal'}</button></div>`;
  h+=`<div class="cg-pt">${VPT.map(r=>`<div class="${res&&res.mult===r[1]?'hit':''}"><span>${r[0]}</span><b>${fmt(r[1])}\u00d7</b></div>`).join('')}</div>`;w.innerHTML=h}
 async function deal(){if(busy)return;const bet=B('vp');if(bet>S.novas){toast('Not enough SP');return}busy=true;msg='';draw();
  try{const r=await rpc('vp_deal',{p_bet:bet});g={hand:r.hand,bet:r.bet};res=null;holds=[0,0,0,0,0];applyNovas(r.novas,null)}catch(e){msg=errM(e);toast(msg)}busy=false;if(m.isConnected)draw()}
 async function drawCards(){if(busy)return;busy=true;draw();
  try{const r=await rpc('vp_draw',{p_holds:holds.map(x=>!!x)});res=r;g=null;applyNovas(r.novas,r.payout>r.bet?'Casino win':null)}catch(e){toast(errM(e))}busy=false;if(m.isConnected)draw()}
 bindBets(m,draw);
 m.addEventListener('click',e=>{const c=e.target.closest('[data-vph]');if(c&&g&&!busy){const i=+c.dataset.vph;holds[i]=holds[i]?0:1;draw();return}
  if(e.target.closest('[data-vpdeal]'))deal();else if(e.target.closest('[data-vpdraw]'))drawCards()});
 draw();
 FX_DB.rpc('vp_state').then(q=>{if(q.error||!q.data||!m.isConnected)return;g={hand:q.data.hand,bet:q.data.bet};draw()}).catch(()=>{})}

/* THREE CARD POKER + TEXAS HOLD'EM: both are "beat the dealer", one decision after the deal */
const VS={
 tc:{title:'Three Card Poker',deal:'tc_deal',act:'tc_act',state:'tc_state',n:3,go:'play',label:'Play',cost:g=>g.ante,mult:2,info:'Beat the dealer with a better 3-card hand. Play costs the same as your ante. The dealer needs Queen-high to qualify.'},
 hc:{title:"Texas Hold'em",deal:'hc_deal',act:'hc_act',state:'hc_state',n:2,go:'call',label:'Call',cost:g=>g.ante*2,mult:3,info:'Ante, then see your 2 cards and the flop. Call 2\u00d7 your ante or fold. The dealer needs a pair of 4s to qualify.'}};
const LAB={fold:'You folded',noqual:'Dealer does not qualify',win:'You win',lose:'Dealer wins',push:'Push'};
function openVs(kind){
 if(need18())return;const C=VS[kind],{m,w}=shell();let g=null,busy=false,msg='';
 const board=r=>{const b=r.board||[];return `<div class="bj-l">Board</div><div class="bj-h" style="min-height:0">${[0,1,2,3,4].map(i=>b[i]?card(b[i]):'<div class="bj-c back" style="opacity:.25"></div>').join('')}</div>`};
 function draw(){const done=g&&g.done;
  let h=`<h3>${C.title}</h3>${balRow()}<div class="bj-t"><div class="bj-l">Dealer${done?' \u00b7 '+g.d_name:''}</div><div class="bj-h" style="min-height:0">${done?g.d.map(c=>card(c)).join(''):backs(C.n)}</div>${kind==='hc'?board(g||{}):''}<div class="bj-l">You${done?' \u00b7 '+g.p_name:''}</div><div class="bj-h" style="min-height:0">${g?g.p.map(c=>card(c)).join(''):backs(C.n)}</div></div>`;
  if(g&&!done){h+=`<div class="bj-m">Your move: ${C.label.toLowerCase()} for ${fmt(C.cost(g))} SP, or fold.</div><div class="bj-a"><button class="pri" data-vsa="${C.go}" ${busy?'disabled':''}>${C.label} \u00b7 ${fmt(C.cost(g))} SP</button><button class="chip" data-vsa="fold" ${busy?'disabled':''}>Fold</button></div>`}
  else{
   if(done){const net=g.payout-g.wagered,ex=[];
    if(kind==='tc'){if(g.bonus>0)ex.push('Ante bonus +'+fmt(g.bonus)+' SP');if(g.pp_pay>0)ex.push('Pair Plus paid '+fmt(g.pp_pay)+' SP')}
    if(kind==='hc'&&g.result==='win'&&g.call_mult>1)ex.push('Call bet paid '+g.call_mult+':1');
    h+=`<div class="bj-m">${LAB[g.result]||''}. ${net>0?'+'+fmt(net)+' SP':net===0?'Bet returned':'-'+fmt(-net)+' SP'}${ex.length?`<div class="cg-ex">${ex.join(' \u00b7 ')}</div>`:''}</div>`}
   else h+=`<div class="bj-m" style="font-weight:600;font-size:13px">${msg||C.info}</div>`;
   h+=betBox(kind,'Ante')+(kind==='tc'?betBox('tcpp','Pair Plus (optional)'):'')+`<div class="bj-a"><button class="pri" data-vsdeal ${busy?'disabled':''}>${done?'Deal again':'Deal'}</button></div>`}
  w.innerHTML=h}
 async function deal(){if(busy)return;const a=B(kind),pp=kind==='tc'?B('tcpp'):0,need=a*C.mult+pp;
  if(need>S.novas){toast(`You need ${fmt(need)} SP (${kind==='tc'?'ante + play bet + Pair Plus':'ante + the 2\u00d7 call bet'})`);return}
  busy=true;msg='';draw();
  try{const r=await rpc(C.deal,kind==='tc'?{p_ante:a,p_pp:pp}:{p_ante:a});g=r;applyNovas(r.novas,null)}catch(e){msg=errM(e);toast(msg)}busy=false;if(m.isConnected)draw()}
 async function act(a){if(busy)return;busy=true;draw();
  try{const r=await rpc(C.act,{p_action:a});g=r;applyNovas(r.novas,r.payout>r.wagered?'Casino win':null)}catch(e){toast(errM(e))}busy=false;if(m.isConnected)draw()}
 bindBets(m,draw);
 m.addEventListener('click',e=>{if(e.target.closest('[data-vsdeal]')){deal();return}const a=e.target.closest('[data-vsa]');if(a)act(a.dataset.vsa)});
 draw();
 FX_DB.rpc(C.state).then(q=>{if(q.error||!q.data||!m.isConnected)return;g=q.data;draw()}).catch(()=>{})}
const OPEN={cf:openCoin,vp:openVP,tc:()=>openVs('tc'),hc:()=>openVs('hc')};

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-bj]');if(b){openBlackjack(b.dataset.bj);return}
 const cg=e.target.closest('[data-cg]');if(cg&&OPEN[cg.dataset.cg]){OPEN[cg.dataset.cg]();return}
 const t=e.target.closest('[data-slotsth]');if(t&&window.openSlots)window.openSlots(t.dataset.slotsth)});
window.openBlackjack=openBlackjack;window.openCasinoGame=k=>OPEN[k]&&OPEN[k]();
})();
