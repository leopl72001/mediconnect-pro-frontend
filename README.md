# MediConnect Pro — Frontend (Angular 21+)

Interfaz del proyecto de grado **Senior Full-Stack Capstone & Cloud Defense**, construida con **Angular 21**, **Signals**, **zoneless** y **Tailwind CSS 4**.

- **Backend independiente:** [mediconnect-pro-backend](https://github.com/leopl72001/mediconnect-pro-backend) (Java 25 / Spring Boot 4).
- **Proyecto original ya entregado:** [mediconnect](https://github.com/leopl72001/mediconnect). No se modifica.
- **Estado actual:** fase 5, UI responsiva de demostración. **Los datos y acciones del frontend todavía son locales y ficticios.** La autenticación, persistencia y conexión real al backend pertenecen a la fase 6.

## Funcionalidades visuales implementadas

- Panel responsivo con barra lateral y menú móvil.
- Selector de rol **Paciente / Médico / Administrador** para visualizar diseños distintos; **no es autenticación real**.
- Vista de especialistas con buscador y filtros por especialidad.
- Flujo de reserva y cancelación local con **Angular Signals**. La operación **no envía solicitudes HTTP**.
- Panel clínico, notas, prescripciones, consultorios y estadísticas **ilustrativos**.
- Interfaz completamente en español; etiquetas visibles que distinguen la demostración de datos reales.

## Requisitos

- Node.js 24 + npm 11, Docker Desktop recomendado en Windows si la política de seguridad bloquea módulos nativos de Rollup.

## Ejecutar en Windows con Docker

En PowerShell, desde la carpeta `mediconnect-pro-frontend`:

```powershell
docker run --rm -it -p 4200:4200 `
  --mount "type=bind,source=$((Get-Location).Path),target=/app" `
  --mount "type=volume,source=mediconnect-pro-node-modules,target=/app/node_modules" `
  -w /app node:24-bookworm `
  sh -lc "npm ci && npm start -- --host 0.0.0.0"
```

Abre http://localhost:4200 dentro o fuera de VS Code. El servidor está destinado **solo al desarrollo local**.

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
```

La interfaz de demostración concentra varios flujos en el componente raíz para validarlos visualmente. **Antes de integrar la API**, se extraerán componentes por dominio, servicios tipados, guards e interceptor JWT.

### Fases pendientes

- **6:** conectar formularios y datos reales con Spring Boot, JWT y validación por rol.
- **7:** SSE/WebSockets y actualizaciones en tiempo real.
- **8:** imágenes optimizadas, almacenamiento privado y sincronización offline.
- **9:** Vitest y Cypress, 80% de cobertura y pirámide de pruebas.
- **10:** Docker multi-stage, SonarCloud, CI/CD y URL pública.

### Gobernanza de IA

Consulta [.cursorrules](.cursorrules) y [bitácora de IA](docs/ai-log.md). Ninguna pantalla o resultado de demostración debe presentarse como una funcionalidad integrada y operativa en producción.
