

## Preparar el Proyecto para Exportacion y Despliegue

### 1. Verificacion de variables de entorno (estado actual: OK)

Las 3 variables de entorno del frontend ya estan correctamente configuradas en `.env`:

- `VITE_SUPABASE_URL` - URL del backend
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Clave publica (anon key)
- `VITE_SUPABASE_PROJECT_ID` - ID del proyecto

Estas son **claves publicas** (publishable) y es seguro que esten en el repositorio. El cliente Supabase en `src/integrations/supabase/client.ts` las consume correctamente via `import.meta.env`.

Los **secretos privados** (STRIPE_SECRET_KEY, FIRECRAWL_API_KEY, SUPABASE_SERVICE_ROLE_KEY) estan almacenados de forma segura en Lovable Cloud y solo son accesibles desde las Edge Functions del backend. No necesitan estar en el frontend.

**Accion:** Agregar `.env` al `.gitignore` para evitar que las variables se suban al repositorio de GitHub, ya que en Vercel se configuraran como variables de entorno del proyecto.

### 2. Sincronizacion con GitHub

La sincronizacion con GitHub es una **funcionalidad nativa de la plataforma Lovable**, no un boton dentro de la aplicacion. Se activa desde:

**Settings -> GitHub -> Connect project**

Una vez conectado, la sincronizacion es bidireccional y automatica (cada cambio en Lovable se pushea a GitHub y viceversa).

**Accion:** No se requiere codigo. Se agregara una seccion en el README explicando como activar la sincronizacion.

### 3. Actualizar README.md

Reescribir el README.md con documentacion completa del proyecto, incluyendo:

**Secciones del nuevo README:**

- **Crowdfolio** - Descripcion del proyecto (plataforma de gestion de inversiones en crowdfunding/crowdlending)
- **Stack Tecnologico** - React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Lovable Cloud (backend)
- **Estructura del Proyecto** - Carpetas principales y su proposito
- **Variables de Entorno** - Las 3 variables VITE_SUPABASE_* necesarias para el frontend
- **Desarrollo Local** - Instrucciones para clonar, instalar y ejecutar
- **Panel de Administracion** - Documentacion de /admin-dashboard (acceso, roles, funcionalidades)
- **Despliegue en Vercel** - Guia paso a paso:
  1. Conectar repositorio de GitHub a Vercel
  2. Configurar variables de entorno en el dashboard de Vercel
  3. Build command: `npm run build`
  4. Output directory: `dist`
  5. Nota sobre Edge Functions (se ejecutan en Lovable Cloud, no en Vercel)
- **Sincronizacion con GitHub** - Como activar la sync desde Lovable
- **Edge Functions** - Lista de las 9 funciones del backend y su proposito

### Detalle tecnico

**Archivos a modificar:**
- `README.md` - Reescritura completa con documentacion del proyecto y guia de despliegue
- `.gitignore` - Agregar `.env` para proteger variables al pushear a GitHub

**No se crean componentes ni paginas nuevas.** El "Sync to GitHub" no es un boton en la UI, sino una funcionalidad de la plataforma Lovable que se documenta en el README.

