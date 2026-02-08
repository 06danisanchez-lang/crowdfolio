

## Eliminar redireccion manual de dominio en `main.tsx`

### Problema

En `src/main.tsx` (lineas 6-14) existe una redireccion JavaScript que fuerza `www.crowdfolio.es` hacia `crowdfolio.es`. Esta logica del lado del cliente puede causar bucles de redireccion infinitos al interactuar con la configuracion de redirecciones del hosting (Vercel/Lovable Cloud), ya que ambos intentan redirigir simultaneamente.

### Solucion

Eliminar por completo el bloque de redireccion de dominio en `main.tsx`. La normalizacion de dominio (www a no-www o viceversa) y la imposicion de HTTPS deben gestionarse exclusivamente a nivel del servidor/hosting, nunca desde el codigo de la aplicacion.

### Cambio

**Archivo:** `src/main.tsx`

**Eliminar** las lineas 6-14 (el bloque `if (window.location.hostname === "www.crowdfolio.es")`).

El archivo quedara asi:

```text
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Que NO se toca

- **`App.tsx`**: Las `window.location.href` que existen ahi son acciones de usuario (botones del fallback de bucle de redireccion, signOut). Son navegaciones intencionales iniciadas por click, no redirecciones automaticas. Son seguras.
- **`SubscriptionContext.tsx`**: Los `window.location.href` ahi son fallbacks para cuando el popup de Stripe es bloqueado. Son navegaciones a URLs externas (Stripe Checkout), no redirecciones de dominio.
- **Rutas internas**: Todas las rutas en `App.tsx` ya usan `<Navigate to="..." replace />` de React Router, que son relativas y no causan conflictos con el hosting.

### Resultado

La app deja de interferir con las redirecciones de dominio/HTTPS del hosting, eliminando el bucle de redireccion. La normalizacion de `www` queda delegada al servidor.

