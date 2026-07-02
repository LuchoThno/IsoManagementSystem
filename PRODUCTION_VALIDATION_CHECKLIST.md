# Production Validation Checklist

Usa esta guía para validar el cierre funcional de producción en `https://iso.servasmar.cl`.

## 1. Acceso y sesión

1. Abre `https://iso.servasmar.cl`.
2. Confirma que carga la pantalla de login sin errores visuales ni pantalla en blanco.
3. Inicia sesión con una cuenta real de Clerk autorizada.
4. Verifica que el login redirige al dashboard `/`.
5. Recarga el navegador en una ruta interna, por ejemplo `/documents`, y confirma que la sesión persiste.
6. Cierra sesión y confirma que vuelve a `/login`.

Resultado esperado:

- El login funciona sin loops.
- No aparece error de Clerk ni error de sincronización de sesión.
- Las rutas internas quedan protegidas tras cerrar sesión.

## 2. Dashboard

1. Inicia sesión nuevamente.
2. En el dashboard, valida que cargan:
   - métricas principales
   - alertas
   - actividad reciente
3. Confirma que no aparece el mensaje `No fue posible cargar los datos iniciales del sistema`.
4. Abre DevTools y revisa que las llamadas a `/api/health` y `/api/iso/bootstrap-shell` no fallen.

Resultado esperado:

- Dashboard visible en menos tiempo que antes.
- Sin errores 500 ni errores de red.

## 3. Gestión documental

1. Entra a `Gestión documental`.
2. Confirma que la tabla carga sin bloquear toda la app.
3. Usa el buscador por texto y valida que filtra resultados.
4. Sube un documento pequeño de prueba.
5. Verifica que el nuevo documento aparece en la lista.
6. Usa `Ver documento` y confirma que abre el archivo.
7. Usa `Descargar documento` y confirma que descarga con nombre correcto.
8. Edita:
   - título
   - tema
   - versión
   - estado
9. Guarda y confirma que el documento refleja los cambios.
10. Abre:
   - historial de versiones
   - auditoría documental
11. Elimina el documento de prueba.

Resultado esperado:

- El listado carga rápido.
- Ver/descargar sigue funcionando aunque la lista ya no transporte el archivo completo.
- La auditoría y versiones se mantienen consistentes.

## 4. Tareas

1. Entra a `Tareas`.
2. Confirma que la lista carga correctamente.
3. Crea una tarea nueva con:
   - título
   - descripción
   - responsable
   - fecha
   - prioridad
   - norma ISO
4. Edita la tarea creada.
5. Cambia el estado.
6. Elimina la tarea de prueba.

Resultado esperado:

- La lista se actualiza sin refrescar toda la app.
- El dashboard y alertas se ajustan después de crear o eliminar.

## 5. Auditorías

1. Entra a `Auditorías`.
2. Crea una auditoría de prueba con al menos un hallazgo.
3. Edita la auditoría.
4. Cambia su estado.
5. Elimina la auditoría de prueba.

Resultado esperado:

- La carga es independiente del bootstrap general.
- No aparecen errores al guardar ni al recalcular alertas.

## 6. Chat interno

1. Entra a `Chat interno`.
2. Confirma que el estado de conexión pasa a `online` o equivalente operativo.
3. Busca un usuario disponible.
4. Abre una conversación directa.
5. Envía un mensaje.
6. Si tienes dos sesiones o dos usuarios, valida recepción del mensaje en el otro lado.

Resultado esperado:

- La lista de conversaciones carga.
- Socket.IO conecta.
- El mensaje aparece sin refrescar la página.

## 7. Comunicaciones

1. Entra a `Comunicados`.
2. Espera la validación de compatibilidad del proveedor.
3. Confirma cuál proveedor aparece activo:
   - Resend
   - Gmail API
   - Webhook
4. Crea o edita una plantilla.
5. Previsualiza la plantilla.
6. Ejecuta un envío de prueba a un destinatario controlado.
7. Verifica que el envío queda registrado en campañas.

Resultado esperado:

- La compatibilidad carga.
- El preview funciona.
- El envío responde sin error y genera trazabilidad.

## 8. Configuración y usuarios

1. Entra a `Settings > General`.
2. Verifica que la configuración general carga.
3. Entra a `Settings > Notificaciones`.
4. Guarda un cambio menor si corresponde.
5. Entra a `Settings > Usuarios`.
6. Busca un usuario por nombre o correo.
7. Si el entorno lo permite, crea o edita un usuario de prueba.

Resultado esperado:

- Las vistas de settings cargan bien con lazy loading.
- La búsqueda funciona.

## 9. Validación técnica mínima

Ejecuta estos checks después de la prueba manual:

```bash
curl -i https://iso.servasmar.cl/api/health
curl -i https://api-iso.servasmar.cl/api/health
curl -i https://iso.servasmar.cl/api/iso/bootstrap-shell
curl -i "https://iso.servasmar.cl/socket.io/?EIO=4&transport=polling"
```

Resultado esperado:

- `/api/health` -> `200`
- `/api/iso/bootstrap-shell` sin token -> `401`
- `socket.io` polling -> `200` con `sid`

Smoke check automatizable:

```bash
SMOKE_BASE_URL=https://api-iso.servasmar.cl \
SMOKE_AUTH_MODE=clerk \
pnpm smoke:api
```

Smoke de rutas protegidas por modo:

```bash
SMOKE_BASE_URL=https://api-iso.servasmar.cl \
SMOKE_AUTH_MODE=clerk \
pnpm smoke:api:routes
```

Si quieres validar rutas autenticadas reales:

```bash
SMOKE_BASE_URL=https://api-iso.servasmar.cl \
SMOKE_AUTH_MODE=clerk \
SMOKE_BEARER_TOKEN=eyJ... \
pnpm smoke:api:routes
```

Smoke de realtime / Socket.IO:

```bash
SMOKE_SOCKET_URL="https://iso.servasmar.cl/socket.io/?EIO=4&transport=polling" \
pnpm smoke:socket
```

Batería backend mínima:

```bash
SMOKE_BASE_URL=https://api-iso.servasmar.cl \
SMOKE_AUTH_MODE=clerk \
SMOKE_SOCKET_URL="https://iso.servasmar.cl/socket.io/?EIO=4&transport=polling" \
pnpm smoke:backend
```

## 10. Criterio de salida

Se puede considerar el paso 1 cerrado cuando:

- login real funciona
- dashboard funciona
- documentos funciona de punta a punta
- tareas funciona de punta a punta
- auditorías funciona de punta a punta
- chat funciona
- comunicaciones funciona con envío real controlado
- no aparecen errores críticos en consola o red

## Siguiente paso recomendado

Una vez cerrada esta validación manual:

1. rotar secretos expuestos en producción
2. definir Mongo oficial
3. agregar smoke tests e2e automatizados
