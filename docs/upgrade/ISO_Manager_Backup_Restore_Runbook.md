# ISO Manager - Runbook de Backup y Restore

Fecha de referencia: 2026-07-01

## Objetivo

Definir un procedimiento minimo, repetible y seguro para respaldar y restaurar
la base de datos MongoDB del entorno actual sin alterar la arquitectura del
repositorio.

## Alcance

Aplica a los despliegues actuales del backend `apps/api` sobre MongoDB:

- `docker-compose.yml`
- `docker-compose.api.yml`
- despliegues productivos que usen `MONGODB_URI` hacia MongoDB local o externo

## Politica operativa inicial

- Produccion:
  - backup diario completo
  - retencion minima de 7 dias
  - al menos 1 restore de validacion por release o por mes, lo que ocurra primero
- Staging:
  - backup previo a cambios estructurales o despliegues de riesgo
- Desarrollo:
  - backup bajo demanda antes de refactors o pruebas destructivas

## Prerrequisitos

- Tener acceso al valor efectivo de `MONGODB_URI`
- Tener acceso al host Docker o al servidor MongoDB
- Contar con espacio suficiente para generar el dump comprimido
- Resguardar el backup fuera del contenedor y fuera del directorio temporal del proceso

## Convencion sugerida de nombres

Formato recomendado:

`iso-manager_<entorno>_<YYYYMMDD-HHMMSS>.archive.gz`

Ejemplos:

- `iso-manager_prod_20260701-231500.archive.gz`
- `iso-manager_staging_20260701-180000.archive.gz`

## Backup con MongoDB local en Docker

Si el servicio `mongo` corre en `docker-compose.api.yml` o `docker-compose.yml`:

```bash
docker exec iso-manager-mongo sh -lc 'mongodump --archive --gzip --db iso_manager' > iso-manager_prod_20260701-231500.archive.gz
```

Alternativa versionada desde este repo:

```bash
pnpm backup:mongo -- --env prod
```

Notas:

- ejecuta el comando desde un host con espacio disponible
- mueve el archivo generado a almacenamiento persistente inmediatamente
- no dejes el respaldo solo dentro del workspace ni solo en el servidor de app

## Backup usando `MONGODB_URI`

Si usas MongoDB Atlas u otra instancia externa:

```bash
mongodump --uri="$MONGODB_URI" --archive=iso-manager_prod_20260701-231500.archive.gz --gzip
```

Alternativa versionada desde este repo:

```bash
MONGODB_URI="mongodb+srv://..." pnpm backup:mongo -- --env prod
```

Notas:

- valida primero que `MONGODB_URI` apunte al cluster correcto
- usa un usuario con permisos de lectura para respaldo cuando sea posible

## Retencion y limpieza local

Para revisar que respaldos locales se conservarian segun una politica minima:

```bash
pnpm prune:backups:mongo -- --env prod --keep 7 --max-age-days 30
```

Aplicar realmente la limpieza:

```bash
pnpm prune:backups:mongo -- --env prod --keep 7 --max-age-days 30 --apply
```

Notas:

- el comando trabaja en `dry-run` por defecto
- filtra solo archivos `*.archive.gz`
- si se indica `--env prod`, solo actua sobre archivos `iso-manager_prod_...`
- conviene ejecutar primero sin `--apply` y revisar la salida

## Restore de validacion

Antes de restaurar en un entorno sensible:

1. Confirmar que el archivo corresponde al entorno correcto.
2. Restaurar primero en staging o en una base temporal.
3. Verificar salud del API y datos minimos esperados.

Restore contra una base temporal:

```bash
mongorestore --uri="$MONGODB_URI" --archive=iso-manager_prod_20260701-231500.archive.gz --gzip --nsFrom="iso_manager.*" --nsTo="iso_manager_restore_check.*"
```

Alternativa versionada desde este repo:

```bash
pnpm restore:mongo -- --archive backups/iso-manager_prod_20260701-231500.archive.gz --temp-suffix restore_check
```

Verificacion automatizada del restore temporal:

```bash
pnpm verify:restore:mongo -- --archive backups/iso-manager_prod_20260701-231500.archive.gz
```

Que hace este comando:

- restaura el archivo en una base temporal `iso_manager_restore_check`
- valida la presencia de colecciones minimas esperadas
- imprime conteos por coleccion para inspeccion rapida
- elimina la base temporal al terminar, salvo que se use `--keep-restored-db`

Restore completo sobre la base objetivo:

```bash
mongorestore --uri="$MONGODB_URI" --archive=iso-manager_prod_20260701-231500.archive.gz --gzip --drop
```

Alternativa versionada desde este repo:

```bash
pnpm restore:mongo -- --archive backups/iso-manager_prod_20260701-231500.archive.gz --drop
```

Advertencia:

- `--drop` elimina colecciones existentes antes de restaurar
- no ejecutar restore completo en producción sin ventana controlada y respaldo verificado

## Checklist minima post-restore

- `GET /api/health` responde `200`
- `GET /api/iso/auth/config` responde `200`
- `GET /api/iso/bootstrap-shell` responde segun el modo de auth esperado
- existen documentos, tareas, auditorias y configuracion
- los logs de plataforma siguen consultables

## Frecuencia de verificacion

- validar restore al menos una vez por release relevante
- registrar fecha, responsable, archivo usado y resultado de la verificacion

## Automatizacion operativa recomendada

Comando orquestado recomendado para cron:

```bash
pnpm backup:cycle:mongo -- --env prod --keep 7 --max-age-days 30 --apply-prune
```

Que hace este flujo:

- genera un backup nuevo
- aplica la politica de retencion local
- verifica un restore temporal del backup mas reciente

Ejemplo minimo en cron del servidor:

```bash
0 3 * * * cd /ruta/IsoManagementSystem && pnpm backup:cycle:mongo -- --env prod --keep 7 --max-age-days 30 --apply-prune
```

Recomendaciones:

- mover cada backup a almacenamiento externo cifrado despues de generarlo
- registrar el resultado del restore de verificacion en un log operativo
- alertar cuando falle el backup o cuando falten colecciones criticas en la verificacion
- si el restore de verificacion diario es demasiado costoso, usar `--skip-verify`
  y calendarizar una corrida completa al menos semanalmente

## Riesgos conocidos

- el repositorio aun no automatiza backups desde CI/CD ni cron del propio proyecto
- el versionado de archivos adjuntos externos debe revisarse aparte si se desacopla almacenamiento a futuro
- en modo demo pueden existir datos no representativos para una validacion de recuperación de producción

## Siguiente paso recomendado

Automatizar este runbook en infraestructura:

- cron del servidor
- bucket externo cifrado
- retencion definida
- prueba de restore calendarizada
