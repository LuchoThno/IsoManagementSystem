# ISO Manager Enterprise V3 - Auditoria Tecnica Inicial

## Alcance

Auditoria basada en el estado actual del monorepo y el plan
`ISO_Manager_Enterprise_V3_Plan_Upgrade_Seguro.md`.

Fecha de referencia: 2026-07-01

## Resumen Ejecutivo

El proyecto ya cuenta con una base funcional sobre monorepo `pnpm` con:

- Frontend `React + Vite + Tailwind` en `apps/web`
- Backend `NestJS + Mongoose` en `apps/api`
- Persistencia `MongoDB`
- Integracion parcial con `Clerk`
- Integraciones activas o preparadas para `Google Calendar`, `Resend`, `Gmail API` y `Socket.IO`

La plataforma no requiere una reescritura completa. El enfoque recomendado es
upgrade incremental con cuatro frentes previos a nuevas funciones enterprise:

1. endurecimiento de seguridad
2. separacion de capas y modulos
3. multitenencia real
4. trazabilidad operativa y tecnica

## Arquitectura Actual

### Workspace

- Root workspace con scripts `dev`, `build`, `lint`
- `apps/web`: SPA React
- `apps/api`: API NestJS
- `docker-compose.yml` y `docker-compose.api.yml` para despliegue

### Frontend actual

Archivos de referencia:

- `apps/web/src/App.tsx`
- `apps/web/src/store/useISOStore.ts`
- `apps/web/src/store/useAuthStore.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/isoApiClient.ts`

Hallazgos:

- La app usa rutas lazy-loaded y layout centralizado.
- Existe modo dual de autenticacion:
  - modo Clerk
  - modo local/demo usando `storage`
- El frontend mezcla datos reales de API con almacenamiento local en varias rutas.
- No existe una capa formal de autorizacion por permisos; solo existe rol de usuario.
- La base visual ya fue formalizada con tokens y utilidades compartidas;
  persiste solo deuda menor en componentes secundarios.

### Backend actual

Archivos de referencia:

- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/iso/iso.module.ts`
- `apps/api/src/iso/iso.controller.ts`
- `apps/api/src/iso/iso.service.ts`
- `apps/api/src/iso/grc.service.ts`

Hallazgos:

- La API esta concentrada en un modulo grande `IsoModule`.
- `IsoController` expone multiples dominios desde un solo controlador:
  - documentos
  - tareas
  - auditorias
  - evidencias
  - contratos
  - checklist
  - acciones correctivas
  - calendario
  - comunicaciones
  - chat
  - usuarios
  - bootstrap
- La logica de negocio esta muy centralizada en `IsoService` y `GrcService`.
- No se observan DTOs/validacion de payloads de forma consistente en controlador.
- No se observan modulos separados por bounded context.

### Persistencia actual

Colecciones principales detectadas:

- `documents`
- `tasks`
- `audits`
- `chat_threads`
- `email_templates`
- `email_campaigns`
- `settings`
- `standards`
- `standard_sections`
- `standard_clauses`
- `standard_requirements`
- `standard_appendices`
- `evidences`
- `contracts`
- `contract_obligations`
- `contract_documents`
- `audit_checklists`
- `audit_checklist_items`
- `corrective_actions`

Hallazgos:

- El modelo ya cubre bastante dominio ISO/GRC.
- No se aprecia una estrategia formal de migraciones versionadas.
- No se aprecia soporte real para tenant o company isolation a nivel de esquema.
- `settings` parece representar configuracion global de una sola empresa.

## Inventario de Modulos Funcionales

Estado funcional visible en frontend/backend:

- Dashboard
- Documentos
- Tareas
- Auditorias
- Normas / GRC
- Evidencias
- Contratos
- Calendario
- Alertas
- Chat
- Comunicaciones
- Configuracion
- Usuarios

## Dependencias e Integraciones

### Dependencias principales

Backend:

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/mongoose`
- `mongoose`
- `@clerk/backend`
- `socket.io`
- `googleapis`
- `resend`

Frontend:

- `react`
- `react-router-dom`
- `zustand`
- `@tanstack/react-query`
- `@tanstack/react-table`
- `@clerk/clerk-react`
- `socket.io-client`
- `lucide-react`

### Integraciones detectadas

- Clerk
- Google Calendar
- Resend
- Gmail API
- Webhooks de comunicaciones
- Socket.IO

## Autenticacion, Roles y Permisos

Archivos de referencia:

- `apps/api/src/iso/clerk-auth.guard.ts`
- `apps/api/src/iso/clerk-auth.service.ts`
- `apps/api/src/iso/clerk-directory.service.ts`
- `apps/web/src/lib/clerk.ts`
- `apps/web/src/store/useAuthStore.ts`

Estado actual:

- Roles disponibles:
  - `admin`
  - `manager`
  - `auditor`
  - `viewer`
- La autenticacion depende de Clerk cuando esta configurado.
- Si Clerk no esta configurado, el sistema opera en modo local/demo.
- No existe RBAC detallado por accion, recurso o tenant.
- No se aprecia manejo centralizado de permisos desde backend por endpoint.

## Deuda Tecnica

### Alta

- Modulo backend monolitico con demasiadas responsabilidades.
- Servicios grandes con logica de negocio, bootstrap y seed mezclados.
- Modo demo/local y modo productivo comparten flujo y superficie operativa.
- Falta multitenencia real a nivel de datos y autorizacion.
- Falta validacion fuerte de entrada en endpoints.
- Falta estrategia de migraciones y versionado de datos.

### Media

- El design system base ya fue introducido; falta solo mantenimiento incremental
  y eliminación de remanentes visuales menores.
- Falta normalizacion de contratos API y manejo consistente de errores.
- Persisten datos demo/local en frontend que pueden confundir el flujo productivo.
- No se observan tests unitarios ni de integracion en el repo.

### Baja

- `README.md` describe bien el despliegue, pero no hay runbooks operativos por fase.
- No se observan convenciones documentadas para naming de modulos o boundaries.

## Riesgos

### Riesgo 1 - Seguridad ambigua entre demo y produccion

El sistema puede operar sin Clerk configurado. Esto sirve para desarrollo, pero debe
quedar encapsulado para evitar exposicion accidental en entornos no controlados.

### Riesgo 2 - Escalabilidad limitada del backend actual

Un unico controlador y servicios extensos dificultan:

- pruebas
- cambios seguros
- trazabilidad
- evolucion a enterprise

### Riesgo 3 - Falta de aislamiento por empresa

El objetivo final menciona SaaS multiempresa, pero hoy no se observa:

- `tenantId`
- `organizationId`
- filtros por tenant
- politicas por empresa

### Riesgo 4 - Trazabilidad parcial

Existen rastros funcionales como `auditTrail` en documentos, pero no una auditoria
de plataforma consistente para:

- login
- cambios de permisos
- accesos a registros
- cambios sensibles
- integraciones

### Riesgo 5 - Upgrade grande sin boundaries

Si se intenta migrar todos los modulos juntos, aumenta mucho el riesgo de regresion.

## Priorizacion Recomendada

### Prioridad P0

- Definir arquitectura objetivo del monolito modular
- Separar modo demo de modo production
- Diseñar modelo de tenant y company
- Diseñar RBAC backend
- Definir estrategia de auditoria y logs

### Prioridad P1

- Extraer modulos `users`, `auth`, `documents`, `audits`, `grc`
- Introducir DTOs y validacion
- Introducir repositorios/servicios por dominio
- Crear migraciones y semillas controladas

### Prioridad P2

- Design system formal
- Workflow documental
- Dashboard configurable
- ISO Copilot
- Automatizacion y motor de reglas

## Conclusiones

La base actual es valiosa y reutilizable. El upgrade seguro debe tratar al sistema
como un producto funcional que necesita endurecimiento, modularizacion y
multitenencia, no como un MVP descartable.

La siguiente fase recomendada es definir arquitectura objetivo y backlog de
ejecucion por oleadas pequeñas, manteniendo compatibilidad con los modulos ya
activos.
