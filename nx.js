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
 const EMO=[[/restaur|salida|cena|bar\b/i,'🍽️'],[/aliment|comida|mercado|delivery/i,'🍔'],[/transp|pasaje|taxi|gasolin|combust/i,'🚌'],
  [/vivien|alquil|renta|casa|hogar/i,'🏠'],[/servici|luz|agua|internet|cel|tele/i,'💡'],
  [/salud|farmac|medic|clinic|doctor/i,'💊'],[/entreten|cine|juego|streaming|ocio/i,'🎬'],
  [/compra|ropa|zapat|tienda/i,'🛍️'],[/educ|curso|libro|estudi/i,'📚'],
  [/deuda|cuota|pr[eé]stamo|tarjeta/i,'💳'],[/ahorro|meta|fondo/i,'🎯'],
  [/sueldo|salario|ingreso|grati|freelance|bono/i,'💰'],[/gym|deporte|fitness/i,'🏋️'],
  [/mascota|veterin/i,'🐾'],[/regalo|cumple/i,'🎁'],[/viaje|hotel|vuelo|cusco/i,'✈️']];
 const emo=t=>{ for(const [re,e] of EMO) if(re.test(t||'')) return e; return '💸'; };
 /* Si él le puso un icono a la categoría, manda el suyo; si no, se adivina. */
 const emoCat=c=>(c&&c.icono)?c.icono:emo(c?c.nombre:'');
 /* Nombre corto para las rejillas: "Servicios (luz, agua...)" → "Servicios" */
 const rotCat=c=>{ const t=String((c&&c.nombre)||'').split(' (')[0].split(' / ')[0].trim();
   if(t.length<=13) return t;
   if(t.indexOf(' ')>0) return t;        // si tiene espacios, se parte en dos líneas
   return t.slice(0,12)+'.';             // una palabra larguísima sí se recorta
 };

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
  fab.style.display = (k==='mov') ? 'grid':'none';   /* pedido suyo: el + vive en Movimientos */
  nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  cuerpo.querySelectorAll('[data-go]').forEach(e=>{
   e.onclick=ev=>{ ev.stopPropagation();
    const p={}; if(e.dataset.id) p.id=+e.dataset.id; if(e.dataset.tipo) p.tipo=e.dataset.tipo;
    go(e.dataset.go,p); };
  });
  cuerpo.querySelectorAll('[data-back]').forEach(e=>e.onclick=volver);
 }

 /* ============================ piezas comunes ============================ */
 const CERRAR_X='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

 /* -------- hoja inferior para elegir de una lista --------
    Antes el campo "Cuenta" era un botón que rotaba de opción en opción y no
    se veía qué había disponible. Ahora abre la lista, como cualquier app. */
 /* Los teclados (PIN, monto, pago) responden al APRETAR, no al click: en el
    móvil el click llega ~300 ms después y cualquier cosa que lo cancele hace
    perder el dígito. El guardia de 700 ms evita que el click posterior lo
    repita, y el camino por click sigue vivo para teclado físico. */
 function alToque(el,fn){
  if(!el) return;
  if(!window.PointerEvent){ el.addEventListener('click',()=>fn()); return; }
  let tragarClick=false, limpiar=null;
  el.addEventListener('pointerdown',ev=>{
   if(ev.pointerType==='mouse' && ev.button!==0) return;
   /* el click que viene detrás de este toque se descarta con una marca, no con
      una ventana de tiempo: así los clicks de verdad (teclado, lector de
      pantalla, pruebas) nunca se pierden aunque lleguen seguidos */
   tragarClick=true;
   clearTimeout(limpiar);
   limpiar=setTimeout(()=>{ tragarClick=false; },900);
   fn();
  });
  el.addEventListener('click',()=>{
   if(tragarClick){ tragarClick=false; clearTimeout(limpiar); return; }
   fn();
  });
 }

 function hoja(titulo,ops,sel,alElegir){
  const bg=$('nx-bg'), sh=$('nx-sheet');
  if(!bg||!sh) return;
  sh.innerHTML='<div class="grab"></div><h4>'+h(titulo)+'</h4><div class="lista">'+
   ops.map(o=>'<button class="op'+(String(o.v)===String(sel)?' on':'')+'" data-v="'+h(o.v)+'">'+
    '<span class="e">'+(o.e||'•')+'</span><span class="n">'+h(o.n)+
    (o.s?'<small>'+h(o.s)+'</small>':'')+'</span><span class="ck">✓</span></button>').join('')+'</div>';
  const cerrar=()=>{ bg.classList.remove('on'); sh.classList.remove('on'); };
  sh.querySelectorAll('button.op').forEach(b=>b.onclick=()=>{ vib(10); cerrar(); alElegir(b.dataset.v); });
  bg.onclick=cerrar;
  bg.classList.add('on'); sh.classList.add('on');
 }

 /* ============ confirmar antes de borrar, y deshacer al editar ============
    Pedido suyo. Nada de esto cambia un cálculo: sólo intercepta las funciones
    del motor para avisar antes, y guarda una copia del estado para revertir. */

 /* mide el efecto real de una acción sin dejar rastro: aplica, mide, revierte */
 function simular(mut){
  const copia=JSON.stringify(S), m=mesSel();
  const r={deudaA:deudaTotal(), cajaA:saldoHasta(m.y,m.mn)};
  try{ mut(); r.deudaB=deudaTotal(); r.cajaB=saldoHasta(m.y,m.mn); }
  catch(e){ r.deudaB=r.deudaA; r.cajaB=r.cajaA; }
  finally{ S=JSON.parse(copia); }
  return r;
 }
 function lineaCambio(rot,a,b){
  if(Math.abs(a-b)<0.5) return '';
  return '<div class="cifras"><span class="fl">'+rot+'</span>'+
   '<span class="a">'+fmt(a)+'</span><span class="fl">→</span><span class="b">'+fmt(b)+'</span></div>';
 }

 function confirmar(o,alAceptar){
  const bg=$('nx-bg'), sh=$('nx-sheet');
  if(!bg||!sh){ if(window.confirm(o.titulo)) alAceptar(); return; }
  sh.innerHTML='<div class="grab"></div><h4>'+h(o.titulo)+'</h4>'+
   '<div class="conf">'+o.detalle+'</div>'+
   '<div class="cbtns"><button class="nx-go mal" id="nxSi">'+h(o.boton||'Sí, borrar')+'</button>'+
   '<button class="nx-go sec" id="nxNo">Cancelar</button></div>';
  const cerrar=()=>{ bg.classList.remove('on'); sh.classList.remove('on'); };
  $('nxSi').onclick=()=>{ vib(18); cerrar(); alAceptar(); };
  $('nxNo').onclick=()=>{ vib(8); cerrar(); };
  bg.onclick=cerrar;
  bg.classList.add('on'); sh.classList.add('on');
 }

 /* ---- aviso con "Deshacer" para los cambios de un campo ---- */
 let tst=null, tstT=null, copiaPrevia=null;
 /* El aviso se quedaba 7 segundos, tapaba contenido e invitaba a tocar
    "Deshacer" sin querer, y no había forma de sacarlo. Ahora dura menos, se va
    deslizándolo con el dedo y trae una ✕. El botón de deshacer queda separado
    del resto para que no se toque de casualidad. */
 function ocultarToast(){ if(tst){ clearTimeout(tstT); tst.classList.remove('on'); } }
 function toast(titulo,detalle,alDeshacer){
  if(!tst){ tst=document.createElement('div'); tst.id='nx-toast'; document.body.appendChild(tst); }
  tst.innerHTML='<div class="tt"><b>'+h(titulo)+'</b>'+(detalle?h(detalle):'')+'</div>'+
   (alDeshacer?'<button id="nxUndo">Deshacer</button>':'')+
   '<button id="nxToastX" class="x" aria-label="Cerrar aviso">'+CERRAR_X+'</button>';
  const u=$('nxUndo');
  if(u) u.onclick=()=>{ vib(16); ocultarToast(); alDeshacer(); };
  const x=$('nxToastX'); if(x) x.onclick=()=>{ vib(6); ocultarToast(); };
  clearTimeout(tstT);
  tst.style.transform=''; tst.style.opacity='';
  requestAnimationFrame(()=>tst.classList.add('on'));
  tstT=setTimeout(ocultarToast, alDeshacer?4500:2800);

  /* deslizar para descartar: hacia abajo o a un lado */
  let x0=0,y0=0,arr=false;
  const mover=e=>{
   const t=e.touches?e.touches[0]:e;
   const dx=t.clientX-x0, dy=Math.max(0,t.clientY-y0);
   if(!arr && Math.abs(dx)<6 && dy<6) return;
   arr=true;
   tst.style.transition='none';
   tst.style.transform='translate('+dx+'px,'+dy+'px)';
   tst.style.opacity=String(Math.max(0,1-(Math.abs(dx)+dy)/160));
  };
  const soltar=e=>{
   tst.removeEventListener('touchmove',mover);
   tst.removeEventListener('touchend',soltar);
   tst.style.transition='';
   const t=(e.changedTouches?e.changedTouches[0]:e)||{clientX:x0,clientY:y0};
   const lejos=Math.abs(t.clientX-x0)>60 || (t.clientY-y0)>50;
   if(lejos){ tst.style.transform=''; tst.style.opacity=''; ocultarToast(); }
   else { tst.style.transform=''; tst.style.opacity=''; }
   arr=false;
  };
  tst.ontouchstart=e=>{
   const t=e.touches[0]; x0=t.clientX; y0=t.clientY; arr=false;
   tst.addEventListener('touchmove',mover,{passive:true});
   tst.addEventListener('touchend',soltar);
  };
 }

 function barraTop(titulo,sub,derecha){
  return '<div class="nx-top"><button class="bk" data-back aria-label="Volver">‹</button>'+
   '<div class="tt"><h2>'+h(titulo)+'</h2>'+(sub?'<span>'+h(sub)+'</span>':'')+'</div>'+
   '<div class="rt">'+(derecha||'')+'</div></div>';
 }
 const ojoTxt=()=>window.__ocultoSaldo?'Mostrar':'Ocultar';
 const OJO='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
 /* iconos de la cabecera en SVG: el emoji no se centra igual en iOS y en Android,
    y encima el auditor lo marcaba como texto sin contraste. */
 const SVG_GRAF='<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>';
 const SVG_CAMP='<svg viewBox="0 0 24 24"><path d="M18 15V10a6 6 0 1 0-12 0v5l-1.6 2.4A.6.6 0 0 0 4.9 19h14.2a.6.6 0 0 0 .5-1.6z"/><path d="M9.5 22a2.7 2.7 0 0 0 5 0"/></svg>';

 /* ---- movimientos del mes, ya ordenados ---- */
 function txMes(y,mn){ return (S.tx||[]).filter(t=>inMonth(t,y,mn))
   .slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id-a.id); }

 function filaTx(t){
  const ing=t.tipo==='Ingreso', c=catById(t.catId);
  const cat=c?c.nombre.split(' (')[0]:(ing?'Ingreso':'Gasto');
  const medio=t.cardId?((S.tarjetas.find(x=>x.id===t.cardId)||{}).nombre||'Tarjeta')
            :((ctaById(t.cuentaId)||{}).nombre||'');
  return '<button class="nx-row" data-go="txd" data-id="'+t.id+'">'+
   '<span class="av">'+(c&&c.icono?c.icono:emo(cat+' '+(t.concepto||'')))+'</span>'+
   '<span class="tx"><b>'+h(t.concepto||'—')+'</b><span>'+h(cat)+' · '+etiquetaFecha(t.fecha)+'</span></span>'+
   '<span class="am"><b class="'+(ing?'nx-in':'nx-out')+'">'+(ing?'+ ':'− ')+fmt2(t.monto)+'</b>'+
   (medio?'<span>'+h(medio)+'</span>':'')+'</span></button>';
 }

 /* ---- vencimientos (mes visible + 2 meses) ---- */
 function vencs(){
  const m=mesSel(), out=[], hy=hoy();
  for(let k=0;k<3;k++){
   let y=m.y, mn=m.mn+k; while(mn>12){ mn-=12; y++; }
   const meter=(nombre,fecha,st,ico,tipo,id,exacto,nota)=>{
    if(!fecha||!(st.cuota>0)) return;
    const f=(fecha instanceof Date)?fecha:new Date(fecha+'T00:00');
    out.push({nombre,fecha:f,dias:Math.round((f-hy)/86400000),cuota:st.cuota,
              falta:st.falta,ico,tipo,id,k,exacto:exacto!==false,nota:nota||''});
   };
   /* Las tarjetas se pagan en la fecha que fija el cronograma del banco, que
      suele caer el MES SIGUIENTE al cierre. Los préstamos sí van a su día. */
   (S.tarjetas||[]).forEach(c=>{
    const fp=fechaPagoCiclo(c,y,mn);
    meter(c.nombre,fp.fecha,cardMonthStatus(c,y,mn),'💳','tarjeta',c.id,fp.exacto,
          fp.fin?'facturación al '+fechaCorta(fp.fin):'');
   });
   (S.loans||[]).forEach(l=>{
    if(!l.dia) return;
    meter(l.nombre,new Date(y,mn-1,Math.min(+l.dia,diasDeMes(y,mn))),
          loanMonthStatus(l,y,mn),'📄','deuda',l.id,true,'');
   });
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
   '<span class="tx"><b>'+h(v.nombre)+'</b><span>'+v.fecha.getDate()+' '+MESab[v.fecha.getMonth()]+
     ' · '+r.t+(v.nota?' · '+v.nota:'')+(v.exacto?'':' (aprox.)')+'</span></span>'+
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
  const huer=recurrentesHuerfanos();
  if(huer.length){
   const sumaH=huer.reduce((x,r)=>x+(+r.monto||0),0);
   av.push({n:'alto',i:'\uD83E\uDDFE',
    t:'Faltan '+huer.length+' cargo'+(huer.length===1?'':'s')+' fijo'+(huer.length===1?'':'s')+' de '+MES[mn-1]+': '+fmt(sumaH),
    s:huer.map(r=>r.concepto).join(', ')+'. La app los dio por registrados pero no est\u00e1n.',
    a:{r:'Revisar y registrar \u2192',k:'huerfanos'}});
  }
  const bc=(S.cfg&&S.cfg.correosCache)||null;
  if(bc && bc.n>0) av.push({n:'medio',i:'📬',
   t:bc.n+' movimiento'+(bc.n===1?'':'s')+' de tus correos del banco por revisar',
   s:'BCP, Yape e Interbank. Ninguno se anota hasta que lo confirmes.',
   a:{r:'Ver la bandeja →',k:'bandeja'}});
  const ps=proximoSueldo();
  if(ps){
   const dd=Math.round((new Date(ps.fecha+'T00:00')-hoy())/86400000);
   if(dd<=4) av.push({n:'bueno',i:'💰',
    t:(dd===0?'Hoy entra tu sueldo: ':dd===1?'Mañana entra tu sueldo: ':'Tu sueldo entra en '+dd+' días: ')+
      fmt2(montoQuincena(ps.q)),
    s:fechaCorta(ps.fecha)+' · '+ps.rot+(ps.motivo?' (el '+(+ps.nominal.split('-')[2])+' cae '+ps.motivo+')':'')+
      '. Se anota solo.',a:{r:'Ver mi sueldo →',k:'p_sueldo'}});
  }
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
    El cronograma oficial del BCP (variante "cierre de facturación 25") que
    Jordan pasó. Cada fila: mes de facturación → [inicio, cierre, fecha de pago].
    OJO con lo que revela: el pago NO es "el 20 de cada mes". Los consumos del
    25-jul al 25-ago se pagan el 22-set, y el día varía entre 20 y 23 porque el
    banco lo corre al siguiente día útil. */
 const CRONO={
  '25:2026':[
   ['2025-12-25','2026-01-23','2026-02-23'],
   ['2026-01-24','2026-02-25','2026-03-23'],
   ['2026-02-26','2026-03-25','2026-04-21'],
   ['2026-03-26','2026-04-24','2026-05-20'],
   ['2026-04-25','2026-05-25','2026-06-22'],
   ['2026-05-26','2026-06-25','2026-07-21'],
   ['2026-06-26','2026-07-24','2026-08-20'],
   ['2026-07-25','2026-08-25','2026-09-22'],
   ['2026-08-26','2026-09-25','2026-10-20'],
   ['2026-09-26','2026-10-23','2026-11-23'],
   ['2026-10-24','2026-11-25','2026-12-22'],
   ['2026-11-26','2026-12-24','2027-01-20']
  ],
  /* Interbank (IBK Visa Access): reconstruido de sus 13 estados de cuenta reales
     del correo. El patrón es limpio: el ciclo es el MES CALENDARIO completo y el
     pago cae el 20 del mes siguiente, corrido al lunes si el 20 es sábado o
     domingo. Los 7 estados de 2026 (20 feb, 20 mar, 20 abr, 20 may, 22 jun,
     20 jul, 20 ago) coinciden con esta tabla uno por uno. */
  '31:2026':[
   ['2026-01-01','2026-01-31','2026-02-20'],
   ['2026-02-01','2026-02-28','2026-03-20'],
   ['2026-03-01','2026-03-31','2026-04-20'],
   ['2026-04-01','2026-04-30','2026-05-20'],
   ['2026-05-01','2026-05-31','2026-06-22'],
   ['2026-06-01','2026-06-30','2026-07-20'],
   ['2026-07-01','2026-07-31','2026-08-20'],
   ['2026-08-01','2026-08-31','2026-09-21'],
   ['2026-09-01','2026-09-30','2026-10-20'],
   ['2026-10-01','2026-10-31','2026-11-20'],
   ['2026-11-01','2026-11-30','2026-12-21'],
   ['2026-12-01','2026-12-31','2027-01-20']
  ]
 };
 /** Cómo se llama cada cierre en la interfaz. */
 const nombreCierre=d=>(+d===31?'Cierre fin de mes':'Cierre día '+d);
 /** ¿Hay cronograma cargado para esta tarjeta en este año? */
 const hayCrono=(c,y)=>!!CRONO[(+c.cierre||0)+':'+y];
 /** Fila exacta del cronograma para una tarjeta y un mes de facturación (cierre), o null. */
 function filaCrono(c,y,mn){
  const t=CRONO[(+c.cierre||0)+':'+y];
  return (t && t[mn-1]) ? {ini:t[mn-1][0], fin:t[mn-1][1], pago:t[mn-1][2], exacto:true} : null;
 }
 /* IMPORTANTE: el motor indexa las cuotas por el mes en que SE PAGAN
    (compra.startM = mes de la primera cuota). Así que para casar una fila del
    cronograma con la cuota de un mes hay que buscar por FECHA DE PAGO, no por
    mes de cierre: la cuota de setiembre corresponde al ciclo 25-jul → 25-ago. */
 function filaPago(c,y,mn){
  const pre=y+'-'+pad2(mn);
  for(const yy of [y,y-1]){
   const t=CRONO[(+c.cierre||0)+':'+yy];
   if(!t) continue;
   const f=t.find(r=>r[2].indexOf(pre)===0);
   if(f) return {ini:f[0], fin:f[1], pago:f[2], exacto:true};
  }
  return null;
 }
 /** Cuándo se paga la cuota de ese mes. Exacto si hay cronograma. */
 function fechaPagoCiclo(c,y,mn){
  const f=filaPago(c,y,mn);
  if(f) return {fecha:f.pago, exacto:true, fin:f.fin};
  const d=Math.min(+c.dia||20, diasDeMes(y,mn));
  return {fecha:y+'-'+pad2(mn)+'-'+pad2(d), exacto:false, fin:''};
 }

 const CIERRE_ANTES=10;
 function ciclo(c,y,mn){
  const f=filaPago(c,y,mn);
  const k=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  let ini,fin,vencS,exacto=false;
  if(f){ ini=f.ini; fin=f.fin; vencS=f.pago; exacto=true; }
  else {
   const venc=Math.min(+c.dia||20, diasDeMes(y,mn));
   const fVenc=new Date(y,mn-1,venc);
   const fCierre=new Date(y,mn-1,venc); fCierre.setDate(fCierre.getDate()-CIERRE_ANTES);
   const fIni=new Date(fCierre); fIni.setMonth(fIni.getMonth()-1); fIni.setDate(fIni.getDate()+1);
   ini=k(fIni); fin=k(fCierre); vencS=k(fVenc);
  }
  const enCiclo=t=>t.fecha>=ini&&t.fecha<=fin;
  const consumos=(S.tx||[]).filter(t=>t.cardId===c.id&&enCiclo(t));
  const abonos=(S.tx||[]).filter(t=>t.payCardId===c.id&&enCiclo(t));
  const st=cardMonthStatus(c,y,mn);
  const antes=(S.tx||[]).filter(t=>t.cardId===c.id&&t.fecha<ini).reduce((a,t)=>a+(+t.monto||0),0)
            -(S.tx||[]).filter(t=>t.payCardId===c.id&&t.fecha<ini).reduce((a,t)=>a+(+t.monto||0),0);
  return {ini,fin,venc:vencS,exacto:exacto,
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
  const tit=pinModo==='abrir'?('Hola de nuevo'+(n?', '+h(n):'')):pinModo==='nuevo'?'Crea tu PIN':'Repite el PIN';
  const sub=pinModo==='abrir'
   ? 'Ingresa tu PIN para ver tu resumen de '+MES[mesSel().mn-1]+'.'
   : 'Sólo se guarda un hash, nunca el PIN, y queda en este dispositivo.';
  return '<div class="nx-login" id="nxLogin">'+
   '<div class="mk">'+h(initials(S.cfg.titular))+'</div>'+
   '<h1>'+tit+'</h1><p>'+h(sub)+'</p>'+
   '<div class="nx-dots">'+[0,1,2,3].map(()=>'<i></i>').join('')+'</div>'+
   '<div class="msg" id="nxPinMsg"></div>'+
   '<div class="nx-keys">'+[1,2,3,4,5,6,7,8,9].map(d=>'<button data-d="'+d+'">'+d+'</button>').join('')+
    (pinModo==='abrir'?'<span></span>':'<button class="plain" id="nxPinCan">Cancelar</button>')+
    '<button data-d="0">0</button><button class="plain" id="nxPinDel">⌫</button></div>'+
   (pinModo==='abrir'?'<button class="out" id="nxPinOut">¿Olvidaste tu PIN?</button>':'')+
   '</div>';
 },wire(){
  const box=$('nxLogin');
  const pinta_=()=>box.querySelectorAll('.nx-dots i').forEach((d,i)=>d.classList.toggle('f',i<pinBuf.length));
  const msg=t=>{ $('nxPinMsg').textContent=t||''; };
  box.querySelectorAll('button[data-d]').forEach(b=>alToque(b,async()=>{
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
  }));
  $('nxPinDel').onclick=()=>{ pinBuf=pinBuf.slice(0,-1); pinta_(); msg(''); };
  const can=$('nxPinCan'); if(can) can.onclick=()=>{ pinBuf=''; pinModo='abrir'; go('perfil'); };
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
  const m2=mesSel();
  const prods=(S.tarjetas||[]).map((c,i)=>{
   const li=+c.linea||0, us=consumidoCard(c), st=cardMonthStatus(c,m2.y,m2.mn);
   return '<button class="nx-card credito'+(i%2?' alt':'')+'" data-go="tarjeta" data-id="'+c.id+'">'+
    '<span class="cn"><span>'+h(c.nombre)+'</span><span class="chip"></span></span>'+
    '<span><span class="cl">Línea disponible</span><span class="cv">'+fmt(Math.max(0,li-us))+'</span></span>'+
    '<span class="cf"><span>Usado '+fmt(us)+'</span>'+
      '<span>'+(st.falta>0.5?'Vence día '+(c.dia||20):'Al día')+'</span></span></button>';
  });
  const vs=vencs().filter(v=>v.falta>0.5).slice(0,3);
  const ms=(S.metas||[]).slice(0,4);
  const ult=txMes(y,mn).slice(0,4);
  return '<div class="nx-hero">'+
   '<div class="top"><div><div class="hi">Hola, '+h(n||'Jordan')+' 👋</div>'+
    '<div class="dt">'+DIAS[d.getDay()][0].toUpperCase()+DIAS[d.getDay()].slice(1)+' '+d.getDate()+' de '+MES[d.getMonth()]+'</div></div>'+
    '<div class="acts"><button class="nx-ico" data-go="stats" aria-label="Estadísticas">'+SVG_GRAF+'</button>'+
    (()=>{ const av=avisos(), n=av.length;
      return '<button class="nx-ico" data-go="notifs" aria-label="Avisos'+(n?', '+n+' sin ver':'')+'">'+
       SVG_CAMP+(n?'<span class="dot'+(av.some(a=>a.n==='alto')?' alto':'')+'">'+
       (n>9?'9+':n)+'</span>':'')+'</button>'; })()+'</div></div>'+
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

   /* Un aviso a la vez: cuatro tarjetas compitiendo empujaban todo hacia abajo.
      El resto vive en la campana, que ya muestra el punto naranja. */
   (()=>{ const av=avisos(); if(!av.length) return '';
     const a=av[0], mas=av.length-1;
     return '<div class="nx-alert solo '+a.n+'"><span class="i">'+a.i+'</span>'+
      '<span><b>'+a.t+'</b><span>'+a.s+'</span>'+
      '<span class="ax">'+(a.a?'<a data-go="'+a.a.k+'">'+a.a.r+'</a>':'')+
      (mas>0?'<a data-go="notifs" class="mas">+'+mas+' aviso'+(mas===1?'':'s')+' \u203a</a>':'')+
      '</span></span></div>';
   })()+

   '<div class="nx-st"><h3>Mis tarjetas</h3><a data-go="tarjetas">Ver todas</a></div>'+
   '<div class="nx-prods">'+(prods.length?prods.join('')
     :'<div class="nx-empty">Sin tarjetas registradas.</div>')+'</div>'+

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
   '<div class="rt"><button data-go="stats" aria-label="Estadísticas">'+SVG_GRAF+'</button></div></div>'+
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
  /* antes salían dos preguntas: el confirm del navegador y el aviso propio que
     ya trae el borrado envuelto. Ahora pregunta una vez, con las cifras. */
  b.onclick=()=>{
   const t=(S.tx||[]).find(x=>x.id===p.id); if(!t) return;
   const antes=JSON.stringify(S);
   const r=simular(()=>{
    if(t.cardId&&t.compraId){ const cc=S.tarjetas.find(x=>x.id===t.cardId);
     if(cc) cc.compras=(cc.compras||[]).filter(q=>q.id!==t.compraId); }
    S.tx=S.tx.filter(x=>x.id!==p.id); });
   vib(8);
   confirmar({titulo:'¿Borrar el movimiento?',boton:'Sí, borrar',
     detalle:'<div><b>'+h(t.concepto||'Movimiento')+'</b> de '+fmt2(t.monto)+' del '+
      String(t.fecha).split('-').reverse().join('/')+'. Se recalcula todo.</div>'+
      lineaCambio('Deuda total',r.deudaA,r.deudaB)+
      lineaCambio('Disponible del mes',r.cajaA,r.cajaB)},()=>{
    vib(18);
    crudo('delMov',p.id);                              // ← motor
    toast('Movimiento borrado',h(t.concepto||''),
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Borrado deshecho','',null); });
    volver();
   });
  };
 }};

 /* --------------------- registrar gasto / ingreso --------------------- */
 let reg={tipo:'Gasto',monto:'',catId:null,cuentaVal:'',desc:''};
 /* Antes esta rejilla era una lista fija de 10 casillas con expresiones
    regulares, así que las categorías que él creara no aparecían nunca y
    sobraban casillas vacías ("Otras", "Educ."). Ahora son SUS primeras 9
    categorías, en su orden, y la décima abre la lista completa. */
 const CATS_EN_REJILLA=9;
 function catsGrid(){
  const cats=(S.categorias||[]).slice();
  let vis=cats.slice(0,CATS_EN_REJILLA);
  if(reg.catId && !vis.some(c=>c.id===reg.catId)){
   const c=cats.find(x=>x.id===reg.catId);         // la elegida siempre se ve
   if(c) vis=vis.slice(0,CATS_EN_REJILLA-1).concat([c]);
  }
  return vis.map(c=>({rot:rotCat(c),cat:c}));
 }
 P.reg={nav:false,html(){
  const grid=catsGrid();
  const cuentas=(S.cuentas||[]).map(a=>['a:'+a.id,a.nombre])
    .concat((S.tarjetas||[]).map(c=>['card:'+c.id,c.nombre+' (crédito)']));
  if(!reg.cuentaVal&&cuentas.length) reg.cuentaVal=cuentas[0][0];
  const cuentaRot=(cuentas.find(x=>x[0]===reg.cuentaVal)||['',''])[1];
  const val=reg.monto?parseFloat(reg.monto).toLocaleString('es-PE',{minimumFractionDigits:reg.monto.indexOf('.')>=0?2:2,maximumFractionDigits:2}):'0.00';
  return '<div class="nx-reg">'+
   '<div class="rt"><button class="x" data-back aria-label="Cerrar">'+CERRAR_X+'</button>'+
    '<div class="nx-tog"><button data-t="Gasto" class="'+(reg.tipo==='Gasto'?'on':'')+'">Gasto</button>'+
    '<button data-t="Ingreso" class="'+(reg.tipo==='Ingreso'?'on':'')+'">Ingreso</button></div>'+
    '<span></span></div>'+
   '<div class="nx-amt"><div class="k">Monto del '+(reg.tipo==='Gasto'?'gasto':'ingreso')+'</div>'+
    '<div class="v nx-num"><small>S/</small>'+val+'</div></div>'+
   '<div class="nx-mid">'+
   (reg.tipo==='Gasto'
    ? '<div style="font-size:11.5px;font-weight:600;color:var(--nx-mut);margin:4px 0 0">Categoría</div>'+
      '<div class="nx-cats">'+grid.map(g=>
        '<button class="nx-cat'+(reg.catId===g.cat.id?' on':'')+'" data-c="'+g.cat.id+'">'+
        '<span class="e">'+emoCat(g.cat)+'</span><span>'+h(g.rot)+'</span></button>').join('')+
       '<button class="nx-cat mas" type="button"><span class="e">🗂️</span><span>Todas</span></button></div>'
    : '<div style="height:8px"></div>')+
   '<button class="nx-fld" id="nxCta"><span class="k">Cuenta</span><span class="v">'+h(cuentaRot)+' ›</span></button>'+
   '<div class="nx-fld"><span class="k">Descripción</span><input id="nxDesc" placeholder="Sin descripción" value="'+h(reg.desc)+'"></div>'+
   '</div>'+
   '<div class="nx-pad">'+[1,2,3,4,5,6,7,8,9].map(d=>'<button data-n="'+d+'">'+d+'</button>').join('')+
    '<button data-n=".">.</button><button data-n="0">0</button><button data-n="del">⌫</button></div>'+
   '<button class="nx-go" id="nxSave"'+(parseFloat(reg.monto)>0?'':' disabled')+'>Guardar '+(reg.tipo==='Gasto'?'gasto':'ingreso')+'</button>'+
   '</div>';
 },wire(){
  document.querySelectorAll('#nx-body .nx-tog button').forEach(b=>b.onclick=()=>{
   reg.tipo=b.dataset.t; vib(8); pinta(1); });
  document.querySelectorAll('#nx-body .nx-cat[data-c]').forEach(b=>b.onclick=()=>{
   reg.catId=+b.dataset.c; vib(8); pinta(1); });
  document.querySelectorAll('#nx-body .nx-pad button').forEach(b=>alToque(b,()=>{
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
  }));
  const de=$('nxDesc'); if(de) de.oninput=()=>{ reg.desc=de.value; };
  /* si en una pantalla chica la zona de campos no cabe, se marca como scrolleable
     para que el último campo se desvanezca en vez de aparecer cortado */
  const md=document.querySelector('#nx-body .nx-mid');
  if(md) requestAnimationFrame(()=>md.classList.toggle('scrolleable',md.scrollHeight>md.clientHeight+1));
  const ct=$('nxCta'); if(ct) ct.onclick=()=>{
   vib(8);
   const ops=(S.cuentas||[]).map(a=>({v:'a:'+a.id,n:a.nombre,s:'saldo '+fmt(saldoCuenta(a.id)),
      e:/yape|plin/i.test(a.nombre)?'📲':/efectivo/i.test(a.nombre)?'💵':/d[eé]bito/i.test(a.nombre)?'💳':'🏦'}))
    .concat((S.tarjetas||[]).map(c=>({v:'card:'+c.id,n:c.nombre+' (crédito)',
      s:'disponible '+fmt(Math.max(0,(+c.linea||0)-consumidoCard(c))),e:'💳'})));
   hoja('¿Con qué pagaste?',ops,reg.cuentaVal,v=>{ reg.cuentaVal=v; pinta(0); });
  };
  document.querySelectorAll('#nx-body .nx-cat.mas').forEach(cg=>cg.onclick=()=>{
   vib(8);
   const ops=(S.categorias||[])
     .map(c=>({v:String(c.id),n:c.nombre.split(' (')[0],s:c.bucket,e:emoCat(c)}))
     .concat([{v:'__nueva',n:'Crear una categoría',s:'nombre, icono y tipo',e:'➕'}]);
   hoja('Elige la categoría',ops,String(reg.catId||''),v=>{
    if(v==='__nueva'){ abrirCat(0,true); return; }
    reg.catId=+v; pinta(0);
   });
  });
  $('nxSave').onclick=()=>{
   const mo=parseFloat(reg.monto)||0; if(!(mo>0)) return;
   /* se llenan los campos del formulario del motor y se llama a SU addMov():
      así el gasto a crédito, las cuotas y el recálculo salen igual que siempre */
   $('mFecha').value=keyOf(new Date());
   $('mTipo').value=reg.tipo;
   syncMovForm();
   if(reg.tipo==='Gasto'){
    const cid=reg.catId || ((catsGrid()[0]||{cat:{}}).cat||{}).id;
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

 /* ------------------------- detalle de una cuenta ------------------------- */
 P.cuenta={html(p){
  const a=(S.cuentas||[]).find(x=>x.id===p.id);
  if(!a) return barraTop('Cuenta')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  const sal=saldoCuenta(a.id);
  const movs=(S.tx||[]).filter(t=>t.cuentaId===a.id)
    .slice().sort((x,y)=>y.fecha.localeCompare(x.fecha)).slice(0,12);
  const ing=movs.filter(t=>t.tipo==='Ingreso').reduce((s,t)=>s+(+t.monto||0),0);
  const gas=movs.filter(t=>t.tipo!=='Ingreso').reduce((s,t)=>s+(+t.monto||0),0);
  return barraTop(a.nombre,'Cuenta o medio de pago')+
   '<div class="nx-scroll">'+
   '<div class="nx-cyc"><div class="h"><span>Saldo registrado</span>'+
     '<span class="tag'+(sal>=0?' ok':'')+'">'+(sal>=0?'En positivo':'En negativo')+'</span></div>'+
    '<div class="big">'+fmt2(sal)+'</div>'+
    '<div class="two"><div><span>Entradas</span><b>'+fmt(ing)+'</b></div>'+
     '<div><span>Salidas</span><b>'+fmt(gas)+'</b></div></div>'+
    '<div class="pie">Sale de lo que anotas en la app, no del banco</div></div>'+
   '<div class="nx-st"><h3>Movimientos de esta cuenta</h3></div>'+
   '<div class="nx-box">'+(movs.length?movs.map(filaTx).join(''):'<div class="nx-empty">Sin movimientos.</div>')+'</div>'+
   (sal<0?'<div class="nx-tip nxw"><span>ℹ️</span><span>Está en negativo porque anotaste más salidas que '+
     'entradas en esta cuenta. Si el banco te dice otra cosa, falta registrar un ingreso.</span></div>':'')+
   '</div>';
 }};

 /* ---------------------- todas las cuentas (Finanzas) ---------------------- */
 P.cuentas={html(){
  const cs=(S.cuentas||[]);
  return barraTop('Cuentas',cs.length+' medio'+(cs.length===1?'':'s')+' de pago')+
   '<div class="nx-scroll"><div class="nx-box">'+(cs.length?cs.map(a=>{
    const sal=saldoCuenta(a.id);
    return '<button class="nx-row" data-go="cuenta" data-id="'+a.id+'"><span class="av">'+
     (/yape|plin/i.test(a.nombre)?'📲':/efectivo/i.test(a.nombre)?'💵':/d[eé]bito/i.test(a.nombre)?'💳':'🏦')+'</span>'+
     '<span class="tx"><b>'+h(a.nombre)+'</b><span>saldo registrado</span></span>'+
     '<span class="am"><b class="'+(sal<0?'':'nx-in')+'" style="'+(sal<0?'color:var(--nx-neg)':'')+'">'+fmt(sal)+'</b></span>'+
     '<span class="ar">›</span></button>';
   }).join(''):'<div class="nx-empty">Sin cuentas.</div>')+'</div></div>';
 }};


 /* ---- cargos fijos marcados como generados que no están en los movimientos ----
    Pasa si la nube pisa los movimientos con una versión anterior después de que
    el motor ya marcó el mes como generado (lastGen). El resultado es un gasto
    fijo invisible, así que hay que detectarlo, no taparlo. */
 function recurrentesHuerfanos(){
  const m=mesSel(), mk=m.y+'-'+pad2(m.mn);
  return (S.recurrentes||[]).filter(r=>{
   if(r.lastGen!==mk) return false;
   if((r.omitidos||[]).indexOf(mk)>=0) return false;      /* él dijo que los deje fuera */
   return !(S.tx||[]).some(t=>String(t.fecha).slice(0,7)===mk &&
     (t.rec===r.id || (t.concepto===r.concepto && Math.abs((+t.monto||0)-(+r.monto||0))<0.01)));
  });
 }

 function lineaResumen(suma){
  const m=mesSel();
  return '<div class="nx-box nxp">'+
   '<div class="nx-kv"><span>Suma que falta</span><b>'+fmt(suma)+'</b></div>'+
   '<div class="nx-kv"><span>Disponible ahora</span><b>'+fmt(saldoHasta(m.y,m.mn))+'</b></div>'+
   '<div class="nx-kv tot"><span>Disponible si los registras</span><b>'+fmt(saldoHasta(m.y,m.mn)-suma)+'</b></div>'+
   '</div>';
 }

 P.huerfanos={html(){
  const m=mesSel();
  const hu=recurrentesHuerfanos();
  const suma=hu.reduce((a,r)=>a+(+r.monto||0),0);
  return barraTop('Cargos fijos faltantes',MES[m.mn-1]+' '+m.y)+
   '<div class="nx-scroll">'+
   (hu.length
    ? '<div class="nx-tip nxw"><span>\uD83E\uDDFE</span><span>La app tiene estos cargos marcados como '+
       '<b>ya generados</b> en '+MES[m.mn-1]+', pero no existen en tus movimientos. Suele pasar '+
       'cuando la nube sobrescribe los movimientos con una copia anterior. Mientras falten, tu '+
       'gasto del mes y tu disponible salen <b>mejores de lo que son</b>.</span></div>'+
      '<div class="nx-box">'+hu.map(r=>{
        const c=catById(r.catId);
        return '<div class="nx-row"><span class="av">'+(c&&c.icono?c.icono:emo((c?c.nombre:'')+' '+r.concepto))+'</span>'+
         '<span class="tx"><b>'+h(r.concepto)+'</b><span>'+h(c?c.nombre.split(' (')[0]:'-')+
         ' &middot; día '+r.dia+'</span></span><span class="am"><b>'+fmt(r.monto)+'</b></span></div>';
       }).join('')+'</div>'+
      lineaResumen(suma)+
      '<button class="nx-go" id="nxHuOk">Registrarlos ('+fmt(suma)+')</button>'+
      '<button class="nx-go sec" id="nxHuNo" style="margin-top:9px">No, ya los pagué por otro lado</button>'
    : '<div class="nx-empty">Nada pendiente: todos los cargos fijos de '+MES[m.mn-1]+' están registrados.</div>')+
   '</div>';
 },wire(){
  const ok=$('nxHuOk');
  if(ok) ok.onclick=()=>{
   const m=mesSel(), mk=m.y+'-'+pad2(m.mn), hu=recurrentesHuerfanos();
   const suma=hu.reduce((a,r)=>a+(+r.monto||0),0);
   confirmar({titulo:'¿Registrar '+hu.length+' cargo'+(hu.length===1?'':'s')+' fijo'+(hu.length===1?'':'s')+'?',
     boton:'Sí, registrarlos',
     detalle:'Se anotan '+hu.map(r=>'<b>'+h(r.concepto)+'</b> '+fmt(r.monto)).join(', ')+
      ' en '+MES[m.mn-1]+', cada uno en su día.'+
      lineaCambio('Disponible del mes',saldoHasta(m.y,m.mn),saldoHasta(m.y,m.mn)-suma)},
    ()=>{
     /* se reusa el generador del motor: se le limpia el lastGen y él crea los
        movimientos con su propia lógica; los que aún no llegan a su día se
        anotan aparte, también con la forma que usa el motor */
     hu.forEach(r=>{ const rr=(S.recurrentes||[]).find(x=>x.id===r.id); if(rr) rr.lastGen=''; });
     generateRecurrentes();          /* crea los que ya pasaron su día */
     /* y los que aún no llegan a su día (p. ej. día 31) se anotan igual, con
        la misma forma que usa el motor. Se recorre la lista ORIGINAL: después
        de limpiar lastGen, recurrentesHuerfanos() ya no los reconocería. */
     const yaHay=r=>(S.tx||[]).some(t=>String(t.fecha).slice(0,7)===mk &&
        (t.rec===r.id || (t.concepto===r.concepto && Math.abs((+t.monto||0)-(+r.monto||0))<0.01)));
     hu.forEach(r=>{
      const rr=(S.recurrentes||[]).find(x=>x.id===r.id);
      if(!yaHay(r)){
       const dia=Math.min(+r.dia||1, diasDeMes(m.y,m.mn));
       S.tx.push({id:newId(),fecha:mk+'-'+pad2(dia),tipo:'Gasto',catId:r.catId,
                  cuentaId:r.cuentaId||null,concepto:r.concepto,monto:+r.monto||0,rec:r.id});
      }
      if(rr) rr.lastGen=mk;
     });
     S.tx.sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));
     save();
     toast('Cargos fijos registrados', hu.length+' movimientos por '+fmt(suma), null);
     pila=['home']; pinta(1);
    });
  };
  const no=$('nxHuNo');
  if(no) no.onclick=()=>{
   confirmar({titulo:'¿Dejarlos fuera del mes?',boton:'Sí, dejarlos fuera',
     detalle:'No se registran. El aviso deja de aparecer, pero tu gasto de este mes '+
      'seguirá sin incluirlos.'},
    ()=>{
     const m2=mesSel(), mk2=m2.y+'-'+pad2(m2.mn);
     recurrentesHuerfanos().forEach(r=>{
      const rr=(S.recurrentes||[]).find(x=>x.id===r.id);
      if(rr){ rr.omitidos=rr.omitidos||[]; if(rr.omitidos.indexOf(mk2)<0) rr.omitidos.push(mk2); }
     });
     save(); pila=['home']; pinta(1);
    });
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
    '<button class="nx-row" id="nxCierre"><span class="av">📅</span>'+
     '<span class="tx"><b>Cierre de facturación</b><span>'+
     (+c.cierre ? nombreCierre(+c.cierre).toLowerCase()+' · fechas exactas'
                : 'sin configurar · las fechas salen estimadas')+
     '</span></span><span class="ar">›</span></button>'+
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
  const cb=$('nxCierre'); if(cb) cb.onclick=()=>{
   vib(8);
   const c=(S.tarjetas||[]).find(x=>x.id===p.id); if(!c) return;
   const y=mesSel().y;
   const ops=[25,31,5,10,15,20,30].map(d=>({v:String(d),n:nombreCierre(d),e:'📅',
     s:CRONO[d+':'+y] ? 'cronograma cargado · fechas exactas'
                      : 'sin cronograma · fechas estimadas'}))
    .concat([{v:'0',n:'Sin configurar',e:'❔',s:'volver a las fechas estimadas'}]);
   hoja('¿Cuál es el cierre de facturación?',ops,String(+c.cierre||0),v=>{
    const cc=(S.tarjetas||[]).find(x=>x.id===p.id); if(!cc) return;
    const antes=JSON.stringify(S);
    cc.cierre=+v||0; save();
    toast(+v ? nombreCierre(+v)+' guardado' : 'Cierre sin configurar',
      CRONO[(+v)+':'+y] ? 'Las fechas de pago ahora salen del cronograma del banco'
                        : 'Las fechas vuelven a ser estimadas',
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
    pinta(0);
   });
  };
 }};


 /* ============== cuentas y tarjetas, ya sin las tablas viejas ==============
    Los formularios que se tomaban prestados de la app antigua traían su CSS y
    eran tablas incómodas en el celular. Estas pantallas escriben con las mismas
    funciones del motor (editCard, delCard, delCuenta) y con save(). */
 const icoCuenta=n=>/yape|plin/i.test(n)?'📲':/efectivo|caja/i.test(n)?'💵'
   :/d[eé]bito/i.test(n)?'💳':/ahorro|wardadito/i.test(n)?'🪙':'🏦';

 function usoCuenta(id){
  return {tx:(S.tx||[]).filter(t=>t.cuentaId===id).length,
          rec:(S.recurrentes||[]).filter(r=>r.cuentaId===id).length,
          fav:(S.favoritos||[]).filter(f=>f.cuentaId===id).length};
 }

 P.p_cuentas={html(){
  const m=mesSel();
  const cts=(S.cuentas||[]), trj=(S.tarjetas||[]);
  return barraTop('Cuentas y tarjetas','Medios de pago y líneas')+
   '<div class="nx-scroll">'+
   '<div class="nx-tip"><span>🧮</span><span>El saldo de cada cuenta sale de los movimientos '+
    'que le asignaste, no de tu banco. Tócala para cambiarle el nombre.</span></div>'+

   '<div class="nx-st"><h3>Cuentas</h3><span style="font-size:12px;color:var(--nx-mut)">'+
     cts.length+'</span></div>'+
   '<div class="nx-box">'+(cts.length?cts.map(a=>{
     const s=saldoCuenta(a.id);
     return '<button class="nx-row" data-cta="'+a.id+'"><span class="av">'+icoCuenta(a.nombre)+'</span>'+
      '<span class="tx"><b>'+h(a.nombre)+'</b><span>'+
       (s<0?'en negativo':'registrado en la app')+'</span></span>'+
      '<span class="am"><b'+(s<0?' style="color:var(--nx-neg)"':'')+'>'+fmt(s)+'</b></span>'+
      '</button>';
   }).join(''):'<div class="nx-empty">Sin cuentas.</div>')+'</div>'+
   '<button class="nx-go sec" id="nxCtaNue" style="margin-top:10px">Agregar una cuenta</button>'+

   '<div class="nx-st" style="margin-top:22px"><h3>Tarjetas de crédito</h3>'+
     '<span style="font-size:12px;color:var(--nx-mut)">'+trj.length+'</span></div>'+
   '<div class="nx-box">'+(trj.length?trj.map(c=>{
     const us=consumidoCard(c), li=+c.linea||0;
     const fp=fechaPagoCiclo(c,m.y,m.mn);
     return '<button class="nx-row" data-trj="'+c.id+'"><span class="av">💳</span>'+
      '<span class="tx"><b>'+h(c.nombre)+'</b><span>usa '+fmt(us)+' de '+fmt(li)+
       ' · paga el '+fechaCorta(fp.fecha)+(fp.exacto?'':' (aprox.)')+'</span></span>'+
      '<span class="ar">›</span></button>';
   }).join(''):'<div class="nx-empty">Sin tarjetas.</div>')+'</div>'+
   '<button class="nx-go sec" id="nxTrjNue" style="margin-top:10px">Agregar una tarjeta</button>'+
   '</div>';
 },wire(){
  document.querySelectorAll('#nx-body [data-cta]').forEach(b=>b.onclick=()=>{
   ced2={id:+b.dataset.cta,nombre:''}; go('cuented',{id:+b.dataset.cta}); });
  document.querySelectorAll('#nx-body [data-trj]').forEach(b=>b.onclick=()=>{
   trjEd=null; go('tarjed',{id:+b.dataset.trj}); });
  $('nxCtaNue').onclick=()=>{ ced2={id:0,nombre:''}; go('cuented',{id:0}); };
  $('nxTrjNue').onclick=()=>{
   vib(8);
   confirmar({titulo:'¿Agregar una tarjeta?',boton:'Sí, agregar',
     detalle:'<div>Se crea una tarjeta vacía y la abres para ponerle nombre, línea y '+
      'fecha de pago. No afecta ninguna cifra hasta que le cargues compras.</div>'},()=>{
    const antes=(S.tarjetas||[]).map(x=>x.id);
    addCard();                                        // ← motor
    const nueva=(S.tarjetas||[]).find(x=>antes.indexOf(x.id)<0);
    if(nueva){ trjEd=null; go('tarjed',{id:nueva.id}); }
   });
  };
 }};

 /* ---------------------------- editor de cuenta ---------------------------- */
 let ced2={id:0,nombre:''};
 P.cuented={html(p){
  const a=p.id?(S.cuentas||[]).find(x=>x.id===p.id):null;
  if(p.id && !a) return barraTop('Cuenta')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  if(ced2.id!==(p.id||0)) ced2={id:p.id||0,nombre:a?a.nombre:''};
  const u=a?usoCuenta(a.id):{tx:0,rec:0,fav:0};
  const total=u.tx+u.rec+u.fav;
  return barraTop(p.id?'Editar cuenta':'Nueva cuenta',a?h(a.nombre):'Nombre y nada más')+
   '<div class="nx-scroll">'+
   '<div class="nx-fld"><span class="k">Nombre</span>'+
    '<input id="nxCtN" placeholder="Ej. Cuenta sueldo" value="'+h(ced2.nombre)+'" maxlength="34"></div>'+
   (a?'<div class="nx-box nxp" style="margin-top:6px">'+
      '<div class="nx-kv"><span>Saldo según tus movimientos</span><b>'+fmt2(saldoCuenta(a.id))+'</b></div>'+
      '<div class="nx-kv"><span>Movimientos asignados</span><b>'+u.tx+'</b></div>'+
     '</div>':'')+
   '<button class="nx-go" id="nxCtG" style="margin-top:12px">'+(p.id?'Guardar':'Crear cuenta')+'</button>'+
   (p.id?'<button class="nx-go sec" id="nxCtD" style="margin-top:9px;color:var(--nx-neg)">Borrar cuenta</button>'+
     (total?'<div style="font-size:11.5px;color:var(--nx-mut);margin-top:8px;text-align:center">'+
       'La usan '+listaEs([u.tx?u.tx+' movimiento'+(u.tx===1?'':'s'):'',
         u.rec?u.rec+' cargo'+(u.rec===1?' fijo':'s fijos'):'',
         u.fav?u.fav+' favorito'+(u.fav===1?'':'s'):''])+
       '. Si la borras, te pregunto a dónde pasarlos.</div>':'')
    :'')+
   '</div>';
 },wire(p){
  const i=$('nxCtN'); if(i) i.oninput=()=>{ ced2.nombre=i.value; };
  $('nxCtG').onclick=()=>{
   const nom=(ced2.nombre||'').trim();
   if(!nom){ toast('Ponle un nombre','La cuenta necesita un nombre',null); return; }
   const antes=JSON.stringify(S);
   if(p.id){ const a=(S.cuentas||[]).find(x=>x.id===p.id); if(!a) return; a.nombre=nom; }
   else { S.cuentas=S.cuentas||[]; S.cuentas.push({id:newId(),nombre:nom}); }
   vib(16); save();
   toast(p.id?'Cuenta guardada':'Cuenta creada',nom,
     ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   volver();
  };
  const d=$('nxCtD');
  if(d) d.onclick=()=>{
   const a=(S.cuentas||[]).find(x=>x.id===p.id); if(!a) return;
   const u=usoCuenta(a.id), n=u.tx+u.rec+u.fav;
   const otras=(S.cuentas||[]).filter(x=>x.id!==a.id);
   if(!otras.length){ toast('No se puede borrar','Es la única cuenta que te queda',null); return; }
   const hacer=destino=>{
    const antes=JSON.stringify(S);
    confirmar({titulo:'¿Borrar la cuenta?',boton:'Sí, borrar',
      detalle:(n?'<div>Se pasan <b>'+n+'</b> registro'+(n===1?'':'s')+' a <b>'+h(destino.nombre)+
        '</b> y luego se borra <b>'+h(a.nombre)+'</b>. Tus totales del mes no cambian.</div>'
        :'<div>No hay nada asignado a <b>'+h(a.nombre)+'</b>, así que no se pierde nada.</div>')},()=>{
     (S.tx||[]).forEach(t=>{ if(t.cuentaId===a.id) t.cuentaId=destino.id; });
     (S.recurrentes||[]).forEach(r=>{ if(r.cuentaId===a.id) r.cuentaId=destino.id; });
     (S.favoritos||[]).forEach(f=>{ if(f.cuentaId===a.id) f.cuentaId=destino.id; });
     vib(18);
     crudo('delCuenta',a.id);            // ← motor
     toast('Cuenta borrada',n?n+' registro'+(n===1?'':'s')+' quedaron en '+destino.nombre:'',
       ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Borrado deshecho','',null); });
     volver();
    });
   };
   vib(8);
   if(n) hoja(n===1?'¿A qué cuenta paso ese registro?':'¿A qué cuenta paso esos '+n+' registros?',
     otras.map(x=>({v:String(x.id),n:x.nombre,e:icoCuenta(x.nombre),s:'saldo '+fmt(saldoCuenta(x.id))})),'',
     v=>hacer(otras.find(x=>x.id===+v)));
   else hacer(otras[0]);
  };
 }};

 /* --------------------------- editor de tarjeta --------------------------- */
 let trjEd=null;
 const DIAS_PAGO=[1,5,10,15,20,25,28,30];
 P.tarjed={html(p){
  const c=(S.tarjetas||[]).find(x=>x.id===p.id);
  if(!c) return barraTop('Tarjeta')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  if(!trjEd || trjEd.id!==c.id) trjEd={id:c.id,nombre:c.nombre,linea:String(+c.linea||''),
    dia:+c.dia||20, cierre:+c.cierre||0, pagoMin:String(+c.pagoMin||''), last:c.last||''};
  const m=mesSel(), fp=fechaPagoCiclo({cierre:trjEd.cierre,dia:trjEd.dia},m.y,m.mn);
  const us=consumidoCard(c), compras=(c.compras||[]).length;
  return barraTop('Editar tarjeta',h(c.nombre))+
   '<div class="nx-scroll">'+
   '<div class="nx-fld"><span class="k">Nombre</span>'+
    '<input id="nxTN" value="'+h(trjEd.nombre)+'" maxlength="30"></div>'+
   '<div class="nx-fld"><span class="k">Línea de crédito</span>'+
    '<input id="nxTL" inputmode="decimal" placeholder="0" value="'+h(trjEd.linea)+'"></div>'+
   '<button class="nx-fld" id="nxTD"><span class="k">Día de pago</span>'+
    '<span class="v">día '+trjEd.dia+' ›</span></button>'+
   '<button class="nx-fld" id="nxTC"><span class="k">Cierre de facturación</span>'+
    '<span class="v">'+(trjEd.cierre?nombreCierre(trjEd.cierre).toLowerCase():'sin configurar')+' ›</span></button>'+
   '<div class="nx-fld"><span class="k">Pago mínimo</span>'+
    '<input id="nxTM" inputmode="decimal" placeholder="sin dato" value="'+h(trjEd.pagoMin)+'"></div>'+
   '<div class="nx-fld"><span class="k">Últimos 4 dígitos</span>'+
    '<input id="nxT4" inputmode="numeric" maxlength="4" placeholder="opcional" value="'+h(trjEd.last)+'"></div>'+
   '<div class="nx-tip"><span>📅</span><span>Con estos datos, la cuota de '+MES[m.mn-1]+
    ' se paga el <b>'+fechaCorta(fp.fecha)+'</b>'+(fp.exacto?', tomado del cronograma del banco'
      :'. Configura el cierre y la fecha deja de ser aproximada')+'.</span></div>'+
   '<div class="nx-box nxp"><div class="nx-kv"><span>Usado ahora</span><b>'+fmt2(us)+'</b></div>'+
    '<div class="nx-kv"><span>Compras en cuotas</span><b>'+compras+'</b></div></div>'+
   '<button class="nx-go" id="nxTG" style="margin-top:12px">Guardar</button>'+
   '<button class="nx-go sec" id="nxTD2" style="margin-top:9px;color:var(--nx-neg)">Borrar tarjeta</button>'+
   '<div style="font-size:11.5px;color:var(--nx-mut);margin-top:8px;text-align:center">'+
    'Los últimos 4 dígitos son solo para reconocerla; se quedan en este teléfono.</div>'+
   '</div>';
 },wire(p){
  const n=$('nxTN'); if(n) n.oninput=()=>{ trjEd.nombre=n.value; };
  const l=$('nxTL'); if(l) l.oninput=()=>{ l.value=l.value.replace(/[^0-9.]/g,''); trjEd.linea=l.value; };
  const mi=$('nxTM'); if(mi) mi.oninput=()=>{ mi.value=mi.value.replace(/[^0-9.]/g,''); trjEd.pagoMin=mi.value; };
  const c4=$('nxT4'); if(c4) c4.oninput=()=>{ c4.value=c4.value.replace(/[^0-9]/g,''); trjEd.last=c4.value; };
  $('nxTD').onclick=()=>{ vib(8);
   hoja('¿Qué día se paga?',DIAS_PAGO.map(d=>({v:String(d),n:'Día '+d,e:'📆'})),String(trjEd.dia),
     v=>{ trjEd.dia=+v; pinta(0); }); };
  $('nxTC').onclick=()=>{ vib(8);
   const y=mesSel().y;
   const ops=[25,31,5,10,15,20,30].map(d=>({v:String(d),n:nombreCierre(d),e:'📅',
     s:CRONO[d+':'+y]?'cronograma cargado · fechas exactas':'sin cronograma · fechas estimadas'}))
    .concat([{v:'0',n:'Sin configurar',e:'❔',s:'volver a las fechas estimadas'}]);
   hoja('¿Cuál es el cierre de facturación?',ops,String(trjEd.cierre),
     v=>{ trjEd.cierre=+v||0; pinta(0); }); };
  $('nxTG').onclick=()=>{
   const c=(S.tarjetas||[]).find(x=>x.id===p.id); if(!c) return;
   const nom=(trjEd.nombre||'').trim();
   if(!nom){ toast('Ponle un nombre','La tarjeta necesita un nombre',null); return; }
   const antes=JSON.stringify(S);
   editCard(c.id,'nombre',nom);                       // ← motor
   editCard(c.id,'linea',parseFloat(trjEd.linea)||0);
   editCard(c.id,'dia',trjEd.dia);
   editCard(c.id,'pagoMin',parseFloat(trjEd.pagoMin)||0);
   const cc=(S.tarjetas||[]).find(x=>x.id===p.id);
   if(cc){ if(trjEd.cierre) cc.cierre=trjEd.cierre; else delete cc.cierre;
           if(trjEd.last) cc.last=trjEd.last; else delete cc.last; }
   vib(16); save();
   toast('Tarjeta guardada',nom,
     ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   volver();
  };
  $('nxTD2').onclick=()=>{
   const c=(S.tarjetas||[]).find(x=>x.id===p.id); if(!c) return;
   const antes=JSON.stringify(S);
   const r=simular(()=>{ S.tarjetas=S.tarjetas.filter(x=>x.id!==c.id); });
   confirmar({titulo:'¿Borrar la tarjeta?',boton:'Sí, borrar',
     detalle:'<div>Se borra <b>'+h(c.nombre)+'</b> con sus <b>'+((c.compras||[]).length)+
      '</b> compra'+((c.compras||[]).length===1?'':'s')+' en cuotas. Los pagos que ya '+
      'registraste quedan como movimientos.</div>'+
      lineaCambio('Deuda total',r.deudaA,r.deudaB)},()=>{
    vib(18);
    crudo('delCard',c.id);               // ← motor
    toast('Tarjeta borrada',h(c.nombre),
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Borrado deshecho','',null); });
    volver();
   });
  };
 }};

 /* ============== cargos fijos y favoritos (pantallas propias) ==============
    Antes esta pantalla era la tabla vieja prestada: filas apretadas, un ✕ rojo
    y ningún dato de cuándo se cobra. Ahora dice el día, la cuenta y si el mes
    ya se anotó, y los favoritos se pueden usar de un toque como antes. */
 function icoRec(r){ const c=catById(r.catId); return c?emoCat(c):'🔁'; }
 function nomCta(id){ const a=(S.cuentas||[]).find(x=>x.id===id); return a?a.nombre:'sin cuenta'; }
 function nomCat(id){ const c=catById(id); return c?c.nombre.split(' (')[0]:'sin categoría'; }
 function diasDe(y,mn){ return new Date(y,mn,0).getDate(); }

 /* estado de un cargo fijo dentro del mes de verdad (hoy), no del mes que mira */
 function estadoRec(r){
  const now=new Date(), mk=now.getFullYear()+'-'+pad2(now.getMonth()+1);
  const dim=diasDe(now.getFullYear(),now.getMonth()+1);
  const dia=Math.min(+r.dia||1,dim);
  if(r.lastGen===mk) return {dia:dia,hecho:true,rot:'ya anotado este mes'};
  return {dia:dia,hecho:false,rot:dia<=now.getDate()?'se anota hoy':'se anota el '+dia};
 }

 /* anota un movimiento con el formulario del motor (mismo camino que registrar) */
 function anotarRapido(o){
  $('mFecha').value=keyOf(new Date());
  $('mTipo').value=o.tipo||'Gasto';
  syncMovForm();
  if((o.tipo||'Gasto')==='Gasto' && o.catId) $('mCat').value=o.catId;
  $('mCuenta').value=o.cuentaVal; toggleCredito();
  $('mConcepto').value=o.desc||nomCat(o.catId);
  $('mMonto').value=String(o.monto);
  if(typeof editId!=='undefined'&&editId) cancelEdit();
  addMov();                                            // ← motor
 }

 P.p_recurrentes={html(){
  const recs=(S.recurrentes||[]).slice().sort((a,b)=>(+a.dia||1)-(+b.dia||1));
  const favs=(S.favoritos||[]);
  const totRec=recs.reduce((s,r)=>s+(+r.monto||0),0);
  return barraTop('Recurrentes y favoritos','Lo fijo del mes y tus atajos')+
   '<div class="nx-scroll">'+
   '<div class="nx-tip"><span>🔁</span><span>Los <b>cargos fijos</b> se anotan solos el día que '+
    'les pongas, sin que hagas nada. Los <b>favoritos</b> no: son atajos para anotar de un toque '+
    'lo que repites mucho.</span></div>'+

   '<div class="nx-st"><h3>Cargos fijos</h3><span style="font-size:12px;color:var(--nx-mut)">'+
     (recs.length?fmt(totRec)+' al mes':'ninguno')+'</span></div>'+
   '<div class="nx-box">'+(recs.length?recs.map(r=>{
     const e=estadoRec(r);
     return '<button class="nx-row" data-rec="'+r.id+'"><span class="av">'+icoRec(r)+'</span>'+
      '<span class="tx"><b>'+h(r.concepto)+'</b><span>día '+e.dia+' · '+h(nomCta(r.cuentaId))+
       '</span></span>'+
      '<span class="am"><b>'+fmt(r.monto)+'</b><span>'+(e.hecho?'✓ este mes':e.rot)+'</span></span>'+
      '<span class="ar">›</span></button>';
   }).join(''):'<div class="nx-empty">Sin cargos fijos.</div>')+'</div>'+
   '<button class="nx-go sec" id="nxRecNue" style="margin-top:10px">Agregar un cargo fijo</button>'+

   '<div class="nx-st" style="margin-top:22px"><h3>Favoritos</h3>'+
     '<span style="font-size:12px;color:var(--nx-mut)">'+favs.length+'</span></div>'+
   '<div class="nx-box">'+(favs.length?favs.map(f=>
     '<button class="nx-row" data-fav="'+f.id+'"><span class="av">'+
      ((c=>c?emoCat(c):'⭐')(catById(f.catId)))+'</span>'+
      '<span class="tx"><b>'+h(f.concepto)+'</b><span>'+h(nomCat(f.catId))+' · '+
       h(nomCta(f.cuentaId))+'</span></span>'+
      '<span class="am"><b>'+fmt(f.monto)+'</b></span>'+
      '<span class="ar">›</span></button>').join('')
     :'<div class="nx-empty">Sin favoritos.</div>')+'</div>'+
   '<button class="nx-go sec" id="nxFavNue" style="margin-top:10px">Agregar un favorito</button>'+
   '<div style="font-size:11.5px;color:var(--nx-mut);margin-top:8px;text-align:center">'+
    'Toca un favorito para anotarlo hoy o para editarlo.</div>'+
   '</div>';
 },wire(){
  document.querySelectorAll('#nx-body [data-rec]').forEach(b=>b.onclick=()=>{
   recEd=null; go('reced',{id:+b.dataset.rec}); });
  document.querySelectorAll('#nx-body [data-fav]').forEach(b=>b.onclick=()=>{
   const f=(S.favoritos||[]).find(x=>x.id===+b.dataset.fav); if(!f) return;
   vib(8);
   hoja(f.concepto+' · '+fmt(f.monto),[
     {v:'usar',n:'Anotarlo hoy',e:'✅',s:'gasto de '+fmt(f.monto)+' en '+nomCta(f.cuentaId)},
     {v:'editar',n:'Editarlo',e:'✏️',s:'concepto, categoría, monto o cuenta'}],'',v=>{
    if(v==='editar'){ favEd=null; go('faved',{id:f.id}); return; }
    const antes=JSON.stringify(S);
    const r=simular(()=>{ S.tx.push({id:-1,fecha:keyOf(new Date()),tipo:'Gasto',catId:f.catId,
      cuentaId:f.cuentaId,concepto:f.concepto,monto:+f.monto||0}); });
    confirmar({titulo:'¿Anotar '+h(f.concepto)+'?',boton:'Sí, anotarlo',
      detalle:'<div>Se anota un gasto de <b>'+fmt2(f.monto)+'</b> hoy en <b>'+h(nomCta(f.cuentaId))+
       '</b>, categoría '+h(nomCat(f.catId))+'.</div>'+lineaCambio('Disponible del mes',r.cajaA,r.cajaB)},()=>{
     vib(18);
     anotarRapido({tipo:'Gasto',monto:+f.monto||0,catId:f.catId,cuentaVal:'a:'+f.cuentaId,desc:f.concepto});
     toast('Anotado',h(f.concepto)+' · '+fmt(f.monto),
       ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Movimiento deshecho','',null); });
     pinta(0);
    });
   });
  });
  $('nxRecNue').onclick=()=>{ recEd=null; go('reced',{id:0}); };
  $('nxFavNue').onclick=()=>{ favEd=null; go('faved',{id:0}); };
 }};

 /* ------------------------ editor de un cargo fijo ------------------------ */
 let recEd=null;
 function hojaCat(sel,alElegir){
  const ops=(S.categorias||[]).map(c=>({v:String(c.id),n:c.nombre.split(' (')[0],s:c.bucket,e:emoCat(c)}));
  hoja('Elige la categoría',ops,String(sel||''),v=>alElegir(+v));
 }
 function hojaCta(sel,alElegir){
  const ops=(S.cuentas||[]).map(a=>({v:String(a.id),n:a.nombre,e:icoCuenta(a.nombre),
    s:'saldo '+fmt(saldoCuenta(a.id))}));
  hoja('¿De qué cuenta sale?',ops,String(sel||''),v=>alElegir(+v));
 }
 P.reced={html(p){
  const r=p.id?(S.recurrentes||[]).find(x=>x.id===p.id):null;
  if(p.id && !r) return barraTop('Cargo fijo')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  const now=new Date();
  if(!recEd || recEd.id!==(p.id||0)) recEd={id:p.id||0,
    concepto:r?r.concepto:'', catId:r?r.catId:((S.categorias||[])[0]||{}).id,
    monto:r?String(+r.monto||''):'', dia:r?(+r.dia||1):1,
    cuentaId:r?(r.cuentaId||((S.cuentas||[])[0]||{}).id):((S.cuentas||[])[0]||{}).id,
    yaPagado:true};
  const gen=!p.id && recEd.dia<=now.getDate();
  const e=r?estadoRec(r):null;
  return barraTop(p.id?'Editar cargo fijo':'Nuevo cargo fijo',r?h(r.concepto):'Se anota solo cada mes')+
   '<div class="nx-scroll">'+
   '<div class="nx-fld"><span class="k">Concepto</span>'+
    '<input id="nxRC" placeholder="Ej. Plan de celular" value="'+h(recEd.concepto)+'" maxlength="34"></div>'+
   '<div class="nx-fld"><span class="k">Monto</span>'+
    '<input id="nxRM" inputmode="decimal" placeholder="0.00" value="'+h(recEd.monto)+'"></div>'+
   '<button class="nx-fld" id="nxRCat"><span class="k">Categoría</span>'+
    '<span class="v">'+((c=>c?emoCat(c)+' '+h(nomCat(c.id)):'elegir')(catById(recEd.catId)))+' ›</span></button>'+
   '<button class="nx-fld" id="nxRD"><span class="k">Día del mes</span>'+
    '<span class="v">día '+recEd.dia+' ›</span></button>'+
   '<button class="nx-fld" id="nxRCta"><span class="k">Sale de</span>'+
    '<span class="v">'+h(nomCta(recEd.cuentaId))+' ›</span></button>'+
   (gen?'<button class="nx-fld" id="nxRYa"><span class="k">El de este mes</span>'+
     '<span class="v">'+(recEd.yaPagado?'ya está pagado':'anótalo ahora')+' ›</span></button>'+
     '<div style="font-size:11.5px;color:var(--nx-mut);margin:8px 2px 0">El día '+recEd.dia+
      ' ya pasó. Si dices que falta, se anota el gasto de este mes al guardar.</div>':'')+
   (recEd.dia>28?'<div class="nx-tip"><span>📅</span><span>En los meses cortos se cobra el último día '+
     'del mes, no se salta.</span></div>':'')+
   (e?(()=>{ const n=(S.tx||[]).filter(t=>t.rec===r.id).length;
     return '<div class="nx-box nxp" style="margin-top:6px"><div class="nx-kv"><span>Este mes</span><b>'+
      (e.hecho?'ya anotado':e.rot)+'</b></div>'+
      (n?'<div class="nx-kv"><span>Anotados por la app</span><b>'+n+'</b></div>':'')+'</div>'; })():'')+
   '<button class="nx-go" id="nxRG" style="margin-top:12px">'+(p.id?'Guardar':'Crear cargo fijo')+'</button>'+
   (p.id?'<button class="nx-go sec" id="nxRDel" style="margin-top:9px;color:var(--nx-neg)">Borrar cargo fijo</button>':'')+
   '</div>';
 },wire(p){
  const c=$('nxRC'); if(c) c.oninput=()=>{ recEd.concepto=c.value; };
  const m=$('nxRM'); if(m) m.oninput=()=>{ m.value=m.value.replace(/[^0-9.]/g,''); recEd.monto=m.value; };
  $('nxRCat').onclick=()=>{ vib(8); hojaCat(recEd.catId,v=>{ recEd.catId=v; pinta(0); }); };
  $('nxRCta').onclick=()=>{ vib(8); hojaCta(recEd.cuentaId,v=>{ recEd.cuentaId=v; pinta(0); }); };
  $('nxRD').onclick=()=>{ vib(8);
   const ops=[]; for(let d=1;d<=31;d++) ops.push({v:String(d),n:'Día '+d,e:'📆',
     s:d===31?'o el último día en meses cortos':''});
   hoja('¿Qué día se cobra?',ops,String(recEd.dia),v=>{ recEd.dia=+v; pinta(0); }); };
  const ya=$('nxRYa');
  if(ya) ya.onclick=()=>{ vib(8);
   hoja('El cargo de este mes',[
     {v:'1',n:'Ya está pagado',e:'✔️',s:'no se anota nada ahora'},
     {v:'0',n:'Falta anotarlo',e:'➕',s:'se anota el gasto de este mes'}],recEd.yaPagado?'1':'0',
     v=>{ recEd.yaPagado=(v==='1'); pinta(0); }); };
  $('nxRG').onclick=()=>{
   const nom=(recEd.concepto||'').trim(), mo=parseFloat(recEd.monto)||0;
   if(!nom){ toast('Ponle un concepto','El cargo fijo necesita un nombre',null); return; }
   if(!(mo>0)){ toast('Falta el monto','Pon cuánto te cobran cada mes',null); return; }
   const antes=JSON.stringify(S);
   if(p.id){
    const r=(S.recurrentes||[]).find(x=>x.id===p.id); if(!r) return;
    r.concepto=nom; r.catId=recEd.catId; r.monto=mo; r.dia=recEd.dia; r.cuentaId=recEd.cuentaId;
    vib(16); save();
    toast('Cargo fijo guardado',nom+' · '+fmt(mo),
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   }else{
    const now=new Date(), mk=now.getFullYear()+'-'+pad2(now.getMonth()+1);
    const pasado=recEd.dia<=now.getDate();
    S.recurrentes=S.recurrentes||[];
    S.recurrentes.push({id:newId(),concepto:nom,catId:recEd.catId,monto:mo,dia:recEd.dia,
      cuentaId:recEd.cuentaId, lastGen:(pasado&&recEd.yaPagado)?mk:''});
    vib(16);
    generateRecurrentes();                             // ← motor: anota lo que ya venció
    save();
    toast('Cargo fijo creado',nom+' · '+fmt(mo)+' el día '+recEd.dia,
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Creación deshecha','',null); });
   }
   volver();
  };
  const d=$('nxRDel');
  if(d) d.onclick=()=>{
   const r=(S.recurrentes||[]).find(x=>x.id===p.id); if(!r) return;
   const antes=JSON.stringify(S);
   vib(8);
   confirmar({titulo:'¿Borrar el cargo fijo?',boton:'Sí, borrar',
     detalle:'<div><b>'+h(r.concepto)+'</b> de '+fmt(r.monto)+' el día '+(+r.dia||1)+
      ' deja de anotarse solo. Los '+((S.tx||[]).filter(t=>t.rec===r.id).length)+
      ' que ya se anotaron <b>quedan como movimientos</b>.</div>'},()=>{
    vib(18);
    crudo('delRec',r.id);                // ← motor
    toast('Cargo fijo borrado',h(r.concepto),
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Borrado deshecho','',null); });
    volver();
   });
  };
 }};

 /* ------------------------- editor de un favorito ------------------------- */
 let favEd=null;
 P.faved={html(p){
  const f=p.id?(S.favoritos||[]).find(x=>x.id===p.id):null;
  if(p.id && !f) return barraTop('Favorito')+'<div class="nx-scroll"><div class="nx-empty">No existe.</div></div>';
  if(!favEd || favEd.id!==(p.id||0)) favEd={id:p.id||0,
    concepto:f?f.concepto:'', catId:f?f.catId:((S.categorias||[])[0]||{}).id,
    monto:f?String(+f.monto||''):'',
    cuentaId:f?(f.cuentaId||((S.cuentas||[])[0]||{}).id):((S.cuentas||[])[0]||{}).id};
  const usos=f?(S.tx||[]).filter(t=>t.concepto===f.concepto).length:0;
  return barraTop(p.id?'Editar favorito':'Nuevo favorito',f?h(f.concepto):'Un atajo para anotar rápido')+
   '<div class="nx-scroll">'+
   '<div class="nx-fld"><span class="k">Concepto</span>'+
    '<input id="nxFC" placeholder="Ej. Almuerzo menú" value="'+h(favEd.concepto)+'" maxlength="34"></div>'+
   '<div class="nx-fld"><span class="k">Monto</span>'+
    '<input id="nxFM" inputmode="decimal" placeholder="0.00" value="'+h(favEd.monto)+'"></div>'+
   '<button class="nx-fld" id="nxFCat"><span class="k">Categoría</span>'+
    '<span class="v">'+((c=>c?emoCat(c)+' '+h(nomCat(c.id)):'elegir')(catById(favEd.catId)))+' ›</span></button>'+
   '<button class="nx-fld" id="nxFCta"><span class="k">Sale de</span>'+
    '<span class="v">'+h(nomCta(favEd.cuentaId))+' ›</span></button>'+
   '<div class="nx-tip"><span>⭐</span><span>Un favorito no anota nada por su cuenta: lo tocas cuando '+
    'pasa y se anota con ese monto. Si el monto cambia siempre, mejor anótalo a mano.</span></div>'+
   (usos?'<div class="nx-box nxp"><div class="nx-kv"><span>Movimientos con ese nombre</span><b>'+
     usos+'</b></div></div>':'')+
   '<button class="nx-go" id="nxFG" style="margin-top:12px">'+(p.id?'Guardar':'Crear favorito')+'</button>'+
   (p.id?'<button class="nx-go sec" id="nxFDel" style="margin-top:9px;color:var(--nx-neg)">Borrar favorito</button>':'')+
   '</div>';
 },wire(p){
  const c=$('nxFC'); if(c) c.oninput=()=>{ favEd.concepto=c.value; };
  const m=$('nxFM'); if(m) m.oninput=()=>{ m.value=m.value.replace(/[^0-9.]/g,''); favEd.monto=m.value; };
  $('nxFCat').onclick=()=>{ vib(8); hojaCat(favEd.catId,v=>{ favEd.catId=v; pinta(0); }); };
  $('nxFCta').onclick=()=>{ vib(8); hojaCta(favEd.cuentaId,v=>{ favEd.cuentaId=v; pinta(0); }); };
  $('nxFG').onclick=()=>{
   const nom=(favEd.concepto||'').trim(), mo=parseFloat(favEd.monto)||0;
   if(!nom){ toast('Ponle un concepto','El favorito necesita un nombre',null); return; }
   if(!(mo>0)){ toast('Falta el monto','Pon el monto que vas a anotar',null); return; }
   const antes=JSON.stringify(S);
   if(p.id){ const f=(S.favoritos||[]).find(x=>x.id===p.id); if(!f) return;
    f.concepto=nom; f.catId=favEd.catId; f.monto=mo; f.cuentaId=favEd.cuentaId; }
   else { S.favoritos=S.favoritos||[];
    S.favoritos.push({id:newId(),concepto:nom,catId:favEd.catId,monto:mo,cuentaId:favEd.cuentaId}); }
   vib(16); save();
   toast(p.id?'Favorito guardado':'Favorito creado',nom+' · '+fmt(mo),
     ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   volver();
  };
  const d=$('nxFDel');
  if(d) d.onclick=()=>{
   const f=(S.favoritos||[]).find(x=>x.id===p.id); if(!f) return;
   const antes=JSON.stringify(S);
   vib(8);
   confirmar({titulo:'¿Borrar el favorito?',boton:'Sí, borrar',
     detalle:'<div>Se quita <b>'+h(f.concepto)+'</b> de '+fmt(f.monto)+' de tus atajos. '+
      'Los movimientos que ya anotaste con él <b>no cambian</b>.</div>'},()=>{
    vib(18);
    crudo('delFav',f.id);                // ← motor
    toast('Favorito borrado',h(f.concepto),
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Borrado deshecho','',null); });
    volver();
   });
  };
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

   (cy.exacto
    ? '<div class="nx-tip"><span>✅</span><span><b>Fechas exactas</b>, tomadas del cronograma '+
      'de tu banco ('+nombreCierre(+c.cierre).toLowerCase()+'). Los consumos del '+
      fechaCorta(cy.ini)+' al '+fechaCorta(cy.fin)+' se pagan el <b>'+fechaCorta(cy.venc)+'</b>. '+
      'Si esa fecha cae fin de semana o feriado, el banco la corre al siguiente día útil.</span></div>'
    : '<div class="nx-tip nxw"><span>ℹ️</span><span><b>Fechas estimadas.</b> Esta tarjeta no tiene '+
      'cargado su cierre de facturación, así que se asume el cierre '+CIERRE_ANTES+' días antes del '+
      'día '+(c.dia||20)+'. Configúralo en la tarjeta y las fechas quedan exactas.</span></div>')+

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
   '<div class="rt"><button class="x" data-back aria-label="Cerrar">'+CERRAR_X+'</button>'+
    '<b style="font-size:15px">Registrar pago</b><span></span></div>'+
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
   vib(8);
   const m=mesSel();
   const lista=(S.tarjetas||[]).map(c=>({v:'c:'+c.id,n:c.nombre,e:'💳',
      s:'cuota del mes '+fmt(cardMonthStatus(c,m.y,m.mn).cuota)}))
    .concat((S.loans||[]).map(l=>({v:'l:'+l.id,n:l.nombre,e:'📄',
      s:'cuota '+fmt(l.cuota)+' · saldo '+fmt(loanRem(l))})));
   hoja('¿Qué deuda estás pagando?',lista,pagoSel,v=>{ pagoSel=v; pagoMonto=''; pinta(0); });
  };
  const ps=$('nxPS'); if(ps) ps.onclick=()=>{
   const m=mesSel(), [t,id]=pagoSel.split(':'); let s=0;
   if(t==='c'){ const c=(S.tarjetas||[]).find(x=>x.id===+id); if(c) s=cardMonthStatus(c,m.y,m.mn).falta; }
   else { const l=(S.loans||[]).find(x=>x.id===+id); if(l) s=loanMonthStatus(l,m.y,m.mn).falta; }
   pagoMonto=s.toFixed(2); vib(8); pinta(1); };
  document.querySelectorAll('#nx-body .nx-pad button').forEach(b=>alToque(b,()=>{
   const n=b.dataset.n; vib(6);
   if(n==='del') pagoMonto=pagoMonto.slice(0,-1);
   else if(n==='.'){ if(pagoMonto.indexOf('.')<0) pagoMonto=(pagoMonto||'0')+'.'; }
   else { if(pagoMonto.indexOf('.')>=0&&pagoMonto.split('.')[1].length>=2) return;
          pagoMonto=(pagoMonto==='0'?'':pagoMonto)+n; }
   const num=parseFloat(pagoMonto)||0;
   $('nx-body').querySelector('.nx-amt .v').innerHTML='<small>S/</small>'+
     num.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
   $('nxPG').disabled=!(num>0);
  }));
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
  return '<div class="nx-reg"><div class="rt"><button class="x" data-back aria-label="Cerrar">'+CERRAR_X+'</button>'+
   '<b style="font-size:15px">Aportar</b><span></span></div>'+
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
  const ico={};
  (S.tx||[]).filter(t=>t.tipo==='Gasto'&&inMonth(t,y,mn)).forEach(t=>{
   const c=catById(t.catId), nm=c?c.nombre.split(' (')[0]:'Otros';
   if(c) ico[nm]=emoCat(c);
   gc[nm]=(gc[nm]||0)+(+t.monto||0); });
  const lista=Object.keys(gc).map(k=>({n:k,v:gc[k],e:ico[k]||emo(k)})).sort((a,b)=>b.v-a.v);
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
     '<div class="nx-row"><span class="av">'+x.e+'</span>'+
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
    fila('cuentas','🏦','Cuentas',(S.cuentas||[]).length+' medios de pago',
      fmt((S.cuentas||[]).reduce((a,x)=>a+saldoCuenta(x.id),0)))+
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
  {g:'Mi cuenta',k:'p_sueldo',ic:'💰',r:'Sueldo quincenal',s:'15 y fin de mes, al día útil'},
  {g:'Finanzas',k:'p_eecc',ic:'📄',r:'Estado de cuenta mensual',s:'PDF y Excel al correo'},
  {g:'Finanzas',k:'bandeja',ic:'📬',r:'Bandeja del banco',s:'Movimientos leídos de tus correos'},
  {g:'Finanzas',k:'p_cats',ic:'🎨',r:'Categorías',s:'Crear, renombrar, iconos y límites'},
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

 P.p_eecc     =subMover('Estado de cuenta mensual','PDF y Excel al correo',
   ['#eeccStatus|.box','#eeccPrev']);
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

 /* ==================== categorías: crear, editar y borrar ====================
    Pedido suyo: "¿Puedo yo aumentar/editar las categorías? que me dé la opción
    y también de poner iconos". El icono se guarda en la categoría (campo
    `icono`); si está vacío se sigue adivinando por el nombre, así nada de lo
    que ya existe cambia de aspecto. Todo lo que escribe pasa por save(). */
 const ICONOS=['🍔','🍜','🛒','☕','🍺','🎂','🚌','🚕','⛽','🚲','✈️','🏖️',
  '🏠','💡','💧','📱','🛜','🧾','💊','🏥','🦷','🧴','🎬','🎮','🎧','📺',
  '🛍️','👕','👟','💅','✂️','📚','🎓','💻','🖨️','🏋️','⚽','🐾','🎁','❤️',
  '👶','👨‍👩‍👧','🙏','💳','🏦','🎯','💰','📈','🔧','🧹','💸'];
 const BUCKETS=[['Necesidad','lo que no se puede dejar de pagar','🧱'],
                ['Gusto','lo que se disfruta y se puede recortar','🎈'],
                ['Ahorro','lo que se guarda o adelanta deuda','🎯']];

 /* cuántas cosas dependen de una categoría */
 function usoCat(id){
  return {tx:(S.tx||[]).filter(t=>t.catId===id).length,
          rec:(S.recurrentes||[]).filter(r=>r.catId===id).length,
          fav:(S.favoritos||[]).filter(f=>f.catId===id).length};
 }
 const usoTotal=u=>u.tx+u.rec+u.fav;
 /* "3 movimientos, 1 cargo fijo y 2 favoritos" */
 const listaEs=xs=>{ const a=xs.filter(Boolean);
   return a.length<2?(a[0]||''):a.slice(0,-1).join(', ')+' y '+a[a.length-1]; };

 /* borrador del editor; `vuelve` recuerda si vino del registro */
 let ced={id:0,nombre:'',icono:'',bucket:'Gusto',limite:'',pos:1,vuelve:false};
 function abrirCat(id,desdeReg){
  const c=id?(S.categorias||[]).find(x=>x.id===id):null;
  ced={id:id||0, nombre:c?c.nombre:'', icono:c?(c.icono||''):'',
       bucket:c?(c.bucket||'Gusto'):'Gusto', limite:c&&+c.limite?String(+c.limite):'',
       pos:c?(S.categorias.indexOf(c)+1):(S.categorias||[]).length+1,
       vuelve:!!desdeReg};
  go('cated',{id:id||0});
 }
 const ordinal=i=>i+'º';

 /* rejilla de emojis en la hoja inferior */
 function hojaIconos(sel,alElegir){
  const bg=$('nx-bg'), sh=$('nx-sheet');
  if(!bg||!sh) return;
  sh.innerHTML='<div class="grab"></div><h4>Elige un icono</h4>'+
   '<div class="nx-icos">'+ICONOS.map(e=>'<button class="'+(e===sel?'on':'')+'" data-e="'+e+'" '+
    'type="button" aria-label="icono '+e+'">'+e+'</button>').join('')+'</div>'+
   '<div class="cbtns"><button class="nx-go sec" id="nxIcoAuto">Dejar que se adivine solo</button></div>';
  const cerrar=()=>{ bg.classList.remove('on'); sh.classList.remove('on'); };
  sh.querySelectorAll('.nx-icos button').forEach(b=>b.onclick=()=>{ vib(10); cerrar(); alElegir(b.dataset.e); });
  $('nxIcoAuto').onclick=()=>{ vib(8); cerrar(); alElegir(''); };
  bg.onclick=cerrar;
  bg.classList.add('on'); sh.classList.add('on');
 }

 P.p_cats={html(){
  const cats=(S.categorias||[]);
  return barraTop('Categorías',cats.length+' en uso')+'<div class="nx-scroll">'+
   '<div class="nx-tip"><span>🎨</span><span>Las primeras <b>'+CATS_EN_REJILLA+'</b> salen en la '+
    'rejilla al registrar un gasto, en este mismo orden. Toca una para cambiarle el nombre, '+
    'el icono, el tipo o el límite del mes.</span></div>'+
   '<div class="nx-box">'+cats.map((c,i)=>{
     const u=usoTotal(usoCat(c.id));
     return '<button class="nx-row" data-cat="'+c.id+'">'+
      '<span class="av">'+emoCat(c)+'</span>'+
      '<span class="tx"><b>'+h(c.nombre.split(' (')[0])+'</b><span>'+h(c.bucket)+
       (+c.limite?' · límite '+fmt(c.limite):'')+
       (i<CATS_EN_REJILLA?' · en la rejilla':'')+'</span></span>'+
      '<span class="am"><b style="font-weight:600;font-size:12px;color:var(--nx-mut)">'+
       (u?u+(u===1?' uso':' usos'):'sin usar')+'</b></span></button>';
   }).join('')+'</div>'+
   '<button class="nx-go" id="nxCatNue">Crear una categoría</button>'+
   '</div>';
 },wire(){
  $('nxCatNue').onclick=()=>abrirCat(0,false);
  document.querySelectorAll('#nx-body [data-cat]').forEach(b=>
   b.onclick=()=>abrirCat(+b.dataset.cat,false));
 }};

 P.cated={html(p){
  const nueva=!ced.id;
  const c=ced.id?(S.categorias||[]).find(x=>x.id===ced.id):null;
  const esDeudaCat=!!(c&&c.auto==='deuda');
  const u=c?usoCat(c.id):{tx:0,rec:0,fav:0};
  const icoMuestra=ced.icono||emo(ced.nombre)||'💸';
  return barraTop(nueva?'Nueva categoría':'Editar categoría',
                  nueva?'Nombre, icono y tipo':h((c&&c.nombre.split(' (')[0])||''))+
   '<div class="nx-scroll">'+
   '<div class="nx-catprev"><span class="e">'+icoMuestra+'</span>'+
    '<b>'+h(ced.nombre||'Sin nombre')+'</b><span>'+h(ced.bucket)+'</span></div>'+
   '<div class="nx-fld"><span class="k">Nombre</span>'+
    '<input id="nxCN" placeholder="Ej. Mascotas" value="'+h(ced.nombre)+'" maxlength="40"></div>'+
   '<button class="nx-fld" id="nxCI"><span class="k">Icono</span>'+
    '<span class="v">'+icoMuestra+(ced.icono?'':' automático')+' ›</span></button>'+
   (nueva ? '' :
    '<button class="nx-fld" id="nxCP"><span class="k">Puesto en la lista</span><span class="v">'+
     ordinal(ced.pos)+(ced.pos<=CATS_EN_REJILLA?' · en la rejilla':' · fuera de la rejilla')+' ›</span></button>')+
   (esDeudaCat
    ? '<div class="nx-tip"><span>🔒</span><span>Esta es la categoría con la que la app reconoce '+
      'los <b>pagos de deuda</b>, así que su tipo no se cambia ni se borra. El nombre y el icono sí.</span></div>'
    : '<button class="nx-fld" id="nxCB"><span class="k">Tipo</span><span class="v">'+h(ced.bucket)+' ›</span></button>'+
      '<div class="nx-fld"><span class="k">Límite del mes</span>'+
       '<input id="nxCL" inputmode="decimal" placeholder="sin límite" value="'+h(ced.limite)+'"></div>')+
   '<button class="nx-go" id="nxCG">'+(nueva?'Crear categoría':'Guardar cambios')+'</button>'+
   (nueva||esDeudaCat ? '' :
    '<button class="nx-go sec" id="nxCD" style="margin-top:9px;color:var(--nx-neg)">Borrar categoría</button>'+
    (usoTotal(u)?'<div style="font-size:11.5px;color:var(--nx-mut);margin-top:8px;text-align:center">'+
      'La usan '+listaEs([
        u.tx?u.tx+' movimiento'+(u.tx===1?'':'s'):'',
        u.rec?u.rec+' cargo'+(u.rec===1?' fijo':'s fijos'):'',
        u.fav?u.fav+' favorito'+(u.fav===1?'':'s'):''])+
      '. Si la borras, te pregunto a dónde pasarlos.</div>':''))+
   '</div>';
 },wire(){
  const nn=$('nxCN'); if(nn) nn.oninput=()=>{ ced.nombre=nn.value; };
  const nl=$('nxCL'); if(nl) nl.oninput=()=>{ ced.limite=nl.value.replace(/[^0-9.]/g,''); };
  const bi=$('nxCI'); if(bi) bi.onclick=()=>{ vib(8);
   hojaIconos(ced.icono,e=>{ ced.icono=e; pinta(0); }); };
  const bp=$('nxCP'); if(bp) bp.onclick=()=>{ vib(8);
   const n=(S.categorias||[]).length;
   const ops=[]; for(let i=1;i<=n;i++) ops.push({v:String(i),n:ordinal(i),
     e:i<=CATS_EN_REJILLA?'🔵':'⚪',
     s:i<=CATS_EN_REJILLA?'sale en la rejilla del registro':'sólo en la lista completa'});
   hoja('¿En qué puesto la pongo?',ops,String(ced.pos),v=>{ ced.pos=+v||1; pinta(0); });
  };
  const bb=$('nxCB'); if(bb) bb.onclick=()=>{ vib(8);
   hoja('¿Qué tipo de gasto es?',BUCKETS.map(([v,s,e])=>({v,n:v,s,e})),ced.bucket,
        v=>{ ced.bucket=v; pinta(0); }); };

  $('nxCG').onclick=()=>{
   const nom=(ced.nombre||'').trim();
   if(!nom){ toast('Ponle un nombre','La categoría necesita un nombre para poder elegirla',null); return; }
   const rep=(S.categorias||[]).find(x=>x.id!==ced.id &&
     x.nombre.trim().toLowerCase()===nom.toLowerCase());
   if(rep){ toast('Ya tienes esa categoría','Se llama igual: '+rep.nombre,null); return; }
   const antes=JSON.stringify(S);
   const lim=parseFloat(ced.limite)||0;
   if(ced.id){
    const c=(S.categorias||[]).find(x=>x.id===ced.id); if(!c) return;
    c.nombre=nom;
    if(ced.icono) c.icono=ced.icono; else delete c.icono;
    if(c.auto!=='deuda'){ c.bucket=ced.bucket; c.limite=lim; }
    const desde=S.categorias.indexOf(c), hasta=Math.max(0,Math.min(S.categorias.length-1,ced.pos-1));
    if(desde>=0 && desde!==hasta){ S.categorias.splice(desde,1); S.categorias.splice(hasta,0,c); }
    vib(16); save();
    toast('Categoría guardada',nom,()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   } else {
    const nueva={id:newId(),nombre:nom,bucket:ced.bucket,limite:lim,sugerencias:[]};
    if(ced.icono) nueva.icono=ced.icono;
    S.categorias.push(nueva);
    vib(16); save();
    if(ced.vuelve) reg.catId=nueva.id;          // si vino del registro, queda elegida
    toast('Categoría creada',nom+' · '+ced.bucket,
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Se deshizo la creación','',null); });
   }
   volver();
  };

  const bd=$('nxCD');
  if(bd) bd.onclick=()=>{
   const c=(S.categorias||[]).find(x=>x.id===ced.id); if(!c) return;
   const u=usoCat(c.id), n=usoTotal(u);
   const otras=(S.categorias||[]).filter(x=>x.id!==c.id);
   if(!otras.length){ toast('No se puede borrar','Es la única categoría que te queda',null); return; }
   const borrar=(destino)=>{
    const antes=JSON.stringify(S);
    const det=(n
      ? '<div>Se mueven <b>'+n+'</b> registro'+(n===1?'':'s')+' a <b>'+h(destino.nombre.split(' (')[0])+
        '</b> y luego se borra <b>'+h(c.nombre.split(' (')[0])+'</b>. Tus totales del mes '+
        '<b>no cambian</b>: sólo cambia en qué cajón se cuentan.</div>'
      : '<div>No hay ningún movimiento con <b>'+h(c.nombre.split(' (')[0])+'</b>, así que no se '+
        'pierde nada.</div>');
    confirmar({titulo:'¿Borrar la categoría?',boton:'Sí, borrar',detalle:det},()=>{
     (S.tx||[]).forEach(t=>{ if(t.catId===c.id) t.catId=destino.id; });
     (S.recurrentes||[]).forEach(r=>{ if(r.catId===c.id) r.catId=destino.id; });
     (S.favoritos||[]).forEach(f=>{ if(f.catId===c.id) f.catId=destino.id; });
     S.categorias=S.categorias.filter(x=>x.id!==c.id);
     vib(18); save();
     toast('Categoría borrada', n?n+' registro'+(n===1?'':'s')+' quedaron en '+destino.nombre.split(' (')[0]:'',
       ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Borrado deshecho','',null); });
     volver();
    });
   };
   vib(8);
   if(n) hoja(n===1?'¿A qué categoría paso ese registro?':'¿A qué categoría paso esos '+n+' registros?',
        otras.map(x=>({v:String(x.id),n:x.nombre.split(' (')[0],s:x.bucket,e:emoCat(x)})),'',
        v=>borrar(otras.find(x=>x.id===+v)));
   else borrar(otras[0]);
  };
 }};


 /* ===================== sueldo quincenal automático =====================
    Como me lo explicó: le pagan el 15 y el último día del mes, y si esa
    fecha cae sábado, domingo o feriado, el depósito se adelanta al día útil
    anterior. Agosto 2026 lo confirma: el 15 fue sábado y le pagaron el
    viernes 14; el 31 es lunes y le pagan el 31.
    Los feriados nacionales del Perú se calculan, no se copian a mano: 14 son
    de fecha fija y Jueves y Viernes Santo salen de la Pascua. */
 function pascua(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
   f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),hh=(19*a+b-d-g+15)%30,
   i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-hh-k)%7,m=Math.floor((a+11*hh+22*l)/451),
   mes=Math.floor((hh+l-7*m+114)/31),dia=((hh+l-7*m+114)%31)+1;
  return new Date(y,mes-1,dia);
 }
 const FERIADOS_FIJOS=['01-01','05-01','06-07','06-29','07-23','07-28','07-29',
  '08-06','08-30','10-08','11-01','12-08','12-09','12-25'];
 const NOMBRE_FER={'01-01':'Año Nuevo','05-01':'Día del Trabajo','06-07':'Día de la Bandera',
  '06-29':'San Pedro y San Pablo','07-23':'Día de la Fuerza Aérea','07-28':'Fiestas Patrias',
  '07-29':'Fiestas Patrias','08-06':'Batalla de Junín','08-30':'Santa Rosa de Lima',
  '10-08':'Combate de Angamos','11-01':'Todos los Santos','12-08':'Inmaculada Concepción',
  '12-09':'Batalla de Ayacucho','12-25':'Navidad'};
 const _ferCache={};
 function feriadosPE(y){
  if(_ferCache[y]) return _ferCache[y];
  const p=pascua(y), js=new Date(p), vs=new Date(p);
  js.setDate(p.getDate()-3); vs.setDate(p.getDate()-2);
  const k=d=>pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  const m={}; FERIADOS_FIJOS.forEach(f=>m[f]=NOMBRE_FER[f]);
  m[k(js)]='Jueves Santo'; m[k(vs)]='Viernes Santo';
  return (_ferCache[y]=m);
 }
 const feriadoDe=d=>feriadosPE(d.getFullYear())[pad2(d.getMonth()+1)+'-'+pad2(d.getDate())]||'';
 const finDeSemana=d=>d.getDay()===0||d.getDay()===6;
 /** día útil anterior (o el mismo si ya es útil), con el motivo del salto */
 function habilAntes(d){
  const x=new Date(d); let motivo='';
  while(finDeSemana(x)||feriadoDe(x)){
   if(!motivo) motivo = finDeSemana(x) ? (x.getDay()===6?'sábado':'domingo') : feriadoDe(x);
   x.setDate(x.getDate()-1);
  }
  return {fecha:x, motivo};
 }
 const SUELDO_DEF={on:false,q1:0,q2:0,cuentaId:null,desde:''};
 const cfgSueldo=()=>{ S.cfg.sueldo=Object.assign({},SUELDO_DEF,S.cfg.sueldo||{}); return S.cfg.sueldo; };
 /** las dos fechas de pago de un mes, ya corridas al día útil */
 function fechasSueldo(y,mn){
  const ult=diasDeMes(y,mn);
  return [15,ult].map((dia,i)=>{
   const nominal=new Date(y,mn-1,dia), r=habilAntes(nominal);
   return {q:i+1, k:y+'-'+pad2(mn)+'-q'+(i+1), fecha:keyOf(r.fecha), nominal:keyOf(nominal),
           motivo:r.motivo, dow:DIAS[r.fecha.getDay()],
           rot:i===0?'1ª quincena':'fin de mes'};
  });
 }
 const montoQuincena=q=>{ const s=cfgSueldo(); return +( q===1 ? s.q1 : s.q2 )||0; };
 const yaHaySueldo=k=>(S.tx||[]).some(t=>t.sueldoK===k);
 /** todas las fechas de pago entre `desde` y hoy que aún no están anotadas */
 function sueldosPendientes(){
  const s=cfgSueldo(); if(!s.on) return [];
  const hoyK=keyOf(new Date()), out=[];
  if(!s.desde) return out;
  const d0=new Date(s.desde+'T00:00');
  let y=d0.getFullYear(), mn=d0.getMonth()+1;
  const fin=new Date(); let vueltas=0;
  while((y<fin.getFullYear()||(y===fin.getFullYear()&&mn<=fin.getMonth()+1)) && vueltas++<400){
   fechasSueldo(y,mn).forEach(f=>{
    if(f.fecha>=s.desde && f.fecha<=hoyK && !yaHaySueldo(f.k) && montoQuincena(f.q)>0) out.push(f);
   });
   mn++; if(mn>12){ mn=1; y++; }
  }
  return out;
 }
 /** anota los pagos que ya ocurrieron. Devuelve los que anotó. */
 function generarSueldo(){
  const s=cfgSueldo(), pend=sueldosPendientes();
  if(!pend.length) return [];
  pend.forEach(f=>{
   S.tx.push({id:newId(),fecha:f.fecha,tipo:'Ingreso',catId:null,
     cuentaId:s.cuentaId||null,concepto:'Sueldo · '+f.rot,
     monto:montoQuincena(f.q),sueldoK:f.k});
  });
  S.tx.sort((a,b)=>b.fecha.localeCompare(a.fecha));
  try{ persist(); }catch(e){ console.warn('NEXO sueldo',e); }
  return pend;
 }
 /** la próxima fecha de pago desde hoy (para avisos) */
 function proximoSueldo(){
  const s=cfgSueldo(); if(!s.on) return null;
  const hoyK=keyOf(new Date()), n=new Date();
  for(let i=0;i<3;i++){
   let y=n.getFullYear(), mn=n.getMonth()+1+i; while(mn>12){ mn-=12; y++; }
   const f=fechasSueldo(y,mn).find(x=>x.fecha>=hoyK && montoQuincena(x.q)>0);
   if(f) return f;
  }
  return null;
 }

 P.p_sueldo={html(){
  const s=cfgSueldo();
  const cta=(S.cuentas||[]).find(a=>a.id===s.cuentaId);
  const m=mesSel(), prox=proximoSueldo(), pend=sueldosPendientes();
  const filas=[];
  for(let i=0;i<3;i++){
   let y=m.y, mn=m.mn+i; while(mn>12){ mn-=12; y++; }
   fechasSueldo(y,mn).forEach(f=>filas.push(Object.assign({y,mn},f)));
  }
  const netoBoleta=(+s.q1||0)+(+s.q2||0);
  const netoApp=(()=>{ try{ return +neto().toFixed(2); }catch(e){ return 0; } })();
  return barraTop('Sueldo quincenal',s.on?'Se anota solo el 15 y a fin de mes':'Apagado')+
   '<div class="nx-scroll">'+
   '<div class="nx-tip"><span>💰</span><span>Te pagan el <b>15</b> y el <b>último día del mes</b>. '+
    'Si esa fecha cae sábado, domingo o feriado, el depósito se adelanta al <b>día útil anterior</b> '+
    '— por eso en agosto te pagaron el viernes 14. La app calcula la fecha sola, con los feriados '+
    'nacionales del Perú incluidos.</span></div>'+

   '<button class="nx-fld" id="nxSuOn"><span class="k">Anotarlo automáticamente</span>'+
    '<span class="v">'+(s.on?'Sí ›':'No ›')+'</span></button>'+
   '<div class="nx-fld"><span class="k">1ª quincena (día 15)</span>'+
    '<input id="nxSuQ1" inputmode="decimal" placeholder="0.00" value="'+(+s.q1||'')+'"></div>'+
   '<div class="nx-fld"><span class="k">Fin de mes</span>'+
    '<input id="nxSuQ2" inputmode="decimal" placeholder="0.00" value="'+(+s.q2||'')+'"></div>'+
   '<button class="nx-fld" id="nxSuCta"><span class="k">Entra a</span>'+
    '<span class="v">'+h(cta?cta.nombre:'elegir cuenta')+' ›</span></button>'+
   '<button class="nx-go" id="nxSuGuardar">Guardar</button>'+

   (netoBoleta>0 && Math.abs(netoBoleta-netoApp)>0.5
    ? '<div class="nx-tip nxw" style="margin-top:12px"><span>🧮</span><span>Tu boleta te deposita '+
      '<b>'+fmt2(netoBoleta)+'</b> al mes, pero la app calcula un neto de <b>'+fmt2(netoApp)+'</b> '+
      'a partir de tu sueldo bruto y tus descuentos. La diferencia es '+
      fmt2(Math.abs(netoBoleta-netoApp))+' y el presupuesto usa la cifra de la app. '+
      'Si quieres, la cuadro con lo que realmente te llega.</span></div>'+
      '<button class="nx-go sec" id="nxSuCuadrar">Cuadrar el neto con mi boleta</button>'
    : '')+

   '<div class="nx-st" style="margin-top:20px"><h3>Próximas fechas</h3>'+
    (prox?'<span style="font-size:12px;color:var(--nx-mut)">la próxima: '+fechaCorta(prox.fecha)+'</span>':'')+'</div>'+
   '<div class="nx-box">'+filas.map(f=>{
     const ya=yaHaySueldo(f.k), mo=montoQuincena(f.q);
     const antesDe=!!(s.desde && f.fecha<s.desde);
     return '<div class="nx-row"'+(antesDe?' style="opacity:.55"':'')+'>'+
      '<span class="av">'+(ya?'✅':antesDe?'➖':'💰')+'</span>'+
      '<span class="tx"><b>'+fechaCorta(f.fecha)+' · '+f.dow+'</b><span>'+f.rot+
       (f.motivo?' · el '+(+f.nominal.split("-")[2])+' cae '+h(f.motivo)+', se adelanta':'')+
       (ya?' · ya anotado':antesDe?' · pasó antes de activar esto, no se anota':'')+'</span></span>'+
      '<span class="am"><b>'+(mo>0?fmt2(mo):'—')+'</b></span></div>';
   }).join('')+'</div>'+

   (pend.length
    ? '<button class="nx-go" id="nxSuAhora" style="margin-top:12px">Anotar '+pend.length+
      ' pago'+(pend.length===1?'':'s')+' que ya pasó'+(pend.length===1?'':'aron')+'</button>'
    : '')+

   '<div class="nx-tip" style="margin-top:14px"><span>🗓️</span><span>Feriados que usa para '+
    (new Date()).getFullYear()+': '+Object.keys(feriadosPE((new Date()).getFullYear())).sort()
      .map(k=>(+k.split('-')[1])+' '+MESab[+k.split('-')[0]-1]).join(' · ')+
    '.</span></div>'+
   '</div>';
 },wire(){
  const s=cfgSueldo();
  const q1=$('nxSuQ1'), q2=$('nxSuQ2');
  if(q1) q1.oninput=()=>{ q1.value=q1.value.replace(/[^0-9.]/g,''); };
  if(q2) q2.oninput=()=>{ q2.value=q2.value.replace(/[^0-9.]/g,''); };
  $('nxSuOn').onclick=()=>{ vib(8);
   hoja('¿Anoto tu sueldo automáticamente?',
     [{v:'1',n:'Sí, anótalo solo',e:'✅',s:'cada 15 y fin de mes, al día útil'},
      {v:'0',n:'No, lo anoto yo',e:'✋',s:'la app no toca tus movimientos'}],
     s.on?'1':'0', v=>{
      const c=cfgSueldo(); c.on=(v==='1');
      if(c.on && !c.desde) c.desde=keyOf(new Date());
      save(); pinta(0);
     });
  };
  $('nxSuCta').onclick=()=>{ vib(8);
   hoja('¿A qué cuenta entra?',(S.cuentas||[]).map(a=>({v:String(a.id),n:a.nombre,
     e:/yape|plin/i.test(a.nombre)?'📲':/efectivo/i.test(a.nombre)?'💵':/d[eé]bito/i.test(a.nombre)?'💳':'🏦',
     s:'saldo '+fmt(saldoCuenta(a.id))})),String(s.cuentaId||''),v=>{
      cfgSueldo().cuentaId=+v; save(); pinta(0); });
  };
  $('nxSuGuardar').onclick=()=>{
   const c=cfgSueldo(), antes=JSON.stringify(S);
   c.q1=parseFloat(($('nxSuQ1')||{}).value)||0;
   c.q2=parseFloat(($('nxSuQ2')||{}).value)||0;
   if(c.on && !c.desde) c.desde=keyOf(new Date());
   vib(16); save();
   toast('Sueldo guardado',fmt2(c.q1)+' el 15 y '+fmt2(c.q2)+' a fin de mes',
     ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   pinta(0);
  };
  const ah=$('nxSuAhora');
  if(ah) ah.onclick=()=>{
   const pend=sueldosPendientes(), suma=pend.reduce((a,f)=>a+montoQuincena(f.q),0);
   const m=mesSel();
   confirmar({titulo:'¿Anotar '+pend.length+' pago'+(pend.length===1?'':'s')+' de sueldo?',boton:'Sí, anotar',
     detalle:'<div>Se anotan '+pend.map(f=>fmt2(montoQuincena(f.q))+' el '+fechaCorta(f.fecha)).join(', ')+
      '.</div>'+lineaCambio('Disponible del mes',saldoHasta(m.y,m.mn),saldoHasta(m.y,m.mn)+suma)},()=>{
    const antes=JSON.stringify(S);
    const hechos=generarSueldo(); renderAll(); pinta(0);
    toast('Sueldo anotado',hechos.length+' ingreso'+(hechos.length===1?'':'s')+' de '+fmt2(suma),
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Se deshizo','',null); });
   });
  };
  const cu=$('nxSuCuadrar');
  if(cu) cu.onclick=()=>{
   const c=cfgSueldo(), boleta=(+c.q1||0)+(+c.q2||0);
   const bruto=+S.cfg.bruto||0, tasas=(+S.cfg.aporte||0)+(+S.cfg.comision||0)+(+S.cfg.seguro||0);
   const otrosNuevo=+(bruto-boleta-bruto*tasas).toFixed(2);
   if(otrosNuevo<0){ toast('No cuadra así','Tu boleta paga más que el bruto menos los descuentos',null); return; }
   const iA=ingresoMensual(), antes=JSON.stringify(S);
   confirmar({titulo:'¿Cuadrar el neto con tu boleta?',boton:'Sí, cuadrar',
     detalle:'<div>Se sube <b>otros descuentos</b> de '+fmt2(+S.cfg.otros||0)+' a <b>'+fmt2(otrosNuevo)+
      '</b>, así el neto de la app pasa a ser '+fmt2(boleta)+', lo que de verdad te depositan. '+
      'Esto cambia la base de tu presupuesto 50/30/20.</div>'+
      lineaCambio('Ingreso del mes',iA,boleta+(+S.cfg.otrosIngresos||0))},()=>{
    S.cfg.otros=otrosNuevo; vib(16); save();
    toast('Neto cuadrado','Ahora la app usa '+fmt2(boleta)+' de sueldo',
      ()=>{ S=JSON.parse(antes); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
    pinta(0);
   });
  };
 }};


 /* ================= bandeja: lo que dicen tus correos del banco =================
    El Apps Script lee las notificaciones de BCP, Yape e Interbank y devuelve
    una lista de operaciones. Aquí NO se calcula nada: cada movimiento que él
    aprueba se registra con las funciones del motor (addMov / addCardPayment),
    igual que si lo tecleara. Nada entra sin que lo confirme. */
 const urlBandeja=dias=>{
  let u=''; try{ u=getSyncUrl()||''; }catch(e){ u=''; }
  if(!u) return '';
  return u+(u.indexOf('?')>=0?'&':'?')+'bandeja=1&dias='+(dias||14)+'&t='+Date.now();
 };
 /* estado en memoria de la pantalla */
 let bnd={fase:'nada', items:[], error:'', dias:14, puedeArchivar:false};

 const bndVistos=()=>{ S.cfg.correosVistos=S.cfg.correosVistos||[]; return S.cfg.correosVistos; };
 const bndCache=()=>{ S.cfg.correosCache=S.cfg.correosCache||{ts:0,n:0}; return S.cfg.correosCache; };

 let bndT0=0, bndTimer=null;
 /* La primera lectura del buzón puede tardar ~30 s. Sin señales de vida la
    pantalla parecía colgada, así que se muestran los segundos y hay un tope. */
 function contadorOn(){
  bndT0=Date.now(); clearInterval(bndTimer);
  bndTimer=setInterval(()=>{
   const el=$('nxBndSeg');
   if(!el){ clearInterval(bndTimer); return; }
   el.textContent=Math.round((Date.now()-bndT0)/1000)+' s';
  },500);
 }
 const contadorOff=()=>clearInterval(bndTimer);

 function traerBandeja(){
  const u=urlBandeja(bnd.dias);
  if(!u){ bnd={fase:'sinurl',items:[],error:'',dias:bnd.dias}; return Promise.resolve(); }
  bnd.fase='cargando'; bnd.error='';
  const corta=new AbortController();
  const tope=setTimeout(()=>corta.abort(),90000);
  return fetch(u,{signal:corta.signal}).then(r=>r.text()).then(txt=>{
   clearTimeout(tope);
   let d; try{ d=JSON.parse(txt); }catch(e){
    throw new Error(/accounts\.google|sign ?in|iniciar sesi|<html/i.test(txt)
      ? 'La nube pidió iniciar sesión. Vuelve a publicar el script con acceso "Cualquier persona".'
      : 'La nube respondió algo que no entiendo.');
   }
   if(d && d.error) throw new Error(String(d.error));
   if(!d || !d.bandeja) throw new Error('Falta pegar Correos.gs en tu Apps Script: la nube no trae bandeja.');
   /* SEGURO IMPORTANTE: solo se avisa a la nube de lo archivado si ella dijo
      que sabe hacerlo. Su script de sincronización guarda en una celda TODO lo
      que llega por POST, así que un aviso de archivado en un script sin el
      enganche le sobreescribiría la copia de la nube. */
   bnd.puedeArchivar=(d.archivar===true);
   const ya=bndVistos();
   bnd.items=(d.bandeja||[]).filter(m=>m && m.id && ya.indexOf(m.id)<0);
   bnd.fase='listo';
   const c=bndCache(); c.ts=Date.now(); c.n=bnd.items.length;
   try{ persist(); }catch(e){}
  }).catch(e=>{
   clearTimeout(tope);
   bnd.fase='error';
   bnd.error = (e && e.name==='AbortError')
    ? 'Tu script tardó más de 90 segundos y corté la espera. Vuelve a intentar: '+
      'la segunda vez suele ser instantánea porque la nube guarda el resultado 5 minutos.'
    : (e.message||String(e));
  }).finally(()=>contadorOff());
 }

 /* ---- de qué cuenta o tarjeta salió ---- */
 function destinoCorreo(m){
  const C=(S.cuentas||[]), T=(S.tarjetas||[]);
  const cta=re=>C.find(a=>re.test(a.nombre||''));
  const tar=re=>T.find(c=>re.test(c.nombre||''));
  const p=(o,tipo)=>o?{tipo:tipo,id:o.id,rot:o.nombre}:null;
  let r=null;
  if(m.medio==='credito-bcp')  r=p(tar(/bcp/i),'card');
  else if(m.medio==='debito-bcp') r=p(cta(/d[eé]bito/i)||cta(/cuenta/i),'cta');
  else if(m.medio==='cuenta-bcp') r=p(cta(/cuenta bancaria|banco|ahorro/i)||C[0],'cta');
  else if(m.medio==='yape')      r=p(cta(/yape|plin/i)||C[0],'cta');
  else if(m.medio==='interbank') r=(m.tipo==='Pago de deuda')
      ? p(tar(/interbank|ibk/i),'pagoCard') : p(cta(/cuenta bancaria|banco/i)||C[0],'cta');
  return r||p(C[0],'cta')||{tipo:'cta',id:null,rot:'sin cuenta'};
 }

 /* ---- categoría propuesta por el nombre del comercio ---- */
 const PISTAS=[
  [/pedidos ?ya|rappi|mass |metro |plaza vea|tottus|wong|vivanda|makro|market|panade|restaur|pollo|kfc|bembos|starbucks|juguer|men[uú]|cevich|pizza|burger/i,/aliment|comida/i],
  [/movistar|claro|entel|bitel|win |internet|sedapal|enel|luz del sur|icloud|apple|google|netflix|spotify|disney|recarga|cable/i,/servici/i],
  [/uber|indrive|didi|cabify|taxi|combi|grifo|primax|repsol|petro|pasaje|scania/i,/transp/i],
  [/coolbox|falabella|saga|ripley|oechsle|nike|adidas|shein|temu|aliexpress|mercadolibre|shopstar|hiraoka|promart|sodimac|izquierdo/i,/compra|ropa/i],
  [/inkafarma|mifarma|botica|farmacia|clinic|dental|hospital|laborator/i,/salud/i],
  [/smart ?fit|gym|fitness|deporte/i,/gym|deporte/i],
  [/cine|steam|playstation|xbox|juego|concierto|teleticket/i,/entreten|ocio/i],
  [/universidad|instituto|vallejo|upn|utp|curso|udemy|platzi|colegio/i,/educ|otros/i],
  [/alquiler|arriendo|renta|luz|agua|arbitrio/i,/vivien|alquil/i]
 ];
 function catCorreo(m){
  const txt=(m.concepto||'')+' '+(m.detalle||'');
  if(m.tipo==='Pago de deuda'){
   const d=(S.categorias||[]).find(c=>c.auto==='deuda'); if(d) return d.id;
  }
  for(let i=0;i<PISTAS.length;i++){
   if(PISTAS[i][0].test(txt)){
    const c=(S.categorias||[]).find(x=>PISTAS[i][1].test(x.nombre||''));
    if(c) return c.id;
   }
  }
  const o=(S.categorias||[]).find(x=>/otros/i.test(x.nombre||''));
  return o?o.id:((S.categorias||[])[0]||{}).id;
 }

 /** ¿Ya existe un movimiento del mismo día y monto? Sus datos tienen cosas
     tecleadas a mano, así que el correo puede ser el mismo gasto ya anotado. */
 function yaParecido(m){
  return (S.tx||[]).find(t => t.fecha===m.fecha &&
    Math.abs((+t.monto||0)-(+m.monto||0))<0.01 && t.correoK!==m.id);
 }

 /* elecciones que él cambia antes de anotar: {catId, destino} por id de correo */
 let bndEleccion={};
 /* Selección múltiple para limpiar de golpe lo que ya revisó por su cuenta. */
 let bndModo=false, bndSel={};
 const bndSelN=()=>Object.keys(bndSel).filter(k=>bndSel[k]).length;
 const bndLimpiarSel=()=>{ bndModo=false; bndSel={}; };
 const eleccionDe=m=>{
  if(!bndEleccion[m.id]) bndEleccion[m.id]={catId:catCorreo(m), dest:destinoCorreo(m)};
  return bndEleccion[m.id];
 };

 /** lo anota de verdad, con las funciones del motor */
 function anotarCorreo(m){
  const e=eleccionDe(m), d=e.dest;
  if(d.tipo==='pagoCard'){
   $('payCard').value='c:'+d.id;
   $('payCard').dispatchEvent(new Event('change'));
   $('payFecha').value=m.fecha; $('payMonto').value=String(+m.monto||0);
   addCardPayment();                                   // ← motor
  } else {
   $('mFecha').value=m.fecha;
   $('mTipo').value='Gasto';
   syncMovForm();
   if(e.catId) $('mCat').value=e.catId;
   $('mCuenta').value=(d.tipo==='card'?'card:':'a:')+d.id;
   toggleCredito();
   const cu=$('mCuotas'), te=$('mTea');
   if(cu) cu.value='1';
   if(te) te.value='0';
   $('mConcepto').value=m.concepto||'Movimiento del banco';
   $('mMonto').value=String(+m.monto||0);
   if(typeof editId!=='undefined'&&editId) cancelEdit();
   addMov();                                           // ← motor
  }
  /* la marca del correo va en el movimiento recién creado, para no repetirlo */
  const ult=(S.tx||[]).slice().sort((a,b)=>b.id-a.id)[0];
  if(ult) ult.correoK=m.id;
 }

 /** avisa a la nube que ya se resolvió (y lo recuerda local por si falla) */
 function archivarCorreos(ids){
  if(!ids.length) return;
  const v=bndVistos();
  ids.forEach(i=>{ if(v.indexOf(i)<0) v.push(i); });
  if(v.length>400) S.cfg.correosVistos=v.slice(-400);
  try{ persist(); }catch(e){}
  if(!bnd.puedeArchivar) return;      // ver el seguro de arriba
  let u=''; try{ u=getSyncUrl()||''; }catch(e){}
  if(!u) return;
  fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action:'archivar',ids:ids}),redirect:'follow'}).catch(()=>{});
 }

 /** Marca varios como vistos: no anota nada y no vuelven a aparecer. */
 function verVarios(ids){
  if(!ids.length) return;
  const antesVistos=(bndVistos()||[]).slice();
  const guardados=bnd.items.filter(m=>ids.indexOf(m.id)>=0);
  vib(14);
  archivarCorreos(ids);
  bnd.items=bnd.items.filter(m=>ids.indexOf(m.id)<0);
  bndCache().n=bnd.items.length;
  bndLimpiarSel();
  try{ persist(); }catch(e){}
  pinta(0);
  toast(ids.length===1?'Marcado como visto':ids.length+' marcados como vistos',
    'No se anotó ninguno',()=>{
     S.cfg.correosVistos=antesVistos;
     try{ persist(); }catch(e){}
     bnd.items=guardados.concat(bnd.items);
     bndCache().n=bnd.items.length;
     pinta(0); toast('Vuelven a la bandeja','',null);
    });
 }

 const ICO_BANCO={'BCP':'🔵','Yape':'🟣','Interbank':'🟢'};

 P.bandeja={html(){
  const hayUrl=(()=>{ try{ return !!getSyncUrl(); }catch(e){ return false; } })();
  const c=bndCache();
  const cab=barraTop('Bandeja del banco',
    bnd.fase==='listo' ? (bnd.items.length?bnd.items.length+' por revisar':'todo revisado')
    : bnd.fase==='cargando' ? 'leyendo tus correos…' : 'últimos '+bnd.dias+' días');

  if(!hayUrl || bnd.fase==='sinurl')
   return cab+'<div class="nx-scroll">'+
    '<div class="nx-tip nxw"><span>☁️</span><span>Primero conecta la nube: la bandeja usa el '+
     'mismo Apps Script que ya guarda tus datos. Ve a <b>Perfil → Sincronización</b> y pega tu URL.</span></div>'+
    '<button class="nx-go" data-go="p_nube">Ir a Sincronización</button></div>';

  if(bnd.fase==='nada')
   return cab+'<div class="nx-scroll">'+
    '<div class="nx-tip"><span>📬</span><span>Leo las notificaciones que te manda el banco por cada '+
     'operación (BCP, Yape e Interbank) y te las dejo acá como movimientos listos para confirmar. '+
     '<b>No se anota nada sin tu visto bueno</b>, y tus correos no salen de tu cuenta de Google.</span></div>'+
    (c.n?'<div class="nx-tip"><span>🔔</span><span>La última vez encontré <b>'+c.n+'</b> '+
      'operación'+(c.n===1?'':'es')+' sin revisar.</span></div>':'')+
    '<button class="nx-go" id="nxBndLeer">Revisar mis correos</button></div>';

  if(bnd.fase==='cargando')
   return cab+'<div class="nx-scroll">'+
    '<div class="nx-cargando"><div class="giro"></div>'+
     '<b>Leyendo tus correos del banco…</b>'+
     '<span>Va por <b id="nxBndSeg">0 s</b>. La primera vez puede tardar hasta medio minuto '+
     'porque Google recorre tu buzón; después queda guardado 5 minutos y es instantáneo.</span>'+
    '</div></div>';

  if(bnd.fase==='error')
   return cab+'<div class="nx-scroll">'+
    '<div class="nx-tip nxw"><span>⚠️</span><span>'+h(bnd.error)+'</span></div>'+
    '<button class="nx-go" id="nxBndLeer">Intentar de nuevo</button>'+
    '<button class="nx-go sec" data-go="p_nube" style="margin-top:9px">Ver la conexión</button></div>';

  const gastos=bnd.items.filter(m=>m.tipo!=='Traslado');
  const tras=bnd.items.filter(m=>m.tipo==='Traslado');
  const fila=m=>{
   const e=eleccionDe(m), cat=catById(e.catId);
   const esTras=m.tipo==='Traslado';
   if(bndModo){                                   /* eligiendo varios */
    const on=!!bndSel[m.id];
    return '<button class="nx-mail sel'+(on?' on':'')+'" data-sel="'+h(m.id)+'" '+
     'data-k="'+h(m.id)+'" type="button">'+
     '<span class="tick">'+(on?'✓':'')+'</span>'+
     '<span class="cu"><span class="ln"><span class="b">'+(ICO_BANCO[m.banco]||'🏦')+' '+h(m.banco)+
       (esTras?' · traslado':'')+'</span><b class="mo">'+fmt2(m.monto)+'</b></span>'+
      '<span class="cp">'+h(m.concepto||'Movimiento')+'</span>'+
      '<span class="fe">'+etiquetaFecha(m.fecha)+'</span></span>'+
     '</button>';
   }
   return '<div class="nx-mail" data-k="'+h(m.id)+'">'+
    '<div class="ln"><span class="b">'+(ICO_BANCO[m.banco]||'🏦')+' '+h(m.banco)+'</span>'+
     '<b class="mo">'+fmt2(m.monto)+'</b></div>'+
    '<div class="cp">'+h(m.concepto||'Movimiento')+'</div>'+
    '<div class="fe">'+etiquetaFecha(m.fecha)+' · '+h(m.detalle||m.banco)+
      (esTras?' · <b>traslado entre lo tuyo</b>':'')+'</div>'+
    (()=>{ const y=yaParecido(m); return y
      ? '<div class="nt ojo">⚠️ Ya tienes anotado <b>'+h((y.concepto||'algo').slice(0,28))+
        '</b> por '+fmt2(y.monto)+' ese mismo día. Míralo antes de anotar, para no contarlo dos veces.</div>'
      : ''; })()+
    (esTras
     ? '<div class="nt">Mover plata de un bolsillo a otro no es un gasto, así que esto '+
       '<b>no cambia tus totales</b>. Descártalo cuando lo hayas visto.</div>'+
       '<div class="bt"><button class="ok solo" data-ok="'+h(m.id)+'" hidden></button>'+
       '<button class="no" data-no="'+h(m.id)+'">Visto, descartar</button></div>'
     : '<div class="ch">'+
        '<button class="chip" data-cat="'+h(m.id)+'">'+(cat?emoCat(cat)+' '+h(rotCat(cat)):'sin categoría')+' ›</button>'+
        '<button class="chip" data-dst="'+h(m.id)+'">'+
         (e.dest.tipo==='pagoCard'?'💸 Pago a '+h(e.dest.rot)
          :e.dest.tipo==='card'?'💳 '+h(e.dest.rot):'🏦 '+h(e.dest.rot))+' ›</button>'+
       '</div>'+
       '<div class="bt"><button class="ok" data-ok="'+h(m.id)+'">Anotarlo</button>'+
       '<button class="no" data-no="'+h(m.id)+'">Descartar</button></div>')+
    '</div>';
  };
  const n=bndSelN();
  return cab+'<div class="nx-scroll'+(bndModo?' conbarra':'')+'">'+
   (bnd.items.length===0
    ? '<div class="nx-empty">Nada nuevo en tus correos de los últimos '+bnd.dias+' días.</div>'
    : (bndModo
       ? '<div class="nx-tip"><span>☑️</span><span>Toca los que ya revisaste por tu cuenta y márcalos '+
         'como <b>vistos</b>: no se anota nada y dejan de aparecer.</span></div>'
       : '<div class="nx-tip"><span>👀</span><span>Revisa cada uno antes de anotarlo: la categoría y la '+
         'cuenta vienen propuestas, tócalas para cambiarlas.</span></div>')+
      '<div class="nx-selbar">'+
       (bndModo
        ? '<button id="nxSelTodo">Todos ('+bnd.items.length+')</button>'+
          (tras.length?'<button id="nxSelTras">Solo traslados ('+tras.length+')</button>':'')+
          '<button id="nxSelNada">Ninguno</button>'+
          '<button id="nxSelFin" class="fin">Salir</button>'
        : '<button id="nxSelIni">Marcar varios como vistos</button>')+
      '</div>'+
      (gastos.length?gastos.map(fila).join(''):'')+
      (tras.length?'<div class="nx-st" style="margin-top:14px"><h3>Traslados</h3>'+
        '<span style="font-size:12px;color:var(--nx-mut)">no son gastos</span></div>'+
        tras.map(fila).join(''):''))+
   '<button class="nx-go sec" id="nxBndLeer" style="margin-top:14px">Volver a leer los correos</button>'+
   '<button class="nx-go sec" id="nxBndMas" style="margin-top:9px">Mirar 60 días atrás</button>'+
   '</div>'+
   (bndModo
    ? '<div class="nx-barra"><span>'+(n?n+' elegido'+(n===1?'':'s'):'Ninguno elegido')+'</span>'+
      '<button id="nxSelOk"'+(n?'':' disabled')+'>Marcar como visto</button></div>'
    : '');
 },wire(){
  if(bnd.fase==='cargando') contadorOn();
  const leer=$('nxBndLeer');
  if(leer) leer.onclick=()=>{ vib(8); bndLimpiarSel(); const q=traerBandeja(); pinta(0); q.then(()=>pinta(0)); };
  const mas=$('nxBndMas');
  if(mas) mas.onclick=()=>{ vib(8); bnd.dias=60; const q=traerBandeja(); pinta(0); q.then(()=>pinta(0)); };

  const ini=$('nxSelIni'); if(ini) ini.onclick=()=>{ vib(8); bndModo=true; bndSel={}; pinta(0); };
  const fin=$('nxSelFin'); if(fin) fin.onclick=()=>{ vib(8); bndLimpiarSel(); pinta(0); };
  const todo=$('nxSelTodo'); if(todo) todo.onclick=()=>{ vib(8);
   bnd.items.forEach(m=>bndSel[m.id]=true); pinta(0); };
  const stras=$('nxSelTras'); if(stras) stras.onclick=()=>{ vib(8);
   bndSel={}; bnd.items.filter(m=>m.tipo==='Traslado').forEach(m=>bndSel[m.id]=true); pinta(0); };
  const nada=$('nxSelNada'); if(nada) nada.onclick=()=>{ vib(8); bndSel={}; pinta(0); };
  document.querySelectorAll('#nx-body [data-sel]').forEach(b=>b.onclick=()=>{
   const k=b.dataset.sel; bndSel[k]=!bndSel[k]; vib(6); pinta(0); });
  const selOk=$('nxSelOk');
  if(selOk) selOk.onclick=()=>{
   const ids=Object.keys(bndSel).filter(k=>bndSel[k]);
   if(!ids.length) return;
   const suma=bnd.items.filter(m=>ids.indexOf(m.id)>=0).reduce((a,m)=>a+(+m.monto||0),0);
   confirmar({titulo:'¿Marcar '+ids.length+' como vistos?',boton:'Sí, marcarlos',
     detalle:'<div>Suman '+fmt2(suma)+', pero <b>no se anota ninguno</b>: solo dejan de aparecer '+
      'en la bandeja. Tus totales no cambian. Queda un "Deshacer" por si te arrepientes.</div>'},
     ()=>verVarios(ids));
  };

  document.querySelectorAll('#nx-body [data-cat]').forEach(b=>b.onclick=()=>{
   const m=bnd.items.find(x=>x.id===b.dataset.cat); if(!m) return;
   vib(8);
   hoja('¿En qué categoría lo pongo?',(S.categorias||[]).map(c=>({v:String(c.id),
     n:c.nombre.split(' (')[0],s:c.bucket,e:emoCat(c)})),String(eleccionDe(m).catId||''),
     v=>{ eleccionDe(m).catId=+v; pinta(0); });
  });
  document.querySelectorAll('#nx-body [data-dst]').forEach(b=>b.onclick=()=>{
   const m=bnd.items.find(x=>x.id===b.dataset.dst); if(!m) return;
   vib(8);
   const ops=(S.cuentas||[]).map(a=>({v:'cta:'+a.id,n:a.nombre,e:'🏦',s:'sale de esta cuenta'}))
    .concat((S.tarjetas||[]).map(c=>({v:'card:'+c.id,n:c.nombre,e:'💳',s:'consumo con la tarjeta'})))
    .concat((S.tarjetas||[]).map(c=>({v:'pagoCard:'+c.id,n:'Pago a '+c.nombre,e:'💸',
      s:'abona a la deuda de la tarjeta'})));
   const e=eleccionDe(m);
   hoja('¿De dónde salió?',ops,e.dest.tipo+':'+e.dest.id,v=>{
    const p=v.split(':'), id=+p[1];
    const rot=(p[0]==='cta'?(ctaById(id)||{}).nombre:((S.tarjetas||[]).find(x=>x.id===id)||{}).nombre)||'';
    e.dest={tipo:p[0],id:id,rot:rot}; pinta(0);
   });
  });

  document.querySelectorAll('#nx-body [data-ok]').forEach(b=>b.onclick=()=>{
   const m=bnd.items.find(x=>x.id===b.dataset.ok); if(!m) return;
   const e=eleccionDe(m), cat=catById(e.catId), mm=mesSel();
   const dest=e.dest.tipo==='pagoCard'?'pago de '+e.dest.rot:e.dest.rot;
   const r=simular(()=>anotarCorreo(m));
   const y=yaParecido(m);
   confirmar({titulo:'¿Anotar este movimiento?',boton:'Sí, anotar',
     detalle:'<div><b>'+h(m.concepto||'Movimiento')+'</b> · '+fmt2(m.monto)+' el '+fechaCorta(m.fecha)+
      '<br>'+(cat?'Categoría '+h(cat.nombre.split(' (')[0])+' · ':'')+h(dest)+'</div>'+
      (y?'<div style="color:var(--nx-warn);margin-top:6px">Ojo: ya tienes <b>'+
        h((y.concepto||'algo').slice(0,28))+'</b> por '+fmt2(y.monto)+' ese día. '+
        'Si es el mismo gasto, cancela y descártalo.</div>':'')+
      lineaCambio('Deuda total',r.deudaA,r.deudaB)+
      lineaCambio('Disponible del mes',r.cajaA,r.cajaB)},()=>{
    const antes=JSON.stringify(S);
    vib(18);
    anotarCorreo(m);
    archivarCorreos([m.id]);
    bnd.items=bnd.items.filter(x=>x.id!==m.id);
    bndCache().n=bnd.items.length;
    save(); pinta(0);
    toast('Movimiento anotado',h(m.concepto||'')+' '+fmt2(m.monto),
      ()=>{ S=JSON.parse(antes); persist(); renderAll();
            bnd.items.unshift(m); pinta(0); toast('Se deshizo','',null); });
   });
  });
  document.querySelectorAll('#nx-body [data-no]').forEach(b=>b.onclick=()=>{
   const m=bnd.items.find(x=>x.id===b.dataset.no); if(!m) return;
   vib(10);
   archivarCorreos([m.id]);
   bnd.items=bnd.items.filter(x=>x.id!==m.id);
   bndCache().n=bnd.items.length;
   try{ persist(); }catch(e){}
   pinta(0);
   toast('Descartado','No se anotó nada',()=>{
    S.cfg.correosVistos=bndVistos().filter(x=>x!==m.id);
    try{ persist(); }catch(e){}
    bnd.items.unshift(m); pinta(0); toast('Vuelve a la bandeja','',null);
   });
  });
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

 /* ======== interceptar los borrados: preguntar antes, con la consecuencia ========
    Se envuelven las funciones globales del motor. Las que ya traían un
    confirm() del navegador quedan con el nuestro: durante la llamada real se
    silencia el confirm nativo para no preguntar dos veces. */
 function sinConfirmNativo(fn){
  const c=window.confirm; window.confirm=()=>true;
  try{ fn(); } finally{ window.confirm=c; }
 }
 /* las funciones originales del motor, antes de envolverlas: las pantallas
    propias ya preguntan con su propio aviso, así que llaman a la cruda para no
    preguntar dos veces (pasó con borrar cuenta: salían dos hojas encimadas). */
 const CRUDO={};
 function crudo(nombre){
  const args=[].slice.call(arguments,1);
  const fn=CRUDO[nombre]||window[nombre];
  if(typeof fn!=='function') return;
  sinConfirmNativo(()=>fn.apply(null,args));
 }
 function envolverBorrado(nombre,armar){
  const orig=window[nombre];
  if(typeof orig!=='function') return;
  CRUDO[nombre]=orig;
  window[nombre]=function(){
   const args=arguments;
   let o;
   try{ o=armar.apply(null,args); }catch(e){ o=null; }
   if(!o){ sinConfirmNativo(()=>orig.apply(null,args)); return; }
   confirmar(o,()=>sinConfirmNativo(()=>orig.apply(null,args)));
  };
 }

 (function(){
  const nom=x=>h(x||'—');
  const cambio=mut=>{ const r=simular(mut);
   return lineaCambio('Deuda total',r.deudaA,r.deudaB)+lineaCambio('Disponible del mes',r.cajaA,r.cajaB); };

  envolverBorrado('delFav',id=>{
   const f=(S.favoritos||[]).find(x=>x.id===id); if(!f) return null;
   return {titulo:'¿Borrar el favorito?',boton:'Sí, borrar',
    detalle:'Se quita <b>'+nom(f.concepto)+'</b> de S/ '+(+f.monto||0).toFixed(2)+
     ' de tus accesos rápidos. Los movimientos que ya registraste con él <b>no cambian</b>.'};
  });

  envolverBorrado('delRec',id=>{
   const r=(S.recurrentes||[]).find(x=>x.id===id); if(!r) return null;
   return {titulo:'¿Borrar el recurrente?',boton:'Sí, borrar',
    detalle:'<b>'+nom(r.concepto)+'</b> de '+fmt(r.monto)+' el día '+r.dia+
     ' deja de generarse solo cada mes. Los que ya se generaron <b>quedan registrados</b>.'};
  });

  envolverBorrado('delCuenta',id=>{
   const a=(S.cuentas||[]).find(x=>x.id===id); if(!a) return null;
   const n=(S.tx||[]).filter(t=>t.cuentaId===id).length;
   return {titulo:'¿Borrar la cuenta?',boton:'Sí, borrar',
    detalle:'<b>'+nom(a.nombre)+'</b> tiene <b>'+n+' movimiento'+(n===1?'':'s')+
     '</b> y un saldo de '+fmt(saldoCuenta(id))+'. Al borrarla esos movimientos quedan '+
     '<b>sin cuenta asignada</b>: siguen contando en tu caja, pero ya no sabrás con qué pagaste.'+
     cambio(()=>{ S.cuentas=(S.cuentas||[]).filter(x=>x.id!==id); })};
  });

  envolverBorrado('delCard',id=>{
   const c=(S.tarjetas||[]).find(x=>x.id===id); if(!c) return null;
   const nc=(c.compras||[]).length, pend=consumidoCard(c);
   return {titulo:'¿Borrar la tarjeta?',boton:'Sí, borrar la tarjeta',
    detalle:'<b>'+nom(c.nombre)+'</b> tiene <b>'+nc+' compra'+(nc===1?'':'s')+' en cuotas</b> con '+
     fmt(pend)+' pendiente. Se borran con ella.'+
     cambio(()=>{ S.tarjetas=S.tarjetas.filter(x=>x.id!==id); })};
  });

  envolverBorrado('delCompra',(cid,pid)=>{
   const c=(S.tarjetas||[]).find(x=>x.id===cid); if(!c) return null;
   const p=(c.compras||[]).find(x=>x.id===pid); if(!p) return null;
   return {titulo:'¿Borrar la compra en cuotas?',boton:'Sí, borrar',
    detalle:'<b>'+nom(p.desc||'Compra')+'</b> de '+fmt(p.saldo)+' en '+(p.n||1)+
     ' cuota'+((p.n||1)===1?'':'s')+', en '+nom(c.nombre)+'.'+
     cambio(()=>{ const cc=S.tarjetas.find(x=>x.id===cid);
       if(cc) cc.compras=(cc.compras||[]).filter(x=>x.id!==pid); })};
  });

  envolverBorrado('delLoan',id=>{
   const l=(S.loans||[]).find(x=>x.id===id); if(!l) return null;
   const fin=(S.tx||[]).filter(t=>t.loanId===id).length;
   return {titulo:'¿Borrar el préstamo?',boton:'Sí, borrar el préstamo',
    detalle:'<b>'+nom(l.nombre)+'</b> tiene '+fmt(loanRem(l))+' de saldo y cuota de '+fmt(l.cuota)+'.'+
     (fin?' También se quita el ingreso de financiamiento que registró.':'')+
     cambio(()=>{ S.loans=S.loans.filter(x=>x.id!==id); S.tx=S.tx.filter(t=>t.loanId!==id); })};
  });

  envolverBorrado('delMeta',id=>{
   const g=(S.metas||[]).find(x=>x.id===id); if(!g) return null;
   return {titulo:'¿Borrar la meta?',boton:'Sí, borrar',
    detalle:'<b>'+nom(g.nombre)+'</b> con '+fmt(g.ahorrado)+' ahorrado de '+fmt(g.objetivo)+
     '. <b>No afecta tu caja</b>: la meta es un objetivo, no una cuenta.'};
  });

  envolverBorrado('delCat',id=>{
   const c=(S.categorias||[]).find(x=>x.id===id); if(!c) return null;
   const n=(S.tx||[]).filter(t=>t.catId===id).length;
   return {titulo:'¿Borrar la categoría?',boton:'Sí, borrar',
    detalle:'<b>'+nom(c.nombre)+'</b> la usan <b>'+n+' movimiento'+(n===1?'':'s')+
     '</b>. Al borrarla quedan sin categoría y <b>salen del presupuesto 50/30/20</b>.'};
  });

  envolverBorrado('delMov',id=>{
   const t=(S.tx||[]).find(x=>x.id===id); if(!t) return null;
   const c=catById(t.catId);
   return {titulo:'¿Borrar el movimiento?',boton:'Sí, borrar',
    detalle:'<b>'+nom(t.concepto)+'</b> de '+fmt(t.monto)+' del '+
     String(t.fecha).split('-').reverse().join('/')+
     (c?' · '+nom(c.nombre.split(' (')[0]):'')+'.'+
     cambio(()=>{ if(t.cardId&&t.compraId){ const cc=S.tarjetas.find(x=>x.id===t.cardId);
        if(cc) cc.compras=(cc.compras||[]).filter(p=>p.id!==t.compraId); }
       S.tx=S.tx.filter(x=>x.id!==id); })};
  });

  /* ---- los cambios de un campo no preguntan: dejan "Deshacer" ---- */
  const CAMPO={monto:'el monto',cuota:'la cuota',meses:'el plazo',dia:'el día de pago',
   nombre:'el nombre',linea:'la línea',pagoMin:'el pago mínimo',saldo:'el saldo',
   n:'el número de cuotas',tea:'la tasa',objetivo:'el objetivo',ahorrado:'lo ahorrado',
   fecha:'la fecha',desc:'la descripción',titular:'el nombre',bruto:'el sueldo bruto',
   aporte:'el aporte AFP',comision:'la comisión AFP',seguro:'la prima de seguro',
   otros:'otros descuentos',otrosIngresos:'otros ingresos',saldoIni:'el saldo inicial'};
  const rotCampo=f=>CAMPO[f]||('«'+f+'»');
  [['editLoan','del préstamo',1],['editCard','de la tarjeta',1],['editCompra','de la compra',2],
   ['editMeta','de la meta',1],['setCfg','de tu perfil',0]].forEach(([nombre,que,posCampo])=>{
   const orig=window[nombre];
   if(typeof orig!=='function') return;
   window[nombre]=function(){
    const copia=JSON.stringify(S), m=mesSel();
    const dA=deudaTotal(), cA=saldoHasta(m.y,m.mn);
    orig.apply(null,arguments);
    const dB=deudaTotal(), cB=saldoHasta(m.y,m.mn);
    const partes=[];
    if(Math.abs(dA-dB)>0.5) partes.push('deuda '+fmt(dA)+' → '+fmt(dB));
    if(Math.abs(cA-cB)>0.5) partes.push('disponible '+fmt(cA)+' → '+fmt(cB));
    toast('Cambiaste '+rotCampo(arguments[posCampo])+' '+que,
     partes.length?partes.join(' · '):'',
     ()=>{ S=JSON.parse(copia); persist(); renderAll(); pinta(0); toast('Cambio deshecho','',null); });
   };
  });
 })();

 /* ============================ arranque ============================ */
 const NAVICO={
  home:'<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  mov:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  pres:'<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 3"/>',
  fin:'<path d="M5 20V9M12 20V4M19 20v-7"/>',
  perfil:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>'
 };
 const NAVROT={home:'Inicio',mov:'Movimientos',pres:'Presupuesto',fin:'Finanzas',perfil:'Perfil'};

 function apagarViejo(){
  /* BUG REPORTADO: la app pedía el PIN dos veces. El #lock de la v2.9 se
     enciende solo al cargar; aquí se le quita la clase y se vigila que no
     vuelva, además del display:none del CSS. */
  const l=$('lock'); if(!l) return;
  l.classList.remove('on','err');
  try{ new MutationObserver(()=>{ if(l.classList.contains('on')) l.classList.remove('on'); })
    .observe(l,{attributes:true,attributeFilter:['class']}); }catch(e){}
 }

 function sinZoom(){
  /* Se le acercaba la pantalla sin querer con la pinza: eso se frena aquí.
     OJO — BUG QUE REPORTÓ: antes también cancelaba el `touchend` cuando dos
     toques caían a menos de 320 ms, para matar el doble-toque-para-acercar.
     Cancelar touchend CANCELA EL CLICK, así que al teclear rápido el PIN o un
     monto se perdían dígitos y había que tocar dos veces. Se quitó: el doble
     toque ya lo bloquean `touch-action:manipulation` y el viewport. */
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>
   document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('touchmove',e=>{
   if(e.touches.length>1 && e.cancelable) e.preventDefault();   // pinza con dos dedos
  },{passive:false});
 }

 /* Una sola vez: a las tarjetas que ya existen en el teléfono se les pone el
    cierre que corresponde, así las fechas dejan de ser estimadas sin que él
    tenga que configurar nada. Sólo rellena lo que está vacío, y desde la
    pantalla de la tarjeta se puede cambiar. */
 function sembrarCierres(){
  let toco=false;
  (S.tarjetas||[]).forEach(c=>{
   if(+c.cierre) return;
   const n=(c.nombre||'').toLowerCase();
   if(/bcp/.test(n))            { c.cierre=25; toco=true; }
   else if(/interbank|ibk/.test(n)) { c.cierre=31; toco=true; }
  });
  if(toco) try{ save(); }catch(e){ console.warn('NEXO cierres',e); }
 }

 /* Su configuración de sueldo, una sola vez: 1,484.97 el 15 y 1,484.97 a fin de
    mes, a la cuenta bancaria, contando desde hoy (me pidió no registrar el
    pago del 14 de agosto que ya había pasado). */
 function sembrarSueldo(){
  if(S.cfg.sueldo) return;
  const cta=(S.cuentas||[]).find(a=>/cuenta bancaria|banco|sueldo/i.test(a.nombre))||(S.cuentas||[])[0];
  S.cfg.sueldo={on:true,q1:1484.97,q2:1484.97,cuentaId:cta?cta.id:null,desde:keyOf(new Date())};
  try{ save(); }catch(e){ console.warn('NEXO sueldo semilla',e); }
 }

 /* Al abrir, y como máximo cada 6 horas, se le pregunta a la nube si hay
    operaciones nuevas en los correos. Solo actualiza el contador del aviso:
    nada se anota sin que él lo confirme en la bandeja. */
 function revisarCorreosEnSilencio(){
  let u=''; try{ u=getSyncUrl()||''; }catch(e){ u=''; }
  if(!u) return;
  const c=bndCache();
  if(Date.now()-(+c.ts||0) < 6*3600*1000) return;
  traerBandeja().then(()=>{ try{ if($('nx') && pila[pila.length-1]==='home') pinta(0); }catch(e){} });
 }

 function montar(){
  if($('nx')) return;
  sembrarCierres(); sembrarSueldo();
  const nuevos=generarSueldo();
  document.body.classList.add('nx-on');
  apagarViejo(); sinZoom();
  const root=document.createElement('div'); root.id='nx';
  root.innerHTML='<div id="nx-body"></div>'+
   '<div id="nx-bg"></div><div id="nx-sheet" role="dialog" aria-label="Elegir"></div>'+
   '<nav class="nx-nav" id="nx-nav">'+RAIZ.map(k=>
     '<button data-k="'+k+'"><svg viewBox="0 0 24 24">'+NAVICO[k]+'</svg><span>'+NAVROT[k]+'</span></button>').join('')+'</nav>'+
   '<button class="nx-fab" id="nx-fab" aria-label="Registrar">+</button>';
  document.body.appendChild(root);
  root.querySelectorAll('.nx-nav button').forEach(b=>b.onclick=()=>go(b.dataset.k));
  $('nx-fab').onclick=()=>go('reg');
  pila=[ localStorage.getItem(PIN_K) ? 'login' : 'home' ];
  pinta(1);
  setTimeout(revisarCorreosEnSilencio,2500);
  if(nuevos.length) setTimeout(()=>toast(
    'Anoté tu sueldo',nuevos.map(f=>fmt2(montoQuincena(f.q))+' el '+fechaCorta(f.fecha)).join(' · '),null),900);
 }

 /* cada vez que el motor guarda, se repinta la pantalla actual */
 const _save=window.save;
 window.save=function(){ _save.apply(this,arguments); try{ if($('nx')) pinta(0); }catch(e){ console.warn('NEXO repintar',e); } };

 window.NX={go:go,volver:volver,pinta:()=>pinta(0)};
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',montar);
 else montar();
})();
