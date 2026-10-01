/* Prueba de destinoCorreo(): a qué cuenta o tarjeta manda la bandeja cada correo.
   Se rompió una vez de verdad: con los nombres reales de sus cuentas
   ("Cuenta BCP / Yape", "Cuenta Interbank / Plin") la función buscaba
   /cuenta bancaria|banco|ahorro/ y no encontraba nada, así que todas las
   transferencias, yapeos, retiros, pagos de servicio y TODO Interbank se
   anotaban en Efectivo.
   Corre con:  node test_destino.js                                           */
const fs = require('fs');

/* saca el texto real de la función de nx.js y lo ejecuta: así la prueba mide
   el código que se publica, no una copia. */
function cargar() {
  const src = fs.readFileSync(__dirname + '/nx.js', 'utf8');
  const i = src.indexOf('function destinoCorreo(m){');
  if (i < 0) throw new Error('no se encontró destinoCorreo en nx.js');
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) { j = k + 1; break; } }
  }
  const cuerpo = src.slice(i, j);
  return new Function('S', cuerpo + '; return destinoCorreo;');
}

/* sus cuentas y deudas reales, con los nombres que él eligió */
const S = {
  cuentas: [
    {id:1, nombre:'Efectivo'},
    {id:2, nombre:'Cuenta BCP / Yape'},
    {id:3, nombre:'Cuenta Sueldo BCP'},
    {id:4, nombre:'Wardadito BCP'},
    {id:5, nombre:'Cuenta Interbank / Plin'},
    {id:6, nombre:'Caja Huancayo'},
    {id:7, nombre:'Ripley Max'}
  ],
  tarjetas: [{id:101, nombre:'Tarjeta BCP'}, {id:102, nombre:'Tarjeta Interbank'}],
  loans: [
    {id:201, nombre:'Prestamo Caja Huancayo'},
    {id:202, nombre:'Prestamo BCP'},
    {id:203, nombre:'Prestamo Ripley'}
  ]
};

const destinoCorreo = cargar()(S);

const casos = [
  // [qué llegó,                                      medio,          tipo,              tipo esperado, rótulo esperado]
  ['consumo con tarjeta de crédito BCP',              'credito-bcp',  'Gasto',           'card',     'Tarjeta BCP'],
  ['pago a su propia tarjeta BCP',                    'credito-bcp',  'Pago de deuda',   'pagoCard', 'Tarjeta BCP'],
  ['consumo con tarjeta de débito BCP',               'debito-bcp',   'Gasto',           'cta',      'Cuenta BCP / Yape'],
  ['yapeo a celular',                                 'cuenta-bcp',   'Gasto',           'cta',      'Cuenta BCP / Yape'],
  ['transferencia desde la cuenta BCP',               'cuenta-bcp',   'Gasto',           'cta',      'Cuenta BCP / Yape'],
  ['pago de servicios por BCP',                       'cuenta-bcp',   'Gasto',           'cta',      'Cuenta BCP / Yape'],
  ['aporte a wardadito (sale de la cuenta)',          'cuenta-bcp',   'Traslado',        'cta',      'Cuenta BCP / Yape'],
  ['aviso de la app Yape',                            'yape',         'Gasto',           'cta',      'Cuenta BCP / Yape'],
  ['movimiento de la cuenta Interbank',               'interbank',    'Gasto',           'cta',      'Cuenta Interbank / Plin'],
  ['cobro por Plin',                                  'interbank',    'Gasto',           'cta',      'Cuenta Interbank / Plin'],
  ['pago a su propia tarjeta Interbank',              'interbank',    'Pago de deuda',   'pagoCard', 'Tarjeta Interbank'],
  ['pago de la cuota de Caja Huancayo',               'huancayo',     'Pago de deuda',   'pagoLoan', 'Prestamo Caja Huancayo'],
  ['movimiento de Caja Huancayo que no es pago',      'huancayo',     'Gasto',           'cta',      'Caja Huancayo'],
  ['pago de la cuota de Ripley',                      'ripley',       'Pago de deuda',   'pagoLoan', 'Prestamo Ripley'],
  ['compra en Ripley con la Max',                     'ripley',       'Gasto',           'cta',      'Ripley Max']
];

let fallas = [];
for (const [qué, medio, tipo, espTipo, espRot] of casos) {
  const r = destinoCorreo({medio, tipo, concepto: qué});
  const ok = r && r.tipo === espTipo && r.rot === espRot;
  console.log((ok ? '  ok   ' : '  FALLA') + ' · ' + qué +
              '  →  ' + (r ? r.tipo + ' / ' + r.rot : 'nada'));
  if (!ok) fallas.push(qué + ': esperaba ' + espTipo + ' / ' + espRot +
                       ', salió ' + (r ? r.tipo + ' / ' + r.rot : 'nada'));
}

/* nadie debe terminar en Efectivo por descarte: eso era justo el error */
const aEfectivo = casos.filter(([q, medio, tipo]) => {
  const r = destinoCorreo({medio, tipo, concepto: q});
  return r && r.rot === 'Efectivo';
});
if (aEfectivo.length) fallas.push(aEfectivo.length + ' correos cayeron en Efectivo por descarte');

console.log('');
if (fallas.length) { console.log('FALLA\n- ' + fallas.join('\n- ')); process.exit(1); }
console.log('TODO BIEN · ' + casos.length + ' correos van a donde deben');
