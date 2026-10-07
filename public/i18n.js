/* Languages + Settings. Exact-phrase dictionary applied to the DOM, so every screen follows the chosen language. Order: es, fr, pt, de, it */
(()=>{
const LANGS=[['en','English'],['es','Español'],['fr','Français'],['pt','Português'],['de','Deutsch'],['it','Italiano']];
const D={
'Home':['Inicio','Accueil','Início','Start','Home'],
'Live':['En vivo','En direct','Ao vivo','Live','Dal vivo'],
'Discover':['Descubrir','Découvrir','Descobrir','Entdecken','Scopri'],
'Picks':['Pronósticos','Pronostics','Palpites','Tipps','Pronostici'],
'Feed':['Muro','Fil','Feed','Feed','Feed'],
'Ranks':['Ranking','Classement','Ranking','Rangliste','Classifica'],
'Profile':['Perfil','Profil','Perfil','Profil','Profilo'],
'Live now':['Ahora en vivo','En direct maintenant','Ao vivo agora','Jetzt live','In diretta ora'],
'Upcoming':['Próximos','À venir','Próximos','Demnächst','Prossimi'],
'Games':['Partidos','Matchs','Jogos','Spiele','Partite'],
'Teams in action':['Equipos en juego','Équipes en action','Equipes em ação','Teams im Einsatz','Squadre in campo'],
'Fighters in action':['Peleadores en acción','Combattants en action','Lutadores em ação','Kämpfer im Einsatz','Lottatori in azione'],
'Live scores':['Marcadores en vivo','Scores en direct','Placares ao vivo','Live-Ergebnisse','Risultati live'],
'Scores update automatically every 20 seconds.':['Los marcadores se actualizan cada 20 segundos.','Les scores se mettent à jour toutes les 20 secondes.','Os placares atualizam a cada 20 segundos.','Die Ergebnisse werden alle 20 Sekunden aktualisiert.','I risultati si aggiornano ogni 20 secondi.'],
'Finished · last 36 hours':['Finalizados · últimas 36 horas','Terminés · dernières 36 heures','Encerrados · últimas 36 horas','Beendet · letzte 36 Stunden','Terminate · ultime 36 ore'],
'People':['Personas','Personnes','Pessoas','Personen','Persone'],
'People to follow':['Personas para seguir','Personnes à suivre','Pessoas para seguir','Personen zum Folgen','Persone da seguire'],
'Teams':['Equipos','Équipes','Equipes','Teams','Squadre'],
'Fighters':['Peleadores','Combattants','Lutadores','Kämpfer','Lottatori'],
'Posts':['Publicaciones','Publications','Publicações','Beiträge','Contenuti'],
'Badges':['Insignias','Badges','Medalhas','Abzeichen','Badge'],
'Recent predictions':['Pronósticos recientes','Pronostics récents','Palpites recentes','Letzte Tipps','Pronostici recenti'],
'Favorite teams':['Equipos favoritos','Équipes favorites','Equipes favoritas','Lieblingsteams','Squadre preferite'],
'Favorite fighters':['Peleadores favoritos','Combattants favoris','Lutadores favoritos','Lieblingskämpfer','Lottatori preferiti'],
'Favorites':['Favoritos','Favoris','Favoritos','Favoriten','Preferiti'],
'Followers':['Seguidores','Abonnés','Seguidores','Follower','Follower'],
'Following':['Siguiendo','Abonnements','Seguindo','Folge ich','Seguiti'],
'Follow':['Seguir','Suivre','Seguir','Folgen','Segui'],
'Edit profile':['Editar perfil','Modifier le profil','Editar perfil','Profil bearbeiten','Modifica profilo'],
'Edit banner':['Editar banner','Modifier la bannière','Editar banner','Banner ändern','Modifica banner'],
'SP Shop':['Tienda SP','Boutique SP','Loja SP','SP-Shop','Negozio SP'],
'Copy link':['Copiar enlace','Copier le lien','Copiar link','Link kopieren','Copia link'],
'Log out':['Cerrar sesión','Se déconnecter','Sair','Abmelden','Esci'],
'Manage':['Gestionar','Gérer','Gerenciar','Verwalten','Gestisci'],
'Done':['Listo','Terminé','Concluído','Fertig','Fatto'],
'Close':['Cerrar','Fermer','Fechar','Schließen','Chiudi'],
'Show more':['Mostrar más','Afficher plus','Mostrar mais','Mehr anzeigen','Mostra altro'],
'Refresh':['Actualizar','Actualiser','Atualizar','Aktualisieren','Aggiorna'],
'Post':['Publicar','Publier','Publicar','Posten','Pubblica'],
'Newest':['Recientes','Récents','Recentes','Neueste','Più recenti'],
'Popular':['Populares','Populaires','Populares','Beliebt','Popolari'],
'Settings':['Ajustes','Paramètres','Configurações','Einstellungen','Impostazioni'],
'Appearance':['Apariencia','Apparence','Aparência','Darstellung','Aspetto'],
'Theme':['Tema','Thème','Tema','Design','Tema'],
'System':['Sistema','Système','Sistema','System','Sistema'],
'Light':['Claro','Clair','Claro','Hell','Chiaro'],
'Dark':['Oscuro','Sombre','Escuro','Dunkel','Scuro'],
'Text size':['Tamaño del texto','Taille du texte','Tamanho do texto','Textgröße','Dimensione testo'],
'Small':['Pequeño','Petit','Pequeno','Klein','Piccolo'],
'Default':['Normal','Par défaut','Padrão','Standard','Predefinito'],
'Large':['Grande','Grand','Grande','Groß','Grande'],
'Reduce motion':['Reducir animaciones','Réduire les animations','Reduzir animações','Animationen reduzieren','Riduci animazioni'],
'Preferences':['Preferencias','Préférences','Preferências','Präferenzen','Preferenze'],
'Start page':['Página de inicio','Page de démarrage','Página inicial','Startseite','Pagina iniziale'],
'SP pop-ups':['Avisos de SP','Alertes SP','Avisos de SP','SP-Hinweise','Avvisi SP'],
'On':['Sí','Oui','Sim','An','Sì'],
'Off':['No','Non','Não','Aus','No'],
'Account':['Cuenta','Compte','Conta','Konto','Account'],
'Reset settings':['Restablecer ajustes','Réinitialiser les paramètres','Redefinir configurações','Einstellungen zurücksetzen','Ripristina impostazioni'],
'Rewards':['Recompensas','Récompenses','Recompensas','Belohnungen','Premi'],
'Slots':['Tragaperras','Machine à sous','Caça-níqueis','Spielautomat','Slot'],
'Play':['Jugar','Jouer','Jogar','Spielen','Gioca'],
'Balance':['Saldo','Solde','Saldo','Guthaben','Saldo'],
'Daily SP':['SP diario','SP quotidiens','SP diários','Tägliche SP','SP giornalieri'],
'Language':['Idioma','Langue','Idioma','Sprache','Lingua'],
'No games right now.':['No hay partidos ahora.','Aucun match pour le moment.','Nenhum jogo agora.','Gerade keine Spiele.','Nessuna partita al momento.'],
'Loading live games…':['Cargando partidos en vivo…','Chargement des matchs en direct…','Carregando jogos ao vivo…','Live-Spiele werden geladen…','Caricamento partite live…'],
'Tap to predict':['Toca para pronosticar','Touchez pour pronostiquer','Toque para palpitar','Zum Tippen antippen','Tocca per pronosticare'],
'No pick made':['Sin pronóstico','Aucun pronostic','Sem palpite','Kein Tipp abgegeben','Nessun pronostico'],
'No bio yet.':['Aún no hay biografía.','Pas encore de bio.','Ainda sem bio.','Noch keine Bio.','Ancora nessuna bio.'],
'Share a take…':['Comparte tu opinión…','Partagez votre avis…','Compartilhe sua opinião…','Teile deine Meinung…','Condividi la tua opinione…'],
'Search teams, fighters or people…':['Busca equipos, peleadores o personas…','Cherchez équipes, combattants ou personnes…','Busque equipes, lutadores ou pessoas…','Teams, Kämpfer oder Personen suchen…','Cerca squadre, lottatori o persone…'],
'Predictions are free. No money, no odds — just SP.':['Los pronósticos son gratis. Sin dinero ni cuotas: solo SP.','Les pronostics sont gratuits. Pas d\'argent, pas de cotes : juste des SP.','Os palpites são grátis. Sem dinheiro, sem odds: só SP.','Tipps sind kostenlos. Kein Geld, keine Quoten – nur SP.','I pronostici sono gratuiti. Niente soldi né quote: solo SP.']
};
const PAT=[[/^Level (\d+)$/,['Nivel $1','Niveau $1','Nível $1','Level $1','Livello $1']],[/^Joined (.+)$/,['Se unió en $1','Inscrit en $1','Entrou em $1','Beigetreten: $1','Iscritto da $1']]];
let lang='en';try{lang=localStorage.getItem('fx-lang')||'en'}catch(e){}
if(!LANGS.some(l=>l[0]===lang))lang='en';
const idx=()=>LANGS.findIndex(l=>l[0]===lang)-1;
const tr=s=>{if(lang==='en')return null;const k=s.trim();if(!k)return null;const i=idx();if(D[k])return D[k][i];for(const[r,v]of PAT)if(r.test(k))return k.replace(r,v[i]);return null};
const done=new WeakMap();
const ATTR=['placeholder','aria-label','title'];
function walk(root){if(lang==='en'||!root)return;
 if(root.nodeType===3){const n=root;if(done.get(n)===n.nodeValue)return;const t=tr(n.nodeValue);if(t){const v=n.nodeValue.replace(n.nodeValue.trim(),t);n.nodeValue=v;done.set(n,v)}return}
 if(root.nodeType!==1)return;
 const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const L=[];while(n=tw.nextNode())L.push(n);L.forEach(walk);
 const els=[root,...root.querySelectorAll('[placeholder],[aria-label],[title]')];
 els.forEach(el=>ATTR.forEach(a=>{if(el.hasAttribute&&el.hasAttribute(a)){const t=tr(el.getAttribute(a));if(t)el.setAttribute(a,t)}}))}
let busy=false;
new MutationObserver(ms=>{if(lang==='en'||busy)return;busy=true;ms.forEach(m=>{if(m.type==='childList')m.addedNodes.forEach(walk);else if(m.type==='characterData')walk(m.target)});busy=false}).observe(document.body,{childList:true,subtree:true,characterData:true});
function setLang(l){lang=l;try{localStorage.setItem('fx-lang',l)}catch(e){}document.documentElement.lang=l;
 $('#nav').innerHTML=NAV.map(n=>`<button data-t="${n[0]}" aria-label="${n[2]}" class="${n[0]===S.tab?'on':''}"><span>${ic(n[1],22)}</span>${n[2]}</button>`).join('')+($('#nav').classList.contains('has-admin')?`<button data-t="admin" aria-label="Admin" class="${S.tab==='admin'?'on':''}"><span>${ic('shield',22)}</span>Admin</button>`:'');
 walk(document.body);if(R[S.tab])go(S.tab,true)}
const SD={size:'m',rm:'off',pop:'on',start:'community'};
const getSet=()=>{try{return{...SD,...JSON.parse(localStorage.getItem('fx-set')||'{}')}}catch(e){return{...SD}}};
const putSet=o=>{try{localStorage.setItem('fx-set',JSON.stringify(o))}catch(e){}};
function applySet(){const s=getSet(),h=document.documentElement,a=document.querySelector('.app');if(a)a.style.zoom={s:.92,m:1,l:1.12}[s.size]||1;h.classList.toggle('rm',s.rm==='on');h.classList.toggle('nopop',s.pop==='off')}
function setTheme(v){const d=document.documentElement;S.theme=v==='system'?null:v;if(S.theme)d.dataset.theme=S.theme;else delete d.dataset.theme;try{S.theme?localStorage.setItem('fx-theme',S.theme):localStorage.removeItem('fx-theme')}catch(e){}repaint()}
window.openSettings=()=>{const m=modal('<h3>Settings</h3><div id="stg"></div>');
 const seg=(label,key,opts,cur)=>`<div class="st-row"><span>${label}</span><div class="seg">${opts.map(o=>`<button data-set="${key}:${o[0]}" class="${cur===o[0]?'on':''}">${o[1]}</button>`).join('')}</div></div>`;
 const draw=()=>{const s=getSet(),th=S.theme||'system',onoff=[['on','On'],['off','Off']];
  m.querySelector('#stg').innerHTML=`<div class="sec">Appearance</div>${seg('Theme','theme',[['system','System'],['light','Light'],['dark','Dark']],th)}${seg('Text size','size',[['s','Small'],['m','Default'],['l','Large']],s.size)}${seg('Reduce motion','rm',onoff,s.rm)}<div class="sec">Preferences</div>${seg('Start page','start',[['community','Home'],['live','Live'],['discover','Discover'],['predict','Picks']],s.start)}${seg('SP pop-ups','pop',onoff,s.pop)}<div class="sec">Language</div><div class="lang-list">${LANGS.map(l=>`<button data-lang="${l[0]}" class="${l[0]===lang?'on':''}"><span>${l[1]}</span>${l[0]===lang?'<span>✓</span>':''}</button>`).join('')}</div><div class="sec">Support Sidelyne</div><p class="mu" style="margin:0 0 8px">Sidelyne is free. If you like it, a tip helps get the site on the App Store and keeps it growing. Totally optional, thank you!</p><a class="chip" href="https://ko-fi.com/mntlst" target="_blank" rel="noopener noreferrer" style="display:inline-flex;text-decoration:none">☕ Tip on Ko-fi</a><div class="sec">Account</div><div class="row" style="gap:8px;flex-wrap:wrap">${ME?`<button class="chip" data-copy="${esc(ME.username)}">Copy link</button>`:''}<button class="chip" id="lo">Log out</button><button class="chip" data-rs>Reset settings</button></div>`};
 draw();
 m.addEventListener('click',e=>{const l=e.target.closest('[data-lang]');if(l){setLang(l.dataset.lang);draw();return}
  const b=e.target.closest('[data-set]');if(b){const[k,v]=b.dataset.set.split(':');if(k==='theme')setTheme(v);else{const s=getSet();s[k]=v;putSet(s);applySet()}draw();return}
  if(e.target.closest('[data-rs]')){try{localStorage.removeItem('fx-set')}catch(x){}setTheme('system');applySet();if(lang!=='en')setLang('en');draw()}});
 walk(m)};
applySet();
document.documentElement.lang=lang;if(lang!=='en')walk(document.body);
})();
