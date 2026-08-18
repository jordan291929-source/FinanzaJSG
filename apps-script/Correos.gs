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
 *
 * ENGANCHE (dos trozos que van en tu doGet y tu doPost):
 *   doGet:   if (e && e.parameter && e.parameter.bandeja) return respuestaBandeja_(e.parameter.dias);
 *   doPost:  var _d=null; try{ _d=JSON.parse(e.postData.contents); }catch(x){}
 *            if (_d && _d.action==='archivar') return archivarCorreos_(_d.ids);
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
const REMITENTES = [
  'notificaciones@notificacionesbcp.com.pe',
  'notificaciones@yape.pe',
  'servicioalcliente@netinterbank.com.pe'
];

/* =============================== LECTURA =============================== */

/**
 * Devuelve los movimientos detectados que todavía no has resuelto.
 * @param {number} dias  días hacia atrás
 */
function bandeja_(dias) {
  const d = Math.min(120, Math.max(1, dias || DIAS));
  const q = 'from:{' + REMITENTES.join(' ') + '} newer_than:' + d + 'd';

  /* Caché de 5 minutos: leer el buzón tardaba ~30 s y la app parecía colgada.
     Con esto, abrir la bandeja dos veces seguidas es instantáneo. */
  const cache = CacheService.getScriptCache();
  const clave = 'bandeja:' + d;
  const guardado = cache.get(clave);
  if (guardado) { try { return JSON.parse(guardado); } catch (e) {} }

  const vistos = leerVistos_();
  const out = [];
  const hilos = GmailApp.search(q, 0, MAX_HILOS);
  /* getMessagesForThreads trae los mensajes de TODOS los hilos en una sola
     llamada; hacerlo hilo por hilo era lo que se comía los segundos. */
  const porHilo = GmailApp.getMessagesForThreads(hilos);

  porHilo.forEach(function (msgs) {
    msgs.forEach(function (m) {
      let mv;
      try { mv = interpretar_(m); } catch (e) { return; }
      if (!mv) return;
      if (vistos[mv.id]) return;
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

  // Nunca registrar operaciones que no ocurrieron
  if (/rechaz[oó]|no se pudo|denegad|fallid/i.test(asunto + ' ' + t.slice(0, 400))) return null;
  // Ni cambios de configuración, ni estados de cuenta
  if (/constancia de configuraci[oó]n|estado de cuenta|comprobante de pago/i.test(asunto)) return null;

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
    let mm = t.match(/Monto total\s*S\/\s*([\d.,]+)/i) || t.match(/Monto de yapeo\*?\s*S\/\s*([\d.,]+)/i);
    if (!mm) return null;
    base.monto = num_(mm[1]);
    /* El pago de un servicio trae "Empresa: Movistar": ese nombre vale más que
       un genérico "Yapeo". Después va el comercio del "Tu pago en X". */
    const emp = empresaSuelta_(t);
    const co = t.match(/Tu pago en\s+([^\n!¡]+?)\s*(?:fue exitoso|!)/i);
    base.concepto = titulo_(emp) || (co ? titulo_(co[1]) : '') ||
                    (/servicio fue yapeado/i.test(t) ? 'Yapeo de servicio' : 'Yapeo');
    base.fecha = fechaYape_(t) || fechaDe_(m);
    const op = t.match(/ID de operaci[oó]n:?\s*([0-9A-Za-z-]+)/i) ||
               t.match(/N[º°o]\.?\s*de operaci[oó]n(?:\s*Yape)?:?\s*([0-9A-Za-z-]+)/i);
    base.id = 'yape-' + (op ? op[1] : m.getId());
    return base;
  }

  /* -------------------------- Interbank ------------------------ */
  if (de.indexOf('netinterbank') >= 0) {
    base.banco = 'Interbank'; base.medio = 'interbank';
    // ojo: puede traer dos líneas de monto (soles y dólares). Tomamos SOLES.
    const mm = t.match(/Moneda y monto\s*\|\s*S\/\s*([\d.,]+)/i) ||
               t.match(/Recibo\s*1\s*S\/\s*([\d.,]+)/i);
    if (!mm) return null;
    base.monto = num_(mm[1]);
    const emp = campo_(t, 'Empresa');
    const tar = campo_(t, 'Tarjeta de crédito');
    base.concepto = titulo_(emp) || (tar ? 'Pago tarjeta Interbank' : 'Pago Interbank');
    if (tar) base.tipo = 'Pago de deuda';
    if (/Plin/i.test(asunto)) base.concepto = 'Plin';
    base.fecha = fechaIbk_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
    const op = campo_(t, 'Código de operación');
    base.id = 'ibk-' + (op || m.getId());
    // guardamos el monto en dólares como aviso, no como movimiento
    const usd = t.match(/Moneda y monto\s*\|\s*US\$\s*([\d.,]+)/i);
    if (usd) base.avisoUsd = num_(usd[1]);
    return base;
  }

  /* ----------------------------- BCP --------------------------- */
  if (de.indexOf('notificacionesbcp') >= 0) {
    base.banco = 'BCP';

    // 1) consumo con tarjeta (lo más importante: alimenta tus tarjetas)
    let mm = t.match(/Realizaste un consumo de\s*S\/\s*([\d.,]+)\s*con tu Tarjeta de (Cr[eé]dito|D[eé]bito)/i);
    if (mm) {
      base.monto = num_(mm[1]);
      base.medio = /Cr[eé]dito/i.test(mm[2]) ? 'credito-bcp' : 'debito-bcp';
      base.concepto = titulo_(campo_(t, 'Empresa') || (t.match(/BCP en\s+([^.\n]+)/i) || [])[1] || 'Consumo');
      base.fecha = fechaBcpLarga_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (campo_(t, 'Número de operación') || m.getId());
      return base;
    }

    /* 2) wardadito: los bolsillos de ahorro del BCP. Un aporte saca plata de la
       cuenta y un retiro la devuelve: en los dos casos la plata sigue siendo
       suya, así que es un TRASLADO. Contarlo como gasto le inflaba el mes. */
    if (/wardadito/i.test(t + ' ' + asunto)) {
      mm = t.match(/Realizaste (?:un retiro|un aporte(?: voluntario)?|un ahorro)[^S]*S\/\s*([\d.,]+)/i) ||
           t.match(/\|\s*Total (?:retirado|aportado)\s*\|\s*S\/\s*([\d.,]+)/i);
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
      base.id = 'bcp-' + (campo_(t, 'Número de operación') || m.getId());
      return base;
    }

    // 3) yapeo / transferencia / retiro desde la cuenta
    mm = t.match(/Realizaste (?:un yapeo a celular|una transferencia|un retiro|un pago)[^S]*S\/\s*([\d.,]+)/i);
    if (mm) {
      base.monto = num_(mm[1]);
      base.medio = 'cuenta-bcp';
      base.concepto = /yapeo/i.test(t) ? 'Yapeo a celular'
                    : /transferencia/i.test(t) ? 'Transferencia entre cuentas'
                    : /retiro/i.test(t) ? 'Retiro de efectivo' : 'Operación BCP';
      // una transferencia entre cuentas propias no es gasto: se marca aparte
      if (/Entre mis Cuentas/i.test(asunto)) base.tipo = 'Traslado';
      base.fecha = fechaBcpLarga_(campo_(t, 'Fecha y hora')) || fechaDe_(m);
      base.id = 'bcp-' + (campo_(t, 'Número de operación') || m.getId());
      return base;
    }

    // 4) pago de servicios (formato distinto: sin tabla, con dos puntos)
    if (/Pago de servicios/i.test(t)) {
      mm = t.match(/(?:Importe|Monto|Total)[^\n]*?S\/\s*([\d.,]+)/i);
      if (!mm) return null;
      base.monto = num_(mm[1]);
      base.medio = 'cuenta-bcp';
      base.concepto = titulo_(empresaSuelta_(t) || 'Pago de servicios');
      base.fecha = fechaBcpCorta_((t.match(/Fecha y hora:?\s*([^\n|]+)/i) || [])[1]) || fechaDe_(m);
      base.id = 'bcp-' + ((t.match(/N[uú]mero de operaci[oó]n:?\s*(\d+)/i) || [])[1] || m.getId());
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

/** Respuesta JSON propia, para no depender del otro archivo. */
function jsonCorreos_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** El enganche que va en doGet. Devuelve la bandeja lista para la app.
 *  `archivar: true` le dice a la app que este script SÍ sabe archivar, así
 *  no manda un POST que un script viejo confundiría con datos. */
function respuestaBandeja_(dias) {
  try { return jsonCorreos_({ ok: true, archivar: true, bandeja: bandeja_(+dias || 0) }); }
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

/** El cuerpo en texto plano viene con tablas en pipes. Lo normaliza. */
function limpiar_(t) {
  return String(t).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

/** Saca el valor de una fila de tabla:  | Etiqueta | valor | */
function campo_(t, etiqueta) {
  const re = new RegExp('\\|\\s*' + etiqueta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
                        '\\s*\\|\\s*([^|\\n]+?)\\s*\\|', 'i');
  const m = t.match(re);
  return m ? m[1].trim() : '';
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

function num_(s) {
  return Math.round(parseFloat(String(s).replace(/,/g, '')) * 100) / 100 || 0;
}

/** "1034 MASS AMERICA6 LV M" -> "1034 Mass America6 Lv M" (más legible) */
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
  const b = bandeja_(14);
  Logger.log('Detectados: ' + b.length);
  b.slice(0, 40).forEach(function (m) {
    Logger.log([m.fecha, 'S/ ' + m.monto.toFixed(2), m.banco, m.medio, m.tipo, m.concepto, m.id].join(' · '));
  });
  if (!b.length) Logger.log('Nada. Revisa que los correos del banco estén en la bandeja (no en Spam) y que no los hayas archivado con "archivar".');
}
