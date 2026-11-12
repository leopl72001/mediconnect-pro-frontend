# MediConnect Pro — prueba integral de la fase 6

Esta guía valida desde **Angular en el navegador** el circuito real Spring Boot 4 / PostgreSQL / MongoDB / OpenFDA. Usar **solo cuentas y datos ficticios**.

## Preparación única
- Docker Desktop: `mediconnect-pro-backend` con app, MongoDB, Redis y PostgreSQL levantados.
- Backend `http://127.0.0.1:8082/actuator/health`: estado **UP**.
- Frontend `http://127.0.0.1:4200`: iniciado en la red Docker `mediconnect-pro_default`.
- Existe al menos una **médica de prueba** (Laura Prueba) y un consultorio activo. Se han creado antes en esta instalación.
- Conocer las credenciales ficticias de las tres cuentas: paciente, médico, administrador. **No enviar contraseñas, JWT ni el archivo `.env` a terceros.**
- **Importante:** el token JWT está solo en memoria. Recargar el navegador exige volver a iniciar sesión.

## Recorrido en el navegador (una sola sesión de prueba, cambiando de rol)

1. **Paciente:** inicia sesión con una cuenta de prueba. Debe aparecer `Sesión JWT activa` y rol **Paciente**. Ve a `Mi perfil`, guarda teléfono y dirección ficticios. Mensaje esperado: `Perfil actualizado y guardado en PostgreSQL`.
2. **Paciente:** en `Especialistas` comprueba **Laura Prueba** y la especialidad real. En `Reservar cita real` elige un consultorio activo y un día futuro a más de siete días. Confirma. En `Mis citas` debe figurar **Programada**. **No canceles todavía.**
3. **Administrador (prueba de panel):** cierra sesión e inicia con la cuenta ADMIN configurada en el backend. En `Profesionales` confirma listado real y formulario para crear médico. En `Consultorios` confirma los registros y formulario para crear consultorio. En `Reportes` comprueba recuentos de catálogos reales. No hace falta crear registros duplicados.
4. **Médico:** cierra sesión e inicia con la cuenta de Laura Prueba, la misma asignada a la cita del paso 2. En `Mi agenda` comprueba la cita real. En `Notas clínicas` selecciona esa cita, redacta `Nota clínica ficticia para demostrar MongoDB.` y guarda. Se debe mostrar confirmación.
5. **Médico:** en `Prescripciones`, selecciona **la misma cita vigente**, usa como ejemplo `Tylenol`, dosificación `SOLO DEMOSTRACIÓN`, frecuencia `NO ADMINISTRAR`, y guarda. La app debe mostrar una confirmación y el estado de validación OpenFDA. **No es una receta ni una indicación médica válida.**
6. **Paciente:** cierra sesión, vuelve a entrar como el mismo paciente del paso 1. En `Historia clínica` aparece la nota ficticia. En `Mis recetas` aparece la prescripción de prueba con estado de OpenFDA. En `Mis citas` aparece la reserva, y puedes pulsar `Cancelar cita`: debe pasar a **Cancelada** siempre que falten más de 24 horas para el inicio.

### Evidencia final
Captura 1: registro/login JWT y especialistas reales.
Captura 2: cita real **Programada**.
Captura 3: médico y confirmación de nota / receta.
Captura 4: paciente viendo nota y receta, y luego cita **Cancelada**.
Captura 5: `GitHub Actions` — build Angular y Vitest en verde.

## Diagnóstico rápido
- **No hay médicos:** crearlos con ADMIN (o comprobar GET `/api/v1/doctors`).
- **No hay consultorios:** crearlos con ADMIN (o comprobar GET `/api/v1/offices`).
- **No aparece una cita al médico:** la reserva debe ser con el **mismo médico** cuya cuenta abrió sesión. Pulsa `Actualizar citas`.
- **HTTP 409:** cita solapada; cambia fecha u hora.
- **Error de notas/recetas:** solo el médico asignado y en una cita no cancelada puede crear registros. No canceles antes del paso 5.
- **HTTP 401 tras recargar:** inicia sesión de nuevo.
- **Error de OpenFDA:** depende del servicio externo; la app informa el estado devuelto y no garantiza el nombre del medicamento.

## Qué no prueba este circuito
No sustituye la meta de **80 % de cobertura**, Testcontainers ni **Cypress con tres flujos E2E**. Tampoco acredita tiempo real, modo offline, carga de imágenes ni despliegue público. Eso corresponde a las fases posteriores.
