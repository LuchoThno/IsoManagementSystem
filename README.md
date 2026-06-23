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
