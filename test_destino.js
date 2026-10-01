/* Prueba de destinoCorreo(): a qué cuenta o tarjeta manda la bandeja cada correo.
   Se rompió una vez de verdad: con los nombres reales de sus cuentas
   ("Cuenta BCP / Yape", "Cuenta Interbank / Plin") la función buscaba
   /cuenta bancaria|banco|ahorro/ y no encontraba nada, así que todas las
   transferencias, yapeos, retiros, pagos de servicio y TODO Interbank se
   anotaban en Efectivo.
   Corre con:  node test_destino.js                                           */
const fs = require('fs');

/* saca el texto real de las funciones de nx.js y las ejecuta: así la prueba
   mide el código que se publica, no una copia. */
const SRC = fs.readFileSync(__dirname + '/nx.js', 'utf8');
function trozo(nombre) {
  const i = SRC.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no se encontró ' + nombre + ' en nx.js');
  let d = 0, j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}') { d--; if (!d) { j = k + 1; break; } }
  }
  return SRC.slice(i, j);
}
function cargar(nombres) {
  const cuerpo = nombres.map(trozo).join('\n');
  return new Function('S', 'ctaById', 'persist',
    cuerpo + '; return {' + nombres.join(',') + '};');
}

/* sus cuentas y deudas reales, con los nombres que él eligió */
const S = {
  cuentas: [
    {id:1, nombre:'Efectivo'},
    {id:2, nombre:'Cuenta BCP / Yape'},
    {id:3, nombre:'Cuenta Sueldo BCP'},
    {id:4, nombre:'Wardadito Casa'}, {id:8, nombre:'Wardadito Viaje'},
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

const destinoCorreo = cargar(['destinoCorreo'])(S).destinoCorreo;

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

/* ---------- los dos extremos de un traslado ----------
   El lector manda 'cta:2033' o 'wardadito:Viaje'. Aquí se cuida que la app
   los resuelva, que NO adivine cuando no sabe, y que aprenda a la primera. */
const T = cargar(['ctaDeToken', 'aprenderCuenta'])(
  S, id => S.cuentas.find(c => c.id === id), function () {});
const nom = t => { const c = T.ctaDeToken(t); return c ? c.nombre : null; };

console.log('');
const chkT = (q, real, esp) => {
  const ok = real === esp;
  console.log((ok ? '  ok   ' : '  FALLA') + ' · ' + q + '  →  ' + real);
  if (!ok) fallas.push(q + ': esperaba ' + esp + ', salió ' + real);
};

chkT('un wardadito se reconoce por su nombre', nom('wardadito:Viaje'), 'Wardadito Viaje');
chkT('y el otro también, sin confundirse', nom('wardadito:Casa'), 'Wardadito Casa');
chkT('una cuenta sin dígitos aprendidos NO se adivina', nom('cta:2033'), null);

/* él elige una vez: la app lo guarda y no vuelve a preguntar */
T.aprenderCuenta('cta:2033', 2);
chkT('tras elegirla una vez, ya la reconoce', nom('cta:2033'), 'Cuenta BCP / Yape');
T.aprenderCuenta('cta:9029', 3);
chkT('y la otra cuenta va a la suya', nom('cta:9029'), 'Cuenta Sueldo BCP');
chkT('el BCP enmascara con 3 dígitos y aun así calza', nom('cta:029'), 'Cuenta Sueldo BCP');
chkT('un dígito que nunca eligió sigue sin inventarse', nom('cta:5018'), null);
chkT('aprender dos veces no duplica', S.cuentas.find(c => c.id === 2).digitos.length, 1);

console.log('');
if (fallas.length) { console.log('FALLA\n- ' + fallas.join('\n- ')); process.exit(1); }
console.log('TODO BIEN · ' + casos.length + ' correos van a donde deben, y los traslados se resuelven solos');
