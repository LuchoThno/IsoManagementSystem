# ISO Manager Enterprise V3 - Checklist de Cierre Fase 7

Esta guia concentra el cierre operativo de la Fase 7 de IA sandbox. El objetivo
no es validar aun un LLM productivo, sino confirmar que el contrato, el RBAC, el
tenant scoping y la trazabilidad ya quedaron listos para evolucionar a una capa
de IA real sin romper el perimetro de seguridad del sistema.

## Alcance de la Fase

La Fase 7 se considera cubierta funcionalmente cuando existe:

- modulo IA bajo `apps/api/src/iso/ai/*`
- contratos estables para:
  - `analyze-document`
  - `generate-procedure`
  - `summarize-audit`
  - `propose-corrective-actions`
- RBAC aplicado segun rol
- tenant scoping resuelto desde backend
- eventos `ai.*` registrados en `platform-audit`
- UI minima para ejecutar acciones IA en auditorias
- smoke test automatizable para IA sandbox

## Prerrequisitos

Antes de correr el cierre:

1. Confirmar que Docker Desktop o el daemon Docker local estan activos.
2. Verificar que existe un `.env.production` utilizable o un entorno demo local.
3. Confirmar que la app compila:
   - `pnpm --filter @iso-manager/api build`
   - `pnpm --filter @iso-manager/web lint`
4. Si se validara en modo `clerk`, tener disponible al menos:
   - un token `admin`
   - opcionalmente tokens `manager`, `auditor` y `viewer`

## Validacion Tecnica

### 1. Levantar stack local

```bash
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:3001/api/health
```

Resultado esperado:

- `mongo`, `api` y `web` quedan arriba
- `api` no queda `unhealthy`
- `/api/health` responde `200`

Atajo recomendado para cierre integrado:

```bash
pnpm smoke:fase7 -- --down
```

Resultado esperado:

- levanta stack temporal
- corre smoke base
- corre smoke IA
- corre RBAC si hay tokens y el modo es `clerk`
- apaga la stack al finalizar si usas `--down`

### 2. Smoke base

```bash
pnpm smoke:api
pnpm smoke:api:routes
```

Resultado esperado:

- el modo de auth resuelto es coherente
- las rutas publicas responden correctamente
- las rutas protegidas respetan el modo `demo|clerk|disabled`

### 3. Smoke especifico de IA

Modo demo:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 pnpm smoke:ai
```

Modo clerk:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 \
SMOKE_BEARER_TOKEN=eyJ... \
pnpm smoke:ai
```

Resultado esperado:

- `summarize-audit` responde `201`
- `propose-corrective-actions` responde `201`
- `analyze-document` responde `201`
- todas las respuestas incluyen `id`, `status`, `model`, `tenantId`
- las respuestas contienen la estructura stub esperada para cada endpoint

### 4. RBAC por rol

Ejecutar solo en modo `clerk`:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 \
SMOKE_ADMIN_TOKEN=... \
SMOKE_MANAGER_TOKEN=... \
SMOKE_AUDITOR_TOKEN=... \
SMOKE_VIEWER_TOKEN=... \
pnpm smoke:rbac
```

Resultado esperado:

- `admin`, `manager` y `auditor` pueden usar los endpoints IA permitidos
- `viewer` recibe `403`
- `auditor` recibe `403` en `propose-corrective-actions`
- los rechazos quedan alineados con el contrato RBAC del backend

### 5. Tenant scoping

Validacion minima:

1. Ejecutar IA sobre una auditoria valida del tenant activo.
2. Ejecutar IA sobre un `auditId` o `documentId` inexistente.
3. Verificar que el backend devuelve `404` y no filtra informacion cruzada.

Resultado esperado:

- no se acepta `tenantId` desde el cliente como fuente de verdad
- el tenant efectivo se resuelve en backend
- un recurso fuera del tenant no retorna datos ni metadatos sensibles

### 6. Audit trail

Si el token permite leer `platform/audit-logs`:

1. Consultar auditoria antes de ejecutar IA.
2. Ejecutar `summarize-audit`, `propose-corrective-actions` y `analyze-document`.
3. Consultar auditoria nuevamente.

Resultado esperado:

- aparecen nuevos eventos `ai.summarize_audit`
- aparecen nuevos eventos `ai.propose_corrective_actions`
- aparecen nuevos eventos `ai.analyze_document`
- los eventos registran `tenantId` y el recurso asociado
- los fallos tambien generan eventos `failure` cuando corresponda

## Validacion Manual UI

En `Auditorias`:

1. Seleccionar una auditoria.
2. Ejecutar `Resumir auditoria`.
3. Ejecutar `Proponer acciones`.
4. Confirmar estados:
   - loading
   - error controlado
   - resultado estructurado

Resultado esperado:

- la UI no se bloquea
- el panel IA muestra la respuesta stub
- el resultado cambia al cambiar de auditoria

## Criterio de Salida

La Fase 7 puede considerarse lista para cierre operativo cuando:

- compila backend y frontend sin regresiones
- existe smoke `smoke:ai`
- el stack levanta correctamente
- RBAC de IA queda validado
- tenant scoping queda validado
- audit trail `ai.*` queda validado
- la UI minima de auditorias permite ejecutar el sandbox

## Pendiente Intencional

Lo siguiente no bloquea el cierre de esta fase, pero pertenece a la evolucion
posterior de IA:

- integrar proveedor LLM real
- versionar prompts
- adjuntar fuentes enriquecidas y grounding real
- introducir limites, cuotas y observabilidad de costos
- definir politicas de retencion y redaccion para entradas/salidas IA
