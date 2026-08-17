# Finanzas Personales

App de una sola página para controlar ingresos, gastos, presupuesto, deudas y metas. Funciona en el navegador, sin servidor y sin cuenta: **todos los datos se guardan en el navegador donde la abres** (`localStorage`).

Versión 2.7.0 · español (Perú) · soles

---

## Publicar en GitHub Pages

1. Sube **todo el contenido de esta carpeta** al repositorio (no solo `index.html` — sin `vendor/` y `fonts/` la app se abre pero pierde gráficos, PDF y Excel).
2. En el repo: **Settings → Pages → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Espera ~1 minuto. Tu app queda en `https://<usuario>.github.io/<repo>/`.

Todas las rutas son relativas, así que funciona igual en la raíz del dominio o en un subdirectorio del repo.

### Estructura (no renombres estas carpetas)

```
index.html                 la app completa (HTML + CSS + JS)
manifest.webmanifest       para instalarla como app en el celular
sw.js                      service worker: la deja usable sin internet
.nojekyll                  evita que GitHub Pages procese los archivos
vendor/                    librerías locales (gráficos, PDF, Excel)
fonts/                     tipografía Inter servida localmente
icons/                     iconos de la app
```

Nada se carga de internet: no hay CDN ni Google Fonts. Abre igual con o sin conexión.

## Instalarla en el celular

Abre la URL de GitHub Pages y elige **"Agregar a la pantalla de inicio"** (Safari: botón compartir; Chrome: menú de tres puntos). Queda como una app, en pantalla completa y sin barra del navegador.

## Dónde viven tus datos

En el navegador de cada dispositivo, por separado. Consecuencias prácticas:

- Lo que cargas en la laptop **no aparece** en el celular automáticamente.
- Borrar los datos del sitio o el historial **borra tus finanzas**.

Tres formas de mover o respaldar tus datos, en **Configuración**:

| Botón | Para qué |
|---|---|
| **Exportar copia (JSON)** | Baja un archivo con todo. Hazlo de vez en cuando. |
| **Restaurar copia (JSON)** | Carga ese archivo en otro dispositivo o después de un borrón. |
| **Cargar mis datos del plan (ago-2026)** | Vuelve a los datos iniciales: 6 préstamos, 2 tarjetas, presupuesto meta y 3 metas. |
| **Sincronización con Google** | Pega una URL de Apps Script y la app sube y baja los datos sola. Es la única forma de que laptop y celular se mantengan iguales. |

## Actualizar la app después de editarla

El service worker guarda la app en caché. Cuando cambies `index.html` o algo de `vendor/`, **sube el número de `CACHE` en `sw.js`** (`finanzas-v2.7.0` → `finanzas-v2.7.1`). Sin eso, el navegador puede seguir mostrando la versión vieja.

## Dato inicial cargado

La app viene con la posición real al **31-ago-2026** ya adentro:

- **6 préstamos** con su cuota y plazo, y la TCEA calculada sola desde monto, cuota y plazo.
- **2 tarjetas** con el saldo pasado a 12 cuotas.
- **Presupuesto meta** de S/ 1,045 al mes de gasto de vida.
- **3 metas**: fondo mínimo de S/ 1,000, fondo de 3 meses, y capital propio para el negocio de ropa.
- Estrategia **avalancha** (primero la de mayor tasa) con S/ 150 de pago extra al mes.

Dos números que hay que confirmar y corregir en la pestaña **Deudas**:

- **Línea de crédito** de cada tarjeta (van S/ 5,000 y S/ 2,000 de referencia).
- **Línea consumo BCP**: se estimó un capital de S/ 2,935 para que los 15 pagos de S/ 260 den una TCEA de ~56%. Si tienes el cronograma real, reemplázalo.

Para empezar de cero: **Configuración → Reiniciar todo**.
