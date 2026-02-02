
Contexto y diagnóstico (qué está pasando)
- La librería @lovable.dev/cloud-auth-js construye el parámetro redirect_uri así:
  - redirect_uri = opts.redirect_uri ?? window.location.origin
- En tu app, AuthContext está pasando redirect_uri: window.location.origin.
- Si por cualquier motivo el usuario entra por:
  - https://www.crowdfolio.es (o algún proxy corporativo / redirección intermedia)
  entonces window.location.origin ≠ https://crowdfolio.es y el broker de OAuth lo rechaza con “redirect_uri is not allowed” porque compara contra una lista de URLs permitidas.
- Además, el mismo patrón (window.location.origin) se usa en:
  - signUp → emailRedirectTo
  - resetPassword → redirectTo
  así que conviene normalizarlo en un solo sitio para evitar futuras discrepancias.

Objetivo
- Garantizar que el redirect_uri enviado en lovable.auth.signInWithOAuth sea SIEMPRE exactamente https://crowdfolio.es en producción (sin www, sin puertos, sin variaciones).
- Evitar discrepancias entre “URL de origen” y “URL de redirección” forzando también que la app no se ejecute en www.crowdfolio.es (redirigir a crowdfolio.es).

Cambios propuestos (código)

1) Canonicalizar dominio al cargar la app (www → sin www)
Archivo: src/main.tsx (o alternativamente src/App.tsx antes de montar el router)
- Añadir una redirección temprana:
  - Si window.location.hostname === "www.crowdfolio.es"
  - window.location.replace("https://crowdfolio.es" + pathname + search + hash)
Resultado:
- El usuario nunca se queda navegando en www.
- window.location.origin pasa a ser siempre https://crowdfolio.es, evitando inconsistencias y también problemas de sesión/localStorage entre dominios.

2) Centralizar “origen canónico” para redirects de autenticación
Archivo: src/contexts/AuthContext.tsx
- Crear helper local (o pequeño util interno en el propio archivo) tipo:
  - function getAuthOrigin(): string
  - Si hostname es crowdfolio.es o www.crowdfolio.es ⇒ devolver exactamente "https://crowdfolio.es"
  - En otros casos (preview/staging) ⇒ devolver window.location.origin
- Sustituir usos de window.location.origin por getAuthOrigin() en:
  - signInWithGoogle → redirect_uri
  - signUp → emailRedirectTo (manteniendo la ruta “/”)
  - resetPassword → redirectTo (manteniendo la ruta “/reset-password”)

3) Diagnóstico seguro (para confirmar el valor exacto que se envía)
Archivo: src/contexts/AuthContext.tsx
- Cuando falle signInWithGoogle (result.error), envolver el error con información del redirect_uri usado, por ejemplo:
  - “redirect_uri is not allowed (redirect_uri usado: https://crowdfolio.es)”
- Esto no expone tokens, solo ayuda a confirmar que el valor enviado es el esperado.

Verificación (pasos de prueba)
1) Producción (dominio canónico)
- Abrir https://crowdfolio.es/auth
- Pulsar “Continuar con Google”
- Confirmar que ya no aparece “redirect_uri is not allowed”.
- (Opcional) Revisar que, si el error reaparece, el mensaje indique qué redirect_uri exacto se intentó usar.

2) Producción (www)
- Abrir https://www.crowdfolio.es/auth
- Confirmar que redirige automáticamente a https://crowdfolio.es/auth
- Repetir login con Google.

3) Flujos de email
- Registro con email/password: confirmar que el enlace de verificación apunta a https://crowdfolio.es/
- “¿Olvidaste tu contraseña?”: confirmar que el enlace apunta a https://crowdfolio.es/reset-password

Notas importantes (configuración externa que debe coincidir)
- En tu configuración de OAuth, asegúrate de que la URL permitida (allowlist) incluya exactamente:
  - https://crowdfolio.es
  y, si quieres soportar acceso directo por www (aunque lo redirijamos), también:
  - https://www.crowdfolio.es
- Con los cambios anteriores, incluso si alguien entra por www, el sistema acabará usando crowdfolio.es como origen/redirect estable.

Publicación
- Tras implementar estos cambios, necesitarás pulsar “Publish/Update” para que el frontend actualizado se despliegue en producción.
- En cuanto estén los cambios listos en el editor (después de implementarlos), te lo indicaré para que puedas publicarlo.
