# PetCare · Frontend

Aplicación web de PetCare en React 19 + TypeScript, servida con Vite. El backend debe estar corriendo primero
(ver `../petcare-backend`), porque crea la red `petcare_net`.

```bash
docker compose build
docker compose up -d
```

Abra <http://localhost:5173>.

Instrucciones completas, cuentas de prueba y variables de entorno en el [README principal](../README.md).

## Cómo se conecta con la API

El navegador solo habla con el frontend. Vite reenvía todo lo que empiece por `/api` al contenedor
`petcare_backend` (variable `API_PROXY_TARGET`), así que no hay que configurar direcciones ni CORS.

## Diseño

- `src/styles.css` es el **UI Kit de la maquetación** (mockups de Figma), sin cambios de estilo.
- `src/app.css` solo agrega piezas que la maquetación no tenía: botones del calendario, indicador de carga,
  botones de cuentas de prueba e impresión de reportes.
- Fuente Nunito local, en `public/fonts/`.

## Estructura

```text
petcare-frontend/
├── docker-compose.yml        contenedor del frontend (usa la red externa petcare_net)
├── Dockerfile                node:24-alpine, npm ci, npm run dev
├── vite.config.ts            servidor de desarrollo y proxy /api
├── vitest.config.ts          pruebas con Vitest + jsdom
├── public/                   favicon y fuentes
├── tests/                    pruebas: formatos, cliente de la API e inicio de sesión
└── src/
    ├── main.tsx, App.tsx     arranque y rutas (protegidas por rol)
    ├── api.ts                cliente HTTP y manejo del token
    ├── auth.tsx              sesión: login, registro, cierre y «Recordarme»
    ├── hooks.ts              useApi: carga de datos con recarga
    ├── format.ts             fechas, dinero, estados y exportación a CSV
    ├── types.ts              tipos de datos de la API
    ├── components/
    │   ├── Shell.tsx         barra lateral, barra superior, notificaciones y cierre de sesión
    │   ├── clinic.tsx        modales de nueva cita, urgencia y detalle de cita
    │   ├── PetFormModal.tsx  formulario de mascota del dueño
    │   ├── ui.tsx            toasts, modales, campos, alertas y estados de carga
    │   └── art.tsx           ilustraciones (perro, gato y huella)
    └── pages/
        ├── Login.tsx, Register.tsx
        ├── clinica/          Panel, Citas, Gestion, Equipo, Reportes, Configuracion
        └── dueno/            Buscar, Proveedor, MisCitas, MisMascotas
```

## Rutas

| Ruta | Pantalla | Rol |
|---|---|---|
| `/login`, `/registro` | Inicio de sesión y registro | Sin sesión |
| `/panel` | Panel principal | Proveedor |
| `/citas` | Citas | Proveedor |
| `/gestion` | Gestión de información | Proveedor |
| `/equipo` | Veterinarios / profesionales | Proveedor |
| `/reportes` | Reportes | Proveedor |
| `/configuracion` | Configuración del negocio | Proveedor |
| `/buscar` | Buscar servicios | Dueño |
| `/proveedores/:id` | Perfil del proveedor y reserva | Dueño |
| `/mis-citas` | Mis citas | Dueño |
| `/mis-mascotas` | Mis mascotas | Dueño |

Si alguien abre una ruta que no corresponde a su rol, se le lleva a su pantalla de inicio.

## Comandos

| Acción | Comando |
|---|---|
| Ver los logs | `docker compose logs -f` |
| Correr las pruebas (25) | `docker compose exec frontend npm test` |
| Verificar tipos de TypeScript | `docker compose exec frontend npm run typecheck` |
| Aplicar cambios en el código | `docker compose build` y `docker compose up -d` |
