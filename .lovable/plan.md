

## Notificacion a n8n en el registro de usuario

### Resumen

Tras un registro exitoso en el formulario de signup, se enviara una peticion HTTP POST silenciosa al webhook de n8n. Si falla, el error se ignora y el usuario continua con normalidad.

### Cambio

**Archivo modificado:** `src/pages/Auth.tsx`

En el bloque `else` del signup exitoso (linea 137-138), se anadira una llamada `fetch` fire-and-forget justo antes del mensaje de exito:

```
// Signup exitoso -> notificar a n8n (fire and forget)
fetch('https://brunosanchez.app.n8n.cloud/webhook-test/nuevo-usuario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    fecha: new Date().toISOString(),
    origen: 'crowdfolio_beta',
  }),
}).catch(() => {});  // Ignorar errores silenciosamente

setSuccessMessage('Cuenta creada! ...');
```

### Detalles tecnicos

- Se usa `fetch` nativo del navegador (no se necesita instalar axios ni ninguna dependencia adicional).
- `.catch(() => {})` garantiza que cualquier fallo de red o del webhook se ignora sin afectar al usuario.
- La peticion no es `await`-ed, por lo que no bloquea la UI ni retrasa el mensaje de exito.
- Solo se dispara en registros exitosos (cuando `signUp` no devuelve error).
- No afecta al flujo de login ni al de recuperacion de contrasena.

### Alcance

- Un solo archivo modificado, una sola linea logica anadida.
- Sin cambios en base de datos, componentes UI, ni dependencias.

