

## Implementar modelo freemium completo y ajustar CTAs del hero

### 1. Actualizar CTAs del hero

**Archivo:** `src/components/landing/HeroSection.tsx`

- CTA primario: cambiar texto de "Empezar a organizar mi cartera" a **"Crea una cuenta gratis"**
- CTA secundario: cambiar texto de "Ver planes" a **"Ver precios"** (mantiene la navegacion a `/pricing`)

### 2. Reescribir la tabla de precios con el nuevo contenido

**Archivo:** `src/components/subscription/PricingTable.tsx`

Reemplazar el array `FEATURES` actual (que usa un formato generico de nombre + valor free/pro) por dos listas independientes de features descriptivas:

**Plan Free:**
- Titulo: "Free"
- Descripcion: lista con checkmarks:
  - Anade hasta 3 inversiones
  - Consulta tu cartera y su evolucion
  - Explora oportunidades de inversion
- Precio: 0 EUR
- Sin CTA activo (muestra "Plan actual" si el usuario esta en Free)

**Plan Pro (badge "Recomendado"):**
- Titulo: "Pro" con icono Crown
- Descripcion: lista con checkmarks y texto descriptivo por cada feature:
  - **Inversiones ilimitadas:** anade todas las inversiones que tengas, sin limite
  - **Alertas configurables:** recibe avisos sobre vencimientos y eventos importantes
  - **Informe fiscal automatico:** descarga un resumen con los datos necesarios para tu declaracion
- Precio dinamico segun el toggle Mensual/Anual (5,99 EUR/mes o 59 EUR/ano)
- Badge "Ahorra 17 %" visible en el toggle Anual (ya existe)
- Microcopy bajo el precio: "Cancela cuando quieras . Sin permanencia"
- CTA: **"Pasar a Pro"** (antes decia "Empezar con Pro")

Se mantiene:
- El selector Mensual/Anual en la parte superior (ya existe, funciona bien)
- La logica de checkout existente (handleCheckout, handleManageSubscription)
- La logica de redireccion para usuarios no autenticados (sessionStorage + redirect a /auth)
- El badge "Tu plan actual" para el plan activo
- La informacion de renovacion de suscripcion al final

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/landing/HeroSection.tsx` | Texto de los 2 CTAs |
| `src/components/subscription/PricingTable.tsx` | Features descriptivas, microcopy, CTA "Pasar a Pro" |

### Que NO se toca

- Estilos generales del sitio, colores, tipografia
- Estructura del layout de la pagina de precios (`Pricing.tsx`)
- Logica de Stripe (config, checkout, portal)
- Ningun otro componente o pagina
- Base de datos

