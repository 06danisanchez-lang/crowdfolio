
Contexto (lo que ya sabemos)
- El “parpadeo” que describes es un bucle de redirecciones: la URL cambia rápidamente entre rutas.
- Ocurre en https://crowdfolio.es (sin www) y también en incógnito, así que no parece un problema de caché/localStorage.
- En este proyecto, el bucle solo puede ocurrir si el estado de autenticación (`user`) está alternando entre “hay sesión” y “no hay sesión”, porque:
  - `PublicRoute` redirige a `/` cuando `user` existe
  - `ProtectedRoute` redirige a `/landing` cuando `user` NO existe
  - Si `user` oscila, la app entra en `/` ⇄ `/landing` (o `/auth`) continuamente.

Hipótesis más probable (a partir del código actual)
- En `AuthContext.tsx` estamos actualizando `user/session` desde dos vías:
  1) `supabase.auth.onAuthStateChange(...)` (listener)
  2) `supabase.auth.getSession()` (carga inicial)
- En algunos escenarios (especialmente con refresh de token/estado inicial), `onAuthStateChange` puede emitir eventos iniciales/transitorios (p. ej. `INITIAL_SESSION`) y/o cambios de sesión que pisan momentáneamente el estado mientras `getSession()` resuelve. Esto puede provocar alternancia rápida `user=null` ↔ `user!=null`.
- Dado que el bucle ocurre incluso en incógnito, el síntoma encaja con una inicialización “inestable” del estado auth más que con datos persistidos.

Objetivo
- Hacer que el estado de autenticación pase de “cargando” a “resuelto” de forma estable (una sola vez), evitando que el listener inicial provoque transiciones transitorias que disparen redirecciones.
- Añadir un “cortafuegos” contra bucles de redirección para que, si por cualquier razón vuelve a ocurrir, el usuario no quede bloqueado.

Cambios propuestos (implementación)

1) Endurecer la inicialización de AuthContext para evitar oscilaciones
Archivo: `src/contexts/AuthContext.tsx`

1.1. Ignorar el evento `INITIAL_SESSION` del listener (o no permitir que afecte al estado durante bootstrap)
- Añadir un `useRef` tipo `hasBootstrappedRef` / `initializingRef`.
- Comportamiento:
  - El listener `onAuthStateChange` NO debe aplicar `setSession/setUser` cuando `event === "INITIAL_SESSION"` (porque ya resolvemos el estado inicial con `getSession()`).
  - El listener sí debe seguir procesando eventos reales posteriores: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, etc.

1.2. Evitar “setState” redundantes y asegurar orden de bootstrap
- En `initializeAuth`:
  - Obtener sesión con `getSession()`
  - Setear `session/user`
  - (Opcional) Lanzar `checkAdminRole` sin bloquear la UI (ver punto 1.3)
  - Marcar `hasBootstrappedRef.current = true`
  - Finalmente `setIsLoading(false)`

1.3. (Recomendado) No bloquear `isLoading` esperando `checkAdminRole`
- Ahora mismo hacemos `await checkAdminRole()` antes de `setIsLoading(false)`.
- Para evitar que cualquier lentitud/error de consulta de roles afecte a la estabilidad del arranque:
  - Mover el `checkAdminRole` a “fire-and-forget” tras setear `session/user` (pero asegurando que si no hay user, isAdmin=false).
  - Esto reduce la ventana temporal donde pueden darse re-renders/reconciliaciones sensibles.

2) Añadir “cortafuegos” para bucles de redirección en los Route Guards
Archivo: `src/App.tsx`

2.1. Detectar bucle `/` ⇄ `/landing` (o similares) y bloquear redirección
- Implementar un contador de redirecciones en `sessionStorage` con ventana temporal (ejemplo):
  - Guardar `{ lastRedirectAt, count }`
  - Si se superan N redirecciones en X segundos (por ejemplo 6 en 3s), detener `Navigate` y renderizar una pantalla de fallback.
- La pantalla de fallback debe:
  - Explicar “Se ha detectado un bucle de redirección de sesión”
  - Ofrecer botones:
    - “Ir a Iniciar sesión” (`/auth`)
    - “Ir a Landing” (`/landing`)
    - “Cerrar sesión” (llamar a `signOut()` por si hay un estado corrupto)
  - (Opcional) incluir un botón “Recargar” que haga `window.location.reload()`.

2.2. (Opcional) Suavizar PublicRoute
- Como refuerzo, en `PublicRoute` podemos retrasar el redirect a `/` un tick (microtask) o exigir que el estado auth esté “estable” (por ejemplo, que `hasBootstrappedRef` sea true) antes de redirigir.
- Esto reduce el riesgo de que un `user` momentáneo dispare un redirect prematuro.

3) Añadir trazas de diagnóstico (temporalmente) para confirmar el origen exacto
Archivos: `src/contexts/AuthContext.tsx`, `src/App.tsx`
- Loggear (con `console.debug`) solo en desarrollo o bajo un flag `?debugAuth=1`:
  - Eventos `onAuthStateChange`: event name + si session viene null/no-null
  - Transiciones de `isLoading`, `user?.id`
  - Decisiones de ProtectedRoute/PublicRoute (cuándo redirige y hacia dónde)
- Esto nos permitirá confirmar si el bucle viene de:
  - Alternancia real de sesión (SIGNED_IN/SIGNED_OUT repetidos)
  - O un `INITIAL_SESSION` transitorio mal manejado
  - O un “hard reload” encubierto (menos probable por tu descripción)

Plan de verificación (pasos concretos)
1) En incógnito:
- Abrir `https://crowdfolio.es/`
- Debe ir a `/landing` y quedarse estable (sin parpadeo)
- Navegar a `/auth` y comprobar estabilidad

2) Login:
- Iniciar sesión (email/password o Google)
- Debe ir a `/` y quedarse estable
- Cambiar de secciones dentro del dashboard y confirmar que no vuelve a `/landing` solo

3) Confirmación anti-bucle:
- Si por cualquier razón la sesión vuelve a oscilar, debe aparecer la pantalla “bucle detectado” en vez de parpadear indefinidamente (esto elimina el bloqueo total).

Notas técnicas / riesgos
- Estos cambios no relajan seguridad: `ProtectedRoute` seguirá protegiendo el dashboard; solo añadimos estabilidad y un fallback si hay bucle.
- Mantendremos el sistema de roles en `user_roles` (no moveremos roles a perfiles) y no usaremos storage del cliente para privilegios.

Entregables
- `src/contexts/AuthContext.tsx`: bootstrap estable + listener sin `INITIAL_SESSION` + (opcional) no bloquear UI por roles.
- `src/App.tsx`: detector de bucle + fallback UI en guards.
- Logs de diagnóstico controlados por flag (si se aprueba incluirlos temporalmente).
