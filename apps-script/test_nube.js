/* Prueba la nube: que un aparato atrasado NO pise al que está al día, y que
   los respaldos automáticos no se borren a sí mismos.
   Existe por un caso real: se abrió la app en la tablet con datos de días
   atrás y al sincronizar lo viejo se volvió "lo más nuevo" en todas partes.
   Corre con:  node test_nube.js                                             */
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'Codigo.gs'), 'utf8');

/* un Drive de mentira: carpeta con archivos en memoria */
function drive() {
  const files = new Map();
  const mk = (nombre, contenido, creado) => ({
    nombre, contenido, creado: creado || Date.now(), papelera: false,
    getName: function(){ return this.nombre; },
    getDateCreated: function(){ return new Date(this.creado); },
    setContent: function(c){ this.contenido = c; return this; },
    setTrashed: function(v){ this.papelera = v; files.delete(this.nombre); return this; },
    getBlob: function(){ const t = this.contenido; return { getDataAsString: () => t }; }
  });
  const iter = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  const carpeta = {
    getFilesByName: n => iter([...files.values()].filter(f => f.nombre === n)),
    getFilesByType: () => iter([...files.values()]),
    createFile: (n, c) => { const f = mk(n, c); files.set(n, f); return f; }
  };
  return { files, carpeta,
    DriveApp: { getFoldersByName: () => iter([carpeta]), createFolder: () => carpeta } };
}

function cargar(d) {
  const ctx = {
    DriveApp: d.DriveApp,
    MimeType: { PLAIN_TEXT: 'text/plain' },
    Session: { getScriptTimeZone: () => 'America/Lima', getEffectiveUser: () => ({ getEmail: () => 'x@y.z' }) },
    Utilities: { formatDate: (fecha, z, f) => {
      const p = n => String(n).padStart(2, '0');
      return f.replace('yyyy', fecha.getFullYear()).replace('MM', p(fecha.getMonth() + 1))
              .replace('dd', p(fecha.getDate())).replace('HHmm', p(fecha.getHours()) + p(fecha.getMinutes()));
    }},
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } },
    GmailApp: { search: () => [] }, Logger: { log(){} }, console
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

/* las constantes son `const` dentro del script, no salen al contexto: se leen del fuente */
const RECIENTES = +(/const RECIENTES = (\d+)/.exec(src) || [])[1];

const estado = (n, ts) => ({ cfg:{}, categorias:[], tx: Array.from({length:n}, (_,i)=>({id:i})), _ts: ts });
const guardar = (ctx, e) => JSON.parse(ctx.guardar_(JSON.stringify(e), e));

let fallas = [];
const chk = (q, real, esp) => {
  const ok = real === esp;
  console.log((ok ? '  ok   ' : '  FALLA') + ' · ' + q + ' = ' + real + (ok ? '' : '   (esperaba ' + esp + ')'));
  if (!ok) fallas.push(q);
};

const AHORA = Date.now(), DIA = 86400000;

/* ---------- 1. un aparato atrasado no pisa al que está al día ---------- */
{
  const d = drive(), ctx = cargar(d);
  chk('el primer guardado entra', guardar(ctx, estado(47, AHORA)).ok, true);

  const r = guardar(ctx, estado(12, AHORA - 3 * DIA));   // la tablet, con datos de hace 3 días
  chk('el aparato atrasado es RECHAZADO', r.ok, false);
  chk('y dice por qué', r.error, 'mas-viejo');
  chk('la nube conserva los 47', JSON.parse(d.files.get('finanzas-datos.json').contenido).tx.length, 47);
}

/* ---------- 2. pero él puede forzarlo a propósito ---------- */
{
  const d = drive(), ctx = cargar(d);
  guardar(ctx, estado(47, AHORA));
  const viejo = estado(12, AHORA - 3 * DIA); viejo.forzar = true;
  chk('con forzar sí entra', guardar(ctx, viejo).ok, true);
  const guardado = JSON.parse(d.files.get('finanzas-datos.json').contenido);
  chk('y quedan los 12', guardado.tx.length, 12);
  chk('la orden de forzar NO se guarda entre sus datos', 'forzar' in guardado, false);
}

/* ---------- 3. diferencias de reloj entre aparatos no bloquean nada ---------- */
{
  const d = drive(), ctx = cargar(d);
  guardar(ctx, estado(47, AHORA));
  chk('un reloj 30 s atrasado no molesta', guardar(ctx, estado(48, AHORA - 30000)).ok, true);
}

/* ---------- 4. el respaldo del día no se pisa a sí mismo ---------- */
{
  const d = drive(), ctx = cargar(d);
  guardar(ctx, estado(47, AHORA));                 // como empezó el día
  guardar(ctx, estado(3, AHORA + 1000));           // el accidente, más tarde
  const hoy = [...d.files.keys()].find(n => n.indexOf('backup-') === 0);
  chk('el respaldo del día guarda cómo empezó', JSON.parse(d.files.get(hoy).contenido).tx.length, 47);
  chk('y la copia viva sí tiene lo último', JSON.parse(d.files.get('finanzas-datos.json').contenido).tx.length, 3);
}

/* ---------- 5. las versiones recientes no crecen sin fin ---------- */
{
  const d = drive(), ctx = cargar(d);
  for (let i = 0; i < 20; i++) {
    d.carpeta.createFile('reciente-2026-09-' + String(i + 1).padStart(2, '0') + '-1200.json', '{}');
  }
  guardar(ctx, estado(1, AHORA));
  const recientes = [...d.files.keys()].filter(n => n.indexOf('reciente-') === 0);
  chk('se conservan ' + RECIENTES + ' versiones recientes', recientes.length, RECIENTES);
}

/* ---------- 6. lo que no parece el estado de la app no pisa nada ---------- */
{
  const d = drive(), ctx = cargar(d);
  guardar(ctx, estado(47, AHORA));
  chk('un POST raro se rechaza', JSON.parse(ctx.guardar_('{"hola":1}', {hola:1})).ok, false);
  chk('y la nube sigue intacta', JSON.parse(d.files.get('finanzas-datos.json').contenido).tx.length, 47);
}

console.log('');
if (fallas.length) { console.log('FALLA\n- ' + fallas.join('\n- ')); process.exit(1); }
console.log('TODO BIEN · lo viejo no pisa lo nuevo y los respaldos sobreviven');
