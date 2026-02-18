

# Fix: Variables de entorno en Vercel apuntando al backend incorrecto

## Diagnostico

La preview de Lovable funciona correctamente con el backend `vqazrgwjcglnqrmdcjdm`. Sin embargo, la version desplegada en Vercel tiene sus propias variables de entorno que probablemente apuntan a un proyecto diferente.

## Solucion (no requiere cambios de codigo)

Este problema se resuelve **exclusivamente en el dashboard de Vercel**, ya que las variables de entorno de Vercel son independientes de las de Lovable.

### Paso 1: Actualizar variables en Vercel

1. Ir a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleccionar el proyecto Crowdfolio
3. Ir a **Settings** -> **Environment Variables**
4. Verificar y actualizar estas 3 variables para que coincidan con las de Lovable Cloud:

```text
VITE_SUPABASE_URL = https://vqazrgwjcglnqrmdcjdm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxYXpyZ3dqY2dsbnFybWRjamRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjE4ODksImV4cCI6MjA4MzczNzg4OX0.a_rCxFjO_WckVmXl9pbWZlN8NaRWMZVeCtD6cP6qrGw
VITE_SUPABASE_PROJECT_ID = vqazrgwjcglnqrmdcjdm
```

5. Asegurarse de que estan habilitadas para **Production**, **Preview** y **Development**

### Paso 2: Redesplegar en Vercel

Despues de actualizar las variables, hacer un **redeploy** desde el dashboard de Vercel:
- Ir a **Deployments** -> seleccionar el ultimo deployment -> menu de 3 puntos -> **Redeploy**

### Paso 3: Verificar webhooks de Stripe (si aplica)

Si tienes webhooks de Stripe configurados apuntando al backend antiguo, actualizarlos en el [dashboard de Stripe](https://dashboard.stripe.com/webhooks) para que apunten a:

```text
https://vqazrgwjcglnqrmdcjdm.supabase.co/functions/v1/<nombre-funcion>
```

## Importante

- No se requiere ningun cambio de codigo en este proyecto
- La edge function `check-subscription` ya esta desplegada correctamente en el backend de Lovable Cloud
- Una vez que Vercel apunte al backend correcto, las suscripciones Pro deberian reconocerse automaticamente

