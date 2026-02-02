
## Plan: Permitir URL de Supabase en Validación OAuth

### Problema
La validación de seguridad en `GoogleButton.tsx` solo permite URLs de `accounts.google.com`, pero el flujo OAuth de Supabase primero genera una URL que apunta a `vqazrgwjcglnqrmdcjdm.supabase.co` antes de redirigir a Google.

### Solución
Actualizar el array `allowedHosts` para incluir también el dominio de Supabase del proyecto.

### Cambio a Realizar

**Archivo:** `src/components/auth/GoogleButton.tsx`

**Línea 55-57 (aproximadamente):**

```typescript
// ANTES:
const allowedHosts = ['accounts.google.com'];

// DESPUÉS:
const allowedHosts = [
  'accounts.google.com',
  'vqazrgwjcglnqrmdcjdm.supabase.co', // URL del proyecto Supabase
];
```

### Flujo OAuth Corregido

```text
┌─────────────────────────────────────────────────────────────┐
│  Usuario hace clic en "Continuar con Google"                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase genera URL OAuth                                  │
│  → https://vqazrgwjcglnqrmdcjdm.supabase.co/auth/v1/...    │
│  ✅ Ahora permitida en allowedHosts                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase redirige internamente a Google                    │
│  → https://accounts.google.com/o/oauth2/v2/auth/...        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Usuario autoriza en Google                                 │
│  → Callback a https://crowdfolio.es/                        │
└─────────────────────────────────────────────────────────────┘
```

### Seguridad
La validación sigue siendo segura porque solo permite:
1. `accounts.google.com` - Servidor OAuth de Google
2. `vqazrgwjcglnqrmdcjdm.supabase.co` - Tu proyecto específico de backend

Cualquier otra URL seguirá siendo rechazada.

### Resultado Esperado
- ✅ El flujo OAuth funcionará correctamente en `https://crowdfolio.es`
- ✅ El usuario será redirigido a Google para autenticarse
- ✅ Tras autorizar, volverá a crowdfolio.es con la sesión activa
