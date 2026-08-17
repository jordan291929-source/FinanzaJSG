/* ======================= NEXO · capa de interfaz =======================
   Calca del prototipo NEXO sobre el motor que ya existe.

   REGLA DE ORO DE ESTE ARCHIVO: aquí no se calcula nada de finanzas.
   Todo sale de las funciones del motor (saldoHasta, cardMonthStatus,
   loanMonthStatus, consumidoCard, comprasState, loanRem, cuotasMes,
   ingresoMensual, gastoMes, effLimite, impliedRate...) y todo lo que
   escribe pasa por las funciones del motor (addMov, addCardPayment,
   addMeta, editMeta, delMov, delMeta, save). Si un número aparece acá,
   lo calculó el motor.
   ===================================================================== */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const h=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const vib=n=>{ try{ if(window.hapt) hapt(n); }catch(e){} };
 const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
            'setiembre','octubre','noviembre','diciembre'];
 const MESab=['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
 const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
 const RAMPA=['#5cc4d0','#1ba5b4','#0e919f','#0b7784','#08525c'];
 const pad2=n=>('0'+n).slice(-2);

 /* -------- emoji por categoría (decoración; nunca cambia un número) -------- */
 const EMO=[[/aliment|comida|mercado|restaur|delivery/i,'🍔'],[/transp|pasaje|taxi|gasolin|combust/i,'🚌'],
  [/vivien|alquil|renta|casa|hogar/i,'🏠'],[/servici|luz|agua|internet|cel|tele/i,'💡'],
  [/salud|farmac|medic|clinic|doctor/i,'💊'],[/entreten|cine|juego|streaming|ocio/i,'🎬'],
  [/compra|ropa|zapat|tienda/i,'🛍️'],[/educ|curso|libro|estudi/i,'📚'],
  [/deuda|cuota|pr[eé]stamo|tarjeta/i,'💳'],[/ahorro|meta|fondo/i,'🎯'],
  [/sueldo|salario|ingreso|grati|freelance|bono/i,'💰'],[/gym|deporte|fitness/i,'🏋️'],
  [/mascota|veterin/i,'🐾'],[/regalo|cumple/i,'🎁'],[/viaje|hotel|vuelo|cusco/i,'✈️']];
 const emo=t=>{ for(const [re,e] of EMO) if(re.test(t||'')) return e; return '💸'; };

 /* ============================ helpers de fecha ============================ */
 function hoy(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
 function mesSel(){ const v=curMV().split('-').map(Number); return {y:v[0],mn:v[1]}; }
 function diasDeMes(y,mn){ return new Date(y,mn,0).getDate(); }
 function fechaCorta(f){ const p=String(f).split('-'); return (+p[2])+' '+MESab[+p[1]-1]; }
 function esHoy(f){ return f===keyOf(new Date()); }
 function etiquetaFecha(f){
  if(esHoy(f)) return 'Hoy';
  const d=new Date(f+'T00:00'), ay=new Date(hoy()-86400000);
  if(d.getTime()===ay.getTime()) return 'Ayer';
  return fechaCorta(f);
 }

 /* ============================ router ============================ */
 const P={};                       // registro de pantallas
 let pila=['home'], param={};
 const RAIZ=['home','mov','pres','fin','perfil'];

 function go(k,p){
  if(!P[k]) return;
  vib(8);
  param=p||{};
  if(RAIZ.indexOf(k)>=0) pila=[k]; else if(pila[pila.length-1]!==k) pila.push(k);
  pinta(1);
 }
 function volver(){
  vib(8);
  if(pila.length>1) pila.pop(); else pila=['home'];
  pinta(-1);
 }
 function actual(){ return pila[pila.length-1]; }

 function pinta(dir){
  const k=actual(), pant=P[k];
  const cuerpo=$('nx-body');
  // rescatar los bloques prestados antes de borrar el HTML
  let att=$('nx-attic');
  if(!att){ att=document.createElement('div'); att.id='nx-attic';
   att.style.display='none'; document.body.appendChild(att); }
  cuerpo.querySelectorAll('[data-nx-home]').forEach(e=>att.appendChild(e));
  document.documentElement.style.setProperty('--nxd',(dir<0?-14:14)+'px');
  cuerpo.className='nx-anim';
  cuerpo.innerHTML=pant.html(param);
  window.scrollTo(0,0);
  if(pant.wire) try{ pant.wire(param); }catch(e){ console.warn('NEXO wire '+k,e); }
  // la barra sólo en las raíces
  const nav=$('nx-nav'), fab=$('nx-fab');
  const esRaiz=RAIZ.indexOf(k)>=0;
  nav.style.display = (esRaiz||pant.nav) ? 'flex':'none';
  fab.style.display = (k==='home'||k==='mov') ? 'grid':'none';
  nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  cuerpo.querySelectorAll('[data-go]').forEach(e=>{
   e.onclick=ev=>{ ev.stopPropagation();
    const p={}; if(e.dataset.id) p.id=+e.dataset.id; if(e.dataset.tipo) p.tipo=e.dataset.tipo;
    go(e.dataset.go,p); };
  });
  cuerpo.querySelectorAll('[data-back]').forEach(e=>e.onclick=volver);
 }

 /* ============================ piezas comunes ============================ */
 function barraTop(titulo,sub,derecha){
  return '<div class="nx-top"><button class="bk" data-back aria-label="Volver">‹</button>'+
   '<div class="tt"><h2>'+h(titulo)+'</h2>'+(sub?'<span>'+h(sub)+'</span>':'')+'</div>'+
   '<div class="rt">'+(derecha||'')+'</div></div>';
 }
 const ojoTxt=()=>window.__ocultoSaldo?'Mostrar':'Ocultar';
 const OJO='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

 /* ---- movimientos del mes, ya ordenados ---- */
 function txMes(y,mn){ return (S.tx||[]).filter(t=>inMonth(t,y,mn))
   .slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id-a.id); }

 function filaTx(t){
  const ing=t.tipo==='Ingreso', c=catById(t.catId);
  const cat=c?c.nombre.split(' (')[0]:(ing?'Ingreso':'Gasto');
  const medio=t.cardId?((S.tarjetas.find(x=>x.id===t.cardId)||{}).nombre||'Tarjeta')
            :((ctaById(t.cuentaId)||{}).nombre||'');
  return '<button class="nx-row" data-go="txd" data-id="'+t.id+'">'+
   '<span class="av">'+emo(cat+' '+(t.concepto||''))+'</span>'+
   '<span class="tx"><b>'+h(t.concepto||'—')+'</b><span>'+h(cat)+' · '+etiquetaFecha(t.fecha)+'</span></span>'+
   '<span class="am"><b class="'+(ing?'nx-in':'nx-out')+'">'+(ing?'+ ':'− ')+fmt2(t.monto)+'</b>'+
   (medio?'<span>'+h(medio)+'</span>':'')+'</span></button>';
 }

 /* ---- vencimientos (mes visible + 2 meses) ---- */
 function vencs(){
  const m=mesSel(), out=[], hy=hoy();
  for(let k=0;k<3;k++){
   let y=m.y, mn=m.mn+k; while(mn>12){ mn-=12; y++; }
   const meter=(nombre,dia,st,ico,tipo,id)=>{
    if(!dia||!(st.cuota>0)) return;
    const f=new Date(y,mn-1,Math.min(+dia,diasDeMes(y,mn)));
    out.push({nombre,fecha:f,dias:Math.round((f-hy)/86400000),cuota:st.cuota,
              falta:st.falta,ico,tipo,id,k});
   };
   (S.tarjetas||[]).forEach(c=>meter(c.nombre,c.dia,cardMonthStatus(c,y,mn),'💳','tarjeta',c.id));
   (S.loans||[]).forEach(l=>meter(l.nombre,l.dia,loanMonthStatus(l,y,mn),'📄','deuda',l.id));
  }
  return out.sort((a,b)=>a.fecha-b.fecha);
 }
 function rotDias(v){
  if(v.falta<=0.5) return {t:'pagado',c:'ok'};
  if(v.dias<0)  return {t:'venció hace '+(-v.dias)+(v.dias===-1?' día':' días'),c:'mal'};
  if(v.dias===0) return {t:'vence hoy',c:'mal'};
  if(v.dias===1) return {t:'vence mañana',c:'mal'};
  return {t:'vence en '+v.dias+' días',c:v.dias<=7?'pronto':''};
 }
 function filaVenc(v){
  const r=rotDias(v);
  return '<button class="nx-row" data-go="'+v.tipo+'" data-id="'+v.id+'">'+
   '<span class="av">'+v.ico+'</span>'+
   '<span class="tx"><b>'+h(v.nombre)+'</b><span>'+v.fecha.getDate()+' '+MESab[v.fecha.getMonth()]+' · '+r.t+'</span></span>'+
   '<span class="am"><b>'+fmt(v.cuota)+'</b>'+(v.falta>0.5&&v.falta<v.cuota-0.5?'<span>falta '+fmt(v.falta)+'</span>':'')+'</span></button>';
 }

 /* ---- avisos ---- */
 function avisos(){
  const m=mesSel(), y=m.y, mn=m.mn;
  const I=ingresoMensual(), cuotas=cuotasMes(y,mn), saldo=saldoHasta(y,mn), av=[];
  if(saldo<0) av.push({n:'alto',i:'🔴',t:'Cierras '+MES[mn-1]+' en rojo: '+fmt(saldo),
   s:'Después de las cuotas del mes te falta plata.',a:{r:'Ver qué pagar →',k:'pagos'}});
  if(I>0 && cuotas/I>0.30) av.push({n:'alto',i:'⚠️',
   t:'Tus cuotas se comen el '+Math.round(cuotas/I*100)+'% de tu ingreso',
   s:fmt(cuotas)+' de '+fmt(I)+'. Sobre 30% es zona de riesgo.',a:{r:'Ver deudas →',k:'deudas'}});
  vencs().filter(v=>v.k===0&&v.falta>0.5&&v.dias<=7).slice(0,2).forEach(v=>{
   const r=rotDias(v);
   av.push({n:v.dias<=1?'alto':'medio',i:v.ico,t:h(v.nombre)+' '+r.t+': '+fmt(v.falta),
    s:'Cuota del mes '+fmt(v.cuota),a:{r:'Próximos pagos →',k:'pagos'}});
  });
  const gc={};
  (S.tx||[]).filter(t=>t.tipo==='Gasto'&&inMonth(t,y,mn)).forEach(t=>{ gc[t.catId]=(gc[t.catId]||0)+(+t.monto||0); });
  (S.categorias||[]).forEach(c=>{
   if(c.auto==='deuda') return;
   const lim=effLimite(c,y,mn), usa=gc[c.id]||0;
   if(lim>0&&usa>lim) av.push({n:'medio',i:'📊',
    t:'Has usado el '+Math.round(usa/lim*100)+'% de tu presupuesto de '+h(c.nombre.split(' (')[0]),
    s:fmt(usa)+' de '+fmt(lim)+'.',a:{r:'Revisar presupuesto →',k:'pres'}});
  });
  (S.tarjetas||[]).forEach(c=>{
   const li=+c.linea||0, us=consumidoCard(c);
   if(li>0&&us/li>0.80) av.push({n:'medio',i:'💳',
    t:h(c.nombre)+' al '+Math.round(us/li*100)+'% de su línea',
    s:'Te queda '+fmt(Math.max(0,li-us))+' de '+fmt(li)+'.',a:{r:'Ver tarjeta →',k:'tarjetas'}});
  });
  const ult=(S.tx||[]).map(t=>t.fecha).sort().pop();
  if(ult){ const d=Math.round((hoy()-new Date(ult+'T00:00'))/86400000);
   if(d>=4) av.push({n:'medio',i:'📝',t:'Llevas '+d+' días sin anotar un movimiento',
    s:'Lo que gastaste en esos días existe igual; sólo no está acá.',a:{r:'Anotar ahora →',k:'reg'}}); }
  if(!av.length){
   const g=gastoMes(y,mn), pv=prevMV(y,mn), ga=gastoMes(pv[0],pv[1]);
   if(ga>0&&g<ga) av.push({n:'bueno',i:'✅',t:'Gastaste '+fmt(ga-g)+' menos que en '+MES[pv[1]-1],
    s:fmt(g)+' contra '+fmt(ga)+'.',a:{r:'Ver estadísticas →',k:'stats'}});
   else av.push({n:'bueno',i:'✅',t:'Nada urgente hoy',
    s:'Sin cuotas vencidas y sin categorías pasadas de su límite.',a:null});
  }
  const or={alto:0,medio:1,bueno:2};
  return av.sort((a,b)=>or[a.n]-or[b.n]).slice(0,4);
 }

 /* ============================ ciclo de tarjeta ============================
    OJO — ESTIMACIÓN DECLARADA: el motor guarda día de pago y compras en
    cuotas, pero no día de cierre. Se asume cierre = vencimiento − 10 días,
    y la pantalla lo dice con una etiqueta. Cuando Jordan confirme los datos
    reales del banco, sólo hay que cambiar CIERRE_ANTES o guardarlo por tarjeta. */
 const CIERRE_ANTES=10;
 function ciclo(c,y,mn){
  const venc=Math.min(+c.dia||20, diasDeMes(y,mn));
  const fVenc=new Date(y,mn-1,venc);
  const fCierre=new Date(y,mn-1,venc); fCierre.setDate(fCierre.getDate()-CIERRE_ANTES);
  const fIni=new Date(fCierre); fIni.setMonth(fIni.getMonth()-1); fIni.setDate(fIni.getDate()+1);
  const k=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  const ini=k(fIni), fin=k(fCierre);
  const enCiclo=t=>t.fecha>=ini&&t.fecha<=fin;
  const consumos=(S.tx||[]).filter(t=>t.cardId===c.id&&enCiclo(t));
  const abonos=(S.tx||[]).filter(t=>t.payCardId===c.id&&enCiclo(t));
  const st=cardMonthStatus(c,y,mn);
  const antes=(S.tx||[]).filter(t=>t.cardId===c.id&&t.fecha<ini).reduce((a,t)=>a+(+t.monto||0),0)
            -(S.tx||[]).filter(t=>t.payCardId===c.id&&t.fecha<ini).reduce((a,t)=>a+(+t.monto||0),0);
  return {ini,fin,venc:k(fVenc),
   facturado:st.cuota, pagado:st.cov, falta:st.falta,
   consumos, abonos,
   sumaCons:consumos.reduce((a,t)=>a+(+t.monto||0),0),
   sumaAbon:abonos.reduce((a,t)=>a+(+t.monto||0),0),
   anterior:Math.max(0,antes),
   interes:0,                              // sus compras son en cuotas sin interés (tea 0)
   tea:+c.tea||0, minimo:(+c.minimo||0)};
 }
 const rangoCiclo=cy=>fechaCorta(cy.ini)+' – '+fechaCorta(cy.fin);

 /* ============================ PANTALLAS ============================ */

 /* ---------------------------- login con PIN ---------------------------- */
 const PIN_K='pinHash';
 const sha=async t=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('fjsg:'+t));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');};
 let pinBuf='', pinModo='abrir', pinPrimero='';
 P.login={html(){
  const n=(S.cfg.titular||'').trim().split(' ')[0]||'';
  const tit=pinModo==='abrir'?'Hola de nuevo':pinModo==='nuevo'?'Crea tu PIN':'Repite el PIN';
  const sub=pinModo==='abrir'
   ? 'Ingresa tu PIN para ver tu resumen de '+MES[mesSel().mn-1]+'.'
   : 'Sólo se guarda un hash, nunca el PIN, y queda en este dispositivo.';
  return '<div class="nx-login" id="nxLogin">'+
   '<div class="mk">'+h(initials(S.cfg.titular))+'</div>'+
   '<h1>'+tit+'</h1><p>'+h(sub)+(n&&pinModo==='abrir'?' <b>'+h(n)+'</b>':'')+'</p>'+
   '<div class="nx-dots">'+[0,1,2,3].map(()=>'<i></i>').join('')+'</div>'+
   '<div class="msg" id="nxPinMsg"></div>'+
   '<div class="nx-keys">'+[1,2,3,4,5,6,7,8,9].map(d=>'<button data-d="'+d+'">'+d+'</button>').join('')+
    '<button class="plain" id="nxPinCan">'+(pinModo==='abrir'?'':'Cancelar')+'</button>'+
    '<button data-d="0">0</button><button class="plain" id="nxPinDel">⌫</button></div>'+
   (pinModo==='abrir'?'<button class="out" id="nxPinOut">¿Olvidaste tu PIN?</button>':'')+
   '</div>';
 },wire(){
  const box=$('nxLogin');
  const pinta_=()=>box.querySelectorAll('.nx-dots i').forEach((d,i)=>d.classList.toggle('f',i<pinBuf.length));
  const msg=t=>{ $('nxPinMsg').textContent=t||''; };
  box.querySelectorAll('button[data-d]').forEach(b=>b.onclick=async()=>{
   if(pinBuf.length>=4) return;
   vib(9); pinBuf+=b.dataset.d; pinta_(); msg('');
   if(pinBuf.length<4) return;
   await new Promise(r=>setTimeout(r,140));
   const hs=await sha(pinBuf);
   if(pinModo==='abrir'){
    if(hs===localStorage.getItem(PIN_K)){ pinBuf=''; go('home'); }
    else { vib([12,55,12]); box.classList.add('err'); msg('PIN incorrecto');
           setTimeout(()=>box.classList.remove('err'),360); pinBuf=''; pinta_(); }
   } else if(pinModo==='nuevo'){ pinPrimero=hs; pinBuf=''; pinModo='repetir'; pinta(1); }
   else {
    if(hs===pinPrimero){ localStorage.setItem(PIN_K,hs); pinBuf=''; pinModo='abrir';
      alert('PIN activado. Te lo pedirá al abrir la app.'); go('perfil'); }
    else { vib([12,55,12]); box.classList.add('err'); msg('No coincide, empecemos de nuevo');
      setTimeout(()=>{ box.classList.remove('err'); pinBuf=''; pinModo='nuevo'; pinta(1); },800); }
   }
  });
  $('nxPinDel').onclick=()=>{ pinBuf=pinBuf.slice(0,-1); pinta_(); msg(''); };
  const can=$('nxPinCan'); if(can&&pinModo!=='abrir') can.onclick=()=>{ pinBuf=''; pinModo='abrir'; go('perfil'); };
  const out=$('nxPinOut'); if(out) out.onclick=()=>{
   if(!confirm('Como el PIN sólo es una cortina de privacidad y no cifra nada, lo voy a desactivar para que NO pierdas tus datos.\n\n¿Desactivar el PIN?')) return;
   localStorage.removeItem(PIN_K); pinBuf=''; go('home');
  };
  pinta_();
 }};

 /* ------------------------------- Inicio ------------------------------- */
 P.home={html(){
  const m=mesSel(), y=m.y, mn=m.mn;
  const saldo=saldoHasta(y,mn), n=(S.cfg.titular||'').trim().split(' ')[0]||'';
  const d=new Date();
  const ing=ingresoRealMes(y,mn), gas=gastoMes(y,mn);
  const metaYa=(S.metas||[]).reduce((a,g)=>a+(+g.ahorrado||0),0);
  const prods=(S.tarjetas||[]).map((c,i)=>{
   const li=+c.linea||0, us=consumidoCard(c);
   return '<button class="nx-card credito'+(i%2?' alt':'')+'" data-go="tarjeta" data-id="'+c.id+'">'+
    '<span class="cn"><span>'+h(c.nombre)+'</span><span class="chip"></span></span>'+
    '<span><span class="cl">Línea disponible</span><span class="cv">'+fmt(Math.max(0,li-us))+'</span></span>'+
    '<span class="cf"><span>'+(c.last?'•••• '+h(c.last):'Usado '+fmt(us))+'</span>'+
      '<span>'+(c.dia?'Pago día '+c.dia:'')+'</span></span></button>';
  }).concat((S.cuentas||[]).map(a=>{
   const s=saldoCuenta(a.id);
   return '<button class="nx-card" data-go="mov">'+
    '<span class="cn"><span>'+h(a.nombre)+'</span><span class="chip"></span></span>'+
    '<span><span class="cl">Saldo registrado</span><span class="cv" style="'+(s<0?'color:var(--nx-neg)':'')+'">'+fmt(s)+'</span></span>'+
    '<span class="cf"><span>'+(s<0?'En negativo':'Débito / efectivo')+'</span></span></button>';
  }));
  const vs=vencs().filter(v=>v.falta>0.5).slice(0,3);
  const ms=(S.metas||[]).slice(0,4);
  const ult=txMes(y,mn).slice(0,4);
  return '<div class="nx-hero">'+
   '<div class="top"><div><div class="hi">Hola, '+h(n||'Jordan')+' 👋</div>'+
    '<div class="dt">'+DIAS[d.getDay()][0].toUpperCase()+DIAS[d.getDay()].slice(1)+' '+d.getDate()+' de '+MES[d.getMonth()]+'</div></div>'+
    '<div class="acts"><button class="nx-ico" data-go="stats" aria-label="Estadísticas">📊</button>'+
    '<button class="nx-ico" data-go="notifs" aria-label="Avisos">🔔'+(avisos().some(a=>a.n==='alto')?'<span class="dot"></span>':'')+'</button></div></div>'+
   '<div class="lbl">Disponible al cierre de '+MES[mn-1]+
    '<button class="nx-eye" id="nxOjo">'+OJO+ojoTxt()+'</button></div>'+
   '<div class="big">'+oc(fmt(saldo))+'</div>'+
   '<div class="sub">'+(saldo<0?'Estás en rojo este mes':'Después de pagar las cuotas del mes')+'</div></div>'+

   '<div class="nx-scroll">'+
   '<div class="nx-stats">'+
    '<div class="nx-stat"><div class="k"><i style="background:var(--nx-pos)"></i>Ingresos</div><div class="v nx-num">'+fmt(ing)+'</div></div>'+
    '<div class="nx-stat"><div class="k"><i style="background:var(--nx-neg)"></i>Gastos</div><div class="v nx-num">'+fmt(gas)+'</div></div>'+
    '<div class="nx-stat"><div class="k"><i style="background:var(--nx-brand)"></i>Metas</div><div class="v nx-num">'+fmt(metaYa)+'</div></div>'+
   '</div>'+

   '<div class="nx-carr">'+avisos().map(a=>'<div class="nx-alert '+a.n+'"><span class="i">'+a.i+'</span>'+
     '<span><b>'+a.t+'</b><span>'+a.s+'</span>'+(a.a?'<a data-go="'+a.a.k+'">'+a.a.r+'</a>':'')+'</span></div>').join('')+'</div>'+

   '<div class="nx-st"><h3>Mis productos</h3><a data-go="fin">Ver todos</a></div>'+
   '<div class="nx-prods">'+(prods.length?prods.join(''):'<div class="nx-empty">Sin productos.</div>')+'</div>'+

   '<div class="nx-st"><h3>Próximos pagos</h3><a data-go="pagos">Ver todos</a></div>'+
   '<div class="nx-box">'+(vs.length?vs.map(filaVenc).join(''):'<div class="nx-empty">Nada por pagar.</div>')+'</div>'+

   '<div class="nx-st"><h3>Últimos movimientos</h3><a data-go="mov">Ver todos</a></div>'+
   '<div class="nx-box">'+(ult.length?ult.map(filaTx).join(''):'<div class="nx-empty">Aún no registras movimientos este mes.</div>')+'</div>'+

   '<div class="nx-st"><h3>Mis metas</h3><a data-go="metas">Ver todas</a></div>'+
   '<div class="nx-metas">'+(ms.length?ms.map(g=>{
     const ob=+g.objetivo||0, ya=+g.ahorrado||0, p=ob>0?Math.min(100,ya/ob*100):0;
     return '<button class="nx-meta" data-go="meta" data-id="'+g.id+'"><span class="e">'+emo(g.nombre)+'</span>'+
      '<b>'+h(g.nombre)+'</b><span class="nx-num">'+fmt(ya)+' / '+fmt(ob)+'</span>'+
      '<span class="nx-bar"><i style="width:'+p.toFixed(1)+'%"></i></span></button>';
    }).join(''):'<div class="nx-empty" style="grid-column:1/-1">Sin metas todavía.</div>')+'</div>'+
   '</div>';
 },wire(){ const o=$('nxOjo'); if(o) o.onclick=()=>{ vib(8); toggleSaldo(); pinta(1); }; }};

 /* ----------------------------- Movimientos ----------------------------- */
 let movFiltro='todos', movQ='';
 P.mov={html(){
  const m=mesSel(), y=m.y, mn=m.mn;
  let lista=txMes(y,mn);
  if(movFiltro==='ingresos') lista=lista.filter(t=>t.tipo==='Ingreso');
  if(movFiltro==='gastos')   lista=lista.filter(t=>t.tipo==='Gasto'&&!t.payCardId&&!t.payLoanId);
  if(movFiltro==='tarjeta')  lista=lista.filter(t=>t.cardId);
  if(movFiltro==='deudas')   lista=lista.filter(t=>t.payCardId||t.payLoanId);
  if(movQ){ const q=movQ.toLowerCase();
   lista=lista.filter(t=>(t.concepto||'').toLowerCase().indexOf(q)>=0
    ||((catById(t.catId)||{}).nombre||'').toLowerCase().indexOf(q)>=0); }
  const neto=lista.reduce((a,t)=>a+(t.tipo==='Ingreso'?1:-1)*(+t.monto||0),0);
  const chip=(k,r)=>'<button data-f="'+k+'" class="'+(movFiltro===k?'on':'')+'">'+r+'</button>';
  return '<div class="nx-top"><div class="tt"><h2>Movimientos</h2><span>'+MES[mn-1]+' '+y+'</span></div>'+
   '<div class="rt"><button data-go="stats" aria-label="Estadísticas">📊</button></div></div>'+
   '<div class="nx-scroll">'+
   '<div class="nx-search">🔍<input id="nxQ" placeholder="Buscar movimiento" value="'+h(movQ)+'"></div>'+
   '<div class="nx-chips">'+chip('todos','Todos')+chip('ingresos','Ingresos')+chip('gastos','Gastos')+
     chip('tarjeta','Tarjeta')+chip('deudas','Deudas')+'</div>'+
   '<div class="nx-st"><h3 style="font-size:12.5px;font-weight:600;color:var(--nx-mut)">'+lista.length+' movimiento'+(lista.length===1?'':'s')+'</h3>'+
     '<span style="font-size:12.5px;font-weight:600;color:'+(neto>=0?'var(--nx-pos)':'var(--nx-neg)')+'">Neto '+(neto>=0?'+ ':'− ')+fmt2(Math.abs(neto))+'</span></div>'+
   '<div class="nx-box">'+(lista.length?lista.map(filaTx).join(''):'<div class="nx-empty">Nada con ese filtro.</div>')+'</div>'+
   '</div>';
 },wire(){
  document.querySelectorAll('#nx-body .nx-chips button[data-f]').forEach(b=>
   b.onclick=()=>{ movFiltro=b.dataset.f; vib(8); pinta(1); });
  const q=$('nxQ'); if(q){ q.oninput=()=>{ movQ=q.value; };
   q.onkeydown=e=>{ if(e.key==='Enter'){ q.blur(); pinta(1); } };
   q.onblur=()=>{ if(movQ!==q.value) movQ=q.value; pinta(1); }; }
 }};

 /* ------------------------ detalle de un movimiento ------------------------ */
 P.txd={html(p){
  const t=(S.tx||[]).find(x=>x.id===p.id);
  if(!t) return barraTop('Movimiento')+'<div class="nx-scroll"><div class="nx-empty">Ya no existe.</div></div>';
  const c=catById(t.catId), ing=t.tipo==='Ingreso';
  const medio=t.cardId?((S.tarjetas.find(x=>x.id===t.cardId)||{}).nombre||'Tarjeta')
            :((ctaById(t.cuentaId)||{}).nombre||'—');
  const kv=(k,v)=>'<div class="nx-kv"><span>'+k+'</span><b>'+v+'</b></div>';
  return barraTop(t.concepto||'Movimiento',etiquetaFecha(t.fecha))+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>'+(ing?'Ingreso':'Gasto')+'</span></div>'+
    '<div class="big">'+(ing?'+ ':'− ')+fmt2(t.monto)+'</div>'+
    '<div class="pie">'+h(c?c.nombre:'Sin categoría')+'</div></div>'+
   '<div class="nx-box nxp">'+
    kv('Fecha',t.fecha.split('-').reverse().join('/'))+
    kv('Categoría',h(c?c.nombre:'—'))+
    kv('Medio',h(medio))+
    (t.cuotas>1?kv('Cuotas',t.cuotas):'')+
    (t.payCardId||t.payLoanId?kv('Tipo','Pago de deuda'):'')+
   '</div>'+
   '<button class="nx-go mal" id="nxDel">Eliminar movimiento</button>'+
   '</div>';
 },wire(p){
  const b=$('nxDel'); if(!b) return;
  b.onclick=()=>{ if(!confirm('¿Eliminar este movimiento? Se recalcula todo.')) return;
   vib(18); delMov(p.id); volver(); };
 }};

 /* --------------------- registrar gasto / ingreso --------------------- */
 let reg={tipo:'Gasto',monto:'',catId:null,cuentaVal:'',desc:''};
 const CATICO=[['Comida',/aliment|comida|mercado/i],['Transp.',/transp/i],['Vivienda',/vivien|alquil/i],
  ['Servicios',/servici/i],['Ocio',/entreten|ocio|cine/i],['Compras',/compra|ropa/i],
  ['Salud',/salud/i],['Educ.',/educ/i],['Deudas',/deuda/i],['Otros',/./]];
 function catsGrid(){
  const cats=(S.categorias||[]);
  const usados={};
  const out=CATICO.map(([rot,re])=>{
   const c=cats.find(x=>re.test(x.nombre)&&!usados[x.id]);
   if(c) usados[c.id]=1;
   return {rot,cat:c};
  });
  return out;
 }
 P.reg={nav:false,html(){
  const grid=catsGrid();
  const cuentas=(S.cuentas||[]).map(a=>['a:'+a.id,a.nombre])
    .concat((S.tarjetas||[]).map(c=>['card:'+c.id,c.nombre+' (crédito)']));
  if(!reg.cuentaVal&&cuentas.length) reg.cuentaVal=cuentas[0][0];
  const cuentaRot=(cuentas.find(x=>x[0]===reg.cuentaVal)||['',''])[1];
  const val=reg.monto?parseFloat(reg.monto).toLocaleString('es-PE',{minimumFractionDigits:reg.monto.indexOf('.')>=0?2:2,maximumFractionDigits:2}):'0.00';
  return '<div class="nx-reg">'+
   '<div class="rt"><button class="x" data-back>✕</button>'+
    '<div class="nx-tog"><button data-t="Gasto" class="'+(reg.tipo==='Gasto'?'on':'')+'">Gasto</button>'+
    '<button data-t="Ingreso" class="'+(reg.tipo==='Ingreso'?'on':'')+'">Ingreso</button></div>'+
    '<span style="width:34px"></span></div>'+
   '<div class="nx-amt"><div class="k">Monto del '+(reg.tipo==='Gasto'?'gasto':'ingreso')+'</div>'+
    '<div class="v nx-num"><small>S/</small>'+val+'</div></div>'+
   (reg.tipo==='Gasto'
    ? '<div style="font-size:11.5px;font-weight:600;color:var(--nx-mut);margin:4px 0 0">Categoría</div>'+
      '<div class="nx-cats">'+grid.map((g,i)=>'<button class="nx-cat'+(g.cat&&reg.catId===g.cat.id?' on':'')+'" '+
        (g.cat?'data-c="'+g.cat.id+'"':'disabled style="opacity:.35"')+'>'+
        '<span class="e">'+emo(g.cat?g.cat.nombre:g.rot)+'</span><span>'+g.rot+'</span></button>').join('')+'</div>'
    : '<div style="height:8px"></div>')+
   '<button class="nx-fld" id="nxCta"><span class="k">Cuenta</span><span class="v">'+h(cuentaRot)+' ›</span></button>'+
   '<div class="nx-fld"><span class="k">Descripción</span><input id="nxDesc" placeholder="Sin descripción" value="'+h(reg.desc)+'"></div>'+
   '<div class="nx-pad">'+[1,2,3,4,5,6,7,8,9].map(d=>'<button data-n="'+d+'">'+d+'</button>').join('')+
    '<button data-n=".">.</button><button data-n="0">0</button><button data-n="del">⌫</button></div>'+
   '<button class="nx-go" id="nxSave"'+(parseFloat(reg.monto)>0?'':' disabled')+'>Guardar '+(reg.tipo==='Gasto'?'gasto':'ingreso')+'</button>'+
   '</div>';
 },wire(){
  document.querySelectorAll('#nx-body .nx-tog button').forEach(b=>b.onclick=()=>{
   reg.tipo=b.dataset.t; vib(8); pinta(1); });
  document.querySelectorAll('#nx-body .nx-cat[data-c]').forEach(b=>b.onclick=()=>{
   reg.catId=+b.dataset.c; vib(8); pinta(1); });
  document.querySelectorAll('#nx-body .nx-pad button').forEach(b=>b.onclick=()=>{
   const n=b.dataset.n; vib(6);
   if(n==='del') reg.monto=reg.monto.slice(0,-1);
   else if(n==='.'){ if(reg.monto.indexOf('.')<0) reg.monto=(reg.monto||'0')+'.'; }
   else { if(reg.monto.indexOf('.')>=0 && reg.monto.split('.')[1].length>=2) return;
          if(reg.monto.replace('.','').length>=9) return;
          reg.monto=(reg.monto==='0'?'':reg.monto)+n; }
   const v=$('nx-body').querySelector('.nx-amt .v');
   const num=parseFloat(reg.monto)||0;
   v.innerHTML='<small>S/</small>'+num.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
   $('nxSave').disabled=!(num>0);
  });
  const de=$('nxDesc'); if(de) de.oninput=()=>{ reg.desc=de.value; };
  const ct=$('nxCta'); if(ct) ct.onclick=()=>{
   const cuentas=(S.cuentas||[]).map(a=>['a:'+a.id,a.nombre])
     .concat((S.tarjetas||[]).map(c=>['card:'+c.id,c.nombre+' (crédito)']));
   const i=cuentas.findIndex(x=>x[0]===reg.cuentaVal);
   reg.cuentaVal=cuentas[(i+1)%cuentas.length][0]; vib(8); pinta(1);
  };
  $('nxSave').onclick=()=>{
   const mo=parseFloat(reg.monto)||0; if(!(mo>0)) return;
   /* se llenan los campos del formulario del motor y se llama a SU addMov():
      así el gasto a crédito, las cuotas y el recálculo salen igual que siempre */
   $('mFecha').value=keyOf(new Date());
   $('mTipo').value=reg.tipo;
   syncMovForm();
   if(reg.tipo==='Gasto'){
    const cid=reg.catId || (catsGrid().find(g=>g.cat)||{cat:{}}).cat.id;
    if(cid) $('mCat').value=cid;
   }
   $('mCuenta').value=reg.cuentaVal; toggleCredito();
   $('mConcepto').value=reg.desc||((catById(reg.catId)||{}).nombre||reg.tipo);
   $('mMonto').value=String(mo);
   if(typeof editId!=='undefined'&&editId) cancelEdit();
   vib(18);
   addMov();                              // ← función del motor
   reg={tipo:reg.tipo,monto:'',catId:null,cuentaVal:reg.cuentaVal,desc:''};
   pila=['mov']; pinta(1);
  };
 }};

 /* ------------------------------- Tarjetas ------------------------------- */
 P.tarjetas={html(){
  const m=mesSel();
  return barraTop('Tarjetas',(S.tarjetas||[]).length+' activa'+((S.tarjetas||[]).length===1?'':'s'))+
   '<div class="nx-scroll">'+((S.tarjetas||[]).length?(S.tarjetas||[]).map(c=>{
    const li=+c.linea||0, us=consumidoCard(c), st=cardMonthStatus(c,m.y,m.mn);
    const p=li>0?Math.min(100,us/li*100):0;
    return '<button class="nx-box nxp" style="display:block;width:100%;text-align:left" data-go="tarjeta" data-id="'+c.id+'">'+
     '<div style="display:flex;justify-content:space-between;gap:10px"><b style="font-size:14.5px">'+h(c.nombre)+'</b>'+
      '<span style="color:var(--nx-faint)">›</span></div>'+
     '<div style="font-size:12px;color:var(--nx-mut);margin-top:3px">Usado '+fmt(us)+' de '+fmt(li)+' · '+Math.round(p)+'%</div>'+
     '<div class="nx-bar '+(p>80?'bad':p>60?'warn':'')+'"><i style="width:'+p.toFixed(1)+'%"></i></div>'+
     '<div style="display:flex;justify-content:space-between;margin-top:11px;font-size:12.5px">'+
      '<span style="color:var(--nx-mut)">Cuota del mes</span><b>'+fmt(st.cuota)+
      (st.falta>0.5?' <span style="color:var(--nx-warn)">· falta '+fmt(st.falta)+'</span>':' <span style="color:var(--nx-pos)">· pagada</span>')+'</b></div>'+
     '</button>';
   }).join(''):'<div class="nx-empty">Sin tarjetas registradas.</div>')+'</div>';
 }};

 /* -------------------------- detalle de tarjeta -------------------------- */
 P.tarjeta={html(p){
  const c=(S.tarjetas||[]).find(x=>x.id===p.id);
  if(!c) return barraTop('Tarjeta')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  const m=mesSel(), li=+c.linea||0, us=consumidoCard(c), st=cardMonthStatus(c,m.y,m.mn);
  const compras=comprasState(c).filter(x=>x.pend>0.5);
  const movs=(S.tx||[]).filter(t=>t.cardId===c.id||t.payCardId===c.id)
    .slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,8);
  return barraTop(c.nombre,(c.last?'•••• '+h(c.last)+' · ':'')+'Tarjeta de crédito')+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Línea disponible</span>'+
     '<span class="tag'+(st.falta<=0.5?' ok':'')+'">'+(st.falta<=0.5?'Al día':'Por pagar')+'</span></div>'+
    '<div class="big">'+fmt(Math.max(0,li-us))+'</div>'+
    '<div class="two"><div><span>Usado</span><b>'+fmt(us)+'</b></div>'+
     '<div><span>Cuota del mes</span><b>'+fmt(st.cuota)+'</b></div>'+
     '<div><span>Vence</span><b>día '+(c.dia||'—')+'</b></div></div>'+
    '<div class="pie">Línea total '+fmt(li)+'</div></div>'+

   '<div class="nx-box">'+
    '<button class="nx-row" data-go="estado" data-id="'+c.id+'"><span class="av">📄</span>'+
     '<span class="tx"><b>Estado de cuenta</b><span>Ciclo, cargos y abonos</span></span><span class="ar">›</span></button>'+
    '<button class="nx-row" id="nxPagT"><span class="av">💸</span>'+
     '<span class="tx"><b>Registrar un pago</b><span>Cuota del mes '+fmt(st.cuota)+'</span></span><span class="ar">›</span></button>'+
   '</div>'+

   '<div class="nx-st"><h3>Compras en cuotas</h3></div>'+
   '<div class="nx-box">'+(compras.length?compras.map(x=>{
     const q=x.p, n=Math.max(1,+q.n||1), cu=cuotaOf(q);
     const pagadas=Math.max(0,Math.min(n,Math.round((((+q.saldo||0)-x.pend)/((+q.saldo||0)||1))*n)));
     return '<div class="nx-row"><span class="av">'+emo(q.desc||'')+'</span>'+
      '<span class="tx"><b>'+h(q.desc||'Compra')+'</b><span>'+pagadas+' de '+n+' cuotas · '+fmt(cu)+'/mes</span></span>'+
      '<span class="am"><b>'+fmt(x.pend)+'</b><span>pendiente</span></span></div>';
    }).join(''):'<div class="nx-empty">Sin compras en cuotas pendientes.</div>')+'</div>'+

   '<div class="nx-st"><h3>Últimos movimientos de la tarjeta</h3></div>'+
   '<div class="nx-box">'+(movs.length?movs.map(filaTx).join(''):'<div class="nx-empty">Sin movimientos.</div>')+'</div>'+
   '</div>';
 },wire(p){
  const b=$('nxPagT'); if(b) b.onclick=()=>go('pagar',{tipo:'c',id:p.id});
 }};

 /* ------------------- estado de cuenta del ciclo ------------------- */
 P.estado={html(p){
  const c=(S.tarjetas||[]).find(x=>x.id===p.id);
  if(!c) return barraTop('Estado de cuenta')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  const m=mesSel(), cy=ciclo(c,m.y,m.mn);
  const kv=(k,v,cls)=>'<div class="nx-kv '+(cls||'')+'"><span>'+k+'</span><b>'+v+'</b></div>';
  return barraTop('Estado de cuenta',h(c.nombre)+(c.last?' · •••• '+h(c.last):''))+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Total facturado del ciclo</span>'+
     '<span class="tag'+(cy.falta<=0.5?' ok':'')+'">'+(cy.falta<=0.5?'Ciclo pagado':'Por pagar')+'</span></div>'+
    '<div class="big">'+fmt2(cy.facturado)+'</div>'+
    '<div class="two"><div><span>Pago mínimo</span><b>'+(cy.minimo>0?fmt2(cy.minimo):'—')+'</b></div>'+
     '<div><span>Fecha límite</span><b>'+fechaCorta(cy.venc)+'</b></div></div>'+
    '<div class="pie">Ciclo '+rangoCiclo(cy)+' · cierre '+fechaCorta(cy.fin)+'</div></div>'+

   '<div class="nx-box nxp">'+
    kv('Saldo del ciclo anterior',fmt2(cy.anterior))+
    kv('Consumos y cargos','+ '+fmt2(cy.sumaCons))+
    kv('Pagos y abonos','<span style="color:var(--nx-pos)">− '+fmt2(cy.sumaAbon)+'</span>')+
    kv('Intereses y comisiones',fmt2(cy.interes))+
    kv('Cuota facturada del mes',fmt2(cy.facturado),'tot')+
    kv('Falta pagar',cy.falta>0.5?'<span style="color:var(--nx-warn)">'+fmt2(cy.falta)+'</span>':'<span style="color:var(--nx-pos)">nada</span>')+
   '</div>'+

   '<div class="nx-tip nxw"><span>ℹ️</span><span><b>Las fechas del ciclo son estimadas.</b> '+
    'El motor guarda tu día de pago (día '+(c.dia||'—')+') pero no el día de cierre, así que se '+
    'asume el cierre '+CIERRE_ANTES+' días antes. Cuando tengas el estado de cuenta del banco a la '+
    'mano, dime el día de cierre real y lo dejo exacto.</span></div>'+

   ((+c.tea||0)>0
    ? '<div class="nx-tip"><span>💡</span><span>Si pagas solo el mínimo, el saldo restante genera '+
      'intereses a una TEA de '+((+c.tea||0)*100).toFixed(0)+'%.</span></div>'
    : '<div class="nx-tip"><span>💡</span><span>Tus compras están en cuotas <b>sin interés</b> '+
      '(TEA 0%), así que pagar la cuota completa no te cuesta nada extra. Eso sí: mientras haya '+
      'saldo, la línea disponible sigue ocupada.</span></div>')+

   '<div class="nx-st"><h3>Detalle del ciclo</h3><span style="font-size:12px;color:var(--nx-mut)">'+
     (cy.consumos.length+cy.abonos.length)+' movimiento'+((cy.consumos.length+cy.abonos.length)===1?'':'s')+'</span></div>'+
   '<div class="nx-box">'+((cy.consumos.length+cy.abonos.length)
     ? cy.consumos.concat(cy.abonos).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(filaTx).join('')
     : '<div class="nx-empty">Sin movimientos registrados en este ciclo.</div>')+'</div>'+
   '</div>';
 }};

 /* --------------------------- próximos pagos --------------------------- */
 P.pagos={html(){
  const vs=vencs();
  const pend=vs.filter(v=>v.falta>0.5), list=vs.filter(v=>v.falta<=0.5);
  return barraTop('Próximos pagos',pend.length+' pendiente'+(pend.length===1?'':'s'))+
   '<div class="nx-scroll">'+
   '<div class="nx-box">'+(pend.length?pend.map(filaVenc).join(''):'<div class="nx-empty">Nada pendiente.</div>')+'</div>'+
   (list.length?'<div class="nx-st"><h3>Ya pagados</h3></div><div class="nx-box">'+list.map(filaVenc).join('')+'</div>':'')+
   '<button class="nx-go" id="nxPagG">Registrar un pago</button>'+
   '</div>';
 },wire(){ $('nxPagG').onclick=()=>go('pagar',{}); }};

 /* ------------------------------- Deudas ------------------------------- */
 P.deudas={html(){
  const m=mesSel();
  return barraTop('Deudas',(S.loans||[]).length+' en curso')+
   '<div class="nx-scroll">'+((S.loans||[]).length?(S.loans||[]).map(l=>{
    const rest=loanRem(l), pag=loanCuotasPagadas(l), n=+l.meses||0;
    const p=n>0?Math.min(100,pag/n*100):0, st=loanMonthStatus(l,m.y,m.mn);
    return '<button class="nx-box nxp" style="display:block;width:100%;text-align:left" data-go="deuda" data-id="'+l.id+'">'+
     '<div style="display:flex;justify-content:space-between;gap:10px"><b style="font-size:14.5px">'+h(l.nombre)+'</b>'+
      '<span style="color:var(--nx-faint)">›</span></div>'+
     '<div style="font-size:12px;color:var(--nx-mut);margin-top:3px">'+pag+' de '+n+' cuotas · '+fmt(l.cuota)+'/mes</div>'+
     '<div class="nx-bar"><i style="width:'+p.toFixed(1)+'%"></i></div>'+
     '<div style="display:flex;justify-content:space-between;margin-top:11px;font-size:12.5px">'+
      '<span style="color:var(--nx-mut)">Saldo</span><b>'+fmt(rest)+
      (st.falta>0.5?' <span style="color:var(--nx-warn)">· falta '+fmt(st.falta)+' este mes</span>':'')+'</b></div>'+
     '</button>';
   }).join(''):'<div class="nx-empty">Sin préstamos registrados.</div>')+'</div>';
 }};

 P.deuda={html(p){
  const l=(S.loans||[]).find(x=>x.id===p.id);
  if(!l) return barraTop('Deuda')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  const m=mesSel(), rest=loanRem(l), pag=loanCuotasPagadas(l), n=+l.meses||0;
  const tea=impliedRate(l.monto,l.cuota,l.meses);          // el motor calcula la tasa
  const tcea=(Math.pow(1+tea,12)-1)*100;
  const st=loanMonthStatus(l,m.y,m.mn);
  const total=(+l.cuota||0)*n, interes=Math.max(0,total-(+l.monto||0));
  const kv=(k,v,cls)=>'<div class="nx-kv '+(cls||'')+'"><span>'+k+'</span><b>'+v+'</b></div>';
  const pct=n>0?Math.min(100,pag/n*100):0;
  return barraTop(l.nombre,'Préstamo · cuota fija')+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Saldo pendiente</span>'+
     '<span class="tag'+(st.falta<=0.5?' ok':'')+'">'+(st.falta<=0.5?'Al día':'Por pagar')+'</span></div>'+
    '<div class="big">'+fmt2(rest)+'</div>'+
    '<div class="two"><div><span>Cuota</span><b>'+fmt(l.cuota)+'</b></div>'+
     '<div><span>Pagadas</span><b>'+pag+' / '+n+'</b></div>'+
     '<div><span>Vence</span><b>día '+(l.dia||'—')+'</b></div></div>'+
    '<div class="pie">Avance '+Math.round(pct)+'%</div></div>'+
   '<div class="nx-box nxp">'+
    kv('Monto original',fmt2(l.monto))+
    kv('Total a pagar',fmt2(total))+
    kv('Intereses del crédito','<span style="color:var(--nx-neg)">'+fmt2(interes)+'</span>')+
    kv('TCEA calculada',tcea>0?tcea.toFixed(1)+'%':'—')+
    kv('Se libera',(function(){ const s=monthNum(l.startY,l.startM)+n-1; const yy=Math.floor((s-1)/12), mm=s-yy*12;
        return MESab[mm-1]+' '+yy; })(),'tot')+
   '</div>'+
   (interes>0?'<div class="nx-tip nxw"><span>⚠️</span><span>Por este préstamo vas a pagar <b>'+fmt(interes)+
     '</b> de intereses sobre '+fmt(l.monto)+' prestados. Cada abono extra al capital te ahorra parte de eso.</span></div>':'')+
   '<button class="nx-go" id="nxPagD">Registrar un pago</button>'+
   '</div>';
 },wire(p){ $('nxPagD').onclick=()=>go('pagar',{tipo:'l',id:p.id}); }};

 /* --------------------------- registrar pago --------------------------- */
 let pagoSel='', pagoMonto='';
 P.pagar={nav:false,html(p){
  const ops=(S.tarjetas||[]).map(c=>['c:'+c.id,'Tarjeta · '+c.nombre])
    .concat((S.loans||[]).map(l=>['l:'+l.id,'Préstamo · '+l.nombre]));
  if(!pagoSel){ pagoSel = (p.tipo&&p.id) ? p.tipo+':'+p.id : (ops[0]||[''])[0]; }
  const rot=(ops.find(x=>x[0]===pagoSel)||['',''])[1];
  const m=mesSel();
  let sug=0;
  if(pagoSel){ const [t,id]=pagoSel.split(':');
   if(t==='c'){ const c=(S.tarjetas||[]).find(x=>x.id===+id); if(c) sug=cardMonthStatus(c,m.y,m.mn).falta; }
   else { const l=(S.loans||[]).find(x=>x.id===+id); if(l) sug=loanMonthStatus(l,m.y,m.mn).falta; } }
  const num=parseFloat(pagoMonto)||0;
  return '<div class="nx-reg">'+
   '<div class="rt"><button class="x" data-back>✕</button>'+
    '<b style="font-size:15px">Registrar pago</b><span style="width:34px"></span></div>'+
   '<div class="nx-amt"><div class="k">Monto del pago</div>'+
    '<div class="v nx-num"><small>S/</small>'+num.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div></div>'+
   '<button class="nx-fld" id="nxPD"><span class="k">Deuda</span><span class="v">'+h(rot)+' ›</span></button>'+
   (sug>0.5?'<button class="nx-fld" id="nxPS"><span class="k">Falta este mes</span><span class="v" style="color:var(--nx-brand)">'+fmt2(sug)+' · usar ›</span></button>':'')+
   '<div class="nx-pad">'+[1,2,3,4,5,6,7,8,9].map(d=>'<button data-n="'+d+'">'+d+'</button>').join('')+
    '<button data-n=".">.</button><button data-n="0">0</button><button data-n="del">⌫</button></div>'+
   '<button class="nx-go" id="nxPG"'+(num>0?'':' disabled')+'>Registrar pago</button></div>';
 },wire(p){
  const ops=(S.tarjetas||[]).map(c=>['c:'+c.id]).concat((S.loans||[]).map(l=>['l:'+l.id]));
  const pd=$('nxPD'); if(pd) pd.onclick=()=>{
   const i=ops.findIndex(x=>x[0]===pagoSel); pagoSel=ops[(i+1)%ops.length][0]; vib(8); pinta(1); };
  const ps=$('nxPS'); if(ps) ps.onclick=()=>{
   const m=mesSel(), [t,id]=pagoSel.split(':'); let s=0;
   if(t==='c'){ const c=(S.tarjetas||[]).find(x=>x.id===+id); if(c) s=cardMonthStatus(c,m.y,m.mn).falta; }
   else { const l=(S.loans||[]).find(x=>x.id===+id); if(l) s=loanMonthStatus(l,m.y,m.mn).falta; }
   pagoMonto=s.toFixed(2); vib(8); pinta(1); };
  document.querySelectorAll('#nx-body .nx-pad button').forEach(b=>b.onclick=()=>{
   const n=b.dataset.n; vib(6);
   if(n==='del') pagoMonto=pagoMonto.slice(0,-1);
   else if(n==='.'){ if(pagoMonto.indexOf('.')<0) pagoMonto=(pagoMonto||'0')+'.'; }
   else { if(pagoMonto.indexOf('.')>=0&&pagoMonto.split('.')[1].length>=2) return;
          pagoMonto=(pagoMonto==='0'?'':pagoMonto)+n; }
   const num=parseFloat(pagoMonto)||0;
   $('nx-body').querySelector('.nx-amt .v').innerHTML='<small>S/</small>'+
     num.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
   $('nxPG').disabled=!(num>0);
  });
  $('nxPG').onclick=()=>{
   const mo=parseFloat(pagoMonto)||0; if(!(mo>0)) return;
   /* mismos campos que usa la app de siempre, y su propia addCardPayment() */
   $('payCard').value=pagoSel;
   $('payCard').dispatchEvent(new Event('change'));
   $('payFecha').value=keyOf(new Date());
   $('payMonto').value=String(mo);
   vib(18);
   addCardPayment();                       // ← función del motor
   pagoMonto=''; volver();
  };
 }};

 /* -------------------------------- Metas -------------------------------- */
 P.metas={html(){
  const ms=S.metas||[];
  const ya=ms.reduce((a,g)=>a+(+g.ahorrado||0),0), ob=ms.reduce((a,g)=>a+(+g.objetivo||0),0);
  return barraTop('Metas',ms.length+' activa'+(ms.length===1?'':'s'))+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Ahorrado en total</span></div>'+
    '<div class="big">'+fmt2(ya)+'</div>'+
    '<div class="pie">de '+fmt(ob)+' en objetivos</div></div>'+
   (ms.length?ms.map(g=>{
     const o=+g.objetivo||0, y=+g.ahorrado||0, p=o>0?Math.min(100,y/o*100):0;
     return '<button class="nx-box nxp" style="display:block;width:100%;text-align:left" data-go="meta" data-id="'+g.id+'">'+
      '<div style="display:flex;gap:10px;align-items:center"><span style="font-size:20px">'+emo(g.nombre)+'</span>'+
      '<b style="flex:1;font-size:14.5px">'+h(g.nombre)+'</b><span style="color:var(--nx-faint)">›</span></div>'+
      '<div style="font-size:12px;color:var(--nx-mut);margin-top:6px">'+fmt(y)+' de '+fmt(o)+' · '+Math.round(p)+'%</div>'+
      '<div class="nx-bar"><i style="width:'+p.toFixed(1)+'%"></i></div></button>';
    }).join(''):'<div class="nx-empty">Sin metas. Crea la primera abajo.</div>')+
   '<button class="nx-go" id="nxNM">Crear una meta</button></div>';
 },wire(){ $('nxNM').onclick=()=>go('nuevameta'); }};

 P.meta={html(p){
  const g=(S.metas||[]).find(x=>x.id===p.id);
  if(!g) return barraTop('Meta')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  const o=+g.objetivo||0, y=+g.ahorrado||0, falta=Math.max(0,o-y), pc=o>0?Math.min(100,y/o*100):0;
  const kv=(k,v)=>'<div class="nx-kv"><span>'+k+'</span><b>'+v+'</b></div>';
  return barraTop(g.nombre,'Meta de ahorro')+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Ahorrado</span>'+
     '<span class="tag'+(falta<=0.5?' ok':'')+'">'+(falta<=0.5?'Cumplida':Math.round(pc)+'%')+'</span></div>'+
    '<div class="big">'+fmt2(y)+'</div>'+
    '<div class="two"><div><span>Objetivo</span><b>'+fmt(o)+'</b></div>'+
     '<div><span>Falta</span><b>'+fmt(falta)+'</b></div></div>'+
    (g.fecha?'<div class="pie">Fecha objetivo '+h(g.fecha)+'</div>':'')+'</div>'+
   '<div class="nx-box nxp">'+kv('Progreso',Math.round(pc)+'%')+kv('Objetivo',fmt2(o))+
     (g.fecha?kv('Fecha',h(g.fecha)):'')+'</div>'+
   '<button class="nx-go" id="nxAp">Aportar a esta meta</button>'+
   '<button class="nx-go sec" id="nxDelM" style="margin-top:9px">Eliminar meta</button></div>';
 },wire(p){
  $('nxAp').onclick=()=>go('aporte',{id:p.id});
  $('nxDelM').onclick=()=>{ if(!confirm('¿Eliminar esta meta?')) return; vib(18); delMeta(p.id); pila=['metas']; pinta(-1); };
 }};

 let apMonto='';
 P.aporte={nav:false,html(p){
  const g=(S.metas||[]).find(x=>x.id===p.id)||{};
  const num=parseFloat(apMonto)||0;
  return '<div class="nx-reg"><div class="rt"><button class="x" data-back>✕</button>'+
   '<b style="font-size:15px">Aportar</b><span style="width:34px"></span></div>'+
   '<div class="nx-amt"><div class="k">Aporte a '+h(g.nombre||'la meta')+'</div>'+
    '<div class="v nx-num"><small>S/</small>'+num.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div></div>'+
   '<div class="nx-tip"><span>ℹ️</span><span>El aporte sube el ahorrado de la meta. Si además quieres '+
    'que salga de tu caja, anótalo como gasto en la categoría de ahorro.</span></div>'+
   '<div class="nx-pad">'+[1,2,3,4,5,6,7,8,9].map(d=>'<button data-n="'+d+'">'+d+'</button>').join('')+
    '<button data-n=".">.</button><button data-n="0">0</button><button data-n="del">⌫</button></div>'+
   '<button class="nx-go" id="nxApG"'+(num>0?'':' disabled')+'>Guardar aporte</button></div>';
 },wire(p){
  document.querySelectorAll('#nx-body .nx-pad button').forEach(b=>b.onclick=()=>{
   const n=b.dataset.n; vib(6);
   if(n==='del') apMonto=apMonto.slice(0,-1);
   else if(n==='.'){ if(apMonto.indexOf('.')<0) apMonto=(apMonto||'0')+'.'; }
   else { if(apMonto.indexOf('.')>=0&&apMonto.split('.')[1].length>=2) return; apMonto=(apMonto==='0'?'':apMonto)+n; }
   const num=parseFloat(apMonto)||0;
   $('nx-body').querySelector('.nx-amt .v').innerHTML='<small>S/</small>'+
     num.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
   $('nxApG').disabled=!(num>0);
  });
  $('nxApG').onclick=()=>{
   const g=(S.metas||[]).find(x=>x.id===p.id); if(!g) return;
   const mo=parseFloat(apMonto)||0; if(!(mo>0)) return;
   vib(18);
   editMeta(g.id,'ahorrado',(+g.ahorrado||0)+mo);          // ← función del motor
   apMonto=''; volver();
  };
 }};

 P.nuevameta={nav:false,html(){
  return barraTop('Nueva meta')+'<div class="nx-scroll">'+
   '<div class="nx-fld"><span class="k">Nombre</span><input id="nmN" placeholder="Fondo de emergencia"></div>'+
   '<div class="nx-fld"><span class="k">Objetivo (S/)</span><input id="nmO" inputmode="decimal" placeholder="1000"></div>'+
   '<div class="nx-fld"><span class="k">Ya tengo (S/)</span><input id="nmY" inputmode="decimal" placeholder="0"></div>'+
   '<div class="nx-fld"><span class="k">Fecha objetivo</span><input id="nmF" type="date"></div>'+
   '<button class="nx-go" id="nmG">Crear meta</button></div>';
 },wire(){
  $('nmG').onclick=()=>{
   if(!$('nmN').value||!parseFloat($('nmO').value)){ alert('Nombre y objetivo'); return; }
   $('gNombre').value=$('nmN').value; $('gObj').value=$('nmO').value;
   $('gYa').value=$('nmY').value||'0'; $('gFecha').value=$('nmF').value||'';
   vib(18); addMeta();                                     // ← función del motor
   pila=['metas']; pinta(1);
  };
 }};

 /* ----------------------------- Presupuesto ----------------------------- */
 P.pres={html(){
  const m=mesSel(), y=m.y, mn=m.mn;
  const I=ingresoMensual(), bk=bucketReal(y,mn);
  const tg={Necesidad:I*0.5,Gusto:I*0.3,Ahorro:I*0.2};
  const gc={};
  (S.tx||[]).filter(t=>t.tipo==='Gasto'&&inMonth(t,y,mn)).forEach(t=>{
   const c=catById(t.catId), nm=c?c.nombre.split(' (')[0]:'Otros';
   gc[nm]=(gc[nm]||0)+(+t.monto||0); });
  const lista=Object.keys(gc).map(k=>({n:k,v:gc[k]})).sort((a,b)=>b.v-a.v);
  const tot=lista.reduce((a,x)=>a+x.v,0);
  const seg=lista.slice(0,5).map((x,i)=>'<i style="flex:'+(x.v/(tot||1)*100).toFixed(2)+';background:'+RAMPA[i]+'"></i>').join('');
  const blq=(k,v,t)=>{ const p=t>0?Math.min(150,v/t*100):0;
   return '<div class="nx-box nxp" style="margin-bottom:11px">'+
    '<div style="display:flex;justify-content:space-between"><b>'+k+'</b>'+
     '<span class="nx-num" style="font-weight:700">'+fmt(v)+' <span style="color:var(--nx-mut);font-weight:500">de '+fmt(t)+'</span></span></div>'+
    '<div class="nx-bar '+(p>100?'bad':p>85?'warn':'')+'"><i style="width:'+Math.min(100,p).toFixed(1)+'%"></i></div>'+
    '<div style="font-size:11.5px;color:var(--nx-mut);margin-top:6px">'+Math.round(p)+'% usado'+
     (p>100?' · te pasaste '+fmt(v-t):'')+'</div></div>'; };
  return '<div class="nx-top"><div class="tt"><h2>Presupuesto</h2><span>'+MES[mn-1]+' '+y+' · regla 50/30/20</span></div></div>'+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Ingreso base del mes</span></div>'+
    '<div class="big">'+fmt2(I)+'</div><div class="pie">Neto de planilla más otros ingresos fijos</div></div>'+
   blq('Necesidades · 50%',bk.Necesidad,tg.Necesidad)+
   blq('Gustos · 30%',bk.Gusto,tg.Gusto)+
   blq('Ahorro y deuda · 20%',bk.Ahorro,tg.Ahorro)+
   '<div class="nx-st"><h3>Gastos por categoría</h3><span style="font-size:12px;color:var(--nx-mut)">'+fmt(tot)+'</span></div>'+
   (tot?'<div class="nx-seg">'+seg+'</div>':'')+
   '<div class="nx-box">'+(lista.length?lista.map((x,i)=>
     '<div class="nx-row"><span class="av">'+emo(x.n)+'</span>'+
     '<span class="tx"><b>'+h(x.n)+'</b><span>'+Math.round(x.v/(tot||1)*100)+'% del mes</span></span>'+
     '<span class="am"><b>'+fmt2(x.v)+'</b></span></div>').join('')
    :'<div class="nx-empty">Sin gastos este mes.</div>')+'</div></div>';
 }};

 /* ------------------------------ Finanzas ------------------------------ */
 P.fin={html(){
  const tarj=(S.tarjetas||[]).reduce((a,c)=>a+consumidoCard(c),0);
  const loan=(S.loans||[]).reduce((a,l)=>a+loanRem(l),0);
  const ya=(S.metas||[]).reduce((a,g)=>a+(+g.ahorrado||0),0);
  const pend=vencs().filter(v=>v.falta>0.5).length;
  const fila=(k,ic,rot,sub,val)=>'<button class="nx-row" data-go="'+k+'"><span class="av">'+ic+'</span>'+
   '<span class="tx"><b>'+rot+'</b><span>'+sub+'</span></span>'+
   (val?'<span class="am"><b>'+val+'</b></span>':'')+'<span class="ar">›</span></button>';
  return '<div class="nx-top"><div class="tt"><h2>Finanzas</h2><span>Todo lo que debes, ahorras y pagas</span></div></div>'+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Deuda total</span></div>'+
    '<div class="big">'+fmt2(deudaTotal())+'</div>'+
    '<div class="pie">'+(S.loans||[]).length+' préstamos · '+(S.tarjetas||[]).length+' tarjetas</div></div>'+
   '<div class="nx-box">'+
    fila('tarjetas','💳','Tarjetas',(S.tarjetas||[]).length+' activas',fmt(tarj))+
    fila('deudas','📄','Préstamos',(S.loans||[]).length+' en curso',fmt(loan))+
    fila('metas','🎯','Metas',(S.metas||[]).length+' activas',fmt(ya))+
    fila('pagos','📅','Próximos pagos',pend+' pendientes','')+
    fila('stats','📊','Estadísticas','Evolución de tus meses','')+
   '</div></div>';
 }};

 /* ---------------------------- Estadísticas ---------------------------- */
 P.stats={html(){
  const m=mesSel();
  const serie=[]; let y=m.y, mn=m.mn;
  const ks=[]; for(let i=0;i<6;i++){ ks.unshift([y,mn]); mn--; if(mn<1){ mn=12; y--; } }
  ks.forEach(([a,b])=>serie.push({rot:MESab[b-1],ing:ingresoRealMes(a,b),gas:gastoMes(a,b),sal:saldoHasta(a,b)}));
  const max=Math.max(1,...serie.map(s=>Math.max(s.ing,s.gas)));
  return barraTop('Estadísticas','Últimos 6 meses')+
   '<div class="nx-scroll">'+
   '<div class="nx-box nxp"><div class="nx-st"><h3>Ingresos y gastos</h3></div>'+
    '<div style="display:flex;align-items:flex-end;gap:9px;height:150px;margin-top:6px">'+
     serie.map(s=>'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">'+
      '<div style="display:flex;gap:3px;align-items:flex-end;height:100%;width:100%;justify-content:center">'+
       '<i style="width:38%;background:var(--nx-brand2);border-radius:3px 3px 0 0;height:'+(s.ing/max*100).toFixed(1)+'%"></i>'+
       '<i style="width:38%;background:var(--nx-warn);border-radius:3px 3px 0 0;height:'+(s.gas/max*100).toFixed(1)+'%"></i>'+
      '</div><span style="font-size:10.5px;color:var(--nx-mut)">'+s.rot+'</span></div>').join('')+
    '</div>'+
    '<div style="display:flex;gap:16px;margin-top:12px;font-size:11.5px;color:var(--nx-mut)">'+
     '<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--nx-brand2);margin-right:5px"></i>Ingresos</span>'+
     '<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--nx-warn);margin-right:5px"></i>Gastos</span></div>'+
   '</div>'+
   '<div class="nx-st"><h3>Mes por mes</h3></div>'+
   '<div class="nx-box">'+serie.slice().reverse().map(s=>
     '<div class="nx-row"><span class="av">📅</span><span class="tx"><b>'+s.rot+'</b>'+
     '<span>Ingresos '+fmt(s.ing)+' · gastos '+fmt(s.gas)+'</span></span>'+
     '<span class="am"><b class="'+(s.sal>=0?'nx-in':'')+'">'+fmt(s.sal)+'</b><span>caja</span></span></div>').join('')+
   '</div></div>';
 }};

 /* --------------------------- notificaciones --------------------------- */
 P.notifs={html(){
  const av=avisos();
  return barraTop('Avisos',av.length+' aviso'+(av.length===1?'':'s'))+
   '<div class="nx-scroll">'+av.map(a=>'<div class="nx-alert '+a.n+'" style="flex:1 1 auto;margin-bottom:10px">'+
    '<span class="i">'+a.i+'</span><span><b>'+a.t+'</b><span>'+a.s+'</span>'+
    (a.a?'<a data-go="'+a.a.k+'">'+a.a.r+'</a>':'')+'</span></div>').join('')+
   '<div class="nx-tip"><span>ℹ️</span><span>Estos avisos se calculan cuando abres la app. Para que te '+
    'lleguen al celular sin abrirla haría falta un servidor de notificaciones; hoy la app no tiene uno.</span></div>'+
   '</div>';
 }};

 /* ------------------------------- Perfil ------------------------------- */
 const SUB=[
  {g:'Mi cuenta',k:'p_perfil',ic:'👤',r:'Perfil e ingreso',s:'Nombre, sueldo, AFP y saldo inicial'},
  {g:'Mi cuenta',k:'p_cuentas',ic:'🏦',r:'Cuentas y tarjetas',s:'Medios de pago y líneas'},
  {g:'Finanzas',k:'p_estrategia',ic:'🧮',r:'Estrategia de pago',s:'Avalancha o bola de nieve'},
  {g:'Finanzas',k:'p_eecc',ic:'📄',r:'Estado de cuenta mensual',s:'PDF y Excel al correo'},
  {g:'Finanzas',k:'p_recurrentes',ic:'🔁',r:'Recurrentes y favoritos',s:'Lo que se repite cada mes'},
  {g:'Finanzas',k:'p_calendario',ic:'🗓️',r:'Calendario',s:'Gasto día por día'},
  {g:'Ajustes',k:'p_nube',ic:'☁️',r:'Sincronización',s:'Laptop y celular iguales'},
  {g:'Ajustes',k:'p_seg',ic:'🔒',r:'Seguridad',s:'PIN de 4 dígitos y vibración'},
  {g:'Ajustes',k:'p_datos',ic:'💾',r:'Copias y datos',s:'Exportar, restaurar y reiniciar'},
  {g:'Ajustes',k:'p_acerca',ic:'ℹ️',r:'Acerca de',s:'Versión y dónde viven tus datos'}
 ];
 P.perfil={html(){
  let g=null, out='';
  SUB.forEach(s=>{
   if(s.g!==g){ if(g) out+='</div>'; g=s.g;
    out+='<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--nx-mut);margin:18px 2px 8px">'+g+'</div><div class="nx-box">'; }
   out+='<button class="nx-row" data-go="'+s.k+'"><span class="av">'+s.ic+'</span>'+
    '<span class="tx"><b>'+s.r+'</b><span>'+s.s+'</span></span><span class="ar">›</span></button>';
  });
  out+='</div>';
  return '<div class="nx-top"><div class="tt"><h2>'+h(S.cfg.titular||'Mi perfil')+'</h2>'+
   '<span>v'+(window.APP_VERSION||'')+'</span></div></div><div class="nx-scroll">'+out+'</div>';
 }};

 /* --- las subpáginas reusan los bloques de la app vieja moviéndolos --- */
 function subMover(titulo,sub,fuentes,extra){
  return {html(){ return barraTop(titulo,sub)+'<div class="nx-scroll" id="nxSub">'+(extra||'')+'</div>'; },
   wire(){
    const dest=$('nxSub');
    fuentes.forEach(sel=>{
     const el=sel.indexOf('|')>0
       ? (document.querySelector(sel.split('|')[0])||{closest:()=>null}).closest(sel.split('|')[1])
       : document.querySelector(sel);
     if(el){ el.dataset.nxHome=sel;
       dest.appendChild(el); el.classList.remove('esconder'); el.style.display=''; }
    });
   }};
 }
 P.p_perfil   =subMover('Perfil e ingreso','Nombre, sueldo y descuentos',['#cfgGrid','#cfgCalc']);
 P.p_cuentas  =subMover('Cuentas y tarjetas','Medios de pago y líneas',
   ['#ctaBody|.tablewrap','#cardBody|.tablewrap'],
   '<div class="nx-tip"><span>ℹ️</span><span>Las tablas de siempre, con sus mismos campos editables.</span></div>');
 P.p_estrategia=subMover('Estrategia de pago','Avalancha o bola de nieve',['#stratOut|.box']);
 P.p_eecc     =subMover('Estado de cuenta mensual','PDF y Excel al correo',
   ['#eeccStatus|.box','#eeccPrev']);
 P.p_recurrentes=subMover('Recurrentes y favoritos','Lo que se repite',
   ['#favBody|.tablewrap','#recBody|.tablewrap','#favChips']);
 P.p_calendario=subMover('Calendario','Gasto día por día',['#calGrid|.box','#dayList|.box']);
 P.p_nube     =subMover('Sincronización','Laptop y celular iguales',['#syncUrl|.box']);
 P.p_seg={html(){
  return barraTop('Seguridad','PIN y vibración')+'<div class="nx-scroll">'+
   '<div class="nx-tip"><span>🔒</span><span>El PIN es una cortina de privacidad: no cifra tus datos, '+
    'sólo evita que alguien los vea si le prestas el celular un momento.</span></div>'+
   '<button class="nx-go" id="nxPinNew">'+(localStorage.getItem(PIN_K)?'Cambiar':'Activar')+' PIN</button>'+
   (localStorage.getItem(PIN_K)?'<button class="nx-go sec" id="nxPinOff" style="margin-top:9px">Quitar PIN</button>':'')+
   '<button class="nx-go sec" id="nxVib" style="margin-top:9px">Vibración: '+
    (localStorage.getItem('vibrar')==='0'?'desactivada':'activada')+'</button></div>';
 },wire(){
  $('nxPinNew').onclick=()=>{ pinBuf=''; pinModo='nuevo'; go('login'); };
  const off=$('nxPinOff'); if(off) off.onclick=()=>{ localStorage.removeItem(PIN_K); alert('PIN desactivado.'); pinta(1); };
  $('nxVib').onclick=()=>{ if(window.vibrarToggle) vibrarToggle(); pinta(1); };
 }};
 P.p_datos={html(){
  return barraTop('Copias y datos','Exportar, restaurar y reiniciar')+'<div class="nx-scroll">'+
   '<div class="nx-tip nxw"><span>⚠️</span><span>Si borras los datos del navegador, tus finanzas se van '+
    'con ellos. La copia y la nube son tu red.</span></div>'+
   '<button class="nx-go" onclick="exportData()">Exportar copia (JSON)</button>'+
   '<button class="nx-go sec" onclick="importBackup()" style="margin-top:9px">Restaurar copia (JSON)</button>'+
   '<button class="nx-go sec" onclick="cargarPlanInicial()" style="margin-top:9px">Cargar datos del plan (ago-2026)</button>'+
   '<button class="nx-go mal" onclick="resetAll()" style="margin-top:22px">Reiniciar todo</button></div>';
 }};
 P.p_acerca={html(){
  return barraTop('Acerca de','Versión y datos')+'<div class="nx-scroll"><div class="nx-box nxp">'+
   '<div class="nx-kv"><span>Versión</span><b>v'+(window.APP_VERSION||'')+'</b></div>'+
   '<div class="nx-kv"><span>Interfaz</span><b>NEXO</b></div>'+
   '<div class="nx-kv"><span>Movimientos</span><b>'+(S.tx||[]).length+'</b></div>'+
   '<div class="nx-kv"><span>Sin internet</span><b>funciona</b></div></div>'+
   '<div class="nx-tip"><span>ℹ️</span><span>Tus datos viven en este navegador y, si conectaste la '+
    'sincronización, en un archivo JSON de <b>tu</b> Drive. No pasan por ningún otro servidor.</span></div></div>';
 }};

 /* ============================ arranque ============================ */
 const NAVICO={
  home:'<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  mov:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  pres:'<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 3"/>',
  fin:'<path d="M5 20V9M12 20V4M19 20v-7"/>',
  perfil:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>'
 };
 const NAVROT={home:'Inicio',mov:'Movimientos',pres:'Presupuesto',fin:'Finanzas',perfil:'Perfil'};

 function montar(){
  if($('nx')) return;
  document.body.classList.add('nx-on');
  const root=document.createElement('div'); root.id='nx';
  root.innerHTML='<div id="nx-body"></div>'+
   '<nav class="nx-nav" id="nx-nav">'+RAIZ.map(k=>
     '<button data-k="'+k+'"><svg viewBox="0 0 24 24">'+NAVICO[k]+'</svg><span>'+NAVROT[k]+'</span></button>').join('')+'</nav>'+
   '<button class="nx-fab" id="nx-fab" aria-label="Registrar">+</button>';
  document.body.appendChild(root);
  root.querySelectorAll('.nx-nav button').forEach(b=>b.onclick=()=>go(b.dataset.k));
  $('nx-fab').onclick=()=>go('reg');
  pila=[ localStorage.getItem(PIN_K) ? 'login' : 'home' ];
  pinta(1);
 }

 /* cada vez que el motor guarda, se repinta la pantalla actual */
 const _save=window.save;
 window.save=function(){ _save.apply(this,arguments); try{ if($('nx')) pinta(0); }catch(e){ console.warn('NEXO repintar',e); } };

 window.NX={go:go,volver:volver,pinta:()=>pinta(0)};
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',montar);
 else montar();
})();
