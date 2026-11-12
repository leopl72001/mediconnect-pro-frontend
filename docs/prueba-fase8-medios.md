# Fase 8 — Prueba integral de archivos WebP y sincronización offline

**Objetivo:** probar en un solo recorrido subida privada, transformación Canvas/WebP y sincronización diferida sin cambiar de cuenta.

## Preparar la aplicación

1. En backend `D:\app fullstack\mediconnect-pro-backend`, ejecutar `git pull --ff-only origin main` y `docker compose up -d --build`.
2. Esperar a que `Invoke-RestMethod http://127.0.0.1:8082/actuator/health` indique `UP` (no reiniciar volúmenes).
3. En frontend `D:\app fullstack\mediconnect-pro-frontend`, ejecutar `git pull --ff-only origin main`. Angular en Docker suele recargar el cambio.
4. Recargar `http://localhost:4200`, volver a iniciar sesión como **paciente** y entrar en **Mis archivos**.

## Una prueba con 4 evidencias

1. **Transformación online:** usar solo una **foto ficticia** o una imagen pública descargada sin datos personales. Seleccionar PNG/JPG, esperar confirmación de MongoDB. En **Archivos privados**, el nombre debe terminar en **.webp**. Descargar y abrirlo.
2. **PDF de prueba:** opcional: subir un PDF creado con texto ficticio. Debe almacenarse y descargarse manteniendo `.pdf`.
3. **Sin internet:** mantener la sesión de paciente abierta. En las herramientas de desarrollador de Brave/Chrome (`F12` → **Network** → **Offline**), seleccionar **otra imagen ficticia** en **Mis archivos**. Debe aparecer en **Cola offline** como 1 pendiente, sin enviarse al servidor. **No cierres sesión ni borres el almacenamiento del navegador.**
4. **Recuperación:** cambiar **Offline → Online** desde DevTools. Debe iniciarse la sincronización sola y la cola volver a **0 pendientes**. La imagen debe aparecer entre los archivos privados de MongoDB; pulsar **Actualizar archivos** si el listado aún está cargando.

## Seguridad básica

- En otra sesión distinta de paciente, el listado **no debe mostrar** archivos del primer paciente.
- Con la API, una descarga por ID ajeno debe responder 404, no contenido. **No compartas JWT ni IDs de archivos reales**.
- Prueba un archivo HTML renombrado a `.png`: el backend debe rechazarlo con **HTTP 400** en lugar de almacenarlo.
- Desconectar/cerrar sesión no debe subir colas pendientes sin JWT.

## Interpretación y límites

- La cola se almacena en **IndexedDB sin cifrado por usuario**; usar exclusivamente imágenes de demostración y PDFs ficticios. No es apropiado para datos clínicos reales.
- El servicio de desarrollo `ng serve` no es una aplicación offline instalable (PWA), por lo que una recarga completa con la red offline puede fallar. **La fase 8 garantiza colas diferidas con la página previamente abierta**, no la carga offline completa de la SPA.
- `navigator.onLine` solo indica conectividad del navegador: ante una caída exclusiva del backend usa **Sincronizar ahora** cuando se restablezca el servidor.
- Las garantías finales de seguridad y cobertura dependen de fases 9 (pruebas) y 10 (cloud).

**Fase 8 se cierra cuando puedes mostrar un WebP almacenado y la cola que pasa 1 → 0 sin recargar.**
