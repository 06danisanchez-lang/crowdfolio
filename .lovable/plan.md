

## Configurar SPA Fallback para evitar 404 al recargar

### Problema

Crowdfolio es una SPA (Single Page Application) con rutas manejadas por React Router en el cliente. Cuando un usuario recarga una ruta interna (por ejemplo `/dashboard` o `/admin-dashboard`), el servidor de hosting busca un archivo fisico en esa ruta, no lo encuentra, y devuelve un 404.

### Solucion

Crear un archivo `vercel.json` en la raiz del proyecto que indique a Vercel que redirija todas las rutas al `index.html`, permitiendo que React Router gestione la navegacion.

### Cambio

**Archivo nuevo:** `vercel.json`

```text
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Esta unica regla hace que cualquier ruta que no corresponda a un archivo estatico existente (JS, CSS, imagenes, etc.) devuelva `index.html`, donde React Router se encarga de renderizar la vista correcta.

### Nota sobre otros entornos

Si en el futuro se despliega en otro hosting:

- **Netlify**: crear `public/_redirects` con `/* /index.html 200`
- **Cloudflare Pages**: el SPA fallback se activa desde el dashboard del proyecto
- **Lovable Cloud Preview**: ya gestiona el fallback automaticamente, por lo que este cambio solo afecta al despliegue en Vercel

### Alcance

- Un solo archivo nuevo: `vercel.json`
- Sin cambios en codigo fuente
- Sin dependencias nuevas
- Sin cambios en base de datos

