

## Finalizar integracion n8n: limpiar debug y apuntar a produccion

### Resumen

Se eliminara todo el codigo de depuracion (boton "Probar Conexion n8n", estados asociados y funcion `handleTestN8n`) y se actualizara la URL del webhook de registro al endpoint de produccion con el nuevo origen.

### Cambios en `src/pages/Auth.tsx`

**Eliminar:**
1. Import de `Zap` de lucide-react (linea 9) -- ya no se usa en ningun sitio
2. Estados `testResult` e `isTesting` (lineas 36-37)
3. Linea `setTestResult(null)` en `switchView` (linea 166)
4. Funcion completa `handleTestN8n` (lineas 172-195)
5. Bloque JSX completo del debug (lineas 413-449) -- boton, alerta de resultado y texto de disclaimer

**Modificar:**
1. URL del webhook en el signup exitoso (linea 141):
   - De: `https://brunosanchez.app.n8n.cloud/webhook-test/nuevo-usuario`
   - A: `https://brunosanchez.app.n8n.cloud/webhook/nuevo-usuario`
2. Campo `origen` en el body (linea 147):
   - De: `'crowdfolio_beta'`
   - A: `'crowdfolio_prod'`

### Resultado final

La pagina de Auth quedara limpia, sin ningun elemento de depuracion visible. El webhook de produccion se disparara silenciosamente en cada registro exitoso sin que el usuario lo note.
