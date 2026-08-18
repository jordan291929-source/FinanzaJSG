# La nube de tu app — Drive + Apps Script

Esto es la guía que en la otra laptop quedó pendiente ("te paso la guía de cómo crearla"). Nunca llegó al archivo, así que aquí está, con el script ya escrito y probado.

---

## Qué es y para qué sirve

Tu app guarda todo en el navegador donde la abres. Eso significa que la laptop y el celular son dos mundos separados, y que si borras los datos del sitio, se van tus finanzas.

La "nube" resuelve las dos cosas. Es un script tuyo, en tu cuenta de Google, que hace de intermediario:

```
        laptop  ─┐
                 ├──►  script de Apps Script  ──►  archivo JSON en tu Drive
        celular ─┘              (tuyo)              (carpeta "Finanzas Personales")
```

- **Al abrir la app**, ella le pide los datos al script (GET) y se pone al día.
- **Cada vez que editas algo**, la app se lo manda al script (POST) ~1 segundo después. No hay botón que apretar.
- Si la versión de la nube es más nueva que la local, gana la nube. Si la local es más nueva, la app te avisa y **no** la sobrescribe.
- El script guarda además **un respaldo por día** (60 días). Esto importa: sin él, si algo borrara tus datos, el guardado automático pisaría también la copia de la nube.

El mismo script manda el estado de cuenta a tu correo con el PDF y el Excel adjuntos.

Todo vive en tu cuenta de Google. No pasa por ningún servidor mío ni de nadie más.

---

## Cómo crearla (10 minutos, una sola vez)

### 1. Crear el proyecto

Entra a **[script.google.com](https://script.google.com)** → **Nuevo proyecto**. Ponle un nombre arriba a la izquierda, por ejemplo `Finanzas — nube`.

### 2. Pegar el código

Borra todo lo que aparezca en el editor y pega el contenido completo de **`Codigo.gs`**.

### 3. Cambiar la clave

Arriba del archivo hay esta línea:

```javascript
const CLAVE = 'cambia-esto-por-algo-tuyo-largo-2026';
```

Reemplázala por cualquier texto largo tuyo, **sin espacios ni tildes**. Por ejemplo `mi-clave-larga-y-unica-2026`. Anótala, la necesitas en el paso 6.
**No pongas la tuya en ningún archivo del repositorio**: esta guía es pública.

Guarda con el icono del disquete (o `Ctrl+S`).

### 4. Publicar

**Implementar** (arriba a la derecha) → **Nueva implementación** → el engranaje ⚙ → **Aplicación web**. Luego:

| Campo | Qué poner |
|---|---|
| Descripción | `v1` |
| Ejecutar como | **Yo** (tu correo) |
| Quién tiene acceso | **Cualquier persona** |

Dale **Implementar**.

> **Ese "Cualquier persona" es obligatorio** y suena peor de lo que es. Significa "sin login de Google", no "público". Sin eso, la app recibe la pantalla de login de Google en vez de tus datos y falla. Quien te protege es la clave del paso 3: sin `?k=tu-clave` el script no devuelve nada.

### 5. Autorizar

Google te va a pedir permisos. Aparece un aviso de "aplicación no verificada": es normal, la app la estás haciendo tú.

**Configuración avanzada** → **Ir a Finanzas — nube (no seguro)** → **Permitir**.

Pide dos permisos: Drive (para guardar el archivo) y Gmail (para enviarte el estado de cuenta).

### 6. Copiar la URL y armarla

Al terminar te da una **URL de la aplicación web** que termina en `/exec`. Cópiala y **pégale tu clave al final**:

```
https://script.google.com/macros/s/AKfycb.../exec?k=TU-CLAVE
```

Esa URL completa —con el `?k=` incluido— es la que va en la app.

### 7. Conectar la app

Abre **https://jordan291929-source.github.io/FinanzaJSG/**

- **Configuración** → *URL de sincronización* → pega la URL → **Conectar**.
  La primera vez dirá **"Conectado ✓ — la nube está vacía"**. Pulsa **Guardar en la nube** para subir tus datos.
- **Estado de cuenta** → *URL de envío* → pega **la misma URL** → guardar. (Es el mismo script; la app usa dos campos porque antes eran dos scripts distintos.)

Verás aparecer en tu Drive una carpeta **Finanzas Personales** con `finanzas-datos.json` dentro.

### 8. Conectar el celular

Abre la misma dirección en el celular, ve a **Configuración**, pega **la misma URL** y **Conectar**. Debe decir **"✓ Cargado de la nube"** y aparecer tus datos.

Ahí recién puedes hacer *Agregar a la pantalla de inicio*.

---

## Qué debe decir cuando funciona

| Mensaje | Qué significa |
|---|---|
| `Conectado ✓ — la nube está vacía` | Todo bien, primera vez. Pulsa *Guardar en la nube*. |
| `Guardado en la nube · 4:59 p. m.` | Se subió. Sale solo cada vez que editas algo. |
| `✓ Cargado de la nube · 4:59 p. m.` | Bajó los datos del otro dispositivo. |
| `Tu versión local es más reciente (no se sobrescribió)` | Editaste aquí sin conexión. Pulsa *Guardar en la nube* para que gane esta versión. |

## Si algo falla

| Error | Causa y arreglo |
|---|---|
| `La URL pide iniciar sesión` | En el paso 4 no quedó *Cualquier persona*. Vuelve a **Implementar → Gestionar implementaciones → editar ✏ → Quién tiene acceso: Cualquier persona**. |
| `La URL no devuelve datos válidos` | Copiaste la URL del editor y no la de la aplicación web. Debe terminar en `/exec` (más tu `?k=`). |
| `No se pudo conectar` | Falta el `?k=tu-clave` al final, o la clave no coincide con la del script. |
| El correo no llega | Falta autorizar Gmail. En el editor, ejecuta la función `probar` una vez y acepta los permisos. |

Para revisar que todo esté en orden: en el editor de Apps Script elige la función **`probar`** y dale ▶. En el registro te dice qué archivo existe, cuántos bytes tiene, a qué correo enviaría y si la clave está puesta.

---

## Cada vez que cambies el script

Si editas `Codigo.gs`, tienes que volver a publicar: **Implementar → Gestionar implementaciones → editar ✏ → Versión: Nueva → Implementar**. La URL no cambia.

## Un detalle honesto

La clave del paso 3 va en la URL. Es una protección real (sin ella el script no responde nada), pero no es una contraseña fuerte: si alguien ve tu URL completa, ve tus datos. No la pegues en un chat de grupo ni en un repositorio público. Para uso personal entre tu laptop y tu celular está bien.

Y ojo con esto: la carpeta de Drive **no** es un respaldo si borras el archivo a mano. Los respaldos diarios son los `backup-2026-08-17.json` que el script deja al lado. También sigue teniendo sentido bajar de vez en cuando el **Exportar copia (JSON)** desde Configuración.
