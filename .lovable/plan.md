

## Fix: Bloqueos intermitentes y bug "TodosTodos"

### Causa raiz

**Problema principal - Bloqueo global por loading gate:**
En `Index.tsx` linea 108, hay un `if (isLoading)` que depende de `useInvestments().isLoading`. Este gate bloquea TODAS las vistas (Oportunidades, Plataformas, Fiscalidad, etc.) hasta que la carga de inversiones termine. Si la peticion es lenta o falla silenciosamente, la pagina entera queda en blanco mostrando solo "Cargando...".

**Problema secundario - "TodosTodos":**
En `OpportunityFilters.tsx`, los componentes `Select` usan `placeholder="Todos"` en el `SelectValue` y simultaneamente tienen un `SelectItem value="all"` con label "Todos". Radix Select renderiza ambos textos concatenados cuando el valor seleccionado es "all", produciendo "TodosTodos".

**No hay sistema de captura de errores:**
No existe Sentry, LogRocket ni ningun sistema de monitorizacion frontend. Los errores se pierden silenciosamente.

### Cambios concretos

#### 1. `src/pages/Index.tsx` - Eliminar loading gate global

**Antes (linea 108-114):**
```
if (isLoading) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Cargando...</div>
    </div>
  );
}
```

**Despues:** Eliminar este bloque completamente. Cada vista individual ya maneja su propio estado de carga:
- `OpportunityList` tiene su prop `isLoading` con skeletons
- `PlatformList` tiene su propio skeleton loader
- `TaxDashboard` gestiona su carga internamente
- El dashboard mostrara los KPIs con valores 0 mientras carga (se vera el layout inmediatamente)

Para el dashboard, envolver los KPI cards con un estado de carga condicional inline:
```tsx
{currentView === 'dashboard' && (
  <div className="p-6 lg:p-8">
    {isLoading ? (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    ) : (
      /* contenido actual del dashboard */
    )}
  </div>
)}
```

#### 2. `src/components/opportunities/OpportunityFilters.tsx` - Fix "TodosTodos"

Cambiar los `SelectItem value="all"` para que NO coincidan con el placeholder. Hay dos opciones; la mas limpia es quitar el placeholder del `SelectValue` y dejar que el `SelectItem` con label descriptivo sea el que se muestre:

En cada Select con `value="all"`:
- Plataforma: Cambiar `<SelectItem value="all">Todas las plataformas</SelectItem>` -- este ya esta bien
- Tipo de proyecto: Cambiar `<SelectItem value="all">Todos</SelectItem>` a `<SelectItem value="all">Todos los tipos</SelectItem>`
- Nivel de riesgo: Cambiar a `<SelectItem value="all">Todos los niveles</SelectItem>`
- Estado: Cambiar a `<SelectItem value="all">Todos los estados</SelectItem>`

Y eliminar los `placeholder="Todos"` de los `SelectTrigger > SelectValue` correspondientes ya que el item "all" ya proporciona texto.

#### 3. `src/hooks/useInvestments.ts` - Proteccion contra loading infinito

Anadir timeout de seguridad para que `isLoading` nunca quede en `true` indefinidamente:

```tsx
const fetchInvestments = useCallback(async () => {
  if (!user) {
    setInvestments([]);
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);
    // ... fetch logic existente ...
  } catch (error) {
    console.error('Error fetching investments:', error);
  } finally {
    setIsLoading(false); // Ya existe, pero verificar que siempre se ejecuta
  }
}, [user]);
```

Esto ya esta implementado correctamente con `finally`, pero el problema es que si la peticion de Supabase se queda colgada (timeout de red), el `finally` nunca se ejecuta. Anadir un timeout:

```tsx
const timeoutId = setTimeout(() => {
  if (isMountedRef.current) {
    setIsLoading(false);
    console.warn('Investment fetch timed out');
  }
}, 15000);
```

#### 4. Sin cambios necesarios para race conditions de filtros

Los filtros de oportunidades se aplican client-side via `useMemo` sobre el array `opportunities` ya cargado en memoria. No hay peticiones de red al cambiar filtros, por lo que no hay race conditions en este flujo.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Index.tsx` | Eliminar loading gate global, anadir skeleton inline para dashboard |
| `src/components/opportunities/OpportunityFilters.tsx` | Fix labels "all" para evitar "TodosTodos" |
| `src/hooks/useInvestments.ts` | Anadir timeout de seguridad en fetch |

### Respuestas a las preguntas especificas

1. **Errores en consola**: No hay errores visibles porque el bloqueo es un loading infinito, no un crash. La consola no muestra stack trace.
2. **Endpoint del filtro "solo proyectos abiertos"**: No hay endpoint. Los filtros se aplican client-side con `useMemo` sobre datos ya cargados. No se hace ninguna peticion de red al cambiar filtros.
3. **Manejo de respuestas vacias**: `OpportunityList` maneja `[]` correctamente (muestra empty state con mensaje). `PlatformList` tambien. No hay bug aqui.
4. **"TodosTodos"**: Se genera por la colision entre `placeholder="Todos"` en `SelectValue` y `SelectItem value="all"` con label "Todos". Radix concatena ambos.
5. **Cancelacion de peticiones**: No hay AbortController, pero no es relevante para los filtros (son client-side). Solo afectaria al scraping concurrente.
6. **Sistema de captura de errores**: No hay ninguno configurado (ni Sentry, ni LogRocket, ni similar).

