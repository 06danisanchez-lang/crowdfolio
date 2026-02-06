

## Boton temporal "Probar Conexion n8n" en la pagina de Auth

### Resumen

Se anadira un boton de depuracion temporal en la parte inferior del formulario de Login/Signup que permite verificar manualmente que el webhook de n8n recibe la senal correctamente. El boton disparara un `fetch` POST al mismo endpoint ya configurado y mostrara el resultado en pantalla usando el sistema de alertas existente.

### Cambio

**Archivo modificado:** `src/pages/Auth.tsx`

1. Anadir un estado `testResult` para almacenar el resultado del test (exito o error).
2. Anadir una funcion `handleTestN8n` que:
   - Envia un POST a `https://brunosanchez.app.n8n.cloud/webhook-test/nuevo-usuario` con un payload de prueba.
   - Si la respuesta es `ok`, muestra "Conexion Exitosa!".
   - Si falla (error de red o respuesta no-ok), muestra "Error: " con el mensaje tecnico.
3. Renderizar un boton con estilo `outline` y un icono de prueba debajo del enlace "Registrate / Inicia sesion", junto con una alerta condicional que muestre el resultado.

### Detalles tecnicos

**Funcion de test:**
```
const handleTestN8n = async () => {
  setTestResult(null);
  try {
    const res = await fetch('https://brunosanchez.app.n8n.cloud/webhook-test/nuevo-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@debug.com',
        fecha: new Date().toISOString(),
        origen: 'crowdfolio_debug_test',
      }),
    });
    if (res.ok) {
      setTestResult({ success: true, message: 'Conexion Exitosa!' });
    } else {
      setTestResult({ success: false, message: `Error: HTTP ${res.status} ${res.statusText}` });
    }
  } catch (err) {
    setTestResult({ success: false, message: `Error: ${err instanceof Error ? err.message : 'Desconocido'}` });
  }
};
```

**UI del boton (bajo el enlace de cambio login/signup):**
- Separador visual (linea fina)
- Boton con variante `outline`, tamano `sm`, texto "Probar Conexion n8n" con icono Zap
- Alerta verde si exito, alerta roja si error, que aparece debajo del boton
- Texto pequeno "(Solo depuracion - eliminar antes de produccion)" para recordar que es temporal

### Alcance

- Un solo archivo modificado: `src/pages/Auth.tsx`
- Sin dependencias nuevas (usa `fetch` nativo, iconos de `lucide-react` ya disponibles)
- Sin cambios en base de datos ni otros componentes
- Boton solo visible en la vista de login/signup (no en forgot-password)

