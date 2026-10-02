/* Prueba la red de seguridad que evita perder datos.
   Existe por un caso real: se abrió la app en la tablet, que tenía datos de
   días atrás, se tocó "Cargar de la nube" y se reemplazó el trabajo del día.
   No preguntaba nada y no había forma de volver.
   Corre con:  node test_respaldos.js                                         */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

const NOMBRES = ['SUGS','defaultSugs','defaults','migrate','ANTES_KEY',
 'resumenEstado','copiasAntes','copiaAntes','volverACopia','pedirOk','reemplazarEstado'];

function motor() {
  const out = [];
  for (const n of NOMBRES) {
    const re = new RegExp('^[ \\t]*(?:function\\s+' + n + '\\s*\\(|const\\s+' + n + '\\s*=)', 'm');
    const m = re.exec(src);
    if (!m) throw new Error('no se encontró en index.html: ' + n);
    let i = m.index, d = 0, k = i, vl = false;
    for (; k < src.length; k++) {
      const c = src[k];
      if ('{(['.includes(c)) { d++; if (c === '{') vl = true; }
      else if ('})]'.includes(c)) { d--; if (d === 0 && c === '}' && vl && /^[ \t]*function/.test(m[0])) { k++; break; } }
      else if (c === ';' && d === 0) { k++; break; }
      else if (c === '\n' && d === 0 && k > i + m[0].length) { k++; break; }
    }
    out.push({i, txt: src.slice(i, k)});
  }
  return out.sort((a, b) => a.i - b.i).map(o => o.txt).join('\n');
}
const CODIGO = motor();

/* un navegador de mentira: lo justo para que el código corra */
function entorno(estado, responder) {
  const guardado = {};
  const localStorage = {
    getItem: k => (k in guardado ? guardado[k] : null),
    setItem: (k, v) => { guardado[k] = String(v); },
  };
  const ctx = { S: estado, localStorage,
    window: { nxConfirmar: (o, seguir) => { if (responder(o)) seguir(); } },
    persist(){}, renderAll(){}, pushCloud(){}, generateRecurrentes(){}, confirm: () => true };
  const api = new Function('ctx', `
    with (ctx) {
      ${CODIGO}
      return {resumenEstado, copiasAntes, copiaAntes, volverACopia, reemplazarEstado,
              estado: () => S, ver: () => localStorage.getItem(ANTES_KEY), tope: ANTES_MAX};
    }`)(ctx);
  return api;
}

const est = (n, ts) => ({cfg:{titular:'J'}, categorias:[{id:1,nombre:'Otros',bucket:'Gusto',limite:0}],
  cuentas:[{id:1,nombre:'Efectivo'}], tx: Array.from({length:n}, (_,i) => ({id:i+1, fecha:'2026-10-01',
  tipo:'Gasto', catId:1, cuentaId:1, concepto:'x', monto:1})), _ts: ts});

let fallas = [];
const chk = (q, real, esp) => {
  const ok = real === esp;
  console.log((ok ? '  ok   ' : '  FALLA') + ' · ' + q + ' = ' + real + (ok ? '' : '   (esperaba ' + esp + ')'));
  if (!ok) fallas.push(q);
};

/* ---------- 1. si dice que no, no pasa nada ---------- */
{
  const S = est(47, 2000);
  const m = entorno(S, () => false);
  m.reemplazarEstado(est(12, 1000), 'cargar de la nube', '¿Cargar?');
  chk('si dice que NO, sus datos no se tocan', m.estado().tx.length, 47);
  chk('y no se guarda copia de nada', m.copiasAntes().length, 0);
}

/* ---------- 2. si dice que sí, reemplaza PERO deja copia ---------- */
{
  const S = est(47, 2000);
  const m = entorno(S, () => true);
  m.reemplazarEstado(est(12, 1000), 'cargar de la nube', '¿Cargar?');
  chk('reemplaza cuando acepta', m.estado().tx.length, 12);
  chk('deja una copia de lo que había', m.copiasAntes().length, 1);
  chk('la copia sabe cuántos eran', m.copiasAntes()[0].resumen.n, 47);
  chk('y por qué se hizo', m.copiasAntes()[0].motivo, 'cargar de la nube');

  /* el caso de la tablet: volver a como estaba */
  chk('volver atrás devuelve los 47', (m.volverACopia(0), m.estado().tx.length), 47);
  chk('y la copia usada se consume', m.copiasAntes().length, 0);
}

/* ---------- 3. el aviso tiene que decirle que lo que entra es más viejo ---------- */
{
  let visto = null;
  const m = entorno(est(47, 2000), o => { visto = o; return false; });
  m.reemplazarEstado(est(12, 1000), 'cargar de la nube', '¿Cargar?');
  chk('avisa que lo que entra es más viejo', /más viejo/i.test(visto.texto), true);
  chk('dice cuántos tiene ahora', /47/.test(visto.texto), true);
  chk('y cuántos quedarían', /12/.test(visto.texto), true);

  let v2 = null;
  const m2 = entorno(est(12, 1000), o => { v2 = o; return false; });
  m2.reemplazarEstado(est(47, 2000), 'cargar de la nube', '¿Cargar?');
  chk('si lo que entra es más nuevo, no alarma de más', /más viejo/i.test(v2.texto), false);
}

/* ---------- 4. restaurar un archivo tiene que quedar con fecha de HOY ---------- */
{
  const m = entorno(est(5, 9000), () => true);
  const antiguo = est(80, 1000);
  m.reemplazarEstado(antiguo, 'restaurar copia', '¿Reemplazar?', null, true);
  chk('al restaurar a mano, la fecha es de ahora', m.estado()._ts > 1000000, true);

  /* sin la marca, se conserva la fecha de lo que entra (caso nube) */
  const m2 = entorno(est(5, 9000), () => true);
  m2.reemplazarEstado(est(80, 1234), 'cargar de la nube', '¿Cargar?');
  chk('al cargar de la nube, se conserva su fecha', m2.estado()._ts, 1234);
}

/* ---------- 5. las copias no crecen sin fin ---------- */
{
  const m = entorno(est(10, 100), () => true);
  for (let i = 0; i < 6; i++) m.reemplazarEstado(est(i + 1, 200 + i), 'carga ' + i, '¿?');
  chk('se guardan como mucho ' + m.tope, m.copiasAntes().length, m.tope);
  chk('y la primera de la lista es la más reciente', m.copiasAntes()[0].motivo, 'carga 5');
}

console.log('');
if (fallas.length) { console.log('FALLA\n- ' + fallas.join('\n- ')); process.exit(1); }
console.log('TODO BIEN · no se pierden datos sin preguntar, y siempre se puede volver');
