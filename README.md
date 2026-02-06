# Crowdfolio

Plataforma de gestión integral de inversiones en crowdfunding y crowdlending. Permite a los inversores registrar, monitorizar y analizar su cartera de inversiones participativas, con herramientas de fiscalidad, alertas de oportunidades y un panel de administración.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite |
| Estilos | Tailwind CSS, shadcn/ui |
| Backend | Lovable Cloud (base de datos, autenticación, Edge Functions) |
| Pagos | Stripe |
| Scraping | Firecrawl |

## Estructura del Proyecto

```
src/
├── components/       # Componentes React organizados por dominio
│   ├── admin/        # Panel de administración
│   ├── assets/       # Gestión de activos
│   ├── auth/         # Componentes de autenticación
│   ├── dashboard/    # Dashboard principal (KPIs, gráficos)
│   ├── investments/  # CRUD de inversiones
│   ├── landing/      # Landing page pública
│   ├── layout/       # Layout principal (sidebar, navbar)
│   ├── opportunities/# Oportunidades de inversión
│   ├── platforms/    # Plataformas de crowdfunding
│   ├── subscription/ # Suscripciones y pricing
│   ├── tax/          # Módulo fiscal
│   └── ui/           # Componentes base (shadcn/ui)
├── contexts/         # AuthContext, SubscriptionContext
├── hooks/            # Custom hooks (useInvestments, useTaxCalculation, etc.)
├── lib/              # Utilidades, cálculos fiscales, validaciones
├── pages/            # Páginas/rutas de la aplicación
├── types/            # Tipos TypeScript
└── integrations/     # Cliente y tipos de Lovable Cloud
supabase/
└── functions/        # Edge Functions del backend
```

## Variables de Entorno

El frontend requiere 3 variables de entorno (claves públicas):

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto |

Los secretos privados (`STRIPE_SECRET_KEY`, `FIRECRAWL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) están almacenados de forma segura en Lovable Cloud y solo son accesibles desde las Edge Functions.

## Desarrollo Local

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>

# 2. Navegar al directorio
cd crowdfolio

# 3. Instalar dependencias
npm install

# 4. Crear archivo .env con las variables de entorno
# (Ver sección "Variables de Entorno" arriba)

# 5. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Panel de Administración

Ruta: `/admin-dashboard`

### Acceso

El acceso está restringido a usuarios con rol `admin`. Los usuarios sin este rol son redirigidos automáticamente a la home.

### Gestión de roles

El rol de administrador se gestiona mediante la tabla `user_roles` con una función `has_role()` de tipo `SECURITY DEFINER`. Este patrón evita ataques de escalación de privilegios al no exponer el rol directamente en el perfil del usuario.

Para asignar el rol de admin a un usuario, insertar en la tabla `user_roles`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID>', 'admin');
```

### Funcionalidades

- **KPIs en tiempo real**: Total de usuarios, usuarios Pro activos, volumen total gestionado
- **Tabla de usuarios**: Listado completo con email, plan, estado de suscripción e inversiones
- **Detalle de usuario**: Vista expandida con información de perfil y suscripción

## Despliegue en Vercel

### Requisitos previos

1. Repositorio sincronizado con GitHub (ver sección siguiente)
2. Cuenta en [Vercel](https://vercel.com)

### Pasos

1. **Importar proyecto**: En el dashboard de Vercel, click en "Add New Project" y seleccionar el repositorio de GitHub.

2. **Configurar variables de entorno**: En Settings → Environment Variables, añadir:
   ```
   VITE_SUPABASE_URL=https://<PROJECT_ID>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
   VITE_SUPABASE_PROJECT_ID=<PROJECT_ID>
   ```

3. **Configuración de build**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Deploy**: Click en "Deploy". Vercel construirá y desplegará la aplicación automáticamente.

### Nota sobre Edge Functions

Las Edge Functions (backend) se ejecutan en **Lovable Cloud**, no en Vercel. Vercel solo aloja el frontend estático. Las funciones del backend seguirán funcionando desde Lovable Cloud independientemente de dónde se despliegue el frontend.

## Sincronización con GitHub

La sincronización con GitHub es una funcionalidad nativa de Lovable:

1. En el editor de Lovable, ir a **Settings → GitHub → Connect project**
2. Autorizar la aplicación de GitHub de Lovable
3. Seleccionar la cuenta/organización de GitHub
4. Click en **Create Repository**

Una vez conectado, la sincronización es **bidireccional y automática**: los cambios en Lovable se pushean a GitHub y los cambios en GitHub se sincronizan con Lovable.

## Edge Functions

| Función | Descripción |
|---------|-------------|
| `apply-promo-code` | Validación y aplicación de códigos promocionales |
| `calculate-tax` | Cálculo fiscal de rendimientos de inversión |
| `check-subscription` | Verificación del estado de suscripción del usuario |
| `create-checkout` | Creación de sesiones de pago con Stripe |
| `customer-portal` | Portal de gestión de suscripción de Stripe |
| `extract-investment-from-image` | Extracción de datos de inversión desde imágenes (IA) |
| `extract-investment-from-pdf` | Extracción de datos de inversión desde PDFs (IA) |
| `scheduled-scraper` | Scraping programado de oportunidades de inversión |
| `scrape-opportunities` | Scraping manual de oportunidades desde plataformas |

## Licencia

Proyecto privado. Todos los derechos reservados.
