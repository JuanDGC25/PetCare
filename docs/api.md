# Referencia de la API

[← Volver al README](../README.md)

- **URL base:** `http://localhost:3000/api`. Desde la aplicación web se llama como `/api`, a través del proxy de Vite.
- **Formato:** JSON en las peticiones y en las respuestas.
- **Autenticación:** encabezado `Authorization: Bearer <token>`. El token se obtiene en `/auth/login` o
  `/auth/register`.

## Errores

Todas las respuestas de error tienen la misma forma:

```json
{ "error": "Revise los datos del formulario", "details": { "email": "Correo electrónico no válido" } }
```

| Código | Cuándo |
|---|---|
| `400` | Datos no válidos (`details` indica el campo) o cambio de estado no permitido |
| `401` | Sin sesión, token vencido o credenciales incorrectas |
| `403` | El rol no tiene acceso a la ruta, o el recurso es de otro usuario |
| `404` | El recurso no existe o no pertenece al usuario |
| `409` | Conflicto: correo ya registrado, hora ya tomada o mascota con historial |

## Endpoints

Columna **Acceso**: *Pública* = sin sesión; *Sesión* = cualquier usuario autenticado; *Dueño* / *Proveedor* = solo ese rol.

### General

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Pública | Estado de la API y de la base de datos |

### Autenticación · `/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Pública | Crea una cuenta. Ver el cuerpo abajo |
| POST | `/auth/login` | Pública | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | Sesión | Datos del usuario de la sesión (incluye `provider_id`, `business_name` y `category` si es proveedor) |

Cuerpo de `/auth/register`:

```json
{
  "name": "Ana Gómez", "email": "ana@correo.com", "password": "Clave1234",
  "document": "1012345678", "phone": "3001234567", "role": "dueno", "consent": true
}
```

Si `role` es `"proveedor"`, también exige `businessName`, `category` (`veterinaria`, `peluqueria`, `paseo`,
`guarderia`), `locality` (una localidad de Bogotá) y `neighborhood`; `address` es opcional. El proveedor queda
registrado como primer profesional de su negocio.

### Búsqueda de proveedores · `/providers` (pública)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/providers/meta` | Listas para los filtros: categorías, especies y localidades |
| GET | `/providers?category=&species=&maxPrice=&weekday=&locality=&q=` | Proveedores con al menos un servicio activo, ordenados por precio mínimo. `weekday`: 0 = domingo … 6 = sábado; `q` busca en el nombre, el barrio y los servicios |
| GET | `/providers/:id` | Detalle con `services` activos y `availability` |
| GET | `/providers/:id/slots?serviceId=&date=YYYY-MM-DD` | Horas libres `{ date, slots: ["08:00", …] }` para ese servicio y día |

### Mascotas del dueño · `/pets` (Dueño)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/pets` | Mascotas del dueño |
| POST | `/pets` | Crea una mascota: `{ name, species, breed?, ageYears?, weightKg?, size?, notes? }` |
| PUT | `/pets/:id` | Edita (mismo cuerpo) |
| DELETE | `/pets/:id` | Elimina. `409` si tiene citas activas o historial de atenciones |

`species`: `perro`, `gato`, `conejo` u `otro`. `size`: `pequeno`, `mediano` o `grande`.

### Citas · `/bookings` (Sesión)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/bookings?status=&date=&from=&to=` | Sesión | El dueño ve sus citas; el proveedor, las de su negocio. Orden: fecha y hora |
| POST | `/bookings` | Dueño | Solicita una reserva: `{ serviceId, petId, date, startTime, notes? }`. Queda `pendiente`. `409` si la hora ya no está libre |
| PATCH | `/bookings/:id/status` | Sesión | Cambia el estado: `{ status, notes?, staffId? }`. Ver las transiciones abajo |

Transiciones permitidas:

| Quién | Desde | Hacia |
|---|---|---|
| Proveedor | `pendiente` | `aceptada`, `rechazada` |
| Proveedor | `aceptada` | `atendida` (solo el día de la cita o después), `cancelada` |
| Dueño | `pendiente`, `aceptada` | `cancelada` (solo si la cita no ha pasado) |

`notes` y `staffId` solo los usa el proveedor (mensaje para el dueño y profesional asignado).

### Clínica · `/clinic` (Proveedor)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/clinic/pets` | Pacientes: los registrados por la clínica y los que han tenido citas con ella. Incluye `ownerName`, `lastVisit`, `nextVisit`, `history` y `editable` |
| POST | `/clinic/pets` | Registra un paciente en el mostrador: datos de la mascota + `{ ownerName, ownerPhone }` |
| PUT | `/clinic/pets/:id` | Edita la ficha (solo pacientes registrados por la clínica) |
| GET | `/clinic/staff` | Profesionales con estadísticas: `total`, `attended`, `cancelled`, `upcoming`, `income` |
| POST | `/clinic/staff` | `{ name, specialty, active? }` |
| PUT | `/clinic/staff/:id` | Edita o activa/desactiva |
| DELETE | `/clinic/staff/:id` | Retira al profesional. Sus citas quedan sin profesional asignado |
| POST | `/clinic/bookings` | Nueva cita confirmada: `{ petId, serviceId, staffId?, date, startTime, notes? }` |
| POST | `/clinic/urgent` | Cita urgente: `{ petName, species, ownerContact, symptoms }`. `ownerContact` lleva nombre y teléfono, por ejemplo `"Jorge Díaz · 300 123 4567"` |

### Configuración del negocio · `/my` (Proveedor)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/my/provider` | Datos del negocio |
| PUT | `/my/provider` | `{ businessName, category, locality, neighborhood, address?, description? }` |
| GET | `/my/services` | Servicios, activos e inactivos |
| POST | `/my/services` | `{ name, price, durationMin, species: [...], description?, active? }` |
| PUT | `/my/services/:id` | Edita, o pausa con `active: false` |
| DELETE | `/my/services/:id` | Borra el servicio; si ya tiene reservas, lo desactiva |
| GET | `/my/availability` | Horario semanal |
| PUT | `/my/availability` | Reemplaza todo el horario: `[{ weekday, startTime, endTime }, …]`. No admite franjas cruzadas |

## Ejemplo rápido con curl

```bash
# Iniciar sesión como dueño
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dueno@petcare.co","password":"PetCare123"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

# Ver sus citas
curl -s http://localhost:3000/api/bookings -H "Authorization: Bearer $TOKEN"
```
