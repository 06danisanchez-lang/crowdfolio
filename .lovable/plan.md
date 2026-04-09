

## Plan: Añadir marcadores de test visibles

Los 5 archivos ya tienen los cambios implementados en el código fuente. Para confirmar que la preview está sirviendo este código, añadiré marcadores temporales de texto muy visibles.

### Cambios (2 archivos, solo texto de test)

**1. `src/components/investments/InvestmentForm.tsx` (línea 688)**
Añadir justo antes del hint existente:
```tsx
<p className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">TEST-DRAFT-VISIBLE</p>
```

**2. `src/components/investments/InvestmentList.tsx` (línea 163)**
Añadir justo dentro del bloque de pendientes, antes del título:
```tsx
<p className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">TEST-PENDING-SECTION</p>
```

### Cómo verificar

1. Inicia sesión en la app (estás en `/landing`, necesitas entrar)
2. Ve a la sección "Inversiones"
3. Si hay inversiones incompletas → verás `TEST-PENDING-SECTION` en rojo
4. Abre el modal "Nueva inversión" → verás `TEST-DRAFT-VISIBLE` en rojo

Si no aparecen, la preview no está usando el código actual.

### Después

Una vez confirmado, eliminaremos los dos marcadores de test.

