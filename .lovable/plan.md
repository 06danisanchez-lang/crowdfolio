
## Reorganizar sidebar: navegacion arriba, cuenta abajo

**Archivo unico a modificar:** `src/components/layout/AppLayout.tsx`

### Cambios

1. **Nuevos imports**: `Separator` desde `@/components/ui/separator`, `Avatar` y `AvatarFallback` desde `@/components/ui/avatar`.

2. **Reestructurar el `<aside>`** para usar `flex flex-col h-screen` (o `h-full` con `inset-y-0`) con dos zonas:

#### Zona superior (menu)
- Logo header (sin cambios)
- `<nav>` con `flex-1 overflow-y-auto p-4`:
  - Links de menu: Inicio, Inversiones, Oportunidades, Plataformas, Fiscalidad
  - Fila horizontal con `NotificationBell` + `AlertsPanel` (movidos aqui desde el bloque inferior)
  - Administracion (condicional si admin)

#### Zona inferior (cuenta/sistema)
- `<Separator />` como divisor visual
- Contenedor `p-4 space-y-2`:
  - Fila con `Avatar` (inicial del email) + email truncado con ellipsis
  - Boton Modo oscuro/claro
  - Boton Cerrar sesion

3. **Eliminar** el bloque `absolute bottom-4` actual (lineas 134-174) y reemplazarlo por la estructura flex natural descrita.

4. **Mobile sidebar**: misma estructura, sin `hidden lg:flex` en los botones del bloque inferior (se muestran en ambos breakpoints).

5. **Mobile header**: se mantiene sin cambios.

### Estructura resultante

```text
aside (w-64, flex flex-col, h-screen via inset-y-0)
  +-- div (h-14, border-b) -> logo
  +-- nav (flex-1, overflow-y-auto, p-4, space-y-1)
  |     +-- Inicio, Inversiones, Oportunidades, Plataformas, Fiscalidad
  |     +-- div (flex gap-2, pt-2): NotificationBell + AlertsPanel
  |     +-- Administracion (si admin)
  +-- Separator
  +-- div (p-4, space-y-2)
        +-- div (flex items-center gap-3): Avatar(inicial) + email truncado
        +-- Button: Modo oscuro/claro
        +-- Button: Cerrar sesion
```

Sin cambios en rutas, iconos, logica de vistas, paginas legales, footer, base de datos ni autenticacion.
