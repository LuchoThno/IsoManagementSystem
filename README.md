# ISO Manager

Proyecto reorganizado como monorepo `pnpm` con:

- `apps/web`: frontend React + Vite + Tailwind con look admin inspirado en Adminto.
- `apps/api`: backend `NestJS` + `MongoDB` con datos iniciales para documentos, tareas, auditorias, alertas y configuracion.
- `docker-compose.yml`: stack completa con `web`, `api` y `mongo`.

## Requisitos

- Node.js 22.13+
- pnpm 11+
- Docker / Docker Compose

## Desarrollo local

```bash
pnpm install
pnpm dev
pnpm build
```

Servicios:

- Web: `http://localhost:5173`
- API: `http://localhost:3001/api`

Variables realmente usadas hoy:

- Frontend: `VITE_API_URL`, `VITE_SOCKET_URL`
- Frontend Clerk opcional: `VITE_CLERK_JWT_TEMPLATE`, `VITE_CLERK_IS_SATELLITE`, `VITE_CLERK_DOMAIN`, `VITE_CLERK_PRIMARY_ORIGIN`
- Frontend auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- API: `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `CLERK_SECRET_KEY`, `CLERK_API_URL`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_JWT_KEY`, `CLERK_USE_STATIC_JWT_KEY`
- API Google Calendar opcional: `GOOGLE_CALENDAR_CLIENT_ID` o `GOOGLE_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` o `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN` o `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`
- API Communications opcional: `RESEND_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `COMMUNICATIONS_WEBHOOK_URL`, `COMMUNICATIONS_WEBHOOK_TOKEN`

El resto de variables de `.env.example` son referencias para integraciones opcionales.

En entornos sin TTY, como CI o automatizaciones, usa:

```bash
CI=true pnpm build
```

## Docker

```bash
docker compose up --build
```

Servicios:

- Web: `http://localhost:8080`
- API interna: `http://api:3000/api`
- API host: `http://localhost:3000/api`
- MongoDB: `mongodb://mongo:27017/iso_manager`

La stack espera a que MongoDB y la API esten saludables antes de levantar los servicios dependientes.

## Vercel

El repositorio incluye `vercel.json` para desplegar `apps/web` como SPA estatica desde la raiz del monorepo.

Configuracion recomendada:

- Proyecto Vercel apuntando a la raiz del repo
- Dominio del frontend en Vercel: `iso.servasmar.cl`
- Variables en Vercel:
  - `VITE_API_URL=https://api-iso.servasmar.cl/api`
  - `VITE_SOCKET_URL=https://api-iso.servasmar.cl`
  - `VITE_CLERK_JWT_TEMPLATE=...` si tu instancia de Clerk exige usar un JWT template explícito para el backend
  - `VITE_CLERK_IS_SATELLITE=false` recomendado para `iso.servasmar.cl` salvo que realmente uses Clerk satellite
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`

Importante:

- Vercel deja bien resuelto el frontend.
- El backend actual (`apps/api`) usa `NestJS + MongoDB + Socket.IO`.
- El chat en tiempo real no queda alineado para Vercel Functions tal como esta hoy, porque depende de un proceso persistente y websockets.
- Para tener la aplicacion completa operativa, conviene desplegar `apps/api` en un runtime persistente (por ejemplo Render, Railway, Fly.io o similar) y conectar el frontend de Vercel contra esa URL.
- Si reutilizas una instancia de Clerk existente, asegúrate de permitir `https://iso.servasmar.cl` dentro de los dominios/autorizados de esa instancia.

### Docker para API

Si quieres mantener el dominio principal en Vercel, una topologia simple es esta:

- `iso.servasmar.cl` -> frontend en Vercel
- `api-iso.servasmar.cl` -> servidor Docker con `apps/api`

El repositorio incluye `docker-compose.api.yml` para levantar solo `api + mongo`.

Variables recomendadas en el servidor Docker:

- `NODE_ENV=production`
- `API_PORT=3000`
- `MONGODB_URI=mongodb://mongo:27017/iso_manager`
- `CORS_ORIGIN=https://iso.servasmar.cl`
- `CLERK_SECRET_KEY=sk_live_...`
- `CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----...` solo si quieres forzar validación estática
- `CLERK_USE_STATIC_JWT_KEY=false` recomendado; usa `true` solo si quieres obligar esa clave pública fija
- `CLERK_API_URL=https://api.clerk.com`
- `CLERK_AUTHORIZED_PARTIES=https://iso.servasmar.cl` solo si quieres restringir explícitamente el `azp/aud` de los tokens
- `GOOGLE_CALENDAR_CLIENT_ID=...` o `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CALENDAR_CLIENT_SECRET=...` o `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_CALENDAR_REFRESH_TOKEN=...` o `GOOGLE_REFRESH_TOKEN=...`
- `GOOGLE_CALENDAR_ID=primary` o el ID compartido que quieras sincronizar
- `RESEND_API_KEY=re_...` recomendado para el modulo Communications
- `GMAIL_CLIENT_ID=...`, `GMAIL_CLIENT_SECRET=...`, `GMAIL_REFRESH_TOKEN=...` si prefieres Gmail API
- `COMMUNICATIONS_WEBHOOK_URL=https://...` y `COMMUNICATIONS_WEBHOOK_TOKEN=...` si usas una pasarela propia

El modulo `Communications` ahora valida compatibilidad del proveedor desde backend. Para despliegues en Vercel + VPS/Docker, `Resend` es la opcion mas simple.

Comando:

```bash
docker compose -f docker-compose.api.yml up -d --build
```

Luego solo apuntas el subdominio `api-iso.servasmar.cl` desde Vercel DNS hacia la IP publica de ese servidor.

Si el frontend y el API pasan por Cloudflare en producción:

- Mantén `CORS_ORIGIN` con el dominio público real del frontend.
- Usa `VITE_API_URL` y `VITE_SOCKET_URL` con los hostnames públicos proxied por Cloudflare.
- El backend ahora valida bearer tokens de Clerk, así que la autenticación no depende de cookies compartidas entre dominios.

Guia paso a paso:

- [DEPLOY_VERCEL_DOCKER.md](/Users/mac/Documents/Desarrollos_Apps/IsoManagementSystem/DEPLOY_VERCEL_DOCKER.md:1)

## GitHub Actions

El repositorio incluye una workflow en `.github/workflows/ci.yml` que valida:

- instalacion con `pnpm`
- `pnpm lint`
- `CI=true pnpm build`
- build de imagenes Docker con `docker compose build`

## Estructura

```text
apps/
  api/   # NestJS + Mongoose
  web/   # React + Vite
```
