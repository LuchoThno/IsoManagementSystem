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

