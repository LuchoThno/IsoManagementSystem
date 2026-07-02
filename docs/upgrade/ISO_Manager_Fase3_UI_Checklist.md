# ISO Manager Enterprise V3 - Checklist de Cierre Fase 3

Fecha de referencia: 2026-07-01

## Objetivo

Validar que la base del design system quedó suficientemente consolidada
antes de pasar a la siguiente fase del upgrade.

## Criterios de Aceptacion

- existe una capa de tokens globales en `apps/web/src/index.css`
- `tailwind.config.js` expone colores y superficies semánticas
- el layout principal usa clases compartidas y no colores inline críticos
- las páginas core usan tarjetas, botones, inputs y estados consistentes
- los modales principales usan la misma jerarquía visual
- tablas y filtros compartidos usan el mismo lenguaje visual
- los estados de loading, vacío y error ya no dependen de estilos ad hoc
- el frontend compila con `pnpm --filter @iso-manager/web build`

## Cobertura Validada

- layout:
  - sidebar
  - topbar
  - dashboard shell
- páginas:
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
  - login
- componentes compartidos:
  - tablas documentales
  - filtros de documentos, tareas, auditorías y alertas
  - modales de documentos, tareas, auditorías y calendario
  - tarjetas y chips semánticos

## Deuda Menor Aceptada

- persisten algunos estilos puntuales no críticos en vistas secundarias
- `Communications` conserva gradientes y superficies especiales propias del módulo
- existen componentes legacy auxiliares que no afectan el flujo principal actual

## Salida de Fase

La Fase 3 puede considerarse funcionalmente cerrada cuando:

- no exista deuda visual crítica en rutas principales
- el build del frontend continúe estable
- los siguientes cambios se concentren ya en seguridad, backend o refactor modular
