/* Prueba del cuadre: corregir sin que la corrección se disfrace de gasto.
   Lo que se cuida aquí es que un cuadre NO se cuele en ninguna suma donde no
   debe. Si se cuela en una sola, el presupuesto vuelve a mentir justo cuando
   él estaba tratando de arreglarlo.
   Corre con:  node test_cuadre.js                                            */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

const NOMBRES = ['pad','daysIn','keyOf','newId','monthNum','inMonth','catById','ctaById',
 'esDeuda','esCuadre','cuadreSinCaja','txEstimado','mRate','cuotaOf','impliedRate',
 'pagosCompra','pagosGenerales','saldoPendienteCompra','comprasState','consumidoCard',
 'fechaMes','paidCardUpto','paidLoanUpto','cardCumSched','cardPayMonth','cardMonthStatus',
 'loanPaidTot','loanCuotasPagadas','loanRem','loanCuotaMes','loanCumSched','loanMonthStatus',
 'cuotasMes','deudaTotal','gastoMes','gastoMesExacto','gastoMesEstimado','gastoDia',
 'cashOutMes','ingresoRealMes','saldoHasta','saldoHastaExacto','saldoCuenta','bucketReal',
 'addCuadreCaja','addCuadreDeuda','cuadreMes'];

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

/* sus datos reales, recortados a lo que hace falta */
const base = () => ({
  cfg: {saldoIni: 0},
  categorias: [
    {id: 1, nombre: 'Alimentación', bucket: 'Necesidad', limite: 750},
    {id: 7, nombre: 'Pago de deudas', bucket: 'Deuda', limite: 0, auto: 'deuda'}
  ],
  cuentas: [{id: 2, nombre: 'Cuenta BCP / Yape'}, {id: 3, nombre: 'Cuenta Sueldo BCP'}],
  tarjetas: [{id: 101, nombre: 'Tarjeta BCP', linea: 10700, dia: 20, cierre: 25,
    compras: [{id: 1102, desc: 'Consumo general 2', saldo: 4650, n: 3, tea: 0, startY: 2026, startM: 10}]}],
  loans: [{id: 202, nombre: 'Prestamo BCP 1', monto: 11500, cuota: 447.95, meses: 59,
    dia: 1, startY: 2026, startM: 10}],
  metas: [], recurrentes: [], favoritos: [],
  tx: [
    {id: 1, fecha: '2026-09-30', tipo: 'Ingreso', catId: null, cuentaId: 2, concepto: 'Saldo inicial', monto: 238.92},
    {id: 2, fecha: '2026-10-03', tipo: 'Gasto', catId: 1, cuentaId: 2, concepto: 'Almuerzo', monto: 20}
  ]
});
const cargar = S => new Function('S', 'save',
  CODIGO + '; return {' + NOMBRES.join(',') + '};')(S, function(){});

const r2 = x => Math.round(x * 100) / 100;
let fallas = [];
const chk = (q, real, esp) => {
  const ok = typeof esp === 'number' ? Math.abs(real - esp) < 0.005 : real === esp;
  console.log((ok ? '  ok   ' : '  FALLA') + ' · ' + q + ' = ' + (typeof real === 'number' ? r2(real) : real) +
              (ok ? '' : '   (esperaba ' + esp + ')'));
  if (!ok) fallas.push(q);
};

/* ---------- 1. cuadre de cuenta: el banco dice otra cosa ---------- */
{
  const S = base(), m = cargar(S);
  chk('antes · saldo de la cuenta', m.saldoCuenta(2), 218.92);
  chk('antes · gasto de octubre', m.gastoMes(2026, 10), 20);

  // el banco dice 200.40: faltan 18.52 que nunca se anotaron
  const t = m.addCuadreCaja(2, 200.40, '2026-10-05');
  chk('el cuadre se creó como Gasto', t.tipo, 'Gasto');
  chk('por la diferencia exacta', t.monto, 18.52);
  chk('marcado como cuadre de caja', t.cuadre, 'caja');

  chk('la cuenta queda en lo que dice el banco', m.saldoCuenta(2), 200.40);
  chk('NO infla el gasto del mes', m.gastoMes(2026, 10), 20);
  chk('NO se come el límite de ninguna categoría', m.bucketReal(2026, 10).Necesidad, 20);
  chk('NO ensucia el gasto del día', m.gastoDia('2026-10-05'), 0);
  chk('se ve en el total cuadrado del mes', m.cuadreMes(2026, 10), 18.52);

  // y al revés: si sobra plata, entra como Ingreso pero no como ingreso real
  const t2 = m.addCuadreCaja(2, 250, '2026-10-06');
  chk('si sobra, el cuadre es Ingreso', t2.tipo, 'Ingreso');
  chk('la cuenta sube a lo real', m.saldoCuenta(2), 250);
  chk('NO infla el ingreso del mes', m.ingresoRealMes(2026, 10), 0);

  chk('si ya cuadra, no inventa movimiento', m.addCuadreCaja(2, 250, '2026-10-07'), null);
}

/* ---------- 2. cuadre de deuda: pagó antes del corte ---------- */
{
  const S = base(), m = cargar(S);
  const cajaAntes = m.saldoCuenta(2), totalAntes = m.saldoHasta(2026, 10);
  chk('antes · falta del préstamo en octubre', m.loanMonthStatus(S.loans[0], 2026, 10).falta, 447.95);

  const t = m.addCuadreDeuda('l:202', 447.95, '2026-10-01');
  chk('marcado como cuadre de deuda', t.cuadre, 'deuda');
  chk('queda colgado del préstamo', t.payLoanId, 202);

  chk('la cuota de octubre queda cubierta', m.loanMonthStatus(S.loans[0], 2026, 10).falta, 0);
  chk('la deuda del préstamo baja', r2(m.loanRem(S.loans[0])), 11435.23);
  chk('NO le toca el saldo de la cuenta', m.saldoCuenta(2), cajaAntes);
  chk('NO le toca la plata que tiene', m.saldoHasta(2026, 10), totalAntes);
  chk('NO cuenta como plata que salió', m.cashOutMes(2026, 10), 20);
  chk('NO infla el gasto del mes', m.gastoMes(2026, 10), 20);
}

/* ---------- 3. lo mismo contra una tarjeta ---------- */
{
  const S = base(), m = cargar(S);
  const cajaAntes = m.saldoCuenta(2);
  chk('antes · deuda de la tarjeta', m.consumidoCard(S.tarjetas[0]), 4650);
  m.addCuadreDeuda('c:101', 1550, '2026-10-01');
  chk('la deuda de la tarjeta baja', m.consumidoCard(S.tarjetas[0]), 3100);
  chk('NO le toca el saldo de la cuenta', m.saldoCuenta(2), cajaAntes);
  chk('NO infla el gasto del mes', m.gastoMes(2026, 10), 20);
}

/* ---------- 4. lo que no debe pasar nunca ---------- */
{
  const S = base(), m = cargar(S);
  chk('no acepta una deuda que no existe', m.addCuadreDeuda('l:999', 100, '2026-10-01'), null);
  chk('no acepta monto cero', m.addCuadreDeuda('l:202', 0, '2026-10-01'), null);
  chk('no acepta una cuenta que no existe', m.addCuadreCaja(0, 100, '2026-10-01'), null);
  chk('un gasto normal SÍ mueve la caja', (() => {
    const a = m.saldoCuenta(2);
    S.tx.push({id: 9, fecha: '2026-10-08', tipo: 'Gasto', catId: 1, cuentaId: 2, concepto: 'Menú', monto: 10});
    return r2(a - m.saldoCuenta(2));
  })(), 10);
}

console.log('');
if (fallas.length) { console.log('FALLA\n- ' + fallas.join('\n- ')); process.exit(1); }
console.log('TODO BIEN · el cuadre corrige y no se cuela en ninguna suma');
