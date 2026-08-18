# Lector de correos del banco — cómo activarlo

La app puede leer las notificaciones que BCP, Yape e Interbank te mandan por
cada operación y dejarlas en una **bandeja** para que las confirmes con un
toque, en vez de teclear cada gasto.

Dos cosas importantes antes de empezar:

- **Tus correos no salen de tu cuenta de Google.** El script corre dentro de tu
  propio Google, lee solo esos tres remitentes y devuelve una lista de
  operaciones (fecha, monto, comercio). Nadie más lo ve.
- **Nada se anota sin tu visto bueno.** La bandeja propone; tú confirmas. Los
  traslados entre tus propias cuentas ni siquiera se anotan: solo se te muestran.

---

## Paso 1 — Pega el archivo Correos.gs

1. Abre tu proyecto de Apps Script (el mismo de la sincronización:
   [script.google.com](https://script.google.com) → tu proyecto).
2. En el panel izquierdo, junto a **Archivos**, toca **+** →
   **Secuencia de comandos**. Nómbralo `Correos` (sin `.gs`).
3. Borra lo que traiga y pega **todo** el contenido de `Correos.gs`.
4. Guarda (💾 o Ctrl+S).

## Paso 2 — Revisa que Codigo.gs tenga el enganche

En `Codigo.gs`, dentro de `doGet`, deben estar estas líneas (si usaste el
`Codigo.gs` de este mismo paquete, ya están):

```js
if (e && e.parameter && e.parameter.bandeja) {
  try { return json_({ ok: true, bandeja: bandeja_(+e.parameter.dias || 0) }); }
  catch (err) { return json_({ ok: false, error: String(err) }); }
}
```

Y dentro de `doPost`:

```js
if (d && d.action === 'archivar') return archivar_(d.ids);
```

## Paso 3 — Pruébalo desde el editor (recomendado)

1. Arriba, en el selector de funciones, elige **probarCorreos** y toca
   **Ejecutar**.
2. Google te va a pedir permiso para **leer tu Gmail**. Es la primera vez y es
   normal: el script necesita leer esos correos para poder interpretarlos.
   Acepta con tu propia cuenta.
   - Si aparece "Google no ha verificado esta aplicación": **Configuración
     avanzada** → **Ir a (tu proyecto)**. Es tu propio script, no un tercero.
3. Mira el **Registro de ejecución**. Deberías ver algo como:

```
Detectados: 12
2026-08-16 · S/ 25.50 · Yape · yape · Gasto · Pedidos Ya · yape-...
2026-08-15 · S/ 50.00 · BCP · debito-bcp · Gasto · Plin-Nora Alexandra Zam · bcp-624158
2026-08-16 · S/ 100.00 · BCP · cuenta-bcp · Traslado · Retiro de wardadito Casa · bcp-...
```

Si dice `Detectados: 0`, revisa que los correos del banco estén en tu bandeja
(no en Spam) y que el remitente sea uno de estos tres:

- `notificaciones@notificacionesbcp.com.pe`
- `notificaciones@yape.pe`
- `servicioalcliente@netinterbank.com.pe`

## Paso 4 — Vuelve a publicar el script

Cada cambio necesita una implementación nueva para que la app lo vea:

**Implementar** → **Administrar implementaciones** → ✏️ (editar) →
**Versión: Nueva** → **Implementar**.

La URL **no cambia**, así que no tienes que tocar nada en la app.

## Paso 5 — Úsalo en la app

**Perfil → Finanzas → Bandeja del banco** → *Revisar mis correos*.

Cada operación llega con:

- **categoría propuesta** por el nombre del comercio (Pedidos Ya → Alimentación,
  Movistar → Servicios). Tócala para cambiarla.
- **cuenta o tarjeta propuesta** según el medio: consumo con crédito BCP va a tu
  Tarjeta BCP, el yapeo a Yape / Plin, el pago de Interbank abona a la deuda de
  esa tarjeta. También se cambia con un toque.

Botones: **Anotarlo** (te muestra el efecto en tu deuda y tu disponible antes de
confirmar, y queda un "Deshacer") o **Descartar**.

Lo que anotes o descartes no vuelve a aparecer nunca: el script guarda los ids
resueltos en `correos-vistos.json`, en la misma carpeta de Drive.

---

## Qué reconoce, y qué no

| Correo | Qué hace |
|---|---|
| Consumo con Tarjeta de Crédito BCP | Gasto en la Tarjeta BCP (suma a la línea usada) |
| Consumo con Tarjeta de Débito BCP | Gasto en la cuenta Débito |
| Yapeo a celular / transferencia / retiro | Gasto en la cuenta |
| Pago de servicios BCP | Gasto en la cuenta |
| Pago exitoso / yapeo de servicio (Yape) | Gasto, con el comercio o la empresa como concepto |
| Constancia de pago Interbank | Gasto, o **pago de deuda** si el cargo fue a la tarjeta |
| Transferencia entre mis cuentas | **Traslado** — se muestra, no se anota |
| Aporte o retiro de wardadito | **Traslado** — mover plata entre tus bolsillos no es gasto |
| Compra rechazada | Se ignora (la operación no ocurrió) |
| Constancia de configuración, estados de cuenta, publicidad | Se ignora |

## Si algo sale mal

| Mensaje en la app | Qué significa |
|---|---|
| "Falta pegar Correos.gs" | El script respondió, pero sin la función `bandeja_`. Repite el paso 1 y vuelve a publicar. |
| "La nube pidió iniciar sesión" | La implementación quedó con acceso restringido. Publícala con **Quién tiene acceso: Cualquier persona**. |
| "clave incorrecta" | La URL de la app no lleva `?k=` con la misma clave que `CLAVE` en `Codigo.gs`. |
| Detecta un correo mal (monto o fecha raros) | Mándame el correo y ajusto el patrón. Los formatos de los bancos cambian de vez en cuando. |

## Aviso honesto sobre la clave

La `CLAVE` del script es una protección débil: si alguien consigue tu URL
completa, puede leer tus datos. No la publiques ni la pegues en sitios
públicos. Es aceptable para uso personal, pero no es una contraseña de banco.
