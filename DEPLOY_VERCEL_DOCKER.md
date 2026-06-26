# Deploy Vercel + Docker

Topologia objetivo:

- `iso.servasmar.cl` -> frontend React/Vite en Vercel
- `api-iso.servasmar.cl` -> backend NestJS + Socket.IO en tu servidor Docker

## 1. Variables

### Vercel

Configura estas variables en el proyecto del frontend:

- `VITE_API_URL=https://api-iso.servasmar.cl/api`
- `VITE_SOCKET_URL=https://api-iso.servasmar.cl`

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
```

## 2. Levantar API + Mongo

En el servidor:

```bash
docker compose --env-file .env.production -f docker-compose.api.yml up -d --build
```

Verificaciones:

```bash
docker compose --env-file .env.production -f docker-compose.api.yml ps
curl http://127.0.0.1:3000/api/iso/bootstrap
```

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
curl https://api-iso.servasmar.cl/api/iso/bootstrap
```

## 5. DNS en Vercel

En la zona DNS de `servasmar.cl` crea:

- `iso` -> el dominio/subdominio que usaras en Vercel para el frontend
- `api-iso` -> registro `A` apuntando a la IP publica del servidor Docker

## 6. Notas importantes

- `Socket.IO` usa el mismo host del backend, asi que `VITE_SOCKET_URL` debe quedar sin `/api`.
- Si mas adelante quieres aceptar previews de Vercel en el backend, agrega origins separados por coma en `CORS_ORIGIN`.
- Hoy el backend usa `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` y `CLERK_API_URL` para la autenticación con Clerk.
- El frontend compila en build time, asi que sus variables se cargan en Vercel, no en el servidor Docker.
- Si Cloudflare queda delante del frontend y del API, deja `VITE_API_URL` y `VITE_SOCKET_URL` con esas URLs públicas; el token de Clerk viaja al API y al socket como bearer/auth token.
