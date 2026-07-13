# ISO Management System

Plataforma web para gestionar un Sistema Integrado de Gestión (SIG) con foco en cumplimiento ISO, operación documental, auditorías, tareas, comunicación interna y automatización asistida por IA.

El proyecto está organizado como monorepo `pnpm` e integra un frontend React/Vite, un backend NestJS/MongoDB, despliegue híbrido `Vercel + Docker` y una base evolutiva para automatización y copilotos internos.

## Highlights

- Gestión documental, tareas, auditorías, evidencias, contratos y comunicaciones desde una sola aplicación.
- Autenticación adaptable con `Clerk`, modo `demo` o modo `disabled`, con RBAC y auditoría de plataforma.
- Chat interno en tiempo real con conversaciones directas y grupales.
- Capa de IA sandbox para auditorías y asistencia contextual en conversaciones.
- Primer motor de automatización por reglas con historial auditable por tenant.
- Flujo de despliegue productivo separando frontend en Vercel y backend persistente en Docker/VPS.

## Product Scope

Módulos principales ya implementados:

- `Dashboard`: visión general operativa y estado del sistema.
- `Documents`: gestión documental y trazabilidad.
- `Tasks`: asignación, seguimiento y vencimientos.
- `Audits`: auditorías internas/externas, checklist y apoyo IA.
- `Evidences`: control de evidencias y cumplimiento.
- `Contracts`: obligaciones y seguimiento contractual.
- `Communications`: plantillas, campañas y compatibilidad de proveedores.
- `Chat`: conversaciones internas con soporte grupal y asistencia IA.
- `Automation`: reglas operativas, ejecuciones y runners manuales.
- `Settings`: configuración, usuarios, notificaciones y postura de seguridad.

## Architecture

```text
apps/
  api/   NestJS + Mongoose + Socket.IO
  web/   React + Vite + Tailwind

deploy/
  vps/   scripts de despliegue backend
  nginx/ ejemplos de reverse proxy

docs/
  upgrade/ runbooks, roadmap y checklists operativos
```

Arquitectura recomendada de producción:

- `iso.servasmar.cl` -> frontend en Vercel
- `api-iso.servasmar.cl` -> backend NestJS + Socket.IO en Docker/VPS
- `MongoDB` -> contenedor local o servicio externo, según entorno

## Tech Stack

- Frontend: `React`, `TypeScript`, `Vite`, `Tailwind CSS`, `TanStack Query`, `Zustand`
- Backend: `NestJS`, `Mongoose`, `MongoDB`, `Socket.IO`
- Auth: `Clerk` o modo demo/local
- Deploy: `Vercel`, `Docker Compose`, `VPS`
- Tooling: `pnpm`, `ESLint`, smoke tests HTTP/Socket/RBAC/IA

## Monorepo Apps

### `apps/web`

Panel administrativo moderno para operación SIG:

- rutas protegidas
- dashboard y módulos funcionales
- chat en tiempo real
- runners de automatización
- UI de IA sandbox para auditorías y chat

### `apps/api`

API backend multi-tenant con:

- documentos, tareas, auditorías, contratos, evidencias
- autenticación y contexto de acceso
- auditoría de plataforma
- Socket.IO para chat
- endpoints IA sandbox
- reglas y ejecuciones de automatización

## Current Advanced Features

### Authentication and Access

- `APP_AUTH_MODE=clerk`: producción recomendada, autenticación delegada a Clerk.
- `APP_AUTH_MODE=demo`: entorno local/demo sin depender de Clerk.
- `APP_AUTH_MODE=disabled`: útil para entornos deshabilitados o validaciones específicas.

Capacidades relevantes:

- `GET /api/iso/auth/config`
- `GET /api/iso/auth/session`
- `GET /api/iso/security/posture`
- `GET /api/iso/platform/audit-logs?limit=50`

### AI Sandbox

La Fase 7 dejó disponible una capa IA stub con contratos estables y trazabilidad:

- `POST /api/iso/ai/analyze-document`
- `POST /api/iso/ai/generate-procedure`
- `POST /api/iso/ai/summarize-audit`
- `POST /api/iso/ai/propose-corrective-actions`
- `POST /api/iso/ai/chat-assist`

Hoy esta capa sirve para validar UX, contratos, RBAC y audit trail antes de integrar un LLM real.

### Chat Escalation

El chat interno ya soporta:

- conversaciones directas
- conversaciones grupales con nombre opcional
- sincronización en tiempo real
- marcado de lectura por participante
- asistencia IA sobre el hilo activo para:
  - resumir conversación
  - proponer respuestas
  - sugerir próximas acciones

### Automation

La base de Fase 8 ya incorporó:

- catálogo de reglas por tenant
- historial reciente de ejecuciones
- trigger operativo `audit.upcoming`
- creación preventiva de tareas sin duplicación
- UI de monitoreo y ejecución manual

## Getting Started

### Requirements

- `Node.js 22.13+`
- `pnpm 11+`
- `Docker / Docker Compose`

### Install

```bash
pnpm install
```

### Local Development

```bash
pnpm dev
```

Atajos útiles:

```bash
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
```

Servicios locales:

- Web: `http://localhost:5173`
- API: `http://localhost:3001/api`

En entornos sin TTY:

```bash
CI=true pnpm build
```

## Environment Variables

Variables realmente relevantes hoy:

### Frontend

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_CLERK_JWT_TEMPLATE`
- `VITE_CLERK_IS_SATELLITE`
- `VITE_CLERK_DOMAIN`
- `VITE_CLERK_PRIMARY_ORIGIN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

### Backend

- `PORT`
- `MONGODB_URI`
- `CORS_ORIGIN`
- `APP_AUTH_MODE=clerk|demo|disabled`
- `CLERK_SECRET_KEY`
- `CLERK_API_URL`
- `CLERK_AUTHORIZED_PARTIES`
- `CLERK_JWT_KEY`
- `CLERK_USE_STATIC_JWT_KEY`

### Optional Integrations

- Google Calendar:
  - `GOOGLE_CALENDAR_CLIENT_ID` or `GOOGLE_CLIENT_ID`
  - `GOOGLE_CALENDAR_CLIENT_SECRET` or `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_CALENDAR_REFRESH_TOKEN` or `GOOGLE_REFRESH_TOKEN`
  - `GOOGLE_CALENDAR_ID`
- Communications:
  - `RESEND_API_KEY`
  - `GMAIL_CLIENT_ID`
  - `GMAIL_CLIENT_SECRET`
  - `GMAIL_REFRESH_TOKEN`
  - `COMMUNICATIONS_WEBHOOK_URL`
  - `COMMUNICATIONS_WEBHOOK_TOKEN`

Referencia completa:

- [`.env.production.example`](./.env.production.example)

## Docker

Stack completa local:

```bash
docker compose up --build
```

Servicios:

- Web: `http://localhost:8080`
- API interna: `http://api:3000/api`
- API host: `http://localhost:3000/api`
- MongoDB: `mongodb://mongo:27017/iso_manager`

La stack espera healthchecks válidos antes de levantar dependencias.

## Production Deployment

### Frontend on Vercel

El repositorio incluye `vercel.json` para desplegar `apps/web` desde la raíz del monorepo.

Configuración típica:

- proyecto apuntando al root del repo
- dominio: `iso.servasmar.cl`
- `VITE_API_URL=/api`
- `VITE_SOCKET_URL=/socket.io`

### Backend on Docker/VPS

El repositorio incluye `docker-compose.api.yml` para desplegar `api + mongo`.

Comando base:

```bash
docker compose --env-file .env.production -f docker-compose.api.yml up -d --build
```

Script versionado de despliegue:

```bash
bash deploy/vps/deploy-api.sh
```

Topología productiva recomendada:

- `iso.servasmar.cl` -> Vercel
- `api-iso.servasmar.cl` -> VPS/Docker

Guías relacionadas:

- [DEPLOY_VERCEL_DOCKER.md](./DEPLOY_VERCEL_DOCKER.md)
- [PRODUCTION_VALIDATION_CHECKLIST.md](./PRODUCTION_VALIDATION_CHECKLIST.md)
- [ISO_Manager_Backup_Restore_Runbook.md](./docs/upgrade/ISO_Manager_Backup_Restore_Runbook.md)

## Quality Gates and Smoke Tests

Scripts operativos disponibles:

```bash
pnpm smoke:api
pnpm smoke:api:routes
pnpm smoke:ai
pnpm smoke:socket
pnpm smoke:rbac
pnpm smoke:users
pnpm smoke:backend
pnpm smoke:fase7 -- --down
pnpm smoke:stack:api -- --auth-mode demo --down
```

Cobertura actual:

- autenticación y access context
- rutas públicas/protegidas
- IA sandbox
- Socket.IO / chat
- RBAC por rol
- CRUD de usuarios
- cierre operativo Fase 7

## CI

La workflow `.github/workflows/ci.yml` valida:

- instalación con `pnpm`
- `pnpm lint`
- `CI=true pnpm build`
- build de imágenes Docker

## Documentation

Documentos importantes del repo:

- [DEPLOY_VERCEL_DOCKER.md](./DEPLOY_VERCEL_DOCKER.md)
- [PRODUCTION_VALIDATION_CHECKLIST.md](./PRODUCTION_VALIDATION_CHECKLIST.md)
- [docs/upgrade/ISO_Manager_Fase7_IA_Checklist.md](./docs/upgrade/ISO_Manager_Fase7_IA_Checklist.md)
- [docs/upgrade/ISO_Manager_Fase8_Automatizacion_Backlog.md](./docs/upgrade/ISO_Manager_Fase8_Automatizacion_Backlog.md)
- [docs/upgrade/ISO_Manager_Enterprise_V3_Execution_Roadmap.md](./docs/upgrade/ISO_Manager_Enterprise_V3_Execution_Roadmap.md)

## Roadmap Direction

Siguientes líneas naturales de evolución:

- integración LLM real para IA con controles por tenant
- workflows automáticos adicionales más allá de `audit.upcoming`
- chat con más contexto operativo y comandos accionables
- dashboards de riesgo y cumplimiento más ejecutivos
- endurecimiento de observabilidad, backups y posturas de seguridad

## Status

Estado actual del proyecto:

- Fase 7 IA sandbox: cerrada operativamente
- Fase 8 automatización: base funcional en marcha
- Chat: escalado a grupos + asistencia IA
- Producción: frontend en Vercel y backend en Docker/VPS

---

Si usas este repositorio como base de un SIG productivo, la recomendación es mantener el frontend estático en Vercel y reservar el backend con `Socket.IO`, MongoDB y tareas persistentes para un runtime estable en Docker/VPS.
