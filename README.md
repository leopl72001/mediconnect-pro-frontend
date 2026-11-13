# MediConnect Pro — Frontend (Angular 21+)

Interfaz del proyecto de grado **Senior Full-Stack Capstone & Cloud Defense**, construida con **Angular 21**, **Signals**, **zoneless** y **Tailwind CSS 4**.

- **Backend independiente:** [mediconnect-pro-backend](https://github.com/leopl72001/mediconnect-pro-backend) (Java 25 / Spring Boot 4).
- **Proyecto original ya entregado:** [mediconnect](https://github.com/leopl72001/mediconnect). No se modifica.
- **Estado actual:** fase 6 de integración real completada y validada visualmente para pacientes, médicos y administración. **Fase 7 validada:** notificaciones SSE con JWT, con actualización automática de agenda comprobada visualmente. **Fase 8 validada en Docker local:** imágenes WebP, archivos privados en MongoDB y cola offline. Se comprobó sincronización 1 pendiente → 0 al recuperar conexión; la separación entre pacientes pasó Cypress. La fase 9 cumple la meta de cobertura de 80 % en backend y frontend; el despliegue público y SonarCloud real siguen pendientes. Estadísticas avanzadas y modo demostración siguen siendo ilustrativos.

## Funcionalidades visuales implementadas

- Panel responsivo con barra lateral y menú móvil.
- Acceso real con correo y contraseña, registro de pacientes y roles obtenidos del JWT emitido por Spring Boot.
- Modo demostración separado con selector de roles **Paciente / Médico / Administrador**; no concede permisos de backend.
- Vista de especialistas con buscador y filtros por especialidad. En sesión JWT real, muestra el catálogo del backend; sin login, el modo demostración usa médicos ficticios.
- En sesión JWT de paciente: seleccionar médico, consultorio activo y horario de Colombia; crear la cita en PostgreSQL (`POST /api/v1/appointments`), listar (`GET /api/v1/appointments/me`) y cancelar (`PATCH /api/v1/appointments/{id}/cancel`).
- En sesión JWT de médico: consultar su agenda con `GET /api/v1/appointments/doctor/me`.
- **SSE (fase 7):** `GET /api/v1/notifications/stream` con token JWT **en cabecera Authorization** (no en la URL). Estado de conexión en pantalla (`SSE en vivo` / `SSE reconectando`), aviso al crear/cancelar y actualización automática de agenda de paciente y médico. El cliente usa fetch streaming y reintenta la conexión.
- **Fase 8:** pantalla `Mis archivos` del paciente JWT. JPG/PNG/WebP se convierten y redimensionan a WebP en Canvas (hasta 1600 px); PDF conserva su formato. Subida privada a MongoDB GridFS, descarga autenticada y cola IndexedDB para sincronizar al recuperar conexión.
- En modo demostración: reserva y cancelación local con **Angular Signals**, sin ninguna solicitud HTTP.
- Perfil real del paciente: `GET/PUT /api/v1/patients/me` con datos persistidos en PostgreSQL.
- Médico: guardar notas clínicas en MongoDB mediante `POST /api/v1/appointments/{id}/clinical-notes` y recetas con validación OpenFDA mediante `POST /api/v1/appointments/{id}/prescriptions` sobre sus propias citas.
- Paciente: consultar sus notas y recetas en `GET /api/v1/clinical-notes/me` y `GET /api/v1/prescriptions/me`.
- Administrador: registrar médicos y consultorios reales; ver contadores de catálogos. La API no proporciona métricas de negocio avanzadas ni datos de identidad del paciente en la agenda del médico.
- Interfaz completamente en español; etiquetas visibles que distinguen la demostración de datos reales.

## Requisitos

- Node.js 24 + npm 11, Docker Desktop recomendado en Windows si la política de seguridad bloquea módulos nativos de Rollup.

## Ejecutar en Windows con Docker

En PowerShell, desde la carpeta `mediconnect-pro-frontend`. Primero enciende el backend con `docker compose up -d` en `mediconnect-pro-backend` y verifica `http://127.0.0.1:8082/actuator/health`:

```powershell
docker run --rm -it --name mediconnect-pro-angular --network mediconnect-pro_default -p 127.0.0.1:4200:4200 `
  --mount "type=bind,source=$((Get-Location).Path),target=/app" `
  --mount "type=volume,source=mediconnect-pro-node-modules,target=/app/node_modules" `
  -w /app node:24-bookworm `
  sh -lc "npm ci && npm start -- --host 0.0.0.0 --poll 2000"
```

Abre http://localhost:4200 dentro o fuera de VS Code. El servidor está destinado **solo al desarrollo local**.

**Cómo probar JWT:** abre la aplicación, selecciona `Registrarse`, introduce datos ficticios y una contraseña de al menos 8 caracteres. El frontend llama a `POST /api/v1/auth/register` y luego `POST /api/v1/auth/login`; el token se mantiene en memoria hasta cerrar sesión o recargar. Un interceptor añade `Authorization: Bearer …` a solicitudes protegidas. El backend valida firma y permisos.

**Conexión de desarrollo:** `angular.json` usa `proxy.conf.json` para enviar `/api` desde el contenedor Angular hacia `http://app:8081`. Requiere Docker Desktop y que los contenedores del backend estén corriendo en la red `mediconnect-pro_default`. Así el proxy accede directamente al servicio `app` de Compose por su puerto interno 8081. En el despliegue cloud se configurará un reverse proxy apropiado: esta URL es solo de desarrollo.

**Catálogo y reservas reales:** en Especialistas los médicos provienen de `GET /api/v1/doctors`. La base recién creada puede no tener médicos ni consultorios; un ADMIN debe registrarlos usando `/api/v1/admin/doctors` y `/api/v1/admin/offices`. En la reserva, se selecciona un consultorio activo, día y hora **en zona horaria Colombia UTC-5**; la interfaz envía timestamps ISO UTC a Spring Boot. **El sistema no expone disponibilidad anticipada**: la hora seleccionada es una solicitud, no una garantía, y el backend rechaza citas solapadas con HTTP 409. Cancelaciones requieren más de 24 h de anticipación. En pruebas usa fechas futuras y datos ficticios.

**Seguridad y alcance:** no se guardan tokens en `localStorage` ni se registran credenciales en consola; al recargar hay que volver a autenticarse. La conexión SSE se cierra al salir y reconecta con JWT en cabecera; las notificaciones no llevan datos clínicos. El backend SSE usa memoria local, no distribución entre múltiples réplicas. Roles en la UI son solo presentacionales; la seguridad depende de Spring Security. Los datos de **especialistas, consultorios, citas, agenda, perfil y clínica** son reales cuando hay sesión JWT. **Historias y recetas** son reales en sesión JWT; el **modo demo y las estadísticas avanzadas** siguen siendo visualizaciones ficticias. No se deben usar datos médicos personales para pruebas. **La cola IndexedDB contiene copias locales sin cifrado: solo archivos ficticios.** El login, la autorización JWT y los nombres de archivos no constituyen cifrado local. Para producción se requiere cifrado en reposo, una política de retención y protección adicional de datos sensibles.

Si usas Node.js directamente en un sistema compatible:

```bash
npm ci
npm start
```

## Calidad, CI/CD y defensa (Capstone)

- **Vitest cobertura:** `npm test -- --watch=false --coverage`; ver `coverage/index.html`, y `node scripts/report-coverage.cjs` para leer porcentajes. Última medición real, GitHub Actions PR #28 (13/11/2026): **95,78 % líneas / 87,86 % ramas / 81,20 % funciones / 92,13 % instrucciones**, con **235/235 pruebas**. La regla estricta de CI exige al menos 80 % en las cuatro métricas.
- **Cypress:** cuatro recorridos reales, tres en `cypress/e2e/capstone-critical.cy.js` y uno en `cypress/e2e/media-privacy.cy.js` para impedir acceso entre pacientes. GitHub Actions inicia PostgreSQL/MongoDB/Redis y Angular; los cuatro recorridos estaban aprobados en el PR #13.
- **Docker multi-stage:** `docker build -t mediconnect-pro-ui .` compila Angular 21 y sirve archivos estáticos con Nginx; el proxy mantiene JWT y SSE en el mismo origen.
- **Cloud:** `render.yaml` prepara la interfaz; `BACKEND_ORIGIN` debe contener la URL real del backend en Render. Los secretos y activación requieren cuenta conectada y aprobación del titular. [Guía backend](https://github.com/leopl72001/mediconnect-pro-backend/blob/main/docs/DEPLOY-CLOUD.md).
- **CD:** workflows `publish-cloud.yml` publican a GHCR y activan Render cuando se configura `RENDER_DEPLOY_HOOK_URL`. Publicar contenedor no crea URL pública.
- **Defensa de 15 minutos:** [guion completo y fluido](docs/DEFENSA-CAPSTONE-15MIN.md). [Bitácora IA](docs/ai-log.md).
- **Importante:** la cobertura 80 % está cumplida y protegida en CI. **SonarCloud y la URL pública siguen pendientes** y no deben presentarse como aprobados.

## Compilación y pruebas

Con Docker en marcha, en otra terminal PowerShell:

```powershell
$angularContainer = docker ps --filter "ancestor=node:24-bookworm" --format "{{.ID}}" | Select-Object -First 1
docker exec $angularContainer sh -lc "npm run build && npm test -- --watch=false"
```

GitHub Actions repite estas comprobaciones automáticamente en la rama de desarrollo y en `main`.

## Arquitectura de diseño y próximos pasos

```text
src/app/app.ts         Estado de UI con Angular Signals (datos de API y demo aislados)
src/app/app.html       Paneles y flujos visuales responsivos
src/app/app.scss       Transiciones discretas
src/tailwind.css       Tailwind CSS 4
src/styles.scss        Tipografía y estilos base
src/app/app.spec.ts    Pruebas con Vitest
src/app/auth/         Formulario real de registro / login
src/app/core/         JWT, interceptor, clientes de API y SSE con reconexión
src/app/features/      Páginas reales de perfil, clínica, administración y archivos privados
proxy.conf.json       Proxy local de Angular Docker a Spring Boot
docs/prueba-integral-fase6.md  Recorrido de fase 6 (validado por capturas)
docs/prueba-fase7-sse.md      Validación SSE (comprobada)
docs/prueba-fase8-medios.md  Recorrido único para WebP, PDF y cola offline
```

Los paneles de ejemplo concentran varios flujos en el componente raíz para validarlos visualmente. El registro/login usa un componente independiente y servicios HTTP tipados. Los módulos de perfil, clínica y administración están separados en componentes. Pendiente: completar guards de rutas y extraer el dashboard general en más componentes; mejorar la respuesta al vencimiento del JWT.

### Fases pendientes

- **6 (completada):** JWT, médicos, consultorios, reservas, agenda, perfil, notas clínicas, recetas y administración comprobados mediante flujo funcional en Angular; cobertura formal queda para fase 9.
- **7 (completada):** SSE y actualización de agenda sin recarga verificados visualmente.
- **8 (validada localmente):** Canvas/WebP, archivos privados GridFS y sincronización diferida con IndexedDB probados con archivos ficticios. La privacidad entre cuentas se automatizó con Cypress. [Guía de prueba fase 8](docs/prueba-fase8-medios.md).
- **9 (completada en cobertura):** JaCoCo 82,36 % líneas / 82,17 % ramas y 95/95 JUnit; Vitest 95,78 % líneas / 87,86 % ramas / 81,20 % funciones / 92,13 % instrucciones y 235/235 pruebas; Cypress integrado. Puertas de calidad ≥80 % activadas en CI. SonarCloud real aún pendiente de conexión.
- **10 (preparada, no desplegada):** Docker multi-stage, GHCR y Render Free definidos. PostgreSQL existe; faltan MongoDB/Redis, secretos, URL pública real y dashboard SonarCloud.

### Gobernanza de IA

Consulta [.cursorrules](.cursorrules) y [bitácora de IA](docs/ai-log.md). Ninguna pantalla o resultado de demostración debe presentarse como una funcionalidad integrada y operativa en producción.
