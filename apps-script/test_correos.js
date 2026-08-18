/* Prueba el lector de correos.
   ============================
   Los cuerpos son SINTÉTICOS: nombres, teléfonos, cuentas, CCI, números de
   préstamo, de tarjeta y de operación están inventados. Lo que se conserva
   exactamente es el FORMATO — asteriscos de negrita, cortes de línea a mitad de
   frase, etiquetas, orden y longitudes — porque eso es lo único que el parser
   mira, y donde ya nos equivocamos una vez.
   Se ejecuta con:  node test_correos.js  (desde cualquier carpeta) */
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'Correos.gs'),'utf8');

const ctx={
  Session:{getScriptTimeZone:()=>'America/Lima'},
  Utilities:{formatDate:(d,z,f)=>d.toISOString().slice(0,10)},
  Logger:{log:s=>console.log(s)},
  GmailApp:{search:()=>[]},
  MimeType:{PLAIN_TEXT:'text/plain'},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>'{}',setProperty:()=>{}})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{},removeAll:()=>{}})},
  ContentService:{createTextOutput:t=>({setMimeType:()=>t}),MimeType:{JSON:'json'}},
  console
};
vm.createContext(ctx);
vm.runInContext(src,ctx);

const msg=(from,subject,body,id,date)=>({
  getFrom:()=>from, getSubject:()=>subject, getPlainBody:()=>body,
  getId:()=>id, getDate:()=>new Date(date)
});

const CASOS=[
// 1. consumo con tarjeta de DÉBITO BCP
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un consumo con tu Tarjeta de Débito BCP - Servicio de Notificaciones BCP',
`| |
| Hola Persona Uno Demo, Realizaste un consumo de S/ 50.00 con tu Tarjeta de Débito BCP en PLIN-PERSONA DOS DEMO EJE. Por tu seguridad, te enviamos los datos de tu operación. |
| Monto |
| Total del consumo | S/ 50.00 |
| Datos de la operación |
| Operación realizada | Consumo Tarjeta de Débito |
| Fecha y hora | 15 de agosto de 2026 - 02:09 PM |
| Número de Tarjeta de Débito | ************9911 |
| Empresa | PLIN-PERSONA DOS DEMO EJE |
| Número de operación | 111036 |`,'m1','2026-08-15T19:11:07Z'),
 {fecha:'2026-08-15',monto:50,medio:'debito-bcp',id:'bcp-111036'}],

// 2. consumo con tarjeta de CRÉDITO BCP
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un consumo con tu Tarjeta de Crédito BCP - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Realizaste un consumo de S/ 133.00 con tu Tarjeta de Crédito BCP en 03 COOLBOX TIENDA DEMO. Por tu seguridad, te enviamos los datos de tu operación. |
| Total del consumo | S/ 133.00 |
| Operación realizada | Consumo Tarjeta de Crédito |
| Fecha y hora | 12 de agosto de 2026 - 07:31 PM |
| Empresa | 03 COOLBOX TIENDA DEMO |
| Número de operación | 111030 |`,'m2','2026-08-13T00:31:08Z'),
 {fecha:'2026-08-12',monto:133,medio:'credito-bcp',id:'bcp-111030'}],

// 3. yapeo desde la cuenta BCP
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Yapeo a Celular - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Realizaste un yapeo a celular de S/ 30.00 desde tu Clasica Soles. A continuación, te enviamos los datos de tu operación. |
| Montos |
| Monto enviado | S/ 30.00 |
| Datos de la operación |
| Fecha y hora | 16 de agosto de 2026 - 02:47 PM |
| Número de operación | 111053 |`,'m3','2026-08-16T19:47:52Z'),
 {fecha:'2026-08-16',monto:30,medio:'cuenta-bcp',tipo:'Gasto',id:'bcp-111053'}],

// 4. transferencia entre cuentas propias -> NO es gasto
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Transferencia Entre mis Cuentas - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Realizaste una transferencia de S/ 45.00 desde tu Clasica. Por tu seguridad, te enviamos los datos de tu operación. |
| Monto transferido | S/ 45.00 |
| Fecha y hora | 17 de agosto de 2026 - 02:07 PM |
| Número de operación | 111033 |`,'m4','2026-08-17T19:07:48Z'),
 {fecha:'2026-08-17',monto:45,tipo:'Traslado',id:'bcp-111033'}],

// 5. retiro
[msg('notificaciones@notificacionesbcp.com.pe','Realizaste un retiro de tu wardadito.',
`| Hola Persona, Realizaste un retiro de S/ 100.00 en tu wardadito Casa. Te enviamos los datos de tu operación. |
| Total retirado | S/ 100.00 |
| Operación realizada | Retiro |
| Fecha y hora | 16 de agosto de 2026 - 09:04 PM |
| Número de operación | 111048 |`,'m5','2026-08-17T02:04:32Z'),
 {fecha:'2026-08-16',monto:100,id:'bcp-111048'}],

// 6. Yape: pago en comercio
[msg('notificaciones@yape.pe','Pago exitoso',
`Hola PERSONA,
¡Tu pago en PEDIDOS YA
 fue exitoso!

Monto total S/ 25.50

Fecha y hora: 16 agosto 2026 - 03:02 p. m.

Titular: PERSONA UNO DEMO EJEMPLO

ID de operación: 1111111111005`,'m6','2026-08-16T20:02:08Z'),
 {fecha:'2026-08-16',monto:25.5,medio:'yape',concepto:'Pedidos Ya',id:'yape-1111111111005'}],

// 7. Yape: yapeo a persona
[msg('notificaciones@yape.pe','Por tu seguridad, te notificaremos por cada yapeo que realices',
`¡Hola, PERSONA UNO DEMO EJEM.! ¡Acabas de yapear exitosamente!
Monto de yapeo* S/ 18.21
Yapero PERSONA UNO DEMO EJEM.
Fecha y Hora de la operación 16 agosto 2026 - 03:35 a. m.
ID de operación: 111111111007`,'m7','2026-08-16T08:35:02Z'),
 {fecha:'2026-08-16',monto:18.21,medio:'yape',concepto:'Yapeo',id:'yape-111111111007'}],

// 8. Interbank: pago a la tarjeta de crédito (soles + dólares)
[msg('servicioalcliente@netinterbank.com.pe','Constancia de pago',
` Interbank | Constancia de pago
| Hola PERSONA, te enviamos tu Constancia de pago |
| Código de operación | 0011127 |
| Fecha y hora | 08 Ago 2026 08:14 AM |
| Cuenta cargo | Cuenta Simple Soles 898 1111111011 |
| Tarjeta de crédito | IBK Visa Access Soles 111034******0613 |
| Moneda y monto | S/ 356.88 |
| Moneda y monto | US$ 210.89 |`,'m8','2026-08-08T13:14:07Z'),
 {fecha:'2026-08-08',monto:356.88,medio:'interbank',tipo:'Pago de deuda',id:'ibk-0011127',avisoUsd:210.89}],

// 9. Interbank: pago de servicio
[msg('servicioalcliente@netinterbank.com.pe','Constancia de pago',
`| Hola Persona, te enviamos tu Constancia de pago |
| Código de operación | 0001116 |
| Fecha y hora | 15 Ago 2026 12:36 AM |
| Cuenta cargo | Cuenta Simple Soles 898 1111111011 |
| Empresa | MONNET PAGOS PAGOS SOLES |
| Moneda y monto | S/ 120.00 |`,'m9','2026-08-15T05:36:09Z'),
 {fecha:'2026-08-15',monto:120,concepto:'Monnet Pagos Pagos Soles',id:'ibk-0001116'}],

// --------- casos que DEBEN ignorarse ---------
[msg('notificaciones@notificacionesbcp.com.pe',
 'Se rechazó tu compra por fondos insuficientes - Servicio de Notificaciones BCP',
 'Lo sentimos, tu compra fue rechazada debido a que tu cuenta no tiene saldo suficiente. Importe de la compra S/ 80.00','x1','2026-08-15T18:29:24Z'), null],
[msg('bcpcomunica@email.bcp.com.pe','ÚLTIMOS DÍAS 🗺️ Persona, no te quedes sin tu viaje',
 'Paga con tu Tarjeta BCP y sé uno de los 20 ganadores. S/ 500.00','x2','2026-08-17T21:22:14Z'), null],
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Configuración de Tarjeta en Banca Móvil BCP - Servicio de Notificaciones BCP',
 'Realizaste una configuración para tu Tarjeta de Crédito Visa Oro LATAM Pass.','x3','2026-08-17T05:03:52Z'), null],
[msg('tarjetasdecredito@eecc.interbank.pe','PERSONA, te enviamos el estado de cuenta de tu tarjeta de crédito',
 'Último día de pago 20/08/2026 Pago del mes S/356.88','x4','2026-08-02T00:08:27Z'), null],
[msg('news@descubre.interbank.pe','Persona, gana 1200 Millas Benefit',
 'Afilia tu Tarjeta de Crédito Interbank. Monto S/ 99.00','x5','2026-08-05T16:39:14Z'), null],

// ===== casos tomados de sus correos REALES de agosto 2026 =====

// R1. retiro de wardadito: la plata VUELVE a su cuenta, no es gasto
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un retiro de tu wardadito.',
`| |
| Hola Persona, Realizaste un retiro de S/ 100.00 en tu wardadito Casa. Te enviamos los datos de tu operación. |
| Montos |
| Total retirado | S/ 100.00 |
| Datos de la operación |
| Operación realizada | Retiro |
| Fecha y hora | 16 de agosto de 2026 - 21:04:31 |
| Origen | Wardadito Casa |
| Destino | AHOR. *************033 |`,'r1','2026-08-17T02:04:32Z'),
 {fecha:'2026-08-16',monto:100,tipo:'Traslado',concepto:'Retiro de wardadito Casa',entra:true}],

// R2. aporte voluntario a wardadito: sale de la cuenta pero sigue siendo suya
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un aporte voluntario a tu wardadito.',
`| |
| Hola Persona, Realizaste un aporte voluntario de S/ 1000.00 a tu wardadito Viaje. Te enviamos los datos de tu operación. |
| Montos |
| Total aportado | S/ 1000.00 |
| Datos de la operación |
| Operación realizada | Aporte voluntario |
| Fecha y hora | 14 de agosto de 2026 - 15:34:12 |`,'r2','2026-08-14T22:34:12Z'),
 {fecha:'2026-08-14',monto:1000,tipo:'Traslado',entra:false}],

// R3. Yape de servicio: mes abreviado con punto y empresa como concepto
[msg('notificaciones@yape.pe',
 'Tu yapeo de servicio ha sido confirmado',
`Hola *ANA,*
¡Tu servicio fue yapeado con éxito!

Monto total
S/ 89.90

Fecha y hora: 13 Ago. 2026 - 07:12 pm

Nº de operación Yape: 00111020

Detalle del servicio:

Empresa: Movistar

Servicio: Cuenta Financiera`,'r3','2026-08-14T00:12:43Z'),
 {fecha:'2026-08-13',monto:89.9,concepto:'Movistar',id:'yape-00111020',tipo:'Gasto'}],

// R4. Yape a comercio, sin espacio tras S/
[msg('notificaciones@yape.pe','Pago exitoso',
`Hola PERSONA, ¡Tu pago en PEDIDOS YA fue exitoso!
Monto total S/25.50
Fecha y hora: 16 agosto 2026 - 03:02 p. m.
ID de operación: 11111025`,'r4','2026-08-16T20:02:08Z'),
 {fecha:'2026-08-16',monto:25.5,concepto:'Pedidos Ya',id:'yape-11111025'}],

// R5. transferencia entre sus propias cuentas
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Transferencia Entre mis Cuentas - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Realizaste una transferencia de S/ 45.00 desde tu Clasica. |
| Montos |
| Monto transferido | S/ 45.00 |
| Datos de la operación |
| Fecha y hora | 17 de agosto de 2026 - 02:07 PM |
| Número de operación | 111049 |`,'r5','2026-08-17T19:07:48Z'),
 {fecha:'2026-08-17',monto:45,tipo:'Traslado'}],

// R6. recordatorio de débito automático: NO es una operación
[msg('notificaciones@notificacionesbcp.com.pe',
 '¡No te olvides! Tienes un débito automático pronto',
`Persona Recuerda que tu aporte automático se realizará del 15 al 16 y del 29 al último día de cada mes
Ahorro Quincenal S/ 50.00 Para tu Wardadito Casa`,'r6','2026-08-13T22:35:39Z'),
 null],

// R7. configuración de tarjeta: tampoco
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Configuración de Tarjeta en Banca Móvil BCP - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Realizaste una configuración para tu Tarjeta de Crédito Visa Oro LATAM Pass. |
| Fecha y hora | 17 de agosto de 2026 - 00:03 AM |`,'r7','2026-08-17T05:03:52Z'),
 null],

// R8. compra rechazada: jamás debe entrar
[msg('notificaciones@notificacionesbcp.com.pe',
 'Se rechazó tu compra por fondos insuficientes - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Lo sentimos, tu compra fue rechazada debido a que tu cuenta no tiene saldo suficiente. |
| Importe de la compra | S/ 300.00 |`,'r8','2026-08-15T18:29:24Z'),
 null],

// R9. consumo con crédito BCP (alimenta la tarjeta)
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un consumo con tu Tarjeta de Crédito BCP - Servicio de Notificaciones BCP',
`| Hola Persona Uno Demo, Realizaste un consumo de S/ 19.10 con tu Tarjeta de Crédito BCP en 1034 MASS TIENDA DEMO. |
| Monto |
| Total del consumo | S/ 19.10 |
| Datos de la operación |
| Fecha y hora | 13 de agosto de 2026 - 06:41 PM |
| Empresa | 1034 MASS TIENDA DEMO |
| Número de operación | 111053 |`,'r9','2026-08-13T23:41:39Z'),
 {fecha:'2026-08-13',monto:19.1,medio:'credito-bcp',concepto:'1034 Mass Tienda Demo',id:'bcp-111053'}],

// R10. pago de servicio por Interbank (formato de tabla con pipes)
[msg('servicioalcliente@netinterbank.com.pe','Constancia de pago',
`| Hola Persona, te enviamos tu Constancia de pago |
| Código de operación | 0001116 |
| Fecha y hora | 15 Ago 2026 12:36 AM |
| Empresa | MONNET PAGOS PAGOS SOLES |
| Recibo 1 S/ 250.00 |`,'r10','2026-08-15T05:36:09Z'),
 {fecha:'2026-08-15',monto:250,concepto:'Monnet Pagos Pagos Soles',id:'ibk-0001116'}],

// R11. pago de servicios del BCP: el concepto salía como un párrafo entero
[msg('notificaciones@notificacionesbcp.com.pe',
 'ENVIO AUTOMATICO - CONSTANCIA DE PAGO DE SERVICIO - BANCA MOVIL BCP',
`Hola PERSONA UNO DEMO, ¡Tu operación se realizó con éxito!
Operación realizada: Pago de servicios
Número de operación: 01111023
Fecha y hora: Domingo, 16 Agosto 2026 - 08:14 PM
Empresa: *PAGOEFECTIVO* Servicio: *PAGOEFECTIVO SOLES* Titular del servicio: Persona U*****
Importe: S/ 68.80`,'r11','2026-08-17T01:14:45Z'),
 {fecha:'2026-08-16',monto:68.8,concepto:'Pagoefectivo',medio:'cuenta-bcp',id:'bcp-01111023'}],

// R12. yape de servicio con asteriscos alrededor de la empresa
[msg('notificaciones@yape.pe','Tu yapeo de servicio ha sido confirmado',
`¡Tu servicio fue yapeado con éxito!
Monto total
S/ 20.00
Fecha y hora: 12 Ago. 2026 - 11:25 pm
Nº de operación Yape: 00111019
Empresa: *Claro* Servicio: Postpago`,'r12','2026-08-13T04:25:29Z'),
 {fecha:'2026-08-12',monto:20,concepto:'Claro',id:'yape-00111019'}],

/* ===================================================================
   CASOS REALES v2 — el texto plano de verdad de sus correos.
   Aqui estaba el error: yo habia armado las pruebas con la forma de
   tabla ("| Empresa | X |"), pero Gmail entrega el texto plano con
   negritas en *asteriscos* y las frases CORTADAS a mitad de linea.
   Por eso el consumo con tarjeta (lo mas importante) nunca se leia.
   =================================================================== */

// V1. consumo con Tarjeta de DEBITO BCP — cuerpo real, frase partida en dos
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un consumo con tu Tarjeta de Débito BCP - Servicio de Notificaciones BCP',
` \n  \n\nHola *Persona Uno Demo,*\n\nRealizaste un consumo de *S/ 1.00* con tu *Tarjeta de Débito BCP* en *PLIN-PERSONA \nDOS DEMO EJE.*\n\nPor tu seguridad, te enviamos los *datos de tu operación.*\n  \n\n*Monto*\n  \nTotal del consumo *S/ 1.00* \n  \n\n*Datos de la operación*\n  \nOperación realizada *Consumo Tarjeta de Débito* \nFecha y hora *17 de agosto de 2026 - 11:51 PM* \nNúmero de Tarjeta de Débito *************9911* \nEmpresa *PLIN-PERSONA DOS DEMO EJE* \nNúmero de operación *111031* \n`,
 'v1','2026-08-18T04:51:04Z'),
 {fecha:'2026-08-17',monto:1,concepto:'Plin-Persona Dos Demo Eje',medio:'debito-bcp',
  tipo:'Gasto',id:'bcp-111031'}],

// V2. consumo con Tarjeta de CREDITO BCP — mismo formato real
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un consumo con tu Tarjeta de Crédito BCP - Servicio de Notificaciones BCP',
`Hola *Persona Uno Demo,*\n\nRealizaste un consumo de *S/ 19.10* con tu *Tarjeta de Crédito BCP* en *1034 MASS \nTIENDA DEMO.*\n\n*Monto*\n  \nTotal del consumo *S/ 19.10* \n  \n*Datos de la operación*\n  \nOperación realizada *Consumo Tarjeta de Crédito* \nFecha y hora *13 de agosto de 2026 - 07:42 PM* \nEmpresa *1034 MASS TIENDA DEMO* \nNúmero de operación *111053* \n`,
 'v2','2026-08-14T00:42:11Z'),
 {fecha:'2026-08-13',monto:19.1,concepto:'1034 Mass Tienda Demo',medio:'credito-bcp',
  id:'bcp-111053'}],

// V3. yapeo a una persona — cuerpo real: monto en otra linea y todos los
//     datos seguidos en una sola linea
[msg('notificaciones@yape.pe',
 'Por tu seguridad, te notificaremos por cada yapeo que realices',
`*¡Hola, PERSONA UNO DEMO EJEM.!*\r\n\r\n*¡Acabas de yapear exitosamente!*\r\n\r\n*Monto de yapeo**\r\n\r\nS/ 50.00\r\n\r\nYapero PERSONA UNO DEMO EJEM. Tu número de celular XXXXXXXXX111 Fecha y Hora de la operación 17 agosto 2026 - 09:11 p. m. Celular del Beneficiario XXXXXXXXX222 Nombre del Beneficiario PERSONA DOS DEMO EJEM S. Nº de operación 1111029\r\n\r\n*Por tu seguridad, te notificaremos por cada\r\nyapeo que realices.\r\n`,
 'v3','2026-08-18T02:11:16Z'),
 {fecha:'2026-08-17',monto:50,concepto:'Yapeo a Persona Dos Demo Ejem S',
  medio:'yape',tipo:'Gasto',id:'yape-1111029'}],

// V4. transferencia entre sus propias cuentas — formato real, es traslado
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Transferencia Entre mis Cuentas - Servicio de Notificaciones BCP',
`Hola *Persona Uno Demo,*\n\nRealizaste una transferencia de *S/ 100.00* desde tu *Clasica.*\n\n*Montos*\n  \nMonto transferido *S/ 100.00* \n  \n*Datos de la operación*\n  \nFecha y hora *17 de agosto de 2026 - 06:48 PM* \nNúmero de operación *111049* \n`,
 'v4','2026-08-17T23:48:37Z'),
 {fecha:'2026-08-17',monto:100,tipo:'Traslado',medio:'cuenta-bcp',id:'bcp-111049'}],

// V5. Interbank que escribe "Codigo de operacion es: 0011127" (id salia "ibk-es:")
[msg('servicioalcliente@netinterbank.com.pe','Constancia de pago de Tarjeta de Crédito',
`Hola PERSONA UNO,\n\nRegistramos tu pago.\n\nMoneda y monto S/ 356.88\nTarjeta de crédito 4111********1111\nFecha y hora 08 Ago 2026 08:14 AM\nEl código de operación es: 0011127\n`,
 'v5','2026-08-08T13:14:00Z'),
 {monto:356.88,tipo:'Pago de deuda',medio:'interbank',id:'ibk-0011127',fecha:'2026-08-08'}],

/* ===================================================================
   CASOS REALES v3 — remitentes y tipos que antes no se miraban.
   Todos estos cuerpos salieron de su propio buzon.
   =================================================================== */

// V6. BCP: pago a SU tarjeta (antes se anotaba como gasto suelto)
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Pago de Tarjeta de Crédito Propia - Servicio de Notificaciones BCP',
` \n  \n\nHola *Persona Uno Demo,*\n\nRealizaste un pago a tu tarjeta de *S/ 2779.71* desde tu *Cuenta sueldo*.\n\nA continuación, te enviamos los datos de tu operación.\n  \n\n*Montos*\n  \nMonto pagado *S/ 2779.71* \n  \n\n*Datos de la operación*\n  \nOperación realizada *Pago de tarjeta propia BCP* \nFecha y hora *11 de Agosto de 2026 - 11:27 AM* \nPagado a *VISA Oro*\n**** 5025 \nTipo de pago *Pago total* \nDesde *Cuenta sueldo*\n**** 9029 \nMoneda *Soles* \nCanal *Banca Móvil BCP* \nNúmero de operación *01111021* <#> \n`,
 'v6','2026-08-11T16:27:07Z'),
 {fecha:'2026-08-11',monto:2779.71,tipo:'Pago de deuda',medio:'credito-bcp',
  concepto:'Pago Tarjeta BCP VISA Oro',id:'bcp-01111021'}],

// V7. el mismo pago pero en DOLARES: hay que cobrarlo al tipo de cambio
[msg('notificaciones@notificacionesbcp.com.pe',
 'Constancia de Pago de Tarjeta de Crédito Propia - Servicio de Notificaciones BCP',
`Hola *Persona Uno Demo,*\n\nRealizaste un pago a tu tarjeta de *$ 15.92* desde tu *Cuenta sueldo*.\n\n*Montos*\n  \nMonto pagado *$ 15.92* \nTipo de cambio *S/ 3.4300* \n*Total cobrado al tipo de cambio* *S/ 54.61* \n  \n\n*Datos de la operación*\n  \nOperación realizada *Pago de tarjeta propia BCP* \nFecha y hora *11 de Agosto de 2026 - 11:27 AM* \nPagado a *VISA Oro*\n**** 5025 \nNúmero de operación *01111022* \n`,
 'v7','2026-08-11T16:27:21Z'),
 {fecha:'2026-08-11',monto:54.61,montoUsd:15.92,moneda:'USD',tipo:'Pago de deuda',
  id:'bcp-01111022'}],

// V8. Caja Huancayo: transferencia interbancaria. El monto real es el TOTAL,
//     con comision (S/ 5.50), comision interbancaria (S/ 0.80) e ITF.
[msg('notifica@cajahuancayo.com.pe','Reporte de operación App Móvil - Caja Huancayo',
` Notificación \n\n\nHola *PERSONA UNO DEMO, EJEMPLO *, \nTe enviamos el detalle de tu operación: \n\n[image: Caja Huancayo] \n\nCONSTANCIA DE TRANSFERENCIA INTERBANCARIA - INMEDIATA \nNúmero de Operación: 1111111017 \nCódigo de solicitud: 001111111111004 \nFecha Operación: 15/08/2026 - 12:46:30 \nCuenta Origen: 111111111111111003 \nCuenta Destino (CCI): 00111111111111111001 \nNombreEntidad: BANCO DE CRÉDITO DEL PERÚ \nMonto Transferencia: S/ 500 \nComisión Cliente: S/ 5.5 \nComisión Interbancaria: S/ 0.8 \nITF: S/ 0 \nTotal: S/ 506.3 \n`,
 'v8','2026-08-15T17:46:26Z'),
 {fecha:'2026-08-15',monto:506.3,medio:'huancayo',banco:'Huancayo',
  concepto:'Transferencia a Banco De Crédito Del Perú',id:'cjh-1111111017'}],

// V9. Caja Huancayo: cancelacion anticipada de un credito -> pago de deuda
[msg('umasternet@cajahuancayo.com.pe','CMAC HUANCAYO: REPORTE DE OPERACIÓN APP MOVIL [CANCELACIÓN ANTICIPADA]',
` \nCONSTANCIA CANCELACIÓN ANTICIPADA EXITOSA \nOperación N°: 1111111016 \nCuenta Cargo: 111111111111111003 \nCuenta Crédito: 111111111111111002 \nEstado de la operación: Exitosa \nFecha y hora: 7/08/2026 17:31:00 \nMonto pagado: S/ 4934.96 \nCOMPROBANTE EMPRESAS SUPERVISADAS SBS \n`,
 'v9','2026-08-07T22:31:00Z'),
 {fecha:'2026-08-07',monto:4934.96,tipo:'Pago de deuda',medio:'huancayo',
  concepto:'Cancelación de crédito Huancayo',id:'cjh-1111111016'}],

// V10. Banco Ripley: pago de la cuota del prestamo -> pago de deuda
[msg('bancoripley@notificaciones.bancoripley.com.pe','Pago Préstamo - Banco Ripley Perú',
` \n  *Constancia*\nPago Préstamo   \n  Te informamos que se ha realizado el pago de tu Préstamo, con las \nsiguientes características:   \n      \n    \nTitular de préstamo: PERSONA UNO DEMO EJEMPLO \nNúmero de préstamo: 1111111013 \nNombre de cuenta de ahorro origen: CUENTA RIPLEY MAX \nN° Cuenta de ahorro origen: 1111111014 \nComisión: S/ 0.00 \nInterés moratorio: S/ 0.00 \nMonto total: S/ 210.90 \nFecha: 01/08/2026 \nHora: 08:51 p.m. \nN° Operación: 1111111015 \n`,
 'v10','2026-08-02T01:51:00Z'),
 {fecha:'2026-08-01',monto:210.9,tipo:'Pago de deuda',medio:'ripley',
  concepto:'Pago préstamo Ripley',id:'rip-1111111015'}],

// V11. Banco Ripley: transferencia por Plin, con el valor en la linea de abajo
[msg('bancoripley@notificaciones.bancoripley.com.pe','Constancia transferencia a contacto',
` \nNotificación \nComprobante de\ntransferencia   \n  \nTransferiste * S/ 1.00* desde tu *Cuenta Ripley Max *de* PERSONA UNO \nDEMO EJEMPLO* a * PERSONA DOS DEMO EJEMPLO* \n    \n  \nDetalle\n      \n  Teléfono destinatario\n  111111018\n    \n  Banco destinatario\n  PLIN\n    \n  Fecha\n  \n10/08/2026\n  \n  Hora\n  \n03:13 p.m.\n  \n  Nº de Transacción\n  011111111006-111032\n    \n  ITF\n  \nS/ 0.00\n  \n  \nComisión\nS/ 0.00\n  \n  \nMonto total\n  \nS/ 1.00\n  \n`,
 'v11','2026-08-10T20:13:58Z'),
 {fecha:'2026-08-10',monto:1,medio:'ripley',banco:'Ripley',id:'rip-011111111006-111032'}],

// V12. Ripley: encuesta -> se ignora
[msg('bancoripley@notificaciones.bancoripley.com.pe','PERSONA, ¿cómo te sentiste usando nuestra App?',
`Tu experiencia es importante para nosotros Hola PERSONA`,'v12','2026-08-13T19:26:20Z'), null],

// V13. Huancayo: bienvenida / clave web -> se ignora
[msg('umastersql@cajahuancayo.com.pe','CONSTANCIA DE GENERACIÓN DE CLAVE WEB',
`CONSTANCIA DE GENERACIÓN DE CLAVE WEB \nTipo de operación: Generación de clave web \nEstado de Operación: Exitosa \nFecha y hora: 15/08/2026 12:27:59 \n`,'v13','2026-08-15T17:28:29Z'), null],

// V14. consumo en DOLARES sin tipo de cambio (el caso de OPENAI): no se descarta,
//      viaja con monto 0 y el monto en dolares para que la app lo proponga.
[msg('notificaciones@notificacionesbcp.com.pe',
 'Realizaste un consumo con tu Tarjeta de Crédito BCP - Servicio de Notificaciones BCP',
`Hola *Persona Uno Demo,*\n\nRealizaste un consumo de *$ 24.46* con tu *Tarjeta de Crédito BCP* en *OPENAI \n*CHATGPT SUBSCR.*\n\n*Monto*\n  \nTotal del consumo *$ 24.46* \n  \n*Datos de la operación*\n  \nOperación realizada *Consumo Tarjeta de Crédito* \nFecha y hora *18 de agosto de 2026 - 01:11 AM* \nNúmero de Tarjeta de Crédito *************9922* \nEmpresa *OPENAI *CHATGPT SUBSCR* \nNúmero de operación *0000111009* \n`,
 'v14','2026-08-18T06:11:24Z'),
 {fecha:'2026-08-18',monto:0,montoUsd:24.46,moneda:'USD',medio:'credito-bcp',
  tipo:'Gasto',id:'bcp-0000111009'}],

];


let fallos=0;
CASOS.forEach(([m,esp],i)=>{
 let r=null;
 try{ r=ctx.interpretar_(m); }catch(e){ console.log(`#${i+1} EXCEPCION: ${e.message}`); fallos++; return; }
 if(esp===null){
  /* "ignorar" es el descarte deliberado (publicidad, claves, rechazos). null
     significaría "es una operación y no la supe leer", que ahora se avisa. */
  if(r && r!=='ignorar'){ console.log(`#${i+1} ✗ debía ignorarse y devolvió`, JSON.stringify(r)); fallos++; }
  else if(r==='ignorar'){ console.log(`#${i+1} ✓ ignorado a propósito — "${(m.getSubject()||'').slice(0,44)}"`); }
  else console.log(`#${i+1} ✓ ignorado correctamente — "${m.getSubject().slice(0,50)}"`);
  return;
 }
 if(!r){ console.log(`#${i+1} ✗ no detectó nada — "${m.getSubject().slice(0,50)}"`); fallos++; return; }
 const malos=Object.keys(esp).filter(k=>String(r[k])!==String(esp[k]));
 if(malos.length){
  console.log(`#${i+1} ✗ campos mal: ${malos.map(k=>`${k}=${r[k]} (esperaba ${esp[k]})`).join(', ')}`);
  fallos++;
 } else {
  console.log(`#${i+1} ✓ ${r.fecha} · S/ ${r.monto.toFixed(2)} · ${r.banco}/${r.medio} · ${r.tipo} · "${r.concepto}" · ${r.id}`);
 }
});

/* ================== integración: caché, fresco y lo ya visto ==================
   Acá no se prueba un patrón, se prueba el comportamiento de bandeja_():
   - una segunda lectura normal NO vuelve a tocar Gmail (usa la caché de 5 min);
   - con fresco=1 SÍ vuelve a leer el buzón (es lo que pasa cuando él toca
     «Volver a leer»: si acaba de yapear, el correo tiene que salir ya);
   - un correo ya resuelto no reaparece, ni con su id nuevo ni con el heredado
     (el id del correo, que es lo que quedó guardado antes de arreglar la lectura). */
function ctxIntegracion(vistos, cuerpoRaro, asuntoRaro){
  const cache={};
  const guardado={ v: Object.assign({}, vistos||{}) };
  const cuenta={busquedas:0, lecturasCache:0, escriturasCache:0};
  const cuerpo=`Hola *Persona Uno Demo,*\n\nRealizaste un consumo de *S/ 30.00* con tu *Tarjeta de Débito BCP* en *TIENDA \nDEMO UNO.*\n\n*Datos de la operación*\n  \nFecha y hora *18 de agosto de 2026 - 10:00 AM* \nEmpresa *TIENDA DEMO UNO* \nNúmero de operación *111035* \n`;
  const msg={ getFrom:()=>'notificaciones@notificacionesbcp.com.pe',
    getSubject:()=>asuntoRaro||'Realizaste un consumo con tu Tarjeta de Débito BCP',
    getPlainBody:()=>cuerpoRaro||cuerpo, getId:()=>'idCorreoGmail01',
    getDate:()=>new Date('2026-08-18T15:00:00Z') };
  const c={
    Session:{getScriptTimeZone:()=>'America/Lima'},
    Utilities:{formatDate:(d,z,f)=>d.toISOString().slice(0,10)},
    Logger:{log:()=>{}},
    GmailApp:{ search:()=>{ cuenta.busquedas++; return [{}]; },
               getMessagesForThreads:()=>[[msg]] },
    MimeType:{PLAIN_TEXT:'text/plain'},
    /* almacén de "vistos" MUTABLE: archivar y desarchivar tienen que poder
       escribir de verdad, o no se puede probar el Deshacer */
    PropertiesService:{getScriptProperties:()=>({
      getProperty:()=>JSON.stringify(guardado.v||{}),
      setProperty:(k,val)=>{ try{ guardado.v=JSON.parse(val)||{}; }catch(e){ guardado.v={}; } } })},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    CacheService:{getScriptCache:()=>({
      get:k=>{ cuenta.lecturasCache++; return cache[k]||null; },
      put:(k,v)=>{ cuenta.escriturasCache++; cache[k]=v; },
      removeAll:ks=>ks.forEach(k=>{ delete cache[k]; }) })},
    ContentService:{createTextOutput:t=>({setMimeType:()=>t}),MimeType:{JSON:'json'}},
    console
  };
  vm.createContext(c); vm.runInContext(src,c);
  return {c, cuenta, guardado};
}

function pruebaIntegracion(){
  let malos=0;
  const ok=(cond,rot)=>{ console.log((cond?'✓ ':'✗ ')+rot); if(!cond) malos++; };

  // 1. la caché evita la segunda lectura del buzón
  let {c,cuenta}=ctxIntegracion({});
  const a=c.bandeja_(14);
  const b=c.bandeja_(14);
  ok(a.length===1 && b.length===1, 'las dos lecturas devuelven la operación');
  ok(cuenta.busquedas===1, 'la segunda lectura usó la caché (búsquedas: '+cuenta.busquedas+')');

  // 2. fresco=1 ignora la caché y vuelve a leer Gmail
  const antes=cuenta.busquedas;
  const f=c.bandeja_(14, true);
  ok(f.length===1, 'la lectura fresca devuelve la operación');
  ok(cuenta.busquedas===antes+1, 'fresco=1 volvió a leer el buzón (búsquedas: '+cuenta.busquedas+')');

  // 3. el enganche del doGet pasa el parámetro tal como llega en la URL
  const antes2=cuenta.busquedas;
  c.respuestaBandeja_('14','1');
  ok(cuenta.busquedas===antes2+1, 'respuestaBandeja_(dias, "1") lee fresco');
  const antes3=cuenta.busquedas;
  c.respuestaBandeja_('14','0');
  ok(cuenta.busquedas===antes3, 'respuestaBandeja_(dias, "0") sí usa la caché');

  // 4. lo ya resuelto no vuelve: por id nuevo...
  ({c,cuenta}=ctxIntegracion({'bcp-111035':'2026-08-18'}));
  ok(c.bandeja_(14).length===0, 'un correo ya resuelto no reaparece (id del banco)');

  // 5. ...ni por el id heredado (el del correo, de antes del arreglo)
  ({c,cuenta}=ctxIntegracion({'bcp-idCorreoGmail01':'2026-08-18'}));
  ok(c.bandeja_(14).length===0, 'un correo ya resuelto no reaparece (id heredado)');

  /* 6. DESHACER: archivar quita la operación de la bandeja, y desarchivar la
        devuelve. Sin esto, deshacer en la app dejaba el correo marcado como
        resuelto en el servidor y la operación se perdía para siempre. */
  let guardado;
  ({c,cuenta,guardado}=ctxIntegracion({}));
  ok(c.bandeja_(14).length===1, 'antes de archivar, la operación está en la bandeja');
  c.archivarCorreos_(['bcp-111035']);
  ok(!!guardado.v['bcp-111035'], 'archivar dejó la operación marcada como resuelta');
  ok(c.bandeja_(14).length===0, 'archivada, ya no aparece');
  const res=c.desarchivarCorreos_(['bcp-111035']);
  ok(JSON.parse(res).desarchivados===1, 'desarchivar informa que quitó una marca');
  ok(!guardado.v['bcp-111035'], 'desarchivar borró la marca del servidor');
  ok(c.bandeja_(14).length===1, 'tras deshacer, la operación vuelve a la bandeja');
  const vacio=JSON.parse(c.desarchivarCorreos_([]));
  ok(vacio.ok===true && vacio.desarchivados===0, 'desarchivar sin ids no falla');

  /* 7. UN CORREO DEL BANCO QUE NO SE PUDO LEER: sale como aviso, no al vacío.
        Antes desaparecía sin dejar rastro y la operación no existía para la app. */
  const raro='Hola *Persona Uno Demo,*\n\nAlgo pasó con tu cuenta, pero este correo no '+
    'trae ni monto ni número de operación.\n';
  ({c,cuenta,guardado}=ctxIntegracion({}, raro, 'Aviso importante de tu cuenta BCP'));
  const b7=c.bandeja_(14);
  ok(b7.length===1, 'el correo ilegible sí aparece en la bandeja');
  ok(!!(b7[0]||{}).noLeido, 'aparece marcado como no interpretado');
  ok((b7[0]||{}).tipo==='No reconocido', 'no se puede anotar solo: tipo "No reconocido"');
  ok(+((b7[0]||{}).monto||0)===0, 'no se inventa un monto');
  ok(String((b7[0]||{}).id||'').indexOf('raro-')===0, 'lleva un id propio para poder descartarlo');
  ok((b7[0]||{}).banco==='BCP', 'dice de qué banco venía');
  c.archivarCorreos_([b7[0].id]);
  ok(c.bandeja_(14).length===0, 'marcarlo como visto lo saca de la bandeja');

  /* 8. lo que se descarta A PROPÓSITO no molesta como aviso: una operación
        rechazada no ocurrió, y no hay nada que interpretar ahí. */
  const rech='Hola *Persona Uno Demo,*\n\nTu operación fue *rechazada* por falta de saldo.\n';
  ({c,cuenta,guardado}=ctxIntegracion({}, rech, 'Operación rechazada'));
  ok(c.bandeja_(14).length===0, 'lo que se ignora a propósito no molesta como aviso');

  return malos;
}

console.log('\n--- integración: caché, fresco y lo ya visto ---');
fallos += pruebaIntegracion();

console.log(fallos? `\n*** ${fallos} fallo(s) ***` : '\n=== todos los casos pasan ===');
