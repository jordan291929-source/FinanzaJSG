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

/* ============================== ENDPOINTS ============================== */

function doGet(e) {
  if (!claveOk_(e)) return json_({ error: 'clave incorrecta' });

  // Bandeja de correos del banco (ver Correos.gs). Solo lee Gmail, no toca tus datos.
  if (e && e.parameter && e.parameter.bandeja) return respuestaBandeja_(e.parameter.dias);

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

/** Un respaldo por día. Protege del caso peor: si la app borra tus datos,
 *  el guardado automático también pisaría la copia de la nube. */
function respaldoDiario_(carpeta, cuerpo) {
  const zona = Session.getScriptTimeZone() || 'America/Lima';
  const hoy = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd');
  const nombre = 'backup-' + hoy + '.json';

  const it = carpeta.getFilesByName(nombre);
  if (it.hasNext()) it.next().setContent(cuerpo);
  else carpeta.createFile(nombre, cuerpo, MimeType.PLAIN_TEXT);

  // Limpieza de respaldos viejos
  const corte = Date.now() - DIAS_BACKUP * 86400000;
  const viejos = carpeta.getFilesByType(MimeType.PLAIN_TEXT);
  while (viejos.hasNext()) {
    const v = viejos.next();
    if (v.getName().indexOf('backup-') === 0 && v.getDateCreated().getTime() < corte) {
      v.setTrashed(true);
    }
  }
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
