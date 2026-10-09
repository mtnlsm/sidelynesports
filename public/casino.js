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

window.casinoHub=function(){
 if(!age18())return `<div class="glass card rw"><div class="rw-h">SP Casino</div><p class="mu" style="margin:6px 0 12px">The casino is for adults only. Confirm you are 18 or older to play. SP has no cash value.</p><button class="pri" data-age18 style="padding:8px 18px;min-height:40px">I am 18 or older</button></div>`;
 const th=window.SL_THEMES||{},ord=window.SL_ORDER||[];
 return `<div class="glass card rw"><div class="rw-h">Slots</div><div class="rw-row row sp"><div><b>Sidelyne Slots</b><div class="mu">${ord.length||13} machines, 9 paylines. 3 bonus symbols = free spins.</div></div><button class="pri" data-slots style="padding:8px 18px;min-height:40px">Play</button></div>${ord.length?`<div class="row hs" style="margin-top:6px">${ord.map(k=>`<button class="chip" data-slotsth="${k}">${th[k].name}</button>`).join('')}</div>`:''}</div>
 <div class="glass card rw"><div class="rw-h">Blackjack</div>${TABLES.map(t=>`<div class="rw-row row sp"><div><b>${t[1]}</b><div class="mu">${t[2]}</div></div><button class="pri" data-bj="${t[0]}" style="padding:8px 18px;min-height:40px">Play</button></div>`).join('')}</div>
 <p class="mu" style="margin:10px 2px">Free play only. SP has no cash value. A fresh shoe is shuffled for every hand.</p>`};

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
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-bj]');if(b){openBlackjack(b.dataset.bj);return}
 const t=e.target.closest('[data-slotsth]');if(t&&window.openSlots)window.openSlots(t.dataset.slotsth)});
window.openBlackjack=openBlackjack;
})();
