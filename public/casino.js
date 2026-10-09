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
.cz-note{margin:14px 2px 4px}`;document.head.append(s)}

window.casinoHub=function(){
 if(!age18())return `<div class="glass card rw"><div class="rw-h">SP Casino</div><p class="mu" style="margin:6px 0 12px">The casino is for adults only. Confirm you are 18 or older to play. SP has no cash value.</p><button class="pri" data-age18 style="padding:8px 18px;min-height:40px">I am 18 or older</button></div>`;
 hcss();
 const th=window.SL_THEMES||{},ord=window.SL_ORDER||Object.keys(th);
 const hero=`<div class="cz-hero"><div class="cz-fl" aria-hidden="true"><span>\u2660\ufe0f</span><span>\u2665\ufe0f</span><span>\ud83c\udfb2</span><span>\ud83c\udfb0</span></div><h2>SP Casino</h2><p>13 slot machines and 5 blackjack tables. Free play, every card and spin decided on the server.</p><div class="cz-bal"><span>\ud83e\ude99</span><span>Balance</span><b>${fmt(S.novas||0)}</b><span>SP</span></div></div>`;
 const slots=ord.filter(k=>th[k]).map(k=>{const t=th[k];return `<button class="cz-m" data-slotsth="${k}" style="background:linear-gradient(150deg,${t.a},${t.b})" aria-label="Play ${t.name}"><span class="cz-ic"><span class="cz-big">${t.s[5][0]}</span><span class="cz-sm">${t.sc.e}</span></span><b>${t.name}</b><small>Bonus: ${t.bonus.name}</small><span class="cz-pl">Play</span></button>`}).join('');
 const tabs=TABLES.map(t=>{const L=TLOOK[t[0]];return `<button class="cz-t" data-bj="${t[0]}" style="background:linear-gradient(150deg,${L.g[0]},${L.g[1]})" aria-label="Play ${t[1]}"><span class="cz-cd" aria-hidden="true">${L.c.map(c=>`<span class="cz-k ${/[\u2665\u2666]/.test(c)?'r':''}"><span>${c.slice(0,-1)}</span><i>${c.slice(-1)}</i></span>`).join('')}</span><b>${t[1]}</b><span class="cz-tags">${L.t.map(x=>`<span>${x}</span>`).join('')}</span><span class="cz-pl" style="display:inline-block">Deal me in</span></button>`}).join('');
 return `${hero}
 <div class="cz-sh"><h3>\ud83c\udfb0 Slots</h3><span class="mu">${ord.length} machines \u00b7 9 paylines \u00b7 3 bonus symbols = free spins</span></div>
 <div class="cz-quick"><div><b>Sidelyne Slots</b><span class="mu">Jump back into your last machine.</span></div><button class="pri" data-slots style="padding:8px 20px;min-height:42px">Quick play</button></div>
 <div class="cz-g">${slots}</div>
 <div class="cz-sh"><h3>\u2660\ufe0f Blackjack</h3><span class="mu">5 tables \u00b7 fresh shoe every hand</span></div>
 <div class="cz-tg">${tabs}</div>
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
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-bj]');if(b){openBlackjack(b.dataset.bj);return}
 const t=e.target.closest('[data-slotsth]');if(t&&window.openSlots)window.openSlots(t.dataset.slotsth)});
window.openBlackjack=openBlackjack;
})();
