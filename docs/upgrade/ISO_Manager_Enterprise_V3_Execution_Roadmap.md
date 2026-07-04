# ISO Manager Enterprise V3 - Roadmap de Ejecucion

## Objetivo

Traducir `ISO_Manager_Enterprise_V3_Plan_Upgrade_Seguro.md` a una ejecucion
realista sobre este monorepo.

Fecha de referencia: 2026-07-01

## Principios de Ejecucion

- No reescribir todo de una vez
- Mantener rutas y modulos productivos funcionando
- Aislar el modo demo/local del modo enterprise
- Introducir cambios versionados y reversibles
- Mover primero arquitectura y seguridad, luego features enterprise

## Arquitectura Objetivo

### Backend objetivo

Mantener NestJS, pero pasar de un modulo unico a un monolito modular.

Modulos objetivo:

- `auth`
- `users`
- `tenants`
- `documents`
- `audits`
- `grc`
- `communications`
- `calendar`
- `chat`
- `workflows`
- `ai`
- `reports`
- `platform-audit`

Capas por modulo:

- controller
- dto
- service
- repository
- schema/entity
- mapper
- policy/permission

### Frontend objetivo

Mantener React + Vite, reorganizando por dominios:

- `features/auth`
- `features/dashboard`
- `features/documents`
- `features/audits`
- `features/grc`
- `features/contracts`
- `features/settings`
- `features/admin-users`

Capas objetivo:

- pages
- feature components
- api client
- hooks
- state
- shared ui

### Datos

Mantener MongoDB en esta etapa, agregando:

- `tenantId`
- `createdBy`
- `updatedBy`
- `deletedAt` cuando aplique
- indices por tenant y estado
- migraciones versionadas

### Seguridad objetivo

- Clerk como proveedor principal de identidad
- RBAC en backend por recurso/accion
- feature flag explicita para modo demo/local
- audit log de plataforma
- politicas de sesion
- estrategia de MFA desde Clerk

## Secuencia Recomendada por Fases

## Fase 0 - Preparacion

Entregables:

- rama `release/stable`
- tag de version base
- inventario de variables de entorno efectivas
- backup de base de datos y archivos
- checklist de rollback

Notas para este repo:

- El `README.md` ya documenta variables relevantes; falta convertirlo a runbook de
  despliegue/rollback.
- El archivo del plan aun no esta versionado en git; conviene incluirlo dentro del
  flujo documental oficial del repositorio.
- Ya existe un runbook base de backup/restore en:
  - `docs/upgrade/ISO_Manager_Backup_Restore_Runbook.md`

## Fase 1 - Auditoria Tecnica

Entregables ya iniciados:

- auditoria tecnica inicial
- inventario de modulos
- riesgos
- deuda tecnica
- priorizacion

Archivo:

- `docs/upgrade/ISO_Manager_Current_State_Audit.md`

## Fase 2 - Arquitectura

Decisiones propuestas:

1. Conservar monorepo actual.
2. Conservar NestJS y React.
3. Mantener MongoDB inicialmente para no multiplicar riesgo.
4. Evolucionar a monolito modular antes de pensar en microservicios.
5. Introducir multitenencia y seguridad desde backend primero.

## Fase 3 - UI/UX

Objetivo:

Crear un design system reutilizable sin romper la UI actual.

Primer backlog:

- tokens visuales globales
- tipografia definida
- sidebar unificada
- tablas base
- formularios base
- estados vacios, loading y error
- patrones accesibles de modal/drawer

No recomendado aun:

- rediseño completo de todas las pantallas en un solo PR

Estado al 2026-07-01:

- base de tokens visuales agregada en `apps/web/src/index.css`
- colores/radios/sombras semánticas expuestas en `apps/web/tailwind.config.js`
- layout principal alineado:
  - sidebar
  - topbar
  - shell
- páginas principales alineadas:
  - dashboard
  - documents
  - tasks
  - audits
  - communications
  - settings
  - chat
  - calendar
  - contracts
  - standards
  - standard detail
  - evidences
  - alerts
- componentes compartidos alineados:
  - tablas
  - filtros
  - modales principales
  - estados vacíos y tarjetas base

Checklist de aceptación:

- `docs/upgrade/ISO_Manager_Fase3_UI_Checklist.md`

Estado actual:

- la base del design system ya quedó consolidada para layout, páginas core,
  tablas, filtros y modales principales
- los remanentes visuales que persisten son menores y no bloquean el paso a la
  siguiente fase
- el frontend se validó repetidamente con `pnpm --filter @iso-manager/web build`

Conclusión:

- Fase 3 funcionalmente lista para cierre operativo
- siguiente foco recomendado: Fase 4 Seguridad

## Fase 4 - Seguridad

Backlog minimo previo a nuevas funciones:

1. Introducir `APP_AUTH_MODE=demo|clerk|disabled` o equivalente.
2. Bloquear endpoints sensibles cuando no exista modo autorizado.
3. Implementar guardias y politicas RBAC por endpoint.
4. Registrar audit logs de:
   - login
   - cambios de rol
   - CRUD sensible
   - exportaciones
   - integraciones
5. Centralizar validacion de payloads.

Estado al 2026-07-01:

- `APP_AUTH_MODE` ya gobierna el acceso `demo|clerk|disabled`
- `ClerkAuthGuard` bloquea y audita fallos de autenticacion
- `RolesGuard` aplica RBAC por endpoint y audita denegaciones
- existe audit log de plataforma persistente para operaciones sensibles
- la capa `iso` ya fue separada en controladores por dominio sin romper rutas base
- se agregaron utilidades de validacion de request para endurecer contratos
- existen endpoints operativos para revisar:
  - configuracion de autenticacion
  - sesion actual
  - postura de seguridad
  - auditoria reciente de plataforma
- `auth/config` ya funciona como contrato operativo para frontend, incluyendo:
  - proveedor efectivo
  - directorio activo
  - capacidad de administracion manual de usuarios
  - disponibilidad esperada de rutas autenticadas
- la postura de seguridad ya expone politicas efectivas de:
  - MFA
  - contraseñas
  - sesiones
  segun `APP_AUTH_MODE`
- smoke tests de rutas incluyen validaciones de seguridad criticas

Pendientes para cierre fuerte de la fase:

- delegar MFA de produccion de forma explicita en Clerk y documentar el runbook
- formalizar politica de contrasenas segun modo de autenticacion
- definir estrategia de backups automaticos y verificacion de restauracion
- ampliar cobertura de pruebas de autorizacion por rol y rutas autenticadas de solo lectura

Decisión operativa:

- Fase 4 se considera lista para transicion a la siguiente fase a nivel operativo
  porque los controles base, contratos de autenticacion, auditoria y smokes ya
  están funcionando sobre el monorepo actual.
- El cierre fuerte de Fase 4 queda abierto en paralelo para endurecimientos
  complementarios que no bloquean el inicio del refactor modular.

Avance documental reciente:

- runbook base de backup y restore MongoDB agregado para despliegues actuales
- smoke operativo de RBAC agregado para validar rutas por rol en modo Clerk
- smoke RBAC ampliado para cubrir accesos anonimos bloqueados y mas rutas GET protegidas
- smoke RBAC ampliado tambien para rutas con mutacion segura usando payloads invalidos
- smoke de API endurecido para validar el contrato de capacidades de `auth/config`
- smoke de API ampliado para validar tambien el contrato de `auth/access-context`
- verificacion automatizada de restore Mongo agregada para comprobar colecciones minimas en base temporal
- poda controlada de backups locales agregada para sostener una retencion operativa reproducible
- ciclo orquestado de backup Mongo agregado para cron operativo con backup, retencion y restore-check
- frontend alineado con `auth/access-context` para ocultar acceso no autorizado al panel de usuarios
- frontend alineado tambien en documentos, tareas y auditorias para ocultar acciones de mutacion sin permiso
- smoke stack de `api + mongo` agregado para validacion operativa por Docker con modo y puerto alineados
- smoke RBAC endurecido para verificar rol y permisos efectivos de `auth/access-context` por token

## Fase 5 - Refactor

Orden recomendado para este repo:

1. `auth` y `users`
2. `tenants`
3. `documents`
4. `audits`
5. `grc`
6. `settings`
7. `communications`
8. `calendar`
9. `chat`
10. `workflows`
11. `ai`
12. `reports`

Justificacion:

- `auth/users/tenants` son la base para seguridad y multiempresa.
- `documents` y `audits` concentran trazabilidad y cumplimiento.
- `grc` depende de estructura normativa ya existente y debe migrarse con cuidado.

Estado inicial al 2026-07-02:

- inicio de refactor en `auth` ya ejecutado separando la construccion de
  `auth/access-context` fuera del controlador hacia una pieza reutilizable de
  politica/permisos
- refactor inicial en `users` ya ejecutado moviendo la operacion de directorio
  y consulta de auditoria de plataforma a un servicio dedicado
- refactor inicial en `documents` ya ejecutado moviendo validacion, auditoria y
  operacion CRUD del controlador a un servicio dedicado
- refactor inicial en `audits` ya ejecutado moviendo validacion, checklist y
  operacion CRUD del controlador a un servicio dedicado
- refactor inicial en `grc` ya ejecutado moviendo validacion, auditoria y
  orquestacion de standards, evidences, contracts y corrective actions a un
  servicio dedicado
- refactor inicial en `settings` ya ejecutado moviendo postura de seguridad,
  validacion y actualizacion de configuracion a un servicio dedicado
- refactor inicial en `communications` ya ejecutado moviendo compatibilidad,
  settings, plantillas y campañas a un servicio dedicado
- refactor inicial en `calendar/collaboration` ya ejecutado moviendo sync,
  resolucion de identidad y operacion HTTP de threads a un servicio dedicado
- refactor inicial en `tasks` ya ejecutado moviendo validacion, auditoria y
  operacion CRUD del controlador a un servicio dedicado
- esta linea prepara la migracion gradual desde controladores con logica
  embebida hacia capas mas claras de `controller` + `policy/permission`

Avance adicional al 2026-07-03:

- base inicial de `tenants` agregada con:
  - schema persistente `tenants`
  - servicio dedicado de resolucion del tenant efectivo
  - endpoints `iso/tenants/current` y `iso/tenants`
  - propagacion del tenant actual dentro de `auth/access-context`
- este avance deja lista la primera pieza reusable para multitenencia sin
  obligar aun a migrar todos los esquemas funcionales en el mismo paso
- `documents` y `audits` ya persisten y consultan `tenantId`, incluyendo:
  - backfill operativo para registros legacy sin tenant
  - lectura y mutacion scoped al tenant efectivo
  - indices iniciales por tenant para ambas colecciones
- `tasks` ya sigue el mismo patron de tenant scoping en persistencia, listados y
  mutaciones
- `grc` ya inicia aislamiento tenant en entidades operativas:
  - evidences
  - contracts
  - contract obligations
  - contract documents
  - corrective actions
  con backfill operativo e indices iniciales por tenant
- `communications` ya aplica tenant scoping en:
  - email templates
  - email campaigns
  - campañas basadas en tareas del tenant efectivo
- `chat/collaboration` ya aplica tenant scoping en:
  - chat threads
  - apertura de threads directos
  - mensajes y lectura por thread
- el nucleo estructural de `grc` ya aplica tenant scoping en:
  - standards
  - sections
  - clauses
  - requirements
  - appendices
  - audit checklists
  con backfill estructural, seed por tenant e indices iniciales por tenant
- la resolucion del tenant efectivo ya se consolido en una pieza compartida de
  infraestructura para reducir duplicacion entre `auth`, `tenants`,
  `IsoService` y `GrcService`
- el backfill tenant-aware ya se consolido tambien en una pieza compartida para
  reducir repeticion entre `IsoService` y `GrcService`
- inicio de particion concreta de `IsoService` por dominio:
  - logica de documentos extraida a un servicio dedicado reusable
  - `documents-operations` y bootstrap ya consumen esa pieza
  - logica de tareas extraida a un servicio dedicado reusable
  - `tasks-operations` y bootstrap ya consumen esa pieza
  - logica de auditorias extraida a un servicio dedicado reusable
  - `audits-operations` y bootstrap ya consumen esa pieza
  - logica de communications extraida a un servicio dedicado reusable
  - `communications-operations` y bootstrap ya consumen esa pieza
  - normalizacion y resolucion del documento `settings` consolidada en una
    pieza compartida para evitar duplicacion entre `IsoService` y
    `communications`
  - logica de collaboration/chat extraida a un servicio dedicado reusable
  - `collaboration-operations` ya consume esa pieza para threads y mensajes
  - logica de bootstrap/dashboard extraida a un servicio dedicado reusable
  - seed demo inicial extraido a una pieza dedicada del ciclo de arranque
  - logica operacional de `grc` extraida a un servicio dedicado reusable para
    evidencias, contratos, acciones correctivas y summary
  - logica estructural de `grc` extraida a un servicio dedicado reusable para
    standards, estructura normativa y audit checklist

## Fase 6 - Gestion Documental

Diseño recomendado:

- entidad `document`
- entidad `document_version`
- entidad `document_approval`
- entidad `document_workflow_event`
- almacenamiento externo desacoplado

Capacidades:

- versionado real
- aprobaciones
- firma
- OCR posterior
- busqueda enriquecida

## Fase 7 - IA

ISO Copilot debe montarse sobre dominios ya estabilizados.

Prerequisitos:

- documentos con versionado real
- evidencias estructuradas
- auditorias estructuradas
- permisos por tenant
- eventos auditables

## Fase 8 - Automatizacion

Diseño recomendado:

- catalogo de triggers
- reglas versionadas
- acciones asincronas
- cola de trabajos
- historial de ejecuciones

Ejemplos iniciales:

- documento por vencer
- hallazgo vencido
- auditoria proxima
- contrato con obligacion atrasada

## Fase 9 - Integraciones

Orden recomendado:

1. Resend
2. Google Calendar
3. Cloudflare R2
4. Google Drive
5. Outlook / Microsoft 365

Razon:

- ya existen bases parciales para correo y calendario
- R2 resuelve almacenamiento documental enterprise

## Fase 10 - Indicadores

No construir el dashboard configurable antes de estabilizar tenant, roles y datos.

Primero:

- definicion de KPIs
- ownership de cada dato
- permisos de visualizacion

## Fase 11 - QA

Backlog minimo:

- tests unitarios backend por servicio nuevo
- tests de integracion de endpoints criticos
- smoke tests frontend
- pruebas de autorizacion
- checklist de regresion de modulos existentes

## Fase 12 - Produccion

Estrategia:

- entorno dev
- entorno QA
- entorno staging
- produccion gradual

Requisito:

- rollback documentado por release

## Primeras Oleadas de Trabajo

### Oleada 1 - Fundacion segura

- crear `docs/upgrade`
- definir modo de autenticacion explicito
- definir tenant model
- definir modulo `platform-audit`
- definir backlog de extraccion modular

### Oleada 2 - Seguridad y contratos API

- DTOs y validacion
- RBAC base
- manejo de errores consistente
- separar bootstrap/seed del servicio productivo

### Oleada 3 - Extraccion modular

- `auth`
- `users`
- `documents`
- `audits`

### Oleada 4 - Capacidades enterprise

- workflow documental
- approvals
- storage externo
- automatizaciones

## Siguiente Paso Recomendado

El siguiente paso de implementacion debe ser pequeño y de alto impacto:

1. formalizar el modo de autenticacion del backend
2. introducir base de RBAC
3. separar `auth/users` del `IsoModule`

Ese trio prepara el terreno para el resto del upgrade sin obligar aun a tocar todos
los modulos funcionales.
