# PetCare · Maquetación HTML + CSS (Actividad 2)

Maquetación estática y navegable de los mockups de alta fidelidad diseñados en Figma.
Abre `index.html` en el navegador.

## Vistas
| Archivo | Vista | Modales e interacciones |
|---|---|---|
| `index.html` | Inicio de sesión | Recuperar contraseña; mostrar u ocultar contraseña; estado de carga; error (contraseña `error123`) |
| `registro.html` | Registro | Validación por campo; «Crear cuenta» se habilita con datos válidos y términos aceptados |
| `panel.html` | Panel principal | Nueva cita, Cita urgente, Detalle de cita, Cancelar cita, Notificaciones; filtro Todas/Mañana/Tarde |
| `gestion.html` | Gestión de información | Registrar mascota, Agendar cita; filtros por especie; búsqueda; ficha editable; pestaña Propietarios |
| `reportes.html` | Reportes | Periodo personalizado; descargas simuladas |

Todas las vistas internas tienen el modal **Cerrar sesión**. Citas, Veterinarios y Configuración
muestran un aviso porque se diseñarán en la siguiente iteración.

## Estructura
```
css/styles.css   tokens del UI Kit (:root), componentes y reglas responsive
js/app.js        interacciones de demostración
assets/fonts/    fuente Nunito local
```

