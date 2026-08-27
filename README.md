# Epic Shine — Detailing Mode

Tienda online + punto de venta (POS) para Epic Shine, con stock sincronizado
en tiempo real entre ambos canales.

> **Estado del proyecto**: tienda online funcional de punta a punta
> (catálogo, ficha de producto, carrito, checkout como invitado, pago con
> Mercado Pago, cotizador de envío por peso y cupones de descuento), POS
> con venta presencial, cupones y cierre de caja, y panel de
> administración completo (productos, stock, pedidos, proveedores/compras,
> envíos, cupones, usuarios, reportes). Falta: facturación electrónica
> AFIP (pendiente de definir con el dueño del negocio). Ver "Próximos pasos".

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

1. **Base de datos**: crear un proyecto en Supabase o Railway y copiar la
   `DATABASE_URL`.
2. **Vercel**: importar el repo, configurar las mismas variables de entorno
   que en `.env.example` (`DATABASE_URL`, `AUTH_SECRET`,
   `NEXT_PUBLIC_SITE_URL`, credenciales de Mercado Pago cuando estén
   listas).
3. Antes del primer deploy (o en un paso de build), correr las migraciones
   contra la base de producción:
   ```bash
   npx prisma migrate deploy
   ```
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

- Facturación electrónica AFIP (a definir según situación fiscal).
- Cotización de envío en vivo con Correo Argentino/Andreani cuando haya
  cuenta comercial (ver sección "Cotizador de envío" arriba).
