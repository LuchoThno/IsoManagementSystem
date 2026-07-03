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
- API auth mode opcional: `APP_AUTH_MODE=clerk|demo|disabled`
- API Google Calendar opcional: `GOOGLE_CALENDAR_CLIENT_ID` o `GOOGLE_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` o `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN` o `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`
- API Communications opcional: `RESEND_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `COMMUNICATIONS_WEBHOOK_URL`, `COMMUNICATIONS_WEBHOOK_TOKEN`

El resto de variables de `.env.example` son referencias para integraciones opcionales.

Comportamiento de autenticacion y permisos:

- `APP_AUTH_MODE=clerk`: exige tokens de Clerk en backend y habilita RBAC por rol.
- `APP_AUTH_MODE=demo`: mantiene el flujo local/demo sin requerir Clerk.
- `APP_AUTH_MODE=disabled`: rechaza endpoints protegidos.

Endpoints operativos nuevos:

- `GET /api/iso/auth/config`: expone el modo de autenticacion activo, el proveedor y las capacidades operativas del entorno.
- `GET /api/iso/auth/session`: expone la sesion resuelta por el backend.
- `GET /api/iso/security/posture`: expone controles y politicas activas de seguridad, solo `admin`.
- `GET /api/iso/platform/audit-logs?limit=50`: lista auditoria de plataforma, solo `admin` en modo Clerk.

Politica operativa de autenticacion:

- `APP_AUTH_MODE=clerk`: MFA, contraseñas y sesiones quedan delegadas a Clerk. Es el modo esperado para producción.
- `APP_AUTH_MODE=demo`: mantiene autenticacion local simplificada, con contraseña minima local y sin MFA. Solo debe usarse en desarrollo, demo o validaciones internas controladas.
- `APP_AUTH_MODE=disabled`: no habilita autenticacion ni sesiones para endpoints protegidos.

Capacidades expuestas por `GET /api/iso/auth/config`:

- `provider`: origen operativo de autenticacion para el entorno actual.
- `capabilities.directoryProvider`: `clerk`, `local` o `none`.
- `capabilities.manualUserManagement`: indica si el panel puede crear/editar/eliminar usuarios localmente.
- `capabilities.authenticatedRoutesAvailable`: indica si las rutas protegidas deberian estar operativas.

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
  - `VITE_API_URL=/api`
  - `VITE_SOCKET_URL=/socket.io`
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

Si en producción usas MongoDB Atlas u otra base externa en `MONGODB_URI`, el contenedor `mongo` local puede quedar solo como respaldo técnico y conviene que su puerto se publique solo en `127.0.0.1`.

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
- [ISO_Manager_Backup_Restore_Runbook.md](/Users/mac/Documents/Desarrollos_Apps/IsoManagementSystem/docs/upgrade/ISO_Manager_Backup_Restore_Runbook.md:1)

Comandos operativos versionados:

- `pnpm backup:mongo -- --env prod`
- `pnpm restore:mongo -- --archive backups/<archivo>.archive.gz --temp-suffix restore_check`
- `pnpm smoke:stack:api -- --auth-mode demo --down` para levantar `api + mongo`, forzar `APP_AUTH_MODE`, alinear `API_PORT` con `SMOKE_BASE_URL` y ejecutar smokes HTTP/socket
- `pnpm smoke:rbac` con `SMOKE_ADMIN_TOKEN`, `SMOKE_MANAGER_TOKEN`, `SMOKE_AUDITOR_TOKEN` y/o `SMOKE_VIEWER_TOKEN`

Secuencias recomendadas:

- Validacion local en modo demo:
  `pnpm smoke:stack:api -- --auth-mode demo --down`
- Validacion de rutas protegidas contra un backend ya levantado:
  `SMOKE_BASE_URL=http://127.0.0.1:3001 pnpm smoke:api`
- Validacion RBAC en modo Clerk por rol:
  `SMOKE_BASE_URL=http://127.0.0.1:3001 SMOKE_ADMIN_TOKEN=... SMOKE_MANAGER_TOKEN=... SMOKE_AUDITOR_TOKEN=... SMOKE_VIEWER_TOKEN=... pnpm smoke:rbac`

Notas sobre los smokes:

- `smoke:api` valida `auth/config`, `auth/access-context` y la coherencia general del modo de autenticacion.
- `smoke:api:routes` cubre rutas publicas, protegidas y el acceso a directorio de usuarios y auditoria de plataforma.
- `smoke:rbac` valida no solo codigos HTTP, sino tambien el rol y los permisos que el backend resuelve en `auth/access-context` para cada token.

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
