# Epic Shine — Detailing Mode

Tienda online + punto de venta (POS) para Epic Shine, con stock sincronizado
en tiempo real entre ambos canales.

> **Estado del proyecto**: tienda online funcional de punta a punta
> (catálogo, ficha de producto, carrito, checkout como invitado, pago con
> Mercado Pago, cotizador de envío por peso y cupones de descuento), POS
> con venta presencial, cupones y cierre de caja, y panel de
> administración completo (productos, stock, pedidos, proveedores/compras,
> envíos, cupones, usuarios, apariencia de la tienda, reportes). La
> facturación electrónica AFIP
> queda fuera de alcance por ahora (decisión del negocio). Ver "Próximos
> pasos".

## Stack

- **Next.js 16** (App Router) + **TypeScript**, Tailwind CSS v4.
- **PostgreSQL** + **Prisma ORM** (`prisma/schema.prisma`).
- **Auth.js (NextAuth v5)** con roles `ADMIN`, `EMPLOYEE`, `CUSTOMER`.
- Pensado para desplegar en **Vercel** (app) + **Supabase** o **Railway**
  (Postgres administrado).

## Instalación local

### 1. Requisitos

- Node.js 20+
- PostgreSQL 14+ corriendo localmente, o una URL de conexión a un Postgres
  administrado (Supabase/Railway).

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completá `.env` con:

- `DATABASE_URL`: cadena de conexión a Postgres.
- `AUTH_SECRET`: generar con `npx auth secret` (o cualquier string
  aleatorio largo).
- El resto de las variables (Mercado Pago, correo, envíos) pueden quedar
  vacías mientras no se usen esos módulos.

### 3. Instalar dependencias y preparar la base de datos

```bash
npm install
npm run db:migrate   # crea las tablas
npm run db:seed      # carga sucursal, usuario admin y productos de ejemplo
```

El seed imprime el email/contraseña del usuario admin creado (por defecto
`admin@epicshine.com.ar` / `CambiarEstaClave123!` — **cambiala en producción**
seteando `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` antes de correr el seed).

### 4. Correr en desarrollo

```bash
npm run dev
```

- Tienda: http://localhost:3000
- Login: http://localhost:3000/login
- Panel admin (rol ADMIN): http://localhost:3000/admin
- POS (rol ADMIN o EMPLOYEE): http://localhost:3000/pos

### Otros comandos útiles

```bash
npm run db:studio   # explorador visual de la base de datos (Prisma Studio)
npm run lint        # linter
npm run build       # build de producción
```

## Arquitectura de stock (tienda + POS sincronizados)

Todo movimiento de stock —venta online, venta en el local, ajuste manual,
ingreso por compra— pasa por la tabla `StockItem` (stock por variante y por
sucursal) dentro de una **transacción atómica de Postgres**. La venta del
POS (`src/lib/sales.ts`) descuenta stock con un `UPDATE ... WHERE quantity
>= cantidad_pedida`, lo que evita vender de más si dos ventas ocurren al
mismo tiempo (dos cajeros, o un cajero y un cliente online, vendiendo el
último producto). Cada movimiento además queda registrado en
`StockMovement` para auditoría.

La tienda pública no cachea el catálogo de forma estática (`dynamic =
"force-dynamic"` en la home) para reflejar el stock real en cada request.

## Importar stock desde remito o foto de ticket

Desde `/admin/compras/importar` se puede subir el PDF de un remito o una
foto del ticket de un proveedor: la IA de Claude (Anthropic) lee el
documento y devuelve los ítems (producto, cantidad, costo unitario), que
se matchean automáticamente contra las variantes existentes por SKU,
código de barras o similitud de nombre (`src/lib/product-matching.ts`).
El admin revisa las coincidencias sugeridas, las corrige si hace falta
(o marca una línea como "omitir"), y al confirmar se registra como una
compra normal (`createPurchaseOrder`): mismo ingreso de stock atómico y
mismo historial que cargar la compra a mano.

Para habilitarlo, generá una API key en
https://console.anthropic.com/settings/keys y cargala en
`ANTHROPIC_API_KEY`. Sin esa variable, la importación de remitos devuelve
un error explícito al leer el archivo; la carga manual de compras
(`/admin/compras/nueva`) sigue funcionando igual.

## Mercado Pago (Checkout Pro)

El checkout online ya integra Mercado Pago; para probarlo en desarrollo:

1. Entrá a https://www.mercadopago.com.ar/developers/panel/app y creá (o
   usá) una aplicación. En la pestaña **Credenciales de prueba** copiá el
   `Access Token` a `MERCADOPAGO_ACCESS_TOKEN`.
2. En la pestaña **Webhooks** de la misma app, copiá la **Clave secreta**
   a `MERCADOPAGO_WEBHOOK_SECRET`. Sin este secreto, el webhook igual
   funciona pero sin validar que la notificación venga realmente de
   Mercado Pago (nunca lo dejes vacío en producción).
3. Mercado Pago necesita poder llamar a tu `notification_url`
   (`NEXT_PUBLIC_SITE_URL/api/webhooks/mercadopago`) desde internet, así
   que en local hace falta un túnel (`ngrok http 3000`, por ejemplo) y
   setear `NEXT_PUBLIC_SITE_URL` a esa URL pública mientras probás pagos.
4. Para pagar de prueba, usá las tarjetas de test de Mercado Pago
   (https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)
   y un usuario comprador de prueba (se crea en la sección **Usuarios de
   prueba** del panel de developers).
5. Cuando la tienda esté lista para vender de verdad, solo hay que
   reemplazar `MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_WEBHOOK_SECRET` por
   las credenciales de **producción** de la cuenta real de Epic Shine; el
   código no cambia.

Si estas variables no están configuradas, el checkout sigue funcionando
con efectivo/transferencia; solo la opción de Mercado Pago devuelve un
error explícito en vez de romper el resto de la compra.

## Imágenes de producto

Las fotos que se suben desde `/admin/productos/[id]/editar` se guardan en
**Vercel Blob**. Para habilitarlo: en el proyecto de Vercel, pestaña
**Storage** → **Create Database** → **Blob** → conectarlo al proyecto —
la variable `BLOB_READ_WRITE_TOKEN` se carga sola, no hace falta copiarla
a mano. Sin esa variable configurada, la subida de imágenes falla (el
resto de la tienda funciona igual).

## Notificaciones por email

El cliente recibe un email de confirmación al crear un pedido online, y
otro cada vez que su estado cambia (pagado, enviado, cancelado, etc. —
tanto desde `/admin/pedidos` como automáticamente vía el webhook de
Mercado Pago). Es otro placeholder honesto: usa SMTP genérico
(`src/lib/email.ts`) para no atarse a un proveedor en particular.

1. Completá `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS` en `.env`
   con cualquier proveedor SMTP (Gmail con contraseña de aplicación,
   SendGrid, Mailgun, el relay SMTP de Resend, etc.).
2. Sin `SMTP_HOST` configurado, el envío se salta con un aviso en consola
   en vez de romper el checkout o el cambio de estado que lo dispara —
   podés probar toda la tienda sin tener credenciales de email todavía.
3. Las plantillas están en `src/lib/order-notifications.ts`; agregar un
   nuevo evento (por ejemplo, avisar al admin de un pedido nuevo) es
   agregar una función ahí y llamarla donde corresponda.

## Notificaciones por WhatsApp

Los mismos dos eventos (pedido creado, cambio de estado) también se
intentan mandar por WhatsApp al teléfono que el cliente dejó en el
checkout (`src/lib/whatsapp.ts`), usando la API de WhatsApp de Twilio.
Es independiente del email: si el cliente dejó los dos datos, le llega
por ambos canales.

1. Creá una cuenta en [Twilio](https://www.twilio.com/console) y activá
   WhatsApp (Messaging → Try WhatsApp tiene un sandbox gratis para
   probar; producción requiere un número de WhatsApp Business
   verificado).
2. Completá `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y
   `TWILIO_WHATSAPP_FROM` en `.env` con los valores de esa cuenta.
3. Sin esas variables, el envío se salta con un aviso en consola, igual
   que el email sin `SMTP_HOST`.
4. El número del cliente no se valida en formato estricto (se guarda
   como lo escribe en el checkout); si Twilio lo rechaza por faltarle
   el código de país o no estar habilitado en el sandbox, queda
   logueado como error sin afectar el pedido.

## Accesibilidad

Además del linting estático de JSX (`eslint-plugin-jsx-a11y`, ya incluido
en la config de Next y corriendo en `npm run lint`), se auditaron todas
las páginas públicas, del panel admin y del POS con axe-core (motor de
reglas WCAG 2.1 A/AA) contra una instancia real corriendo con datos de
prueba — no solo una revisión de código. Encontró y se corrigieron 3
problemas reales: inputs de variantes de producto sin `<label>` asociado
(`/admin/productos/nuevo`), y dos `<select>` sin nombre accesible (cambiar
estado de un pedido en `/admin/pedidos`, cambiar rol de un usuario en
`/admin/usuarios`). Además ya existían de antes: skip link al contenido
principal, foco visible en toda la navegación por teclado, y texto
alternativo obligatorio en las imágenes de producto subidas desde el
admin. Para volver a correr una auditoría similar, instalar `axe-core`
como dependencia de desarrollo e inyectarlo con Playwright contra cada
ruta (ver historial de commits de esta sección para el script usado).

## CI

`.github/workflows/ci.yml` corre en cada push a `main` y en cada pull
request: levanta un Postgres de servicio, aplica las migraciones
(`prisma migrate deploy`) y corre lint, build y la suite de tests contra
esa base real — el mismo Postgres real que usa el resto del proyecto,
no mocks. Verificado localmente reproduciendo los mismos pasos contra
una base recién creada (sin datos) antes de confiar en que el workflow
funciona en GitHub.

## Estructura del proyecto

```
prisma/schema.prisma        Modelo de datos completo (productos, variantes,
                             stock, pedidos, pagos, proveedores, cupones, etc.)
prisma/seed.ts               Datos de ejemplo + usuario admin inicial
src/lib/auth.ts              Configuración de Auth.js (login con credenciales)
src/lib/prisma.ts            Cliente Prisma (singleton)
src/lib/sales.ts             Lógica crítica de venta (descuento de stock atómico)
src/proxy.ts                 Middleware de protección de rutas /admin y /pos
src/app/(store)/             Tienda pública
src/app/admin/               Panel de administración (protegido, rol ADMIN)
src/app/pos/                 Punto de venta (protegido, rol ADMIN o EMPLOYEE)
src/app/api/                 Rutas de API (búsqueda de productos, venta POS, auth)
```

## Deploy

1. **Base de datos**: crear un proyecto en Supabase o Railway.
   - En **Supabase**: `DATABASE_URL` es la cadena del pooler en modo
     transacción (puerto 6543, con `?pgbouncer=true`) y `DIRECT_URL` es la
     misma pero al puerto 5432 (conexión directa, sin pooler) — Supabase
     las muestra juntas en el botón **Connect** del proyecto. Las
     migraciones necesitan `DIRECT_URL` porque el modo transacción del
     pooler no soporta todo lo que usa el motor de migraciones de Prisma.
   - En **Railway** (o Postgres propio, sin pooler): `DIRECT_URL` es
     igual a `DATABASE_URL`.
   - **Ojo con la contraseña**: si tiene caracteres especiales (`%`, `&`,
     `#`, etc.), hay que codificarlos con `encodeURIComponent` antes de
     pegarlos en la URL — si no, la conexión falla con "URI malformed" o
     un error de conexión poco claro. Por ejemplo, una contraseña
     `%3Z&9_Tn` se escribe en la URL como `%253Z%269_Tn`.
2. **Vercel**: importar el repo, configurar las variables de entorno de
   `.env.example` (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
   `NEXT_PUBLIC_SITE_URL`, credenciales de Mercado Pago y SMTP cuando
   estén listas).
3. Las migraciones corren solas en cada deploy: `package.json` tiene un
   script `vercel-build` (`prisma migrate deploy && next build`) que
   Vercel usa automáticamente en vez de `build` cuando existe. No hace
   falta correrlas a mano salvo que se despliegue en otra plataforma.
4. Cargar el usuario admin de producción con `npm run db:seed` (con las
   variables `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` de producción), o
   creándolo manualmente desde Prisma Studio.

## Cotizador de envío

El costo de envío se calcula sumando el peso de las variantes del carrito
(`weightGr`) contra los tramos configurados en `/admin/envios`. Es un
placeholder honesto: Correo Argentino y Andreani recién cotizan en vivo
con una cuenta comercial (contrato + credenciales de API), que la tienda
todavía no tiene. El día que exista esa cuenta, alcanza con reemplazar
`calculateShippingCost` (`src/lib/shipping.ts`) por la llamada a la API
del correo — el checkout, la creación de pedidos y el resto del código no
cambian.

## Próximos pasos (ver plan de etapas completo en la conversación)

- Cotización de envío en vivo con Correo Argentino/Andreani cuando haya
  cuenta comercial (ver sección "Cotizador de envío" arriba).
- Facturación electrónica AFIP: fuera de alcance por decisión del
  negocio. Requiere un certificado digital (clave privada + certificado
  X.509) generado con Clave Fiscal y asociado al CUIT de la tienda —
  se puede retomar cuando haga falta, siguiendo ese trámite primero.
