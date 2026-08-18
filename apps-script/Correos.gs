/**
 * Finanzas Personales — lector de correos del banco.
 *
 * AUTOSUFICIENTE: no necesita nada del otro archivo. Guarda lo ya resuelto en
 * las propiedades del script (no en Drive), así el único permiso que Google
 * pide es LEER GMAIL.
 *
 * Lee las notificaciones que BCP, Yape e Interbank te mandan por cada
 * operación y las deja listas como movimientos para que los confirmes
 * en la app. NO escribe nada en tus finanzas: solo llena una bandeja.
 *
 * Endpoints que agrega al mismo script:
 *   GET  ?k=CLAVE&bandeja=1        -> lista de movimientos detectados
 *   GET  ?k=CLAVE&bandeja=1&dias=30 -> ídem, mirando 30 días atrás
 *   POST {action:'archivar', ids:[...]}  -> los marca como resueltos
 *   POST {action:'desarchivar', ids:[...]} -> los devuelve a la bandeja (Deshacer)
 *
 * ENGANCHE (dos trozos que van en tu doGet y tu doPost):
 *   doGet:   if (e && e.parameter && e.parameter.bandeja) return respuestaBandeja_(e.parameter.dias, e.parameter.fresco);
 *   doPost:  var _d=null; try{ _d=JSON.parse(e.postData.contents); }catch(x){}
 *            if (_d && _d.action==='archivar') return archivarCorreos_(_d.ids);
 *            if (_d && _d.action==='desarchivar') return desarchivarCorreos_(_d.ids);
 *   OJO: en doPost va ANTES de guardar los datos, o el aviso de archivado
 *   se guardaría como si fueran tus finanzas.
 *
 * Pega este archivo COMPLETO como un segundo archivo del proyecto
 * (Apps Script -> + -> Secuencia de comandos -> nómbralo "Correos").
 * Codigo.gs se queda como está salvo el enganche que se indica abajo.
 */

/* ============================ CONFIGURACIÓN ============================ */

/** Cuántos días atrás mirar por defecto. */
const DIAS = 14;

/** Tope de hilos que se leen de una vez. Más alto = más lento. */
const MAX_HILOS = 80;

/** Clave donde se recuerda qué operaciones ya resolviste, para que no
 *  vuelvan a aparecer nunca más. Vive en las propiedades del script. */
const VISTOS_K = 'correosVistos';
/** Cuántos ids se recuerdan (los más viejos se olvidan). */
const VISTOS_MAX = 600;

/** Remitentes que sí son notificaciones de operaciones.
 *  Todo lo demás (publicidad, promociones) se ignora. */
/* Un correo de un banco puede terminar en tres sitios:
     - un movimiento (lo normal);
     - IGNORAR: publicidad, encuestas, claves, rechazos... no es una operación;
     - null: ES una operación pero no supe leerla → hay que AVISARLO, no
       tragárselo en silencio. Eso último es lo que pide el contrato. */
const IGNORAR = 'ignorar';

const REMITENTES = [
  'notificaciones@notificacionesbcp.com.pe',
  'notificaciones@yape.pe',
  'servicioalcliente@netinterbank.com.pe',
  'cajahuancayo.com.pe',
  /* SOLO este remitente de Ripley: 'alerta-aprobacion@bancoripley.com.pe' avisa
     LA MISMA transferencia con otro numero de referencia, y se contaria doble.
     Por lo mismo NO se lee izipay: repite el consumo que ya avisa el BCP. */
  'bancoripley@notificaciones.bancoripley.com.pe'
];

/** Como escriben el numero de operacion los correos que llegan. */
const NUM_OP = 'N[uú]mero de operaci[oó]n|N[º°o]\\.? de operaci[oó]n';

/* =============================== LECTURA =============================== */

/**
 * Devuelve los movimientos detectados que todavía no has resuelto.
 * @param {number} dias  días hacia atrás
 */
function bandeja_(dias, fresco) {
  const d = Math.min(120, Math.max(1, dias || DIAS));
  const q = 'from:{' + REMITENTES.join(' ') + '} newer_than:' + d + 'd';

  /* Caché de 5 minutos: leer el buzón tardaba ~30 s y la app parecía colgada.
     Con esto, abrir la bandeja dos veces seguidas es instantáneo.
     PERO: si acaba de yapear y pide leer, la caché le escondía el correo
     nuevo hasta 5 minutos. Con fresco=1 se lee el buzón de verdad. */
  const cache = CacheService.getScriptCache();
  const clave = 'bandeja:' + d;
  if (!fresco) {
    const guardado = cache.get(clave);
    if (guardado) { try { return JSON.parse(guardado); } catch (e) {} }
  }

  const vistos = leerVistos_();
  const out = [];
  const hilos = GmailApp.search(q, 0, MAX_HILOS);
  /* getMessagesForThreads trae los mensajes de TODOS los hilos en una sola
     llamada; hacerlo hilo por hilo era lo que se comía los segundos. */
  const porHilo = GmailApp.getMessagesForThreads(hilos);

  porHilo.forEach(function (msgs) {
    msgs.forEach(function (m) {
      let mv;
      try { mv = interpretar_(m); } catch (e) { mv = null; }
      if (mv === IGNORAR) return;
      if (!mv) {
        /* Es un correo de un banco que no se pudo leer. Antes desaparecía sin
           dejar rastro y la operación no existía para la app. Ahora sale como
           aviso: no se puede anotar solo, pero él se entera. */
        const idr = 'raro-' + m.getId();
        if (vistos[idr]) return;
        out.push({ id: idr, fecha: fechaDe_(m), monto: 0, noLeido: true,
          concepto: recorte_(m.getSubject() || 'Correo del banco'),
          medio: '', tipo: 'No reconocido', banco: bancoDe_(m.getFrom()),
          detalle: 'no supe interpretar este correo' });
        return;
      }
      /* El id sale del numero de operacion del banco. Cuando ese numero no se
         podia leer, el id caia al id del correo, y eso es lo que quedo guardado
         en lo ya resuelto. Se miran los dos, o al arreglar la lectura volverian
         a aparecer operaciones que el ya habia resuelto. */
      const PREF = { Yape: 'yape-', Interbank: 'ibk-', Huancayo: 'cjh-', Ripley: 'rip-' };
      const heredado = (PREF[mv.banco] || 'bcp-') + m.getId();
      if (vistos[mv.id] || vistos[heredado]) return;
      out.push(mv);
    });
  });

  // más reciente primero, sin repetidos por id
  const yaEsta = {};
  const limpio = [];
  out.sort(function (a, b) { return b.fecha < a.fecha ? -1 : 1; });
  out.forEach(function (m) { if (!yaEsta[m.id]) { yaEsta[m.id] = 1; limpio.push(m); } });
  try { cache.put(clave, JSON.stringify(limpio), 300); } catch (e) {}
  return limpio;
}

/** De qué banco es un remitente (para los correos que no se pudieron leer). */
function bancoDe_(de) {
  const d = String(de || '').toLowerCase();
  if (d.indexOf('yape') >= 0) return 'Yape';
  if (d.indexOf('interbank') >= 0) return 'Interbank';
  if (d.indexOf('huancayo') >= 0) return 'Huancayo';
  if (d.indexOf('ripley') >= 0) return 'Ripley';
  return 'BCP';
}

/** Asunto cortito, para no llenar la pantalla. */
function recorte_(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > 48 ? t.slice(0, 47) + '…' : t;
}

/** Se borra la caché al archivar, para que lo resuelto no reaparezca. */
function olvidarCache_() {
  try {
    CacheService.getScriptCache().removeAll(
      [7, 14, 30, 60, 90, 120].map(function (n) { return 'bandeja:' + n; }));
  } catch (e) {}
}

/**
 * Traduce un correo a un movimiento, o devuelve null si el correo
 * no es una operación (publicidad, rechazos, estados de cuenta...).
 */
function interpretar_(m) {
  const de = String(m.getFrom()).toLowerCase();
  const asunto = m.getSubject() || '';
  const t = limpiar_(m.getPlainBody() || '');
  const t1 = unaLinea_(t);                 // frases que el correo parte en dos lineas

  // Nunca registrar operaciones que no ocurrieron
  /* "rechazada"/"rechazado" no entraban en el patrón viejo (pedía rechaz+o/ó):
     una operación rechazada terminaba en el cajón de "no supe leerla". */
  if (/rechaz(?:o|ó|ad[oa])|no se pudo|denegad|fallid|no procesad/i
      .test(asunto + ' ' + t.slice(0, 400))) return IGNORAR;
  // Ni cambios de configuración, ni estados de cuenta
  if (/constancia de configuraci[oó]n|estado de cuenta|comprobante de pago/i.test(asunto)) return IGNORAR;

  const base = {
    id: '',            // identificador estable: no se repite jamás
    fecha: '',         // YYYY-MM-DD
    monto: 0,
    concepto: '',
    medio: '',         // 'credito-bcp' | 'debito-bcp' | 'cuenta-bcp' | 'yape' | 'interbank'
    tipo: 'Gasto',
    banco: '',
    detalle: asunto
  };

  /* --------------------------- Yape --------------------------- */
  if (de.indexOf('yape.pe') >= 0) {
    base.banco = 'Yape'; base.medio = 'yape';
    let mm = t1.match(/Monto (?:total|de yapeo|del? (?:pago|servicio))\s*S\/\s*([\d.,]+)/i) ||
             t1.match(/Monto\s*S\/\s*([\d.,]+)/i);
    if (!mm) return null;
    base.monto = num_(mm[1]);
    /* El pago de un servicio trae "Empresa: Movistar": ese nombre vale más que
       un genérico "Yapeo". Después va el comercio del "Tu pago en X". */
    const emp = empresaSuelta_(t);
    const co = t1.match(/Tu pago en\s+(.+?)\s*(?:fue exitoso|!)/i);
    /* un yapeo a una persona trae el nombre del beneficiario: vale mas que un
       "Yapeo" pelado, que era lo que salia antes en la bandeja */
    const ben = campo_(t, 'Nombre del Beneficiario');
    base.concepto = titulo_(emp) || (co ? titulo_(co[1]) : '') ||
                    (ben ? 'Yapeo a ' + titulo_(ben) : '') ||
                    (/servicio fue yapeado/i.test(t) ? 'Yapeo de servicio' : 'Yapeo');
    base.fecha = fechaYape_(t1) || fechaDe_(m);
    const op = t1.match(/ID de operaci[oó]n:?\s*([0-9A-Za-z-]+)/i) ||
               t1.match(/N[º°o]\.?\s*de operaci[oó]n(?:\s*Yape)?:?\s*([0-9A-Za-z-]+)/i);
    base.id = 'yape-' + (op ? op[1] : m.getId());
    return base;
  }

  /* -------------------------- Interbank ------------------------ */
  if (de.indexOf('netinterbank') >= 0) {
    base.banco = 'Interbank'; base.medio = 'interbank';
    // ojo: puede traer dos líneas de monto (soles y dólares). Tomamos SOLES.
    const mm = t1.match(/Moneda y monto\s*\|?\s*S\/\s*([\d.,]+)/i) ||
               t1.match(/Recibo\s*1\s*S\/\s*([\d.,]+)/i) ||
               t1.match(/(?:Monto|Importe)(?: pagado| total)?\s*:?\s*S\/\s*([\d.,]+)/i);
    if (!mm) return null;
    base.monto = num_(mm[1]);
    const emp = campo_(t, 'Empresa');
    const tar = campo_(t, 'Tarjeta de crédito');
    base.concepto = titulo_(emp) || (tar ? 'Pago tarjeta Interbank' : 'Pago Interbank');
    if (tar) base.tipo = 'Pago de deuda';
    if (/Plin/i.test(asunto)) base.concepto = 'Plin';
    base.fecha = fechaIbk_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
    const op = numOp_(t1, 'C[oó]digo de operaci[oó]n|' + NUM_OP);
    base.id = 'ibk-' + (op || m.getId());
    // guardamos el monto en dólares como aviso, no como movimiento
    const usd = t1.match(/Moneda y monto\s*\|?\s*US\$\s*([\d.,]+)/i);
    if (usd) base.avisoUsd = num_(usd[1]);
    return base;
  }

  /* ------------------------ Caja Huancayo ---------------------- */
  if (de.indexOf('cajahuancayo') >= 0) {
    base.banco = 'Huancayo'; base.medio = 'huancayo';

    /* transferencia a otro banco: lo que sale de verdad es el TOTAL, con
       comision y ITF. Con el "Monto Transferencia" pelado faltaban S/ 6.30. */
    if (/TRANSFERENCIA INTERBANCARIA|TRANSFERENCIA A OTRO BANCO/i.test(t)) {
      const tot = campo_(t, 'Total') || campo_(t, 'Monto Transferencia');
      const mm2 = String(tot).match(/S\/\s*([\d.,]+)/);
      if (!mm2) return null;
      base.monto = num_(mm2[1]);
      const ent = campo_(t, 'NombreEntidad');
      base.concepto = 'Transferencia' + (ent ? ' a ' + titulo_(ent) : ' interbancaria');
      base.fecha = fechaNum_(campo_(t, 'Fecha Operación')) || fechaDe_(m);
      base.id = 'cjh-' + (numOp_(t1, 'N[uú]mero de Operaci[oó]n') || m.getId());
      return base;
    }

    /* pago o cancelacion anticipada de un credito */
    if (/CANCELACI[OÓ]N ANTICIPADA|PAGO DE CR[EÉ]DITO|PAGO DE CUOTA/i.test(t)) {
      const mm3 = String(campo_(t, 'Monto pagado')).match(/S\/\s*([\d.,]+)/);
      if (!mm3) return null;
      base.monto = num_(mm3[1]);
      base.tipo = 'Pago de deuda';
      base.concepto = /CANCELACI/i.test(t) ? 'Cancelación de crédito Huancayo'
                                           : 'Pago de crédito Huancayo';
      base.fecha = fechaNum_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'cjh-' + (numOp_(t1, 'Operaci[oó]n N[º°o]|N[uú]mero de Operaci[oó]n') || m.getId());
      return base;
    }
    return IGNORAR;   // bienvenidas, claves, tokens: no son operaciones
  }

  /* ------------------------- Banco Ripley ---------------------- */
  if (de.indexOf('bancoripley') >= 0) {
    base.banco = 'Ripley'; base.medio = 'ripley';

    if (/pago de tu Pr[eé]stamo/i.test(t)) {
      const mm4 = String(campo_(t, 'Monto total')).match(/S\/\s*([\d.,]+)/);
      if (!mm4) return null;
      base.monto = num_(mm4[1]);
      base.tipo = 'Pago de deuda';
      base.concepto = 'Pago préstamo Ripley';
      base.fecha = fechaNum_(campo_(t, 'Fecha')) || fechaDe_(m);
      base.id = 'rip-' + (numOp_(t1, 'N[º°o] Operaci[oó]n') || m.getId());
      return base;
    }

    if (/Transferiste/i.test(t1)) {
      const totR = String(campo_(t, 'Monto total')).match(/S\/\s*([\d.,]+)/);
      const suelto = t1.match(/Transferiste\s*S\/\s*([\d.,]+)/i);
      if (!totR && !suelto) return null;
      base.monto = num_(totR ? totR[1] : suelto[1]);
      const dest = (t1.match(/\sa\s+([A-ZÁ-Ú][A-ZÁ-Ú .]{4,60}?)(?:\s{2,}|\s*Detalle|$)/) || [])[1] || '';
      const via = campo_(t, 'Banco destinatario');
      base.concepto = (/plin/i.test(via) ? 'Plin' : 'Transferencia') +
                      (dest ? ' a ' + titulo_(dest) : ' desde Ripley');
      base.fecha = fechaNum_(campo_(t, 'Fecha')) || fechaDe_(m);
      base.id = 'rip-' + (numOp_(t1, 'N[º°o] de Transacci[oó]n') || m.getId());
      return base;
    }
    return IGNORAR;   // encuestas y publicidad
  }

  /* ----------------------------- BCP --------------------------- */
  if (de.indexOf('notificacionesbcp') >= 0) {
    base.banco = 'BCP';

    // 1) consumo con tarjeta (lo más importante: alimenta tus tarjetas)
    let mm = t1.match(/Realizaste un consumo de\s*(S\/|US?\$|\$)\s*([\d.,]+)\s*con tu\s*Tarjeta de (Cr[eé]dito|D[eé]bito)/i);
    if (mm) {
      const enSoles = /S\//.test(mm[1]);
      base.monto = enSoles ? num_(mm[2]) : solesDe_(t1, num_(mm[2]));
      /* Un consumo en dolares casi nunca trae el tipo de cambio: el banco lo
         cobra despues, a su propia tasa. Antes esto se descartaba en silencio
         (asi se perdio un consumo de OPENAI). Ahora se manda con monto 0 y la
         app propone el monto en soles para que el lo ajuste. */
      if (!enSoles) { base.moneda = 'USD'; base.montoUsd = num_(mm[2]); }
      if (!base.monto && !base.montoUsd) return null;
      base.medio = /Cr[eé]dito/i.test(mm[3]) ? 'credito-bcp' : 'debito-bcp';
      base.concepto = titulo_(campo_(t, 'Empresa') ||
        (t1.match(/BCP en\s+(.+?)(?:\.|Por tu seguridad|$)/i) || [])[1] || 'Consumo');
      base.fecha = fechaBcpLarga_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (numOp_(t1, NUM_OP) || m.getId());
      return base;
    }

    /* 1b) pago a SU PROPIA tarjeta: no es un gasto nuevo, es que la deuda baja.
       Antes caia en el bloque 3 ("un pago") y se anotaba como gasto suelto:
       le inflaba el mes y no le bajaba la tarjeta. */
    mm = t1.match(/Realizaste un pago a tu tarjeta de\s*(S\/|US?\$|\$)\s*([\d.,]+)/i);
    if (mm) {
      const enSoles = /S\//.test(mm[1]);
      base.monto = enSoles ? num_(mm[2]) : solesDe_(t1, num_(mm[2]));
      if (!enSoles) { base.moneda = 'USD'; base.montoUsd = num_(mm[2]); }
      if (!base.monto && !base.montoUsd) return null;
      base.medio = 'credito-bcp';
      base.tipo = 'Pago de deuda';
      const cual = campo_(t, 'Pagado a');
      base.concepto = 'Pago Tarjeta BCP' + (cual ? ' ' + titulo_(cual.split('*')[0]) : '');
      base.fecha = fechaBcpLarga_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (numOp_(t1, NUM_OP) || m.getId());
      return base;
    }

    /* 2) wardadito: los bolsillos de ahorro del BCP. Un aporte saca plata de la
       cuenta y un retiro la devuelve: en los dos casos la plata sigue siendo
       suya, así que es un TRASLADO. Contarlo como gasto le inflaba el mes. */
    if (/wardadito/i.test(t + ' ' + asunto)) {
      mm = t1.match(/Realizaste (?:un retiro|un aporte(?: voluntario)?|un ahorro)[^S]*S\/\s*([\d.,]+)/i) ||
           t1.match(/Total (?:retirado|aportado)\s*\|?\s*S\/\s*([\d.,]+)/i);
      if (!mm) return null;
      base.monto = num_(mm[1]);
      base.medio = 'cuenta-bcp';
      base.tipo = 'Traslado';
      const bolsillo = (t.match(/wardadito\s+([A-Za-zÁ-úñ0-9 ]{1,24})/i) || [])[1];
      const esRetiro = /retiro/i.test(campo_(t, 'Operación realizada') + ' ' + asunto);
      base.concepto = (esRetiro ? 'Retiro de wardadito' : 'Aporte a wardadito') +
                      (bolsillo ? ' ' + titulo_(bolsillo.trim()) : '');
      base.entra = esRetiro;            // true = la plata vuelve a la cuenta
      base.fecha = fechaBcpLarga_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (numOp_(t1, NUM_OP) || m.getId());
      return base;
    }

    // 3) yapeo / transferencia / retiro desde la cuenta
    mm = t1.match(/Realizaste (?:un yapeo a celular|una transferencia|un retiro|un pago)[^S]*S\/\s*([\d.,]+)/i);
    if (mm) {
      base.monto = num_(mm[1]);
      base.medio = 'cuenta-bcp';
      base.concepto = /yapeo/i.test(t) ? 'Yapeo a celular'
                    : /transferencia/i.test(t) ? 'Transferencia entre cuentas'
                    : /retiro/i.test(t) ? 'Retiro de efectivo' : 'Operación BCP';
      // una transferencia entre cuentas propias no es gasto: se marca aparte
      if (/Entre mis Cuentas/i.test(asunto)) base.tipo = 'Traslado';
      base.fecha = fechaBcpLarga_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (numOp_(t1, NUM_OP) || m.getId());
      return base;
    }

    // 4) pago de servicios (formato distinto: sin tabla, con dos puntos)
    if (/Pago de servicios/i.test(t)) {
      mm = t1.match(/(?:Importe|Monto|Total)[^S]{0,30}S\/\s*([\d.,]+)/i);
      if (!mm) return null;
      base.monto = num_(mm[1]);
      base.medio = 'cuenta-bcp';
      base.concepto = titulo_(empresaSuelta_(t) || 'Pago de servicios');
      base.fecha = fechaBcpCorta_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (numOp_(t1, NUM_OP) || m.getId());
      return base;
    }
  }

  return null;
}

/* ============================== ARCHIVAR ============================== */

/** Marca operaciones como resueltas para que no vuelvan a la bandeja. */
function archivarCorreos_(ids) {
  if (!ids || !ids.length) return jsonCorreos_({ ok: true, archivados: 0 });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return jsonCorreos_({ ok: false, error: 'ocupado' });
  try {
    const v = leerVistos_();
    const hoy = new Date().toISOString().slice(0, 10);
    ids.forEach(function (id) { if (id) v[id] = hoy; });
    guardarVistos_(v);
    olvidarCache_();
    return jsonCorreos_({ ok: true, archivados: ids.length });
  } finally { lock.releaseLock(); }
}

/** Lo contrario de archivar: la app deshizo, y la operación tiene que volver.
 *  Sin esto, Deshacer dejaba el correo marcado como resuelto en el servidor y
 *  la operación no reaparecía nunca: se perdía. */
function desarchivarCorreos_(ids) {
  if (!ids || !ids.length) return jsonCorreos_({ ok: true, desarchivados: 0 });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return jsonCorreos_({ ok: false, error: 'ocupado' });
  try {
    const v = leerVistos_();
    let n = 0;
    ids.forEach(function (id) { if (id && v[id]) { delete v[id]; n++; } });
    guardarVistos_(v);
    olvidarCache_();
    return jsonCorreos_({ ok: true, desarchivados: n });
  } finally { lock.releaseLock(); }
}

/** Respuesta JSON propia, para no depender del otro archivo. */
function jsonCorreos_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** El enganche que va en doGet. Devuelve la bandeja lista para la app.
 *  `archivar: true` le dice a la app que este script SÍ sabe archivar, así
 *  no manda un POST que un script viejo confundiría con datos. */
function respuestaBandeja_(dias, fresco) {
  /* `archivar` y `desarchivar` le dicen a la app qué sabe hacer este script:
     si no supiera desarchivar, la app no puede prometer un Deshacer completo. */
  try { return jsonCorreos_({ ok: true, archivar: true, desarchivar: true,
    bandeja: bandeja_(+dias || 0, !!fresco && fresco !== '0') }); }
  catch (err) { return jsonCorreos_({ ok: false, error: String(err) }); }
}

function leerVistos_() {
  try { return JSON.parse(PropertiesService.getScriptProperties()
    .getProperty(VISTOS_K) || '{}') || {}; }
  catch (e) { return {}; }
}

function guardarVistos_(v) {
  const ks = Object.keys(v);
  if (ks.length > VISTOS_MAX) {           // se olvidan los más antiguos
    ks.sort(function (a, b) { return String(v[a]) < String(v[b]) ? -1 : 1; });
    ks.slice(0, ks.length - VISTOS_MAX).forEach(function (k) { delete v[k]; });
  }
  PropertiesService.getScriptProperties().setProperty(VISTOS_K, JSON.stringify(v));
}

/* ============================= AUXILIARES ============================= */

/** Normaliza el cuerpo. Ojo con esto, que aqui estuvo el error:
 *  el texto plano REAL del BCP y de Yape no trae tablas con pipes, trae
 *  negritas marcadas con asteriscos y las frases cortadas a mitad de linea:
 *      Realizaste un consumo de *S/ 1.00* con tu *Tarjeta de Debito BCP* en
 *      *PLIN-NOMBRE DEL CONTACTO.*
 *  Por eso los asteriscos se sacan siempre, y las frases se buscan en la
 *  version de una sola linea (unaLinea_). */
function limpiar_(t) {
  return String(t).replace(/\r/g, '').replace(/\*/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

/** Todo el cuerpo en una sola linea: para buscar frases que el correo parte. */
function unaLinea_(t) {
  return String(t).replace(/\s+/g, ' ').trim();
}

/** Etiquetas conocidas: sirven de freno cuando el correo pone varios datos
 *  seguidos en la misma linea (Yape hace eso). */
const ETIQUETAS = [
  'Yapero', 'Tu n[uú]mero de celular', 'Fecha y [Hh]ora(?: de la operaci[oó]n)?',
  'Celular del Beneficiario', 'Nombre del Beneficiario', 'Nombre del Yapero',
  'N[º°o]\\.? de operaci[oó]n(?: Yape)?', 'N[uú]mero de operaci[oó]n', 'ID de operaci[oó]n',
  'Empresa', 'Servicio', 'Titular', 'Total(?: del consumo)?', 'Importe', 'Monto[a-z ]{0,14}',
  'Operaci[oó]n realizada', 'N[uú]mero de Tarjeta[^\\n]{0,26}', 'Comercio', 'Concepto',
  'C[oó]digo[^\\n]{0,16}', 'Recibo', 'Vencimiento', 'Cuenta[^\\n]{0,22}', 'Destino', 'Origen',
  'Comisi[oó]n(?: Cliente| Interbancaria)?', 'Mensaje', 'ITF', 'Tipo de cambio',
  'Total cobrado al tipo de cambio', 'Pagado a', 'Tipo de pago', 'Desde', 'Moneda', 'Canal',
  'Monto Transferencia', 'Monto pagado', 'Monto total', 'NombreEntidad', 'Cuenta Origen',
  'Cuenta Destino', 'Cuenta Cargo', 'Cuenta Cr[eé]dito', 'Estado de la operaci[oó]n',
  'Fecha(?: Operaci[oó]n| Afiliaci[oó]n)?', 'Hora', 'Titular de pr[eé]stamo',
  'N[uú]mero de pr[eé]stamo', 'Nombre de cuenta de ahorro origen', 'N[º°o] Cuenta de ahorro origen',
  'Inter[eé]s moratorio', 'Tel[eé]fono destinatario', 'Banco destinatario',
  'N[º°o] de Transacci[oó]n', 'N[º°o] Operaci[oó]n', 'Serie-Nro'
];

/** Saca el valor de un dato, en cualquiera de las tres formas que usan los
 *  bancos:  "| Etiqueta | valor |",  "Etiqueta: valor",  "Etiqueta valor". */
function campo_(t, etiqueta) {
  const et = etiqueta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let m = t.match(new RegExp('\\|\\s*' + et + '\\s*\\|\\s*([^|\\n]+?)\\s*\\|', 'i'));
  if (m) return m[1].trim();
  /* sin pipes: el valor termina en la linea, o cuando empieza otra etiqueta */
  const freno = '(?=$|\\n|\\s+(?:' + ETIQUETAS.join('|') + ')\\b)';
  m = t.match(new RegExp('(?:^|\\n|\\s)' + et + '\\s*:?\\s*(.+?)' + freno, 'i'));
  if (m) return m[1].replace(/\s+/g, ' ').trim();
  /* Ripley pone la etiqueta en una linea y el valor en la siguiente */
  m = t.match(new RegExp('(?:^|\\n)\\s*' + et + '\\s*:?\\s*(?:\\n\\s*)+([^\\n]+)', 'i'));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/** El BCP y Yape escriben "Empresa: *PAGOEFECTIVO* Servicio: *...* Titular: ..."
 *  todo en una línea. Se limpian los asteriscos y se corta en la siguiente
 *  etiqueta, o el concepto salía como un párrafo entero. */
function empresaSuelta_(t) {
  let e = (String(t).match(/Empresa:?\s*([^\n|]+)/i) || [])[1] || '';
  e = e.replace(/\*/g, ' ')
       .split(/\b(?:Servicio|Titular|C[oó]digo|N[uú]mero|Fecha|Total|Importe|Recibo|Vencimiento)\s*:/i)[0];
  return e.replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** El numero de operacion, tolerando como lo escriba cada banco:
 *  "Numero de operacion 126976", "Codigo de operacion es: 0092894",
 *  "N. de operacion: 6443575". Se exige que empiece en digito: sin esto,
 *  un correo de Interbank dio el id "ibk-es:" y dos operaciones distintas
 *  se habrian tapado entre ellas. */
function numOp_(t1, etiquetas) {
  /* entre la etiqueta y el numero puede haber palabras ("es:", "fue"), asi que
     se dejan pasar hasta 16 caracteres que no sean digitos. */
  const m = String(t1).match(new RegExp('(?:' + etiquetas + ')[^0-9\n]{0,16}([0-9][0-9A-Za-z-]{2,})', 'i'));
  return m ? m[1] : '';
}

function num_(s) {
  return Math.round(parseFloat(String(s).replace(/,/g, '')) * 100) / 100 || 0;
}

/** "1034 MASS TIENDA DEMO" -> "1034 Mass Tienda Demo" (más legible) */
function titulo_(s) {
  s = String(s || '').trim().replace(/\s+/g, ' ').replace(/\.$/, '');
  if (s === s.toUpperCase() && s.length > 3) {
    s = s.toLowerCase().replace(/(^|\s|\*|-)([a-záéíóúñ])/g, function (a, p, c) {
      return p + c.toUpperCase();
    });
  }
  return s.slice(0, 60);
}

const MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, set: 9, sep: 9,
  oct: 10, nov: 11, dic: 12
};

function ymd_(y, mn, d) {
  if (!y || !mn || !d) return '';
  return y + '-' + ('0' + mn).slice(-2) + '-' + ('0' + d).slice(-2);
}

function mesNum_(nombre) {
  const k = String(nombre || '').toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  return MESES_ES[k] || 0;
}

/** Un correo en dolares trae "Total cobrado al tipo de cambio S/ 54.61", y si
 *  no, el tipo de cambio suelto. Sin esto, TODO lo que estaba en dolares se
 *  descartaba en silencio. */
function solesDe_(t1, usd) {
  const conv = campo_(t1, 'Total cobrado al tipo de cambio');
  let m = String(conv).match(/S\/\s*([\d.,]+)/);
  if (m) return num_(m[1]);
  m = t1.match(/Tipo de cambio\s*S\/\s*([\d.,]+)/i);
  if (m) return Math.round(usd * num_(m[1]) * 100) / 100;
  return 0;
}

/** Huancayo y Ripley: "15/08/2026" o "7/08/2026" */
function fechaNum_(s) {
  const m = String(s || '').match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  return m ? ymd_(+m[3], +m[2], +m[1]) : '';
}

/** BCP tabla: "15 de agosto de 2026 - 02:09 PM" */
function fechaBcpLarga_(s) {
  const m = String(s || '').match(/(\d{1,2})\s+de\s+([A-Za-zÁ-úñ]+)\s+de\s+(\d{4})/i);
  return m ? ymd_(+m[3], mesNum_(m[2]), +m[1]) : '';
}

/** BCP servicios: "Domingo, 16 Agosto 2026 - 08:14 PM" */
function fechaBcpCorta_(s) {
  const m = String(s || '').match(/(\d{1,2})\s+([A-Za-zÁ-úñ]+)\s+(\d{4})/i);
  return m ? ymd_(+m[3], mesNum_(m[2]), +m[1]) : '';
}

/** Yape: "16 agosto 2026 - 03:02 p. m." o "Fecha y Hora de la operación 16 agosto 2026"
 *  OJO: aquí la fecha viene en texto libre, así que el separador va perezoso y
 *  el día anclado con \b. Con un cuantificador glotón, "16 agosto" se leía "6". */
function fechaYape_(t) {
  /* Yape escribe el mes de tres formas: "16 agosto 2026", "13 Ago. 2026" y
     "13 Ago 2026". El punto opcional es lo que antes rompía la fecha y hacía
     que cayera al día en que llegó el correo (un día después). */
  const m = String(t).match(/Fecha y [Hh]ora[^\n]{0,32}?\b(\d{1,2})\s+([A-Za-zÁ-úñ]+)\.?\s+(\d{4})/);
  return m ? ymd_(+m[3], mesNum_(m[2]), +m[1]) : '';
}

/** Interbank: "08 Ago 2026 08:14 AM" */
function fechaIbk_(s) {
  const m = String(s || '').match(/(\d{1,2})\s+([A-Za-zÁ-úñ]+)\.?\s+(\d{4})/);
  return m ? ymd_(+m[3], mesNum_(m[2]), +m[1]) : '';
}

/** Último recurso: la fecha en que llegó el correo (hora de Lima). */
function fechaDe_(m) {
  return Utilities.formatDate(m.getDate(), Session.getScriptTimeZone() || 'America/Lima', 'yyyy-MM-dd');
}

/* ===================== PRUEBA MANUAL (recomendada) =====================
 * Ejecuta 'probarCorreos' desde el editor. Te muestra en el registro qué
 * detectó de los últimos 14 días, sin tocar nada. Es la forma de ver si
 * el lector entiende bien tus correos antes de usarlo desde la app.
 * ===================================================================== */
function probarCorreos() {
  const b = bandeja_(14, true);          // sin caché: para probar de verdad
  Logger.log('Detectados: ' + b.length);
  b.slice(0, 40).forEach(function (m) {
    Logger.log([m.fecha, 'S/ ' + m.monto.toFixed(2), m.banco, m.medio, m.tipo, m.concepto, m.id].join(' · '));
  });
  if (!b.length) Logger.log('Nada. Revisa que los correos del banco estén en la bandeja (no en Spam) y que no los hayas archivado con "archivar".');
}
