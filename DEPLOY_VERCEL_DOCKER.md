# Deploy Vercel + Docker

Topologia objetivo:

- `iso.servasmar.cl` -> frontend React/Vite en Vercel
- `api-iso.servasmar.cl` -> backend NestJS + Socket.IO en tu servidor Docker

## 1. Variables

### Vercel

Configura estas variables en el proyecto del frontend:

- `VITE_API_URL=/api`
- `VITE_SOCKET_URL=/socket.io`
- `VITE_CLERK_JWT_TEMPLATE=<template-opcional-si-tu-backend-lo-requiere>`
- `VITE_CLERK_IS_SATELLITE=false` recomendado salvo que tu instancia Clerk esté montada como satellite
- `VITE_CLERK_DOMAIN=<solo si usas satellite>`
- `VITE_CLERK_PRIMARY_ORIGIN=<solo si usas satellite>`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`

Sugerencia:

- Mantén estas variables en Vercel Project Settings o con `vercel env pull`.
- Para `iso.servasmar.cl` y `www.iso.servasmar.cl`, el frontend puede usar rewrites same-origin de Vercel y no depender directamente del subdominio `api-iso`.
- No subas secretos reales del frontend o Clerk a Git.
- No cargues en Vercel secretos del backend como `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `RESEND_API_KEY`, `SMTP_*` o `MONGODB_URI`.

### Servidor Docker

Parte desde [\.env.production.example](/Users/mac/Documents/Desarrollos_Apps/IsoManagementSystem/.env.production.example:1) y crea un `.env.production` con:

```env
NODE_ENV=production
API_PORT=3000
PORT=3000
CORS_ORIGIN=https://iso.servasmar.cl
MONGODB_URI=mongodb://mongo:27017/iso_manager
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----...
CLERK_API_URL=https://api.clerk.com
CLERK_AUTHORIZED_PARTIES=https://iso.servasmar.cl
CLERK_USE_STATIC_JWT_KEY=false
```

Notas:

- `.env.production` no viaja en el bundle del deploy. Debe existir en el VPS dentro de `/opt/iso-management-system`.
- El script `deploy/vps/deploy-api.sh` ahora corta el despliegue si ese archivo no está presente.
- Las variables `NEXT_PUBLIC_*` o `VITE_*` pueden existir en `.env.production` como referencia, pero el build real del frontend las toma desde Vercel.
- Si `MONGODB_URI` apunta a Atlas u otra base externa, el `mongo` local del compose puede mantenerse solo como respaldo y su puerto no debería exponerse fuera de `127.0.0.1`.

### Checklist rapida

Vercel:

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_CLERK_JWT_TEMPLATE` solo si usas template
- `VITE_CLERK_IS_SATELLITE` solo si usas satellite
- `VITE_CLERK_DOMAIN` solo si usas satellite
- `VITE_CLERK_PRIMARY_ORIGIN` solo si usas satellite
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

VPS `.env.production`:

- `NODE_ENV`
- `API_PORT`
- `PORT`
- `MONGODB_URI`
- `CORS_ORIGIN`
- `CLERK_SECRET_KEY`
- `CLERK_API_URL`
- `CLERK_AUTHORIZED_PARTIES`
- `CLERK_USE_STATIC_JWT_KEY`
- `CLERK_JWT_KEY` solo si decides usar modo estático
- `GOOGLE_*` si aplica
- `SMTP_*` o `RESEND_*` si aplica

### Variables detectadas hoy

Frontend para Vercel:

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_APP_NAME`
- `VITE_CHAT_PROVIDER`
- `VITE_GOOGLE_CALENDAR_ENABLED`
- `VITE_USE_LOCAL_STORAGE`
- `VITE_CLERK_JWT_TEMPLATE` solo si usas template
- `VITE_CLERK_IS_SATELLITE` solo si usas satellite
- `VITE_CLERK_DOMAIN` solo si usas satellite
- `VITE_CLERK_PRIMARY_ORIGIN` solo si usas satellite
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL` solo si el frontend lo usa visualmente

Backend solo en VPS o Docker:

- `NODE_ENV`
- `API_PORT`
- `PORT`
- `MONGODB_URI`
- `MONGODB_DB`
- `CORS_ORIGIN`
- `CLERK_SECRET_KEY`
- `CLERK_API_URL`
- `CLERK_AUTHORIZED_PARTIES`
- `CLERK_USE_STATIC_JWT_KEY`
- `CLERK_JWT_KEY` solo si decides usar modo estático
- `CLERK_ISSUER` solo si tu validación futura la usa
- `CLERK_JWKS_URI` solo si tu validación futura la usa
- `CLERK_WEBHOOK_SECRET` solo si procesas webhooks
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALLBACK_URL`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `MAIL_PROVIDER`
- `MAIL_FROM`
- `RESEND_API_KEY`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `COMMUNICATIONS_WEBHOOK_URL`
- `COMMUNICATIONS_WEBHOOK_TOKEN`
- `RESEND_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `CONTACT_EMAIL`

Variables que puedes tener en ambos lados como referencia, pero con usos distintos:

- `NEXT_PUBLIC_*` y `VITE_*` en Vercel para compilar frontend.
- Algunas de esas mismas claves pueden existir en `.env.production` local del repo como referencia operativa, pero no son las que usa Vercel en producción.

## 2. Levantar API + Mongo

En el servidor:

```bash
docker compose --env-file .env.production -f docker-compose.api.yml up -d --build
```

Verificaciones:

```bash
docker compose --env-file .env.production -f docker-compose.api.yml ps
curl http://127.0.0.1:3000/api/health
```

Para el modulo `Communications`:

- `Resend` es el provider recomendado para esta app.
- `Gmail API` funciona como alternativa, pero requiere OAuth y mas cuidado operacional.
- Si usas backend propio, carga `COMMUNICATIONS_WEBHOOK_URL` y opcionalmente `COMMUNICATIONS_WEBHOOK_TOKEN`.

## 2.1 Actualizaciones futuras con un comando

Desde tu maquina local puedes usar:

```bash
bash deploy/vps/deploy-api.sh
```

Variables opcionales:

```bash
REMOTE_HOST=root@72.60.121.98 REMOTE_DIR=/opt/iso-management-system bash deploy/vps/deploy-api.sh
```

La ruta de llave SSH por defecto es:

```bash
~/.ssh/id_ed25519_iso_hostinger
```

Si quieres usar otra:

```bash
SSH_KEY_PATH=~/.ssh/otra_llave REMOTE_HOST=root@72.60.121.98 bash deploy/vps/deploy-api.sh
```

Este script:

- empaqueta el repo
- copia el bundle por `scp`
- actualiza `/opt/iso-management-system`
- ejecuta `docker compose up -d --build`

## 3. Publicar con Nginx

Usa como base [api-iso.servasmar.cl.conf.example](/Users/mac/Documents/Desarrollos_Apps/IsoManagementSystem/deploy/nginx/api-iso.servasmar.cl.conf.example:1).

Pasos habituales en Ubuntu:

```bash
sudo cp deploy/nginx/api-iso.servasmar.cl.conf.example /etc/nginx/sites-available/api-iso.servasmar.cl.conf
sudo ln -s /etc/nginx/sites-available/api-iso.servasmar.cl.conf /etc/nginx/sites-enabled/api-iso.servasmar.cl.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4. SSL con Let's Encrypt

Cuando el DNS ya apunte al servidor:

```bash
sudo certbot --nginx -d api-iso.servasmar.cl
```

Luego prueba:

```bash
curl https://api-iso.servasmar.cl/api/health
```

## 5. DNS en Vercel

En la zona DNS de `servasmar.cl` crea:

- `iso` -> el dominio/subdominio que usaras en Vercel para el frontend
- `api-iso` -> registro `A` apuntando a la IP publica del servidor Docker

## 6. Notas importantes

- `Socket.IO` usa el mismo host del backend, asi que `VITE_SOCKET_URL` debe quedar sin `/api`.
- Si mas adelante quieres aceptar previews de Vercel en el backend, agrega origins separados por coma en `CORS_ORIGIN`.
- Hoy el backend usa `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `CLERK_SECRET_KEY`, `CLERK_API_URL`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_USE_STATIC_JWT_KEY` y opcionalmente `CLERK_JWT_KEY` para la autenticación con Clerk.
- El frontend compila en build time, asi que sus variables se cargan en Vercel, no en el servidor Docker.
- Si Cloudflare queda delante del frontend y del API, deja `VITE_API_URL` y `VITE_SOCKET_URL` con esas URLs públicas; el token de Clerk viaja al API y al socket como bearer/auth token.
- Si `api-iso.servasmar.cl` falla pero `iso.servasmar.cl` sigue activo, revisa primero los rewrites de Vercel y el DNS/proxy del subdominio antes de tocar el backend.

## 7. Rotacion de secretos

Si alguna vez hubo credenciales reales en un `.env` local o compartido, trata ese material como comprometido y rota al menos:

- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY` si forzaste modo estatico
- `MONGODB_URI` o el usuario/password asociados
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`
- `SMTP_PASS`
- `COMMUNICATIONS_WEBHOOK_TOKEN`

Secuencia recomendada:

1. Genera nuevos secretos en cada proveedor.
2. Actualiza el VPS con el nuevo `.env.production`.
3. Reinicia el stack con `docker compose --env-file .env.production -f docker-compose.api.yml up -d --build`.
4. Valida `curl http://127.0.0.1:3000/api/health`.
5. Ejecuta `pnpm smoke:api`, `pnpm smoke:api:routes` y `pnpm smoke:ai` contra el backend activo.
6. Revoca explícitamente los secretos anteriores.
