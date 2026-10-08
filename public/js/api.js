// API service layer (live data only).
const fx=(p)=>fetch('/.netlify/functions/'+p+(p.includes('?')?'&':'?')+'_='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
window.FX_API={
  games:()=>fx('sports-data?sport=ALL&type=games'),
  gameDetail:(id)=>fx('game-detail?id='+encodeURIComponent(id)),
  teams:()=>fx('sports-data?sport=ALL&type=teams'),
  ufcEvents:()=>fx('mma?type=events'),
  ufcCard:(slug)=>fx('mma?type=card&id='+encodeURIComponent(slug)),
  ufcRankings:()=>fx('mma?type=rankings'),
  ufcFight:(id)=>fx('mma?type=fight&id='+encodeURIComponent(id)),
  ufcFighter:(id)=>fx('mma?type=fighter&id='+encodeURIComponent(id))
};
