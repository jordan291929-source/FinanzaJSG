# CRITERIOS.md — contrato de aceptación de FinanzaJSG

Este archivo dice **qué tiene que hacer la app**, no cómo. Cada línea está
escrita como conducta observable: *cuando pasa X, la app hace Y*. Una versión
pasa si cumple todo lo que dice acá; si algo se discute, se discute contra este
archivo y no contra el código.

> **Estado: borrador v1, escrito por el implementador.**
> Se pidió a la revisión de arquitectura que lo redactara y todavía no llegó, así
> que esto es un punto de partida. Falta ratificarlo (o corregirlo) antes de que
> valga como contrato de verdad. Lo que ya está aquí sí está probado.

---

## 1. Reglas que no se negocian

1. La app no recalcula plata por su cuenta: **toda escritura final de un
   movimiento pasa por el motor** (`addMov`, `addCardPayment`, `editMov`).
2. Una **simulación** (la vista previa de "esto va a pasar") no cambia nada: ni
   el estado en memoria, ni lo guardado en el teléfono, ni los formularios, ni
   la nube, ni el tipo de cambio.
3. **Ninguna cifra estimada se presenta después como exacta**, en ninguna
   pantalla.
4. Todo cambio de plata tiene **confirmación, antes→después y Deshacer**.
5. En el repositorio no hay datos bancarios reales, ni claves, ni la URL del
   Apps Script de nadie.

## 2. Dólares

| Cuando… | La app… |
|---|---|
| llega un consumo en dólares **con** el monto en soles del banco | usa ese monto tal cual, sin marcarlo como estimado |
| llega un consumo en dólares **sin** conversión | lo anota con una estimación, la muestra marcada («aprox.»), guarda el monto original en dólares y lo deja **pendiente de conciliar** |
| hay **3 o más** conversiones confirmadas del **mismo banco y medio** | estima con la **mediana** de esas conversiones |
| hay **menos de 3** | estima con la referencia (S/ 3.43) y lo dice: es referencia, no cifra exacta |
| existe una mediana firme y el monto escrito implica una tasa que se sale **más de 15 %** | acepta el monto pero **avisa** |
| el monto escrito implica una tasa **fuera de 2.50–5.00** | **rechaza** el monto y explica por qué |
| se aprende una tasa | queda guardada con el **banco y el medio tal como los nombra el lector de correos** (`BCP` + `credito-bcp`), nunca con una etiqueta inventada |
| una tasa mal tecleada entra al historial | las estimaciones siguientes **no se mueven** (la mediana la absorbe) |
| llega el cargo real y él lo escribe | el movimiento deja de ser estimado, guarda la tasa aplicada, conserva el monto en dólares y **entonces sí** se aprende esa tasa |

La tasa se aprende **solo** al confirmar y guardar. Nunca al escribir un monto,
nunca durante una simulación, nunca al cancelar.

Todo movimiento en dólares conserva: moneda de origen, monto en dólares, monto
final en soles, tasa aplicada, **de dónde salió la cifra** (banco / corrección
manual / estimación) y, si es estimación, la marca de pendiente.

## 3. Montos escritos a mano

Se aceptan `83,91`, `83.91`, `1.500,50`, `1,500.50`, `1.500`, y con símbolo
(`S/ 84,20`).
Se rechazan, con aviso y sin cambiar nada: `1.500.50` (ambiguo), `84,`, `.50`,
`84 20`, negativos, texto, y cualquier grupo de miles que no sea de tres cifras.

**`83,91` nunca es 8391.**

## 4. Lo estimado y lo exacto

- Un movimiento estimado **no entra** en el gasto exacto del mes, ni en la deuda
  exacta, ni en el disponible exacto.
- Existe un total propio, visible: **pendiente estimado**.
- **Excepción deliberada:** en el cupo de la tarjeta el estimado **sí** suma,
  porque dejarlo fuera mostraría más línea disponible de la que hay. La pantalla
  dice qué parte de lo usado es estimada.
- Las compras en cuotas se permiten sobre un monto estimado, y cada cuota se
  calcula con el **monto final en soles**, no con el del correo. Siguen marcadas
  como aproximadas.
- Mientras haya un estimado pendiente, hay un aviso que lleva a corregirlo.

## 5. Deshacer

Cuando él deshace algo:

1. el movimiento desaparece;
2. lo aprendido por esa operación (la tasa) se olvida;
3. la reversión **se guarda en el teléfono y se sube a la nube**;
4. si vuelve a abrir la app y esta carga de la nube, **lo deshecho no reaparece**;
5. si lo deshecho venía de un correo, ese correo **vuelve a la bandeja**, también
   en el servidor: la operación no se pierde.

## 6. Bandeja del banco

- Nada se anota sin que él confirme.
- Abrir una confirmación y **cancelar** no deja rastro: ni movimiento, ni
  escritura en el teléfono, ni subida a la nube, ni tasa aprendida.
- Un correo ya resuelto no reaparece, ni por su identificador nuevo ni por el
  heredado.
- «Volver a leer» (`fresco=1`) **no usa la caché**: lee el buzón de nuevo.
- Dos avisos del mismo gasto no se cuentan dos veces.

## 7. Privacidad

- Los datos de arranque de la app son de ejemplo: cifras redondas, sin titular.
- Los cuerpos de correo de prueba están reescritos con personas e
  identificadores inventados, conservando el formato que el parser necesita.
- Hay una prueba que lo verifica sola (`node limpieza.js`): busca formas
  —números largos, CCI, celulares, tarjetas, correos de personas— y falla si
  aparece alguna.

## 8. Versión

Una versión nueva sube los **cinco puntos**: `APP_VERSION`, `nx.css?v=`,
`nx.js?v=`, `CACHE` del service worker y su lista `SHELL`.

## 9. Cómo se comprueba

```
node ../app/apps-script/test_correos.js   # lector de correos + integración
node limpieza.js                          # privacidad de las fixturas
node t40.js … node t64.js                 # interfaz (iPhone simulado)
node audit.js                             # auditoría visual, claro y oscuro
```

Una versión pasa cuando **todo** eso está verde y la auditoría reporta cero
hallazgos en los dos modos.
