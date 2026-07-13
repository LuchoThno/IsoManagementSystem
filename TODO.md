# TODO - Levantar app (Docker completo)

## Paso 1: Preparar entorno
- [ ] Verificar que exista (o crear) `.env.production` para docker (usando el ejemplo del repo si aplica)

## Paso 2: Levantar contenedores
- [ ] Ejecutar `docker compose up --build -d` con `docker-compose.yml`

## Paso 3: Validar salud
- [ ] Verificar puertos y estado con `docker compose ps`
- [ ] Validar API con `curl http://127.0.0.1:<API_PORT>/api/health`
- [ ] Validar web con `http://127.0.0.1:<WEB_PORT>`

## Paso 4: Logs y smoke (si aplica)
- [ ] Si falla, revisar logs con `docker compose logs -f api` y `docker compose logs -f web`
- [ ] Opcional: correr smoke `pnpm smoke:stack:api -- --auth-mode demo --down` si aplica

---

# TODO - ISO Manager Enterprise V3 (Fase 7 - IA sandbox con stub)

## Paso 1: Contrato técnico mínimo IA (DTOs + formato de respuesta)
- [x] Definir DTOs: analyzeDocument, generateProcedure, summarizeAudit, proposeCorrectiveActions
- [x] Definir esquema de respuesta estable (incl. ids, fuentes, pasos, recomendaciones)

## Paso 2: Backend endpoint IA sandbox (con RBAC/tenant scoping + audit trail)
- [x] Crear módulo/handlers de IA bajo `apps/api/src/iso/ai/*`
- [x] Implementar RBAC/tenant scoping usando el patrón existente
- [x] Registrar eventos en `platform-audit` por ejecución IA
- [x] Responder con payload stub con formato correcto

## Paso 3: UI mínima para ejecutar “Analizar con IA”
- [x] Añadir cliente API en `apps/web/src/lib/*`
- [x] Integrar acción y UI en `apps/web/src/pages/Audits.tsx` (o dominio equivalente)
- [x] Mostrar resultado estructurado (stub) y estados loading/error

## Paso 4: Smoke / validación
- [x] Añadir smoke dedicado para IA sandbox (`pnpm smoke:ai`) y cobertura RBAC en `smoke-rbac`
- [x] Añadir comando único de cierre (`pnpm smoke:fase7 -- --down`)
- [x] Documentar checklist operativo de cierre Fase 7 (`docs/upgrade/ISO_Manager_Fase7_IA_Checklist.md`)
- [ ] Ejecutar `docker compose up --build -d`
- [ ] Confirmar Docker daemon activo localmente antes de correr los smoke runtime
- [ ] Validar permisos (sin permiso => 403)
- [ ] Validar tenant scoping (no leak)
- [ ] Validar que existe audit trail por ejecución IA

## Siguiente foco recomendado: Fase 8 - Automatización
- [x] Definir backlog inicial de Fase 8 (`docs/upgrade/ISO_Manager_Fase8_Automatizacion_Backlog.md`)
- [x] Diseñar entidades mínimas `workflow_rule` y `workflow_execution`
- [x] Implementar runner inicial tenant-aware
- [x] Implementar primer trigger: `auditoria proxima`
