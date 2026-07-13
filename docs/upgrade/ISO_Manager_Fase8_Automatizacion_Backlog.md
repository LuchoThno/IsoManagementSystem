# ISO Manager Enterprise V3 - Backlog Inicial Fase 8

Este backlog propone un inicio realista para la Fase 8 de automatizacion sobre
la base ya estabilizada en Fase 7. La idea es empezar con reglas simples,
auditables y por tenant antes de introducir un motor mas amplio o una cola de
trabajos compleja.

## Objetivo

Construir una primera capa de workflows que:

- observe eventos o condiciones por tenant
- ejecute acciones asincronas controladas
- deje historial de ejecucion
- evite duplicados
- reutilice dominios ya existentes: tareas, auditorias, comunicaciones y GRC

## Lo que ya existe y conviene reutilizar

- `tasks` con `dueDate`, `status`, `priority`, `relatedAuditIds`, `relatedFindingIds`
- `audits` con `date`, `status`, `findings`
- `corrective_actions` con `dueDate`, `status`, `priority`, `auditId`
- `contract_obligations` con `dueDate`, `status`, `priority`
- `platform-audit` para trazabilidad operativa
- `communications` y `email-delivery` como base para notificaciones
- tenant scoping ya resuelto en backend

## Gaps antes del motor completo

Hay un trigger del roadmap que todavia necesita mejor modelado antes de ser
automatizado de forma fuerte:

- `documento por vencer`

Hoy `documents` no expone una fecha de expiracion, revision o vigencia formal,
asi que esa automatizacion deberia entrar despues de introducir ese dato o una
entidad/versionado documental mas rica.

## MVP recomendado

### Ola 1 - Trigger por fecha y estado

Implementar primero reglas de lectura simple sobre datos ya disponibles:

1. `hallazgo vencido`
2. `auditoria proxima`
3. `contrato con obligacion atrasada`

Razon:

- ya existen fechas y estados consumibles
- no dependen de IA ni OCR
- tienen salida operativa clara
- permiten validar deduplicacion e historial de ejecucion

### Ola 2 - Acciones encadenadas

Una vez estable la ola 1:

1. enviar notificacion
2. crear o actualizar tarea
3. escalar por prioridad o antiguedad

### Ola 3 - Reglas versionadas

Cuando el flujo operativo ya este validado:

1. catalogo editable de triggers
2. activacion/desactivacion por tenant
3. ventanas de ejecucion
4. politicas de deduplicacion

## Backlog priorizado

## B1. Modelo minimo de workflow

Crear entidades iniciales:

- `workflow_rule`
- `workflow_execution`

Campos minimos sugeridos para `workflow_rule`:

- `tenantId`
- `code`
- `name`
- `triggerType`
- `enabled`
- `config`
- `actions`
- `cooldownMinutes`
- `createdAt`
- `updatedAt`

Campos minimos sugeridos para `workflow_execution`:

- `tenantId`
- `ruleId`
- `triggerType`
- `resourceType`
- `resourceId`
- `status`
- `startedAt`
- `finishedAt`
- `summary`
- `metadata`
- `errorMessage`

## B2. Runner inicial

Implementar un runner simple, por ejemplo:

- servicio Nest dedicado
- ejecucion por intervalo controlado
- sin depender aun de BullMQ o Redis

Requisitos:

- un tenant por corrida o corrida tenant-aware
- limite de concurrencia conservador
- timeout por ejecucion
- idempotencia basica

## B3. Historial y auditoria

Cada ejecucion debe dejar:

- registro en `workflow_execution`
- evento en `platform-audit`

Eventos sugeridos:

- `workflow.execution.started`
- `workflow.execution.succeeded`
- `workflow.execution.failed`
- `workflow.execution.skipped`

## B4. Trigger `auditoria proxima`

Condicion inicial sugerida:

- auditoria con `status = planned`
- `date` dentro de los proximos 7 dias

Acciones MVP:

- enviar notificacion
- crear tarea si no existe una tarea abierta relacionada

## B5. Trigger `hallazgo vencido`

Condicion inicial sugerida:

- finding abierto o en progreso
- `dueDate < now`

Acciones MVP:

- crear o actualizar accion correctiva
- notificar responsable
- escalar si supera umbral de dias vencido

Nota:

Aqui conviene decidir si el trigger opera directamente sobre `audit.findings` o
si primero se normaliza mas el ciclo de vida del hallazgo.

## B6. Trigger `contrato con obligacion atrasada`

Condicion inicial sugerida:

- `contract_obligation.status != fulfilled`
- `dueDate < now`

Acciones MVP:

- notificar owner
- crear tarea de seguimiento

## B7. Dedupe y enfriamiento

Antes de ampliar reglas, resolver:

- no reenviar el mismo aviso cada minuto
- no recrear tareas duplicadas
- permitir reintentos controlados

Estrategia minima:

- clave dedupe por `tenantId + ruleCode + resourceId + actionType + timeBucket`

## B8. UI minima de observabilidad

No empezar con un builder complejo. Solo una vista simple:

- listado de reglas
- estado enabled/disabled
- ultima ejecucion
- ultimo error
- contador de ejecuciones recientes

## B9. Trigger `documento por vencer`

Bloqueado hasta definir al menos uno de estos campos en documentos:

- `reviewDueDate`
- `effectiveUntil`
- `retentionUntil`

## Secuencia sugerida de implementacion

1. entidades `workflow_rule` y `workflow_execution`
2. servicio runner con ejecucion manual o por intervalo
3. trigger `auditoria proxima`
4. trigger `contrato con obligacion atrasada`
5. trigger `hallazgo vencido`
6. dedupe/enfriamiento
7. UI minima de observabilidad
8. modelado documental adicional para `documento por vencer`

## Criterio de salida de la primera iteracion

La primera iteracion de Fase 8 puede considerarse operativa cuando:

- existe al menos un runner por tenant
- se ejecutan 2 o 3 reglas simples reales
- cada ejecucion deja historial
- las acciones no generan duplicados obvios
- el equipo puede entender que paso y por que

## No hacer todavia

- builder visual complejo
- DSL avanzada de reglas
- dependencia temprana de un bus distribuido si aun no hace falta
- automatizaciones documentales sin fecha formal de vigencia
- mezclar IA generativa con automatizacion critica en la primera ola
