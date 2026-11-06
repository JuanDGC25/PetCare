# Pruebas y validación

[← Volver al README](../README.md)

Validación del prototipo funcional, hecha el **5 de noviembre de 2026** sobre los contenedores de Docker con los
datos de prueba recién cargados.

| Tipo | Herramienta | Resultado |
|---|---|---|
| Instalación limpia (sin imágenes, volúmenes ni red previos) | `docker compose build` + `up -d` | Correcta |
| Backend · pruebas unitarias | `node:test` · [tests/unit/](../petcare-backend/tests/unit/) | **18 de 18** |
| Backend · pruebas de la API | `node:test` · [tests/api/](../petcare-backend/tests/api/) | **63 de 63** (se pueden repetir) |
| Frontend · pruebas unitarias y de componentes | Vitest + Testing Library · [tests/](../petcare-frontend/tests/) | **25 de 25** |
| Flujos de la interfaz en el navegador | Playwright con Microsoft Edge, 1440 × 900 y móvil 390 × 844 | **41 de 41** |
| Errores de la API (5xx) durante todas las pruebas | — | Ninguno |
| Errores de JavaScript en el navegador | — | Ninguno |
| Verificación de tipos y compilación de producción del frontend | `tsc` + `vite build` | Sin errores |

## Cómo repetir las pruebas

Con los contenedores levantados:

| Dónde | Comando | Qué corre |
|---|---|---|
| `petcare-backend/` | `docker compose exec backend npm test` | Unitarias + API (81) |
| `petcare-backend/` | `docker compose exec backend npm run test:unit` | Solo unitarias (no tocan la base de datos) |
| `petcare-backend/` | `docker compose exec backend npm run test:api` | Solo API |
| `petcare-frontend/` | `docker compose exec frontend npm test` | Frontend (25) |

Cada prueba aparece con ✔ o ✖ y al final el total; si alguna falla, el comando termina con código 1.

Las pruebas de la API crean sus propios datos (cuentas `…@test.co`, mascotas y citas en días libres), por lo que
se pueden correr varias veces seguidas. Para volver a los datos originales, dentro de `petcare-backend/`:

```bash
docker compose down -v
docker compose up -d
```

### Qué cubren las pruebas unitarias

| Archivo | Casos |
|---|---|
| `petcare-backend/tests/unit/utils.test.js` | <ul><li>Conversión de horas.</li><li>Formatos de hora, fecha y correo.</li><li>Suma de días cruzando mes y año.</li><li>Día de la semana y hora de Bogotá.</li><li>Limpieza de datos.</li><li>Errores por campo.</li></ul> |
| `petcare-backend/tests/unit/slots.test.js` | <ul><li>Horas libres cada 30 minutos.</li><li>Exclusión de horas cruzadas con otra cita.</li><li>Varias franjas en un día.</li><li>Fechas pasadas y servicios más largos que la franja.</li><li>Validación de hora libre para la clínica.</li></ul> |
| `petcare-frontend/tests/format.test.ts` | <ul><li>Pesos colombianos.</li><li>Fechas en español y horas de 12 horas.</li><li>Duraciones, edad y peso.</li><li>Códigos de historia clínica e iniciales.</li><li>Etiquetas de estado.</li></ul> |
| `petcare-frontend/tests/api.test.ts` | <ul><li>Token con o sin «Recordarme».</li><li>Encabezados y cuerpo JSON.</li><li>Respuestas 204.</li><li>Errores con detalles por campo.</li><li>Sin conexión.</li><li>Cierre de sesión ante un 401.</li></ul> |
| `petcare-frontend/tests/Login.test.tsx` | <ul><li>Validaciones del formulario.</li><li>Botones de cuentas de prueba.</li><li>Inicio de sesión que lleva al panel.</li><li>Error de credenciales.</li><li>Pantalla de inicio por rol.</li></ul> |

## Casos de la API

| Grupo | Qué se comprueba |
|---|---|
| Salud y rutas | `/health` responde; una ruta inexistente responde `404` en JSON; un JSON mal formado responde `400` |
| Autenticación | <ul><li>Las 9 cuentas de prueba inician sesión.</li><li>Contraseña incorrecta → `401`; campos vacíos → `400`.</li><li>Sin token o con un token inválido → `401`.</li></ul> |
| Registro | <ul><li>Validaciones por campo.</li><li>Registro de dueño y de proveedor.</li><li>Correo repetido → `409`.</li><li>Un proveedor sin datos del negocio → `400`.</li></ul> |
| Permisos por rol | <ul><li>Un dueño no entra a `/clinic` ni a `/my`; un proveedor no entra a `/pets`.</li><li>Un proveedor no ve, cambia, edita ni borra datos de otro proveedor.</li></ul> |
| Búsqueda | <ul><li>Filtros por categoría, especie, precio y texto.</li><li>Detalle de proveedor; proveedor inexistente → `404`.</li><li>Un proveedor nuevo solo aparece cuando tiene servicios.</li></ul> |
| Horas libres | <ul><li>Fecha no válida → `400`.</li><li>Días pasados sin horas.</li><li>Una hora reservada desaparece y vuelve a aparecer al cancelar o rechazar la cita.</li></ul> |
| Mascotas del dueño | <ul><li>Crear, editar y eliminar.</li><li>Especie no válida → `400`.</li><li>No se editan ni borran mascotas de otro dueño.</li><li>No se elimina una mascota con historial o con citas activas → `409`.</li></ul> |
| Reservas | <ul><li>La reserva queda pendiente.</li><li>Rechazos: datos vacíos, mascota ajena, hora fuera del horario y doble reserva de la misma hora → `409`.</li><li>**Concurrencia:** dos dueños piden la misma hora al mismo tiempo y solo uno la obtiene.</li></ul> |
| Estados de la cita | <ul><li>Confirmar con un profesional asignado.</li><li>Pendiente → Atendida no se permite.</li><li>Una cita futura no se marca como atendida.</li><li>El dueño cancela y no puede confirmar.</li><li>Los estados finales no cambian; el proveedor rechaza.</li><li>Una cita de hoy pasa a atendida.</li><li>El dueño no cancela una cita pasada.</li><li>Un profesional de otra clínica → `400`.</li></ul> |
| Pacientes de la clínica | <ul><li>Listado y registro en mostrador; validaciones de propietario y teléfono.</li><li>Edición de la ficha.</li><li>No se edita la mascota de un dueño con cuenta.</li><li>Otra clínica no ve el paciente.</li></ul> |
| Nueva cita de la clínica | <ul><li>Queda confirmada.</li><li>Rechazos: hora cruzada, fuera del horario, fecha pasada, especie no atendida y mascota que no es de la clínica.</li><li>La ficha muestra la próxima visita.</li></ul> |
| Urgencia | <ul><li>Validación de los 4 campos.</li><li>Crea la mascota y la cita confirmada y urgente, con el nombre y el teléfono del propietario separados.</li></ul> |
| Profesionales | Crear, desactivar, validar, retirar; no se retira el de otra clínica |
| Configuración | <ul><li>Datos del negocio con validación.</li><li>Servicios: crear, validar, pausar y borrar.</li><li>Horario: rechaza franjas cruzadas o invertidas y guarda el horario.</li></ul> |

## Flujos de la interfaz

Se recorrieron en el navegador como lo haría una persona: clics, formularios y navegación.

| Área | Flujos verificados |
|---|---|
| Acceso | <ul><li>Validación de campos vacíos.</li><li>Alerta de contraseña incorrecta.</li><li>«¿Olvidaste tu contraseña?».</li><li>Los botones de **Cuentas de prueba** llenan el formulario e ingresan.</li><li>Sin sesión, las rutas protegidas llevan a `/login`.</li></ul> |
| Registro | <ul><li>«Crear cuenta» se activa solo cuando el formulario está completo y los términos aceptados.</li><li>Errores al salir de cada campo.</li><li>Registro de dueño: entra a Buscar.</li><li>Registro de proveedor: entra al panel vacío, y todas sus secciones cargan sin datos.</li></ul> |
| Dueño nuevo | <ul><li>Agregar, editar y eliminar una mascota.</li><li>Un proveedor nuevo crea un servicio y guarda el horario, y aparece en la búsqueda.</li></ul> |
| Dueño | <ul><li>Filtros de búsqueda.</li><li>Reserva en 3 pasos.</li><li>La reserva aparece como Pendiente en Mis citas.</li><li>Cancelar una reserva.</li><li>Aviso al intentar eliminar una mascota con historial.</li><li>No puede abrir pantallas de la clínica.</li></ul> |
| Clínica · panel | <ul><li>Estadísticas y agenda.</li><li>Filtros Mañana y Tarde.</li><li>Navegación del calendario.</li><li>Notificaciones con la solicitud nueva.</li></ul> |
| Clínica · citas | <ul><li>Confirmar una solicitud asignando un veterinario.</li><li>Rechazar una solicitud.</li><li>Marcar como atendida una cita de hoy.</li><li>Una cita futura no ofrece «Marcar como atendida».</li></ul> |
| Clínica · nueva cita y urgencia | <ul><li>Validaciones del formulario.</li><li>Una hora ocupada se rechaza y se agenda en otra.</li><li>Registro de una urgencia.</li></ul> |
| Gestión de información | <ul><li>Búsqueda y ficha.</li><li>Registrar mascota, con validaciones.</li><li>Editar la ficha: los cambios persisten al recargar.</li><li>Exportar CSV.</li><li>Pestaña de propietarios.</li></ul> |
| Veterinarios | Agregar, editar y retirar un profesional |
| Reportes | <ul><li>Periodos Mes, Año y Personalizado.</li><li>«Exportar Excel» descarga el CSV del rango elegido.</li></ul> |
| Configuración | <ul><li>Guardar los datos del negocio.</li><li>Cambiar y guardar el horario.</li><li>Crear, pausar y reactivar un servicio.</li></ul> |
| Sesión | <ul><li>El proveedor no puede abrir pantallas del dueño.</li><li>Cerrar sesión.</li><li>El dueño ve su cita **Confirmada** después de que la clínica la confirma.</li></ul> |
| Móvil | El menú lateral se abre y navega en una pantalla de 390 px |

## Problemas encontrados y corregidos durante la validación

| Problema | Corrección |
|---|---|
| Se podía marcar como **atendida** una cita de una fecha futura | La API solo lo permite el día de la cita o después, y la interfaz oculta el botón en citas futuras |
| El dueño podía cancelar por la API una cita que ya había pasado | La API lo rechaza; la interfaz ya no mostraba el botón |
| Al eliminar una mascota con citas atendidas se borraba su historia clínica y se alteraban los reportes de la clínica | La API impide eliminar mascotas con historial de atenciones y lo explica en el mensaje |
| Al registrar un paciente en la clínica con varios errores, la API devolvía primero los de la mascota y después los del propietario | La API devuelve todos los errores del formulario a la vez |

## Inspección de usabilidad y accesibilidad

Revisión con axe-core (WCAG 2.1 A y AA) en 12 pantallas y desplazamiento horizontal a 360, 768, 1280 y 1920 px
(48 combinaciones). Resultado final: **48 de 48 sin desplazamiento y ninguna falla de accesibilidad**.

| N.º | Problema | Corrección |
|---|---|---|
| P1 | En «Citas», a 360 px, la página sobresalía 314 px. El texto oculto «Ver» del encabezado de la tabla se salía del contenedor con desplazamiento | El contenedor de la tabla es la referencia de posición, así que la tabla se desplaza sola; las pestañas pasan a otra línea en pantallas pequeñas |
| P2 | En «Buscar», las listas de precio máximo y localidad no tenían etiqueta para lectores de pantalla | Cada lista se asocia con su título (`aria-labelledby`) |
| P3 | En «Registro», el texto blanco de los beneficios tenía un contraste de 3,95:1 | Fondo verde oscuro de la guía de estilos (`--green-900`) |
| P4 | En «Configuración», las horas de los días cerrados tenían un contraste de 2,68:1 y se podían enfocar con el teclado | Los campos de un día cerrado quedan deshabilitados y se activan al abrir el día |

## Capturas

Los pantallazos de cada pantalla están en [docs/capturas/](capturas/):

| Archivo | Pantalla |
|---|---|
| `01-inicio-sesion.png`, `01b-inicio-sesion-validacion.png` | Inicio de sesión con cuentas de prueba y validaciones |
| `02-registro.png` | Registro |
| `03-panel-principal.png` | Panel principal de la clínica |
| `04-detalle-cita.png` | Detalle de una cita |
| `05-nueva-cita.png`, `06-cita-urgente.png` | Nueva cita y cita urgente |
| `07-notificaciones.png` | Notificaciones |
| `08-gestion-informacion.png`, `08b-propietarios.png` | Gestión de información y propietarios |
| `09-citas.png`, `10-veterinarios.png`, `11-reportes.png`, `12-configuracion.png` | Citas, veterinarios, reportes y configuración |
| `13-buscar.png` | Búsqueda del dueño |
| `14-proveedor-horario.png`, `15-reserva-confirmar.png`, `16-reserva-enviada.png` | Reserva en 3 pasos |
| `17-mis-citas.png`, `18-mis-mascotas.png` | Mis citas y Mis mascotas |
| `19-movil.png` | Vista móvil |
