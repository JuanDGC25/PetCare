# PetCare · Backend

API REST de PetCare (Node.js 24 + Express 5) con PostgreSQL 17 y pgweb. Al iniciar crea las tablas y, si la base
está vacía, carga los datos de prueba.

```bash
docker compose build
docker compose up -d
```

- API: <http://localhost:3000/api/health>
- pgweb: <http://localhost:8081>

Las cuentas de prueba, las variables de entorno y el paso a paso de la clave secreta están en el
[README principal](../README.md).

## Estructura

```text
src/
├── index.js        arranque: valida la configuración, prepara la base y escucha
├── app.js          Express, CORS, /api/health y registro de rutas
├── config.js       única lectura de variables de entorno
├── db.js           pool de PostgreSQL, transacciones y espera a la base
├── schema.sql      tablas e índices (idempotente)
├── seed.js         datos de prueba
├── middleware.js   autenticación JWT, control de rol y manejo de errores
├── slots.js        horas libres y validación de cruces
├── utils.js        validaciones, errores HTTP y fechas de Bogotá
└── routes/
    ├── auth.js        registro, inicio de sesión y perfil
    ├── providers.js   búsqueda pública, detalle y horas libres
    ├── pets.js        mascotas del dueño
    ├── bookings.js    reservas y cambios de estado
    ├── clinic.js      pacientes, profesionales, nueva cita y urgencias
    └── my.js          negocio, servicios y horario del proveedor
tests/
├── helpers.js      cliente HTTP y utilidades de prueba
├── unit/           utils y slots (sin base de datos)
└── api/            auth, search, pets, bookings, clinic y config (contra la API en marcha)
```

**Agregar un módulo:**
1. Cree `src/routes/<modulo>.js` con un `Router`.
2. Agréguelo al objeto `routes` de `src/app.js`; queda publicado en `/api/<modulo>`.
3. Escriba sus pruebas en `tests/api/<modulo>.test.js`.

## Pruebas

Usan el *test runner* nativo de Node (`node:test`), sin dependencias extra.

| Comando | Qué corre |
|---|---|
| `docker compose exec backend npm test` | Todo (81 pruebas) |
| `docker compose exec backend npm run test:unit` | Unitarias (18) |
| `docker compose exec backend npm run test:api` | API (63), una suite a la vez |

Las pruebas de la API crean datos. Para volver a los datos de prueba originales:
`docker compose down -v` y `docker compose up -d`.

## Comandos

| Acción | Comando |
|---|---|
| Logs de la API | `docker compose logs -f backend` |
| Consola SQL | `docker compose exec postgres psql -U petcare petcare` |
| Reiniciar la base | `docker compose down -v` y `docker compose up -d` |

Más información: [arquitectura](../docs/arquitectura.md), [referencia de la API](../docs/api.md) y
[pruebas](../docs/pruebas.md).
