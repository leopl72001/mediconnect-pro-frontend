# MediConnect Pro — Frontend (Angular 21+)

Interfaz del proyecto de grado **Senior Full-Stack Capstone & Cloud Defense**, construida con **Angular 21**, **Signals**, **zoneless** y **Tailwind CSS 4**.

- **Backend independiente:** [mediconnect-pro-backend](https://github.com/leopl72001/mediconnect-pro-backend) (Java 25 / Spring Boot 4).
- **Proyecto original ya entregado:** [mediconnect](https://github.com/leopl72001/mediconnect). No se modifica.
- **Estado actual:** fase 6 en curso. Registro e inicio de sesión JWT, catálogo de médicos y consultorios reales, **reserva de citas en PostgreSQL**, listado y cancelación conectados a Spring Boot. El historial clínico y las estadísticas siguen siendo ilustrativos. La prueba manual de reserva desde Angular está pendiente.

## Funcionalidades visuales implementadas

- Panel responsivo con barra lateral y menú móvil.
- Acceso real con correo y contraseña, registro de pacientes y roles obtenidos del JWT emitido por Spring Boot.
- Modo demostración separado con selector de roles **Paciente / Médico / Administrador**; no concede permisos de backend.
- Vista de especialistas con buscador y filtros por especialidad. En sesión JWT real, muestra el catálogo del backend; sin login, el modo demostración usa médicos ficticios.
- En sesión JWT de paciente: seleccionar médico, consultorio activo y horario de Colombia; crear la cita en PostgreSQL (`POST /api/v1/appointments`), listar (`GET /api/v1/appointments/me`) y cancelar (`PATCH /api/v1/appointments/{id}/cancel`).
- En sesión JWT de médico: consultar su agenda con `GET /api/v1/appointments/doctor/me`.
- En modo demostración: reserva y cancelación local con **Angular Signals**, sin ninguna solicitud HTTP.
- Panel clínico, notas, prescripciones, consultorios y estadísticas **ilustrativos**.
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

**Seguridad y alcance:** no se guardan tokens en `localStorage` ni se registran credenciales en consola; al recargar hay que volver a autenticarse. Roles en la UI son solo presentacionales; la seguridad depende de Spring Security. Los datos de **especialistas, consultorios, citas y agenda** son reales cuando hay sesión JWT. **Historia clínica, recetas, estadísticas y el modo demo** siguen siendo visualizaciones ficticias.

Si usas Node.js directamente en un sistema compatible:

```bash
npm ci
npm start
```

## Compilación y pruebas

Con Docker en marcha, en otra terminal PowerShell:

```powershell
$angularContainer = docker ps --filter "ancestor=node:24-bookworm" --format "{{.ID}}" | Select-Object -First 1
docker exec $angularContainer sh -lc "npm run build && npm test -- --watch=false"
```

GitHub Actions repite estas comprobaciones automáticamente en la rama de desarrollo y en `main`.

## Arquitectura de diseño y próximos pasos

```text
src/app/app.ts         Estado de UI con Angular Signals (datos ficticios)
src/app/app.html       Paneles y flujos visuales responsivos
src/app/app.scss       Transiciones discretas
src/tailwind.css       Tailwind CSS 4
src/styles.scss        Tipografía y estilos base
src/app/app.spec.ts    Pruebas con Vitest
src/app/auth/         Formulario real de registro / login
src/app/core/         JWT, interceptor, catálogos y servicios de citas
proxy.conf.json       Proxy local de Angular Docker a Spring Boot
```

Los paneles de ejemplo concentran varios flujos en el componente raíz para validarlos visualmente. El registro/login usa un componente independiente y servicios HTTP tipados. Pendiente: extraer componentes por dominio, agregar guards de rutas y mejorar los flujos administrativos y clínicos reales.

### Fases pendientes

- **6 (en curso):** JWT, médicos y consultorios, reserva/listado/cancelación y agenda del médico programados con pruebas de compilación. Pendiente verificación manual completa y conexión de vistas administrativas y clínicas reales.
- **7:** SSE/WebSockets y actualizaciones en tiempo real.
- **8:** imágenes optimizadas, almacenamiento privado y sincronización offline.
- **9:** Vitest y Cypress, 80% de cobertura y pirámide de pruebas.
- **10:** Docker multi-stage, SonarCloud, CI/CD y URL pública.

### Gobernanza de IA

Consulta [.cursorrules](.cursorrules) y [bitácora de IA](docs/ai-log.md). Ninguna pantalla o resultado de demostración debe presentarse como una funcionalidad integrada y operativa en producción.
