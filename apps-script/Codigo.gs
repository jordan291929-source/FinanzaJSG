/**
 * Finanzas Personales — respaldo en Google Drive y envío del estado de cuenta.
 *
 * Va acompañado de Correos.gs, que agrega el lector de notificaciones del
 * banco (?bandeja=1 y action:'archivar'). Si no pegas Correos.gs, esas dos
 * rutas devuelven error y todo lo demás sigue funcionando igual.
 *
 * Este script es la "nube" de la app. Hace tres cosas:
 *   GET               -> devuelve tus datos guardados (la app los carga al abrir)
 *   POST              -> guarda tus datos en un JSON en tu Drive (la app lo hace sola al editar)
 *   POST action=email -> te manda el estado de cuenta en PDF y Excel a tu correo
 *
 * Cómo publicarlo: ver GUIA-NUBE.md
 */

/* ============================ CONFIGURACIÓN ============================ */

/** Clave privada. Cámbiala por cualquier texto largo tuyo, sin espacios.
 *  Va al final de la URL que pegas en la app:  .../exec?k=TU_CLAVE
 *  Si la dejas vacía (''), cualquiera con el link podría leer o pisar tus datos. */
const CLAVE = 'cambia-esto-por-algo-tuyo-largo-2026';

/** Carpeta y archivo que se crean solos en tu Drive. */
const CARPETA = 'Finanzas Personales';
const ARCHIVO = 'finanzas-datos.json';

/** Días que se conservan los respaldos diarios automáticos. */
const DIAS_BACKUP = 60;

/** Cuántas versiones recientes (con hora) se guardan además de la del día. */
const RECIENTES = 12;

/** Margen de reloj entre aparatos antes de considerar que un guardado llega
 *  atrasado. Dos minutos: el caso real son DÍAS de diferencia, no minutos. */
const MARGEN_RELOJ_MS = 120000;

/* ============================== ENDPOINTS ============================== */

function doGet(e) {
  if (!claveOk_(e)) return json_({ error: 'clave incorrecta' });

  // Bandeja de correos del banco (ver Correos.gs). Solo lee Gmail, no toca tus datos.
  if (e && e.parameter && e.parameter.bandeja)
    return respuestaBandeja_(e.parameter.dias, e.parameter.fresco);

  const f = archivo_();
  // Sin archivo aún -> {} : la app lo entiende como "la nube está vacía".
  return textoJson_(f ? f.getBlob().getDataAsString('UTF-8') : '{}');
}

function doPost(e) {
  if (!claveOk_(e)) return json_({ ok: false, error: 'clave incorrecta' });

  const cuerpo = (e && e.postData && e.postData.contents) || '';
  let d;
  try { d = JSON.parse(cuerpo); }
  catch (err) { return json_({ ok: false, error: 'json invalido' }); }

  if (d && d.action === 'email') return enviarCorreo_(d);
  if (d && d.action === 'archivar') return archivarCorreos_(d.ids);   // ver Correos.gs
  if (d && d.action === 'desarchivar') return desarchivarCorreos_(d.ids);   // deshacer
  return guardar_(cuerpo, d);
}

/* ============================== GUARDADO =============================== */

function guardar_(cuerpo, d) {
  // Cortafuegos: si llega algo que no parece el estado de la app, no piso nada.
  if (!d || typeof d !== 'object' || !(d.cfg || d.categorias || d.tx)) {
    return json_({ ok: false, error: 'no parece el estado de la app' });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'ocupado' });

  try {
    const carpeta = carpeta_();
    const f = archivo_();

    /* Un aparato atrasado no pisa al que está al día.
       Paso de verdad: se abrió la app en la tablet, que tenía datos de hace
       días, y al tocar cualquier cosa subió ESO con fecha de ahora. A partir de
       ahí lo viejo era "lo más nuevo" y el celular se lo tragaba en la
       siguiente carga. El servidor es el único sitio que ve las dos fechas,
       así que la comprobación va aquí.
       Con `forzar` se puede pasar por encima a propósito. */
    if (f && !d.forzar) {
      const previo = tsGuardado_(f), llega = +(d && d._ts) || 0;
      if (previo && llega && llega < previo - MARGEN_RELOJ_MS) {
        return json_({ ok: false, error: 'mas-viejo', nube: previo, enviado: llega });
      }
    }

    /* `forzar` es una orden del usuario, no un dato suyo: no se guarda. */
    if (d.forzar) { delete d.forzar; cuerpo = JSON.stringify(d); }

    if (f) f.setContent(cuerpo);
    else carpeta.createFile(ARCHIVO, cuerpo, MimeType.PLAIN_TEXT);

    respaldoDiario_(carpeta, cuerpo);
    return json_({ ok: true, guardado: new Date().toISOString(), bytes: cuerpo.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** La fecha del estado que ya está guardado en la nube. */
function tsGuardado_(f) {
  try { return +(JSON.parse(f.getBlob().getDataAsString('UTF-8'))._ts) || 0; }
  catch (e) { return 0; }
}

/** Respaldos automáticos, en dos niveles.
 *
 *  backup-AAAA-MM-DD.json : cómo empezó cada día, 60 días. NO se sobrescribe.
 *    Antes sí: cada guardado pisaba el del día, así que un accidente a media
 *    mañana se llevaba por delante el respaldo de esa misma mañana. Ahora el
 *    primer guardado del día queda intacto pase lo que pase.
 *
 *  reciente-AAAA-MM-DD-HHmm.json : las últimas 12 versiones, para volver a
 *    hace un rato y no sólo al principio del día.
 */
function respaldoDiario_(carpeta, cuerpo) {
  const zona = Session.getScriptTimeZone() || 'America/Lima';
  const ahora = new Date();
  const hoy = Utilities.formatDate(ahora, zona, 'yyyy-MM-dd');

  const diario = 'backup-' + hoy + '.json';
  if (!carpeta.getFilesByName(diario).hasNext()) {
    carpeta.createFile(diario, cuerpo, MimeType.PLAIN_TEXT);
  }

  const sello = Utilities.formatDate(ahora, zona, 'yyyy-MM-dd-HHmm');
  const reciente = 'reciente-' + sello + '.json';
  const ir = carpeta.getFilesByName(reciente);
  if (ir.hasNext()) ir.next().setContent(cuerpo);
  else carpeta.createFile(reciente, cuerpo, MimeType.PLAIN_TEXT);

  limpiar_(carpeta);
}

/** Tira los diarios de más de DIAS_BACKUP y deja sólo los RECIENTES últimos. */
function limpiar_(carpeta) {
  const corte = Date.now() - DIAS_BACKUP * 86400000;
  const recientes = [];
  const it = carpeta.getFilesByType(MimeType.PLAIN_TEXT);
  while (it.hasNext()) {
    const v = it.next(), n = v.getName();
    if (n.indexOf('backup-') === 0 && v.getDateCreated().getTime() < corte) v.setTrashed(true);
    else if (n.indexOf('reciente-') === 0) recientes.push(v);
  }
  // el nombre lleva la fecha, así que ordenar por nombre es ordenar por hora
  recientes.sort(function (a, b) { return a.getName() < b.getName() ? 1 : -1; });
  recientes.slice(RECIENTES).forEach(function (v) { v.setTrashed(true); });
}

/* ================================ CORREO =============================== */

function enviarCorreo_(d) {
  try {
    const para = Session.getEffectiveUser().getEmail();
    const adj = [];
    if (d.pdf) {
      adj.push(Utilities.newBlob(Utilities.base64Decode(d.pdf),
        'application/pdf', 'EECC_' + (d.mes || 'mes') + '.pdf'));
    }
    if (d.xlsx) {
      adj.push(Utilities.newBlob(Utilities.base64Decode(d.xlsx),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'EECC_' + (d.mes || 'mes') + '.xlsx'));
    }
    GmailApp.sendEmail(para, d.subject || 'Estado de cuenta', d.body || '', {
      name: 'Finanzas Personales',
      attachments: adj
    });
    return json_({ ok: true, enviado: para });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ============================== AUXILIARES ============================= */

function claveOk_(e) {
  if (!CLAVE) return true;
  return !!(e && e.parameter && e.parameter.k === CLAVE);
}

function carpeta_() {
  const it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}

function archivo_() {
  const it = carpeta_().getFilesByName(ARCHIVO);
  return it.hasNext() ? it.next() : null;
}

function textoJson_(txt) {
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return textoJson_(JSON.stringify(obj));
}

/* ===================== PRUEBA MANUAL (opcional) ========================
 * Ejecuta 'probar' desde el editor para confirmar que Drive y Gmail están
 * autorizados y ver qué hay guardado. No modifica tus datos.
 * ===================================================================== */
function probar() {
  const f = archivo_();
  Logger.log('Carpeta: ' + carpeta_().getName());
  Logger.log('Archivo: ' + (f ? f.getName() + ' · ' + f.getSize() + ' bytes' : 'todavía no existe'));
  Logger.log('Correo destino: ' + Session.getEffectiveUser().getEmail());
  Logger.log('Clave configurada: ' + (CLAVE ? 'sí' : 'NO — cualquiera con el link entra'));
}
