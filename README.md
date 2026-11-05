# PetCare · Prototipo funcional

Aplicación web para que los dueños de mascotas en Bogotá busquen, comparen y reserven servicios (veterinaria,
peluquería, paseo y guardería), y para que las clínicas gestionen su agenda, sus pacientes y sus reportes.

Todo corre en **Docker**: no hay que instalar Node.js ni PostgreSQL. La base de datos se llena sola con
**datos de prueba**.

| Capa | Tecnología | Carpeta |
|---|---|---|
| Interfaz web | React 19 + TypeScript + Vite | `petcare-frontend/` |
| API REST | Node.js 24 + Express 5 | `petcare-backend/` |
| Base de datos | PostgreSQL 17 + pgweb | `petcare-backend/` |

## Contenido

1. [Inicio rápido](#1-inicio-rápido)
2. [Cuentas de prueba](#2-cuentas-de-prueba)
3. [Funcionalidades](#3-funcionalidades)
4. [Recorrido sugerido](#4-recorrido-sugerido)
5. [Configuración y clave secreta](#5-configuración-y-clave-secreta)
6. [Pruebas](#6-pruebas)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Comandos útiles](#8-comandos-útiles)
9. [Problemas comunes](#9-problemas-comunes)
10. [Documentación adicional](#10-documentación-adicional)

---

## 1. Inicio rápido

**Requisito:** tener **Docker Desktop** instalado y abierto. Para comprobarlo, `docker compose version` debe
responder con una versión.

Abra una terminal en la carpeta `PetCare/` y ejecute **en este orden**:

```bash
# 1. Backend: base de datos + pgweb + API
cd petcare-backend
docker compose build
docker compose up -d
cd ..

# 2. Frontend
cd petcare-frontend
docker compose build
docker compose up -d
cd ..
```

> El backend va primero porque crea la red `petcare_net` que usa el frontend. La primera vez, la API tarda unos
> segundos en crear las tablas y cargar los datos de prueba.

Abra en el navegador:

| Qué | Dirección |
|---|---|
| **Aplicación PetCare** | <http://localhost:5173> |
| Base de datos (pgweb) | <http://localhost:8081> |
| Estado de la API | <http://localhost:3000/api/health>, que debe responder `"status":"ok"` |

No hace falta crear archivos `.env`: todo tiene valores por defecto. Para un entorno real, configure su propia
clave secreta (ver [sección 5](#52-generar-la-clave-secreta-jwt_secret-paso-a-paso)).

## 2. Cuentas de prueba

En la pantalla de inicio de sesión, el recuadro **Cuentas de prueba** tiene botones que llenan el correo y la
contraseña; luego solo se pulsa **Iniciar sesión**. Todas las cuentas usan la contraseña **`PetCare123`**.

| Rol | Correo | Quién es |
|---|---|---|
| Proveedor | `proveedor@petcare.co` | Laura Méndez · **Clínica Huellitas** (la cuenta principal para la clínica) |
| Dueño | `dueno@petcare.co` | Ana Gómez · Luna (gata) y Lola (perra) |
| Dueño | `dueno2@petcare.co` | Carlos Ruiz · Max (perro) |
| Dueño | `dueno3@petcare.co` | Valentina Díaz · Mía (gata) |
| Proveedor | `peluqueria@petcare.co` | Spa Canino Patitas Felices |
| Proveedor | `paseos@petcare.co` | Paseos Don Camilo |
| Proveedor | `guarderia@petcare.co` | Guardería Casa Peluda |
| Proveedor | `gatos@petcare.co` | Clínica Felina Michis |
| Proveedor | `peluqueria2@petcare.co` | Peluquería Guau & Miau |

La Clínica Huellitas trae:
- su equipo (Dr. Andrés Peña, Dra. Sofía Ríos, Dr. Camilo Vargas y el Equipo de estética), 7 servicios y la agenda
  de hoy;
- próximas vacunas, solicitudes por confirmar e historial de citas desde enero del año anterior, para los reportes.

También se pueden crear cuentas nuevas desde **Crear cuenta**.

## 3. Funcionalidades

### Clínica o proveedor

| Pantalla | Qué permite |
|---|---|
| **Panel principal** | <ul><li>Resumen del día, agenda (Mañana o Tarde), calendario y próximas vacunas.</li><li>Al abrir una cita: confirmar, rechazar, cancelar, marcar como atendida y asignar profesional.</li></ul> |
| **Nueva cita / Cita urgente** | <ul><li>Nueva cita: queda confirmada y no se puede cruzar con otra.</li><li>Cita urgente: registra la mascota y toma el primer espacio libre.</li></ul> |
| **Citas** | Pestañas Por confirmar, Próximas e Historial, con búsqueda |
| **Gestión de información** | Pacientes con filtros, ficha clínica editable, propietarios, registrar mascota y exportar a CSV |
| **Veterinarios** | Agregar, editar, marcar como no disponible o retirar profesionales |
| **Reportes** | <ul><li>Periodos Mes, Año o Personalizado, comparados con el periodo anterior.</li><li>Gráficas y desempeño por profesional.</li><li>Exportar Excel (CSV) y Descargar PDF.</li></ul> |
| **Configuración** | Datos del negocio, horario por día y servicios (precio, duración, especies, pausar) |
| **Notificaciones** | Solicitudes nuevas y citas próximas (campana) |

### Dueño de mascota

| Pantalla | Qué permite |
|---|---|
| **Buscar servicios** | Filtros por categoría, especie, localidad, día y precio, y búsqueda por texto |
| **Perfil del proveedor** | Reserva en 3 pasos (servicio y hora, mascota, confirmación). Solo muestra horas libres |
| **Mis citas** | Ver el estado y cancelar las reservas que aún no han pasado |
| **Mis mascotas** | Agregar, editar y eliminar (no si tiene historial o citas activas) |

### Estados de una cita

```text
Pendiente ──► Confirmada ──► Atendida
   │              │
   └► Rechazada   └► Cancelada        (el dueño también puede cancelar mientras esté Pendiente o Confirmada)
```

- **Pendiente:** el dueño pidió la cita y espera respuesta. Las citas que agenda la clínica nacen confirmadas.
- **Atendida:** solo se puede marcar el día de la cita o después.
- **Rechazada** y **Cancelada:** liberan el horario de inmediato.

## 4. Recorrido sugerido

1. **Clínica:** entre con el botón **Clínica (proveedor)**.
   - Abra una cita de la agenda y márquela como atendida.
   - Pruebe **Nueva cita** y **Cita urgente**.
2. **Gestión y reportes:**
   - En **Gestión de información**, abra la ficha de un paciente y registre una mascota.
   - En **Reportes**, cambie el periodo y exporte.
3. **Dueño:** cierre sesión y entre con **Dueño de mascota**.
   - Busque «Clínica Huellitas» y reserve: servicio, día, hora y mascota.
   - La reserva queda **Pendiente**.
4. **Confirmación:** vuelva como clínica.
   - La solicitud aparece en la campana y en **Citas › Por confirmar**.
   - Confírmela asignando un veterinario.
5. **Resultado:** como dueño, en **Mis citas**, la reserva aparece **Confirmada**.

Hay pantallazos de cada pantalla en [docs/capturas/](docs/capturas/).

## 5. Configuración y clave secreta

### 5.1 Variables de entorno

Los dos `docker-compose.yml` ya traen valores por defecto, así que el proyecto funciona sin `.env`. Para cambiar
un valor:

1. Copie `.env.example` como `.env` en la carpeta correspondiente.
2. Edite el valor.
3. Ejecute `docker compose up -d` en esa carpeta.

| Carpeta | Variable | Por defecto | Para qué sirve |
|---|---|---|---|
| backend | `JWT_SECRET` | clave de desarrollo | Clave con la que se firman las sesiones (ver 5.2) |
| backend | `JWT_EXPIRES_IN` | `8h` | Duración de la sesión |
| backend | `API_PORT` | `3000` | Puerto de la API |
| backend | `PGWEB_PORT` | `8081` | Puerto de pgweb |
| backend | `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `petcare` / `petcare123` / `petcare` | Credenciales de la base de datos |
| backend | `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para llamar la API directamente |
| frontend | `FRONTEND_PORT` | `5173` | Puerto de la aplicación |
| frontend | `API_PROXY_TARGET` | `http://petcare_backend:3000` | A dónde reenvía el frontend las llamadas `/api` (no cambiar) |

> Los archivos `.env` no se suben al repositorio (están en `.gitignore`).

### 5.2 Generar la clave secreta (`JWT_SECRET`) paso a paso

`JWT_SECRET` es la clave con la que la API firma las sesiones. Quien la conozca puede crear sesiones falsas, así que
fuera de la entrega académica cada instalación debe tener una propia: larga, aleatoria y privada.

**Paso 1. Generar la clave.** Use cualquiera de estas opciones; todas producen 96 caracteres aleatorios.

| Dónde | Comando |
|---|---|
| Cualquier sistema, solo con Docker (recomendado) | `docker run --rm node:24-alpine node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| Git Bash, macOS o Linux | `openssl rand -hex 48` |
| Windows PowerShell | `$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b \| % { $_.ToString('x2') })` |

Ejemplo de resultado (no use este, genere el suyo):

```text
e4f348a985b48a1a44d04d89e3883ebff8b21dd160a84a90256802a81bd98270aa678f57b07d0db5a5227a18bf54e1a8
```

**Paso 2. Crear el archivo `.env` del backend** (si no existe):

```bash
cd petcare-backend
cp .env.example .env          # en PowerShell: Copy-Item .env.example .env
```

**Paso 3. Pegar la clave.** Abra `petcare-backend/.env` y reemplace el valor de `JWT_SECRET`:

```dotenv
JWT_SECRET=e4f348a985b48a1a44d04d89e3883ebff8b21dd160a84a90256802a81bd98270aa678f57b07d0db5a5227a18bf54e1a8
```

**Paso 4. Aplicar el cambio.** Dentro de `petcare-backend/`:

```bash
docker compose up -d
```

Docker detecta el cambio y vuelve a crear solo el contenedor de la API. No hace falta `build`.

**Paso 5. Verificar.**

```bash
docker compose exec backend printenv JWT_SECRET
```

Debe mostrar su clave. <http://localhost:3000/api/health> debe seguir respondiendo `"status":"ok"`.

Tenga en cuenta:
- Al cambiar la clave, **todas las sesiones abiertas se cierran** y hay que volver a iniciar sesión. Los datos no
  se pierden.
- Si la clave tiene menos de 32 caracteres, la API lo advierte en sus logs (`docker compose logs backend`).
- No comparta la clave ni la suba al repositorio. Use una distinta en cada entorno (desarrollo, pruebas,
  producción).

## 6. Pruebas

| Conjunto | Qué cubre | Cómo correrlo | Resultado |
|---|---|---|---|
| Backend · unitarias | Validaciones, fechas y cálculo de horas libres | `docker compose exec backend npm run test:unit` | 18 de 18 |
| Backend · API | Autenticación, permisos, búsqueda, mascotas, reservas, estados, clínica y configuración | `docker compose exec backend npm run test:api` | 63 de 63 |
| Frontend | Formatos, cliente de la API, sesión e inicio de sesión | `docker compose exec frontend npm test` | 25 de 25 |
| Interfaz en navegador | 41 flujos completos de clínica y dueño, automatizados con Playwright | ver [docs/pruebas.md](docs/pruebas.md) | 41 de 41 |

- Ejecute los comandos dentro de `petcare-backend/` o `petcare-frontend/`, según corresponda, con los contenedores
  levantados.
- `npm test` en el backend corre las unitarias y las de la API juntas.
- Las pruebas de la API crean datos (cuentas `…@test.co`, mascotas y citas). Para volver a los datos originales,
  [reinicie la base de datos](#8-comandos-útiles).

## 7. Estructura del proyecto

```text
PetCare/
├── README.md
├── docs/                    arquitectura, API, pruebas y capturas
├── petcare-backend/
│   ├── docker-compose.yml   postgres + pgweb + API
│   ├── src/
│   │   ├── index.js         arranque del servidor
│   │   ├── app.js           Express y registro de rutas
│   │   ├── config.js        variables de entorno
│   │   ├── db.js · schema.sql · seed.js
│   │   ├── middleware.js · slots.js · utils.js
│   │   └── routes/          auth, providers, pets, bookings, clinic, my
│   └── tests/               unit/ y api/
└── petcare-frontend/
    ├── docker-compose.yml
    ├── src/
    │   ├── api.ts · auth.tsx · format.ts · hooks.ts · types.ts
    │   ├── components/      Shell, modales y piezas de interfaz
    │   └── pages/           Login, Register, clinica/ y dueno/
    └── tests/
```

Para agregar un módulo nuevo a la API:
1. Cree el archivo en `src/routes/`.
2. Regístrelo en el objeto `routes` de `src/app.js`.
3. Agregue sus pruebas en `tests/api/`.

## 8. Comandos útiles

Ejecútelos dentro de `petcare-backend/` o `petcare-frontend/`.

| Acción | Comando |
|---|---|
| Ver el estado de los contenedores | `docker compose ps` |
| Ver los logs | `docker compose logs -f` |
| Aplicar cambios en el código | `docker compose build` y `docker compose up -d` |
| Detener | `docker compose down` (primero el frontend, luego el backend) |
| Consola SQL | `docker compose exec postgres psql -U petcare petcare` (backend) |
| **Reiniciar la base de datos** con los datos de prueba | `docker compose down -v` y `docker compose up -d` (backend) |

## 9. Problemas comunes

| Mensaje o síntoma | Solución |
|---|---|
| `network petcare_net declared as external, but could not be found` | Levante primero el backend |
| `port is already allocated` | Otro programa usa ese puerto: cámbielo con un `.env` ([sección 5.1](#51-variables-de-entorno)) |
| «No hay conexión con el servidor» en la aplicación | El backend está apagado: `docker compose up -d` en `petcare-backend/` |
| La API falla justo después de `up -d` | Espere unos segundos a la base de datos; revise `docker compose logs -f backend` |
| Todos tuvieron que volver a iniciar sesión | Cambió `JWT_SECRET`; es lo esperado |
| Los datos de prueba no aparecen | Reinicie la base de datos ([sección 8](#8-comandos-útiles)) |
| `Cannot connect to the Docker daemon` | Abra Docker Desktop y espere a que inicie |

## 10. Documentación adicional

| Documento | Contenido |
|---|---|
| [docs/arquitectura.md](docs/arquitectura.md) | Componentes, modelo de datos, reglas de negocio y seguridad |
| [docs/api.md](docs/api.md) | Referencia de los endpoints |
| [docs/pruebas.md](docs/pruebas.md) | Casos probados y resultados |
| [petcare-backend/README.md](petcare-backend/README.md) | Detalle del backend |
| [petcare-frontend/README.md](petcare-frontend/README.md) | Detalle del frontend |
