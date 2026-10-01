# Barbería & Tattoo Isaza

Página y sistema de reservas de **Isaza** (barbería y tatuajes, Granada, Cali): reservas por barbero, cotización de
tatuajes por WhatsApp, panel para barberos y administración, tienda opcional con pagos en línea y correos automáticos.
Un mismo código sirve a varios clientes: la configuración de cada barbería está en `src/app/config/clientes/`.

**Stack:** Angular 20 (standalone, SPA) · Firebase Auth (Google, código por SMS, enlace al correo; Apple listo para
activar) · Cloud Firestore · Cloud Storage (fotos del staff) ·
Cloud Functions (correos con Resend, pedidos e inventario, pagos con Wompi) · Tailwind CSS 3.

**Proyecto de Firebase:** `isaza-barber` (`.firebaserc`). Config web en `src/app/config/clientes/isaza.ts`.

## Desarrollo

```bash
npm install
npm start            # http://localhost:4200 con el Firebase REAL (isaza-barber)
npm run build        # build de producción en dist/barberia/browser
```

> Si ya tienes otro `ng serve` en el puerto 4200 (p. ej. El Acicale), deténlo antes o usa `npx ng serve --port 4201`.

### Demo con datos de prueba (sin tocar datos reales)

```bash
npm --prefix functions install      # la primera vez
npm run demo                        # emuladores + la página en http://localhost:4200
```

- Usa los emuladores (proyecto `demo-isaza`, con Storage en el puerto 9199) con los datos de `demo-datos/`: 5 servicios, 2 barberos de ejemplo
  (Isaza y Santiago, con correos `@example.com`), ~150 citas, 8 productos de ejemplo con inventario y 5 pedidos.
  **Nunca toca el proyecto real.**
- **El inicio de sesión es con Google real**; solo los datos van a los emuladores. La cuenta `adminEmail` de la
  config entra como admin; cualquier otra entra como cliente.
- Para volver a los datos originales, con la demo abierta: `npm run demo:sembrar`.
- El pago en línea abre un **checkout simulado** (solo en los emuladores). Los correos no salen: se ven en el log.
- Necesita `functions/.secret.local` con valores cualquiera para `RESEND_API_KEY`, `WOMPI_INTEGRITY_SECRET` y
  `WOMPI_EVENTS_SECRET` (ver `functions/.env.example`).

## Pruebas

```bash
npm test                 # 29 pruebas de la app (horario, ganancias, estado "abierto/cerrado", celulares)
npm run test:reglas      # 119 pruebas de firestore.rules + 43 de storage.rules (emuladores, proyecto demo-reglas)
npm run test:funciones   # 28 pruebas de las funciones (correos, pedidos, Wompi)
```

`test:reglas` deja a veces vivo el Java del emulador de Firestore en el puerto 8080: si el siguiente emulador no
arranca, ciérralo (`Get-NetTCPConnection -LocalPort 8080` → `Stop-Process`).

## Qué tiene la página

- **Inicio:** titular con el nombre de la marca, estado en vivo ("Abierto ahora · cierra a las 8:00 PM", en hora de
  Colombia), sello giratorio con el logo, cinta de servicios, menú de servicios destacados (toca uno y reservas),
  bloque **Barbería / Tattoo** (los tatuajes se cotizan por WhatsApp en 3 pasos), sección del **CEO y Fundador**
  (`@isaza_barber_tattoo`), galería con 3 publicaciones de Instagram (el script de Instagram se carga solo cuando la
  galería está por aparecer), mapa, horario de la semana con el día de hoy resaltado y contacto.
- **Logo:** `public/isaza-marca.svg` (la "I" con el corte de navaja dentro de un sello). Favicon, íconos de app
  (`manifest.webmanifest`, se puede instalar en el celular) e imagen para compartir en redes (`og-isaza.jpg`).
- **Ingreso** (`/login`): Google, código por SMS al celular (+57), enlace de acceso al correo y Apple (ver *Formas de
  entrar*). Las cuentas que no traen nombre (celular, correo y a veces Apple) lo escriben en un último paso.
- **Reservas:** 4 pasos (barbero, servicio, horario, datos), disponibilidad en tiempo real y sin doble reserva.
  El correo es el de la cuenta (solo lectura; las cuentas de celular no tienen y el campo no aparece), el celular se
  valida (10 dígitos) y, si entró con su celular, ya viene escrito.
- **Paneles:** `/barbero` (agenda, cortes y ganancias) y `/admin` (citas, cortes y ganancias, servicios, staff,
  usuarios, tienda, pedidos y ajustes).
- **Fotos del staff:** en *Admin → Staff & Barberos*, "Subir foto" reduce la imagen en el navegador (lado mayor de
  1200 px, WebP), la sube a Storage en la carpeta `Staff Barberos` y pone su URL de descarga como avatar. "Elegir de
  Staff Barberos" muestra las fotos que ya están ahí (también las subidas desde la consola). Si se sube una foto y no
  se guarda (se cancela o se cambia por otra), se borra sola; las ya guardadas no se tocan. El SDK de Storage solo se
  descarga en el panel (`FotosStaffService`): la página pública muestra las fotos con su URL.
- **Sin emojis:** íconos SVG propios (`app-icono`) y logos de redes (`app-red-social`).
- La identidad (colores, fuentes, textos, redes, horario) está en `src/app/config/clientes/isaza.ts`. Lo que dice
  `TODO` hay que confirmarlo con el cliente.

## Roles

| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| `cliente` | Por defecto al iniciar sesión (con cualquier método) | Reservar, comprar, ver y cancelar sus citas y pedidos |
| `barbero` | El admin lo registra en *Staff & Barberos* con su correo de Google. Debe entrar con una cuenta que tenga ese correo (no con el celular) | `/barbero`: su agenda, sus cortes y su ganancia |
| `admin` | La cuenta `adminEmail` de la config (y la misma en `firestore.rules`) | Todo |

El rol **solo lo puede cambiar un admin**: las reglas de Firestore impiden que un usuario modifique el suyo.
Si cambia `adminEmail`, hay que cambiarlo también en `firestore.rules` y `storage.rules` (`esEmailAdmin()`).

## Seguridad

- **Reglas de Firestore** (`firestore.rules`, desplegadas en `isaza-barber`): nadie se da rol de barbero o admin; el
  perfil solo acepta campos conocidos y el correo de la propia cuenta; cada cliente ve solo sus citas y pedidos; las
  reservas deben coincidir con el catálogo (nombre, precio y duración), ocupar todos sus bloques de agenda, tener
  textos de tamaño razonable y mandar la confirmación solo al correo de quien reserva; el barbero solo gestiona sus
  citas; los pedidos solo los crea la Cloud Function; el historial de inventario no se edita; cualquier otra
  colección queda cerrada. Cada caso está en `pruebas/reglas.mjs`.
- **Ingreso:** los SMS solo salen a celulares de Colombia (política de regiones de Authentication: evita el fraude de
  SMS a otros países, que en Blaze se cobraría) y Firebase exige un reCAPTCHA invisible antes de cada envío. El enlace
  del correo es de un solo uso y se quita de la barra de direcciones. La vuelta tras entrar (`?volver=`) solo acepta
  rutas internas. Las reglas ya funcionaban con cuentas sin correo: perfil sin campo `email` y reservas con
  `userEmail` vacío; un celular no puede ponerse el correo de otra persona ni darse rol (casos en `pruebas/reglas.mjs`).
- **Reglas de Storage** (`storage.rules`, desplegadas): solo un admin lee, lista, sube o borra, y solo en la carpeta
  `Staff Barberos`; solo fotos JPEG, PNG o WebP de menos de 3 MB (nada de HTML ni SVG, que podrían llevar scripts).
  La página muestra las fotos con su URL de descarga, que lleva token y no pasa por las reglas. El admin se reconoce
  por el correo configurado (como en Firestore) o por el rol `admin` en `usuarios/{uid}`; esto último necesita que la
  cuenta de servicio de Storage tenga el rol *Firebase Rules Firestore Service Agent* (ver *Publicar*). Cada caso está
  en `pruebas/reglas-storage.mjs`.
- **Funciones:** validan sesión, datos y firma (webhook de Wompi); precios e inventario se calculan en el servidor;
  un cliente puede tener máximo 3 pedidos pendientes; tope de 5 instancias por función.
- **Hosting** (`firebase.json`): `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS y una CSP
  básica (`object-src 'none'`, `base-uri`, `frame-ancestors`, `form-action`), probada con el mapa, Instagram y el
  login. Caché larga solo para archivos con hash.
- **Sin terceros innecesarios:** los avatares de iniciales, el sonido de aviso y el logo de Google se generan en la
  propia app (antes se pedían a ui-avatars.com, mixkit.co y svgrepo.com).
- **Dependencias:** `npm audit` marca `@grpc/grpc-js` (solo lo usa Firestore en Node, no en el navegador) y `uuid`
  dentro de `firebase-admin` (no se usa la función afectada). No hay arreglo publicado sin romper versiones.

## Formas de entrar

Se eligen en `acceso` de la config del cliente (`src/app/config/clientes/isaza.ts`); Google siempre está. Cada una
debe estar habilitada en *Firebase → Authentication → Sign-in method* (en `isaza-barber` lo están las cuatro).

| Método | Estado | Notas |
|---|---|---|
| Google | Activo | Ventana emergente. Trae nombre y correo. |
| Celular | Activo (`telefono: true`) | Código de 6 dígitos por SMS a +57. **Cada SMS se cobra** en Blaze según el país: conviene la alerta de presupuesto. Política de regiones: solo Colombia. Para probar sin gastar, se pueden agregar números de prueba en *Authentication → Sign-in method → Teléfono*. |
| Correo | Activo (`correo: true`) | Firebase envía un **enlace** de acceso (no un código) desde `noreply@isaza-barber.firebaseapp.com`, en español. Si se abre en otro navegador, pide confirmar el correo. Puede caer en Spam. |
| Apple | Habilitado en Firebase, **apagado en la app** (`apple: false`) | Falta configurarlo (abajo). Sin eso, Apple responde `invalid_client`. |

**Para encender Apple** (necesita una cuenta de Apple Developer Program, de pago):
1. En [developer.apple.com](https://developer.apple.com/account/resources): un *App ID* con *Sign in with Apple* y un
   *Services ID* (p. ej. `com.isaza.web`) con *Sign in with Apple* configurado: dominio `isaza-barber.firebaseapp.com` y
   Return URL `https://isaza-barber.firebaseapp.com/__/auth/handler`.
2. Una *Key* con *Sign in with Apple* (descargar el `.p8`; anotar Key ID y Team ID).
3. En *Firebase → Authentication → Apple*: Services ID, Team ID, Key ID y la llave `.p8`.
4. Si Apple va a reenviar correos a los usuarios que ocultan el suyo: registrar `noreply@isaza-barber.firebaseapp.com`
   en *Apple → Services → Sign in with Apple for Email Communication*.
5. `apple: true` en `isaza.ts`.

El nombre que ven los clientes en los correos y SMS es el *nombre público* del proyecto (hoy "Isaza-barber"): se cambia
en *Firebase → Configuración del proyecto → General*.

## Correos automáticos (Resend)

Funciones `avisarCitaNueva`, `avisarCambioDeCita` y `recordarCitas` (`functions/src/avisos.ts`): confirmación con el
evento para el calendario, aviso al barbero, cancelación, cambio de horario y recordatorio el día anterior a las
6:00 p. m. Datos del negocio en `functions/.env.isaza-barber`. Con `onboarding@resend.dev` Resend solo entrega al
correo dueño de la cuenta: para enviar a clientes hay que verificar un dominio en Resend.

## Tienda (opcional)

En código arranca **oculta** hasta que el admin la activa en *Admin → Ajustes*. En `isaza-barber` **ya está
activa** (`ajustes/sitio`) con 8 productos de prueba (IDs como `CeraMateFijacion01`; las fotos dicen "Producto de
ejemplo"): se borran desde *Admin → Tienda & Productos*. Los pedidos los crea la Cloud Function `crearPedido` (precios
del catálogo, envío e inventario en una transacción); ya está desplegada. Pago en línea con Wompi (`iniciarPagoWompi`, `webhookWompi`, `confirmarPagoWompi`),
contraentrega o pago en la barbería. El pago en línea está apagado hasta tener las llaves de Wompi.

## Publicar

`isaza-barber` está en el plan **Blaze**. Reglas, base de datos y tienda están activas, y **`crearPedido` y
`cancelarPedido` están desplegadas** (2026-10-01): los pedidos con contraentrega o pago en la barbería funcionan.

Las funciones están separadas por módulos (`functions/src/`):

| Módulo | Funciones | Secretos | Interruptor en `functions/.env.isaza-barber` |
|---|---|---|---|
| `tienda.ts` | `crearPedido`, `cancelarPedido` | Ninguno | Siempre activas |
| `avisos.ts` | `avisarCitaNueva`, `avisarCambioDeCita`, `recordarCitas` | `RESEND_API_KEY` | `ACTIVAR_CORREOS` |
| `pagos.ts` | `iniciarPagoWompi`, `confirmarPagoWompi`, `webhookWompi`, `simularPagoWompi` | `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | `ACTIVAR_PAGOS_EN_LINEA` |

Los interruptores existen porque la CLI exige que estén creados todos los secretos que declara el código, aunque
se despliegue una sola función. En la demo con emuladores (`.env.demo-isaza`) están activos.

```bash
npm run build && firebase deploy --only hosting      # la página en https://isaza-barber.web.app
firebase deploy --only firestore                     # reglas e índices (ya desplegados)
firebase deploy --only storage                       # reglas de Storage (ya desplegadas)

# Activar los correos: llave de Resend (API Keys, permiso de solo envío)
firebase functions:secrets:set RESEND_API_KEY
#   y en functions/.env.isaza-barber: ACTIVAR_CORREOS=true
# Activar el pago en línea: llaves de Wompi (Desarrolladores)
firebase functions:secrets:set WOMPI_INTEGRITY_SECRET
firebase functions:secrets:set WOMPI_EVENTS_SECRET
#   y en functions/.env.isaza-barber: ACTIVAR_PAGOS_EN_LINEA=true y WOMPI_PUBLIC_KEY=pub_...
FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase deploy --only functions
```

**Otros admins y las fotos:** hoy solo la cuenta de `adminEmail` puede subir fotos. Para que cualquier cuenta con rol
`admin` pueda, ejecuta `firebase deploy --only storage` en una terminal interactiva y responde *Sí* a "Grant the new
role?" (le da a la cuenta de servicio de Storage permiso para leer el rol en Firestore). Las reglas no cambian.

Nunca uses un texto fijo como secreto temporal: el webhook de Wompi firma con `WOMPI_EVENTS_SECRET` y uno
adivinable permitiría marcar pedidos como pagados. Limpieza de imágenes de Artifact Registry: 1 día (ya configurada).

- Con dominio propio: conectarlo en Hosting, agregarlo en *Authentication → Dominios autorizados*, cambiar `authDomain`
  en la config, y actualizar `og:image` en `src/index.html` y `URL_SITIO` en `functions/.env.isaza-barber`.
- Los encabezados de seguridad se revisan en producción con `curl -I` (el emulador de Hosting no los aplica).
- Wompi: URL de eventos `https://us-central1-isaza-barber.cloudfunctions.net/webhookWompi`.
- Poner una alerta de presupuesto en Google Cloud (Blaze ya está activo).

## Política de tratamiento de datos

Página `/politica-de-datos` (Ley 1581 de 2012). Los datos del responsable salen de `legal` en la config: **faltan
razón social, NIT y correo de Isaza** (TODO en `isaza.ts`). Conviene que un abogado la revise antes de lanzar.
