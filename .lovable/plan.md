

## Webhook n8n para registros via Google OAuth

### Problema

Cuando un usuario se registra con Google, el flujo OAuth redirige al usuario fuera de la app y vuelve mediante `onAuthStateChange` con evento `SIGNED_IN`. Esto salta por completo el `handleSubmit` de `Auth.tsx`, donde actualmente vive el webhook a n8n. Resultado: los registros con Google no se notifican.

### Solucion

Anadir logica en el listener `onAuthStateChange` del `AuthContext.tsx` que detecte registros nuevos (Google u otros proveedores OAuth futuros) y dispare el webhook de forma silenciosa.

### Cambio

**Archivo modificado:** `src/contexts/AuthContext.tsx`

1. **Nuevo `useRef`**: `webhookFiredForRef = useRef<Set<string>>(new Set())` para rastrear los user IDs a los que ya se les envio el webhook en esta sesion, evitando duplicados por re-renders o multiples eventos.

2. **Nueva funcion `fireNewUserWebhook`**: funcion auxiliar que:
   - Recibe el objeto `User` de Supabase
   - Calcula la diferencia entre `Date.now()` y `user.created_at`
   - Si la cuenta tiene menos de 30 segundos de vida Y el user ID no esta en el Set del ref, envia el POST al webhook
   - Anade el user ID al Set para bloquear disparos duplicados

3. **Integrar en `onAuthStateChange`**: Dentro del bloque que ya procesa el evento `SIGNED_IN`, llamar a `fireNewUserWebhook(newSession.user)` de forma "fire and forget".

### Detalles tecnicos

**Funcion auxiliar (dentro de AuthProvider):**
```text
const webhookFiredForRef = useRef<Set<string>>(new Set());

const fireNewUserWebhook = useCallback((user: User) => {
  // Evitar duplicados
  if (webhookFiredForRef.current.has(user.id)) return;

  const createdAt = new Date(user.created_at).getTime();
  const now = Date.now();
  const ageMs = now - createdAt;

  // Solo si la cuenta tiene menos de 30 segundos
  if (ageMs > 30_000) return;

  // Marcar como enviado ANTES del fetch para evitar race conditions
  webhookFiredForRef.current.add(user.id);

  fetch('https://brunosanchez.app.n8n.cloud/webhook/nuevo-usuario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      fecha: new Date().toISOString(),
      origen: 'crowdfolio_google',
    }),
  }).catch(() => {});
}, []);
```

**Integracion en el listener (linea ~107 del onAuthStateChange):**
```text
if (event === 'SIGNED_IN' && newSession?.user) {
  fireNewUserWebhook(newSession.user);
}
```

### Mecanismo anti-duplicados

Se usan dos capas de proteccion:
- **`useRef<Set<string>>`**: almacena los user IDs ya notificados durante la vida del componente, impidiendo que re-renders o multiples eventos `SIGNED_IN` disparen el webhook dos veces
- **Ventana de 30 segundos sobre `created_at`**: asegura que solo cuentas recien creadas disparan el webhook; logins posteriores del mismo usuario nunca lo activan

### Por que no se duplica con el registro manual

El webhook del registro manual (en `Auth.tsx`) usa `origen: 'crowdfolio_prod'` y se dispara solo cuando el `signUp` manual tiene exito. El evento `SIGNED_IN` de `onAuthStateChange` no se dispara inmediatamente para el registro con email/password porque el usuario debe verificar su email primero. Para cuando se verifica, `created_at` ya tiene mas de 30 segundos, por lo que la condicion de "cuenta nueva" no se cumple.

### Alcance

- Un solo archivo modificado: `src/contexts/AuthContext.tsx`
- Sin dependencias nuevas
- Sin cambios en base de datos
- Sin cambios en la UI
