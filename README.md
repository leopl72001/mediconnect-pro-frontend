# MediConnect Pro — Frontend (Angular 21+)

Interfaz del proyecto de grado **Senior Full-Stack Capstone & Cloud Defense**, construida con **Angular 21**, **Signals**, **zoneless** y **Tailwind CSS 4**.

- **Backend independiente:** [mediconnect-pro-backend](https://github.com/leopl72001/mediconnect-pro-backend) (Java 25 / Spring Boot 4).
- **Proyecto original ya entregado:** [mediconnect](https://github.com/leopl72001/mediconnect). No se modifica.
- **Estado actual:** fase 6 en curso. El acceso de usuarios (registro y login) está conectado al backend real con JWT; las vistas de especialistas, citas e historia clínica todavía muestran **datos ficticios**, y sus acciones no persisten en la API.

## Funcionalidades visuales implementadas

- Panel responsivo con barra lateral y menú móvil.
- Acceso real con correo y contraseña, registro de pacientes y roles obtenidos del JWT emitido por Spring Boot.
- Modo demostración separado con selector de roles **Paciente / Médico / Administrador**; no concede permisos de backend.
- Vista de especialistas con buscador y filtros por especialidad.
- Flujo de reserva y cancelación local con **Angular Signals**. La operación **no envía solicitudes HTTP**.
- Panel clínico, notas, prescripciones, consultorios y estadísticas **ilustrativos**.
- Interfaz completamente en español; etiquetas visibles que distinguen la demostración de datos reales.

## Requisitos

- Node.js 24 + npm 11, Docker Desktop recomendado en Windows si la política de seguridad bloquea módulos nativos de Rollup.

## Ejecutar en Windows con Docker

En PowerShell, desde la carpeta `mediconnect-pro-frontend`. Primero enciende el backend con `docker compose up -d` en `mediconnect-pro-backend` y verifica `http://127.0.0.1:8082/actuator/health`:

```powershell
docker run --rm -it --name mediconnect-pro-angular -p 127.0.0.1:4200:4200 `
  --mount "type=bind,source=$((Get-Location).Path),target=/app" `
  --mount "type=volume,source=mediconnect-pro-node-modules,target=/app/node_modules" `
  -w /app node:24-bookworm `
  sh -lc "npm ci && npm start -- --host 0.0.0.0 --poll 2000"
```

Abre http://localhost:4200 dentro o fuera de VS Code. El servidor está destinado **solo al desarrollo local**.

**Cómo probar JWT:** abre la aplicación, selecciona `Registrarse`, introduce datos ficticios y una contraseña de al menos 8 caracteres. El frontend llama a `POST /api/v1/auth/register` y luego `POST /api/v1/auth/login`; el token se mantiene en memoria hasta cerrar sesión o recargar. Un interceptor añade `Authorization: Bearer …` a solicitudes protegidas. El backend valida firma y permisos.

**Conexión de desarrollo:** `angular.json` usa `proxy.conf.json` para enviar `/api` desde el contenedor Angular hacia `http://host.docker.internal:8082`. Requiere Docker Desktop y el backend corriendo en el host. En el despliegue cloud se configurará un reverse proxy apropiado: esta URL es solo de desarrollo.

**Seguridad y alcance:** no se guardan tokens en `localStorage` ni se registran credenciales en consola; al recargar hay que volver a autenticarse. El panel muestra únicamente **contenido de demostración** aunque el usuario haya iniciado sesión realmente. Roles en UI son solo presentacionales; la seguridad depende de Spring Security.

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
src/app/core/         Servicio de JWT e interceptor HTTP
proxy.conf.json       Proxy local de Angular Docker a Spring Boot
```

Los paneles de ejemplo concentran varios flujos en el componente raíz para validarlos visualmente. El registro/login usa un componente independiente y servicios HTTP tipados. Antes de conectar las citas, se extraerán componentes por dominio, guards y servicios adicionales.

### Fases pendientes

- **6 (en curso):** registro/login real con JWT realizado. Pendiente: perfiles, especialistas, reservas y agendas reales con autorización por rol.
- **7:** SSE/WebSockets y actualizaciones en tiempo real.
- **8:** imágenes optimizadas, almacenamiento privado y sincronización offline.
- **9:** Vitest y Cypress, 80% de cobertura y pirámide de pruebas.
- **10:** Docker multi-stage, SonarCloud, CI/CD y URL pública.

### Gobernanza de IA

Consulta [.cursorrules](.cursorrules) y [bitácora de IA](docs/ai-log.md). Ninguna pantalla o resultado de demostración debe presentarse como una funcionalidad integrada y operativa en producción.
