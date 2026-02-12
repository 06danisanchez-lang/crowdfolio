

## Fix definitivo: Select dentro de Popover + ErrorBoundary global

### Problema

Los `Select` dentro de los `Popover` ("Ordenar" y "Filtros avanzados") causan crash porque al abrirse, el portal del Select dispara eventos de "click fuera" en el Popover, cerrándolo y desmontando el Select activo.

### Cambios

#### 1. Helper `isFromSelectPortal` + triple handler en PopoverContent

**Archivo:** `src/components/opportunities/OpportunityFilters.tsx`

Crear una funcion helper que comprueba si el evento viene del portal del Select:

```typescript
const isFromSelectPortal = (target: EventTarget | null): boolean => {
  if (!(target instanceof Node)) return false;
  const selectContent = document.querySelector('[data-radix-select-content]');
  return !!selectContent && selectContent.contains(target);
};
```

Aplicar **tres handlers** a los dos `PopoverContent` (lineas 77 y 130):

```tsx
<PopoverContent
  align="end"
  className="w-56"
  onPointerDownOutside={(e) => {
    if (isFromSelectPortal(e.target)) e.preventDefault();
  }}
  onInteractOutside={(e) => {
    if (isFromSelectPortal(e.target)) e.preventDefault();
  }}
  onFocusOutside={(e) => {
    if (isFromSelectPortal(e.target)) e.preventDefault();
  }}
>
```

Esto cubre los tres mecanismos que Radix usa para detectar "interaccion fuera" y es fiable en Chrome, Safari y Firefox.

#### 2. ErrorBoundary global

**Archivo nuevo:** `src/components/ErrorBoundary.tsx`

Componente class-based con:
- `fallbackMessage` prop opcional (default: "Ha ocurrido un error")
- `onReset` callback opcional
- UI: Card con icono AlertTriangle, mensaje, boton "Reintentar"
- `componentDidCatch` para logging

**Archivo:** `src/pages/Index.tsx`

Envolver todo el contenido dentro de `AppLayout` con `ErrorBoundary`:

```tsx
<AppLayout ...>
  <ErrorBoundary fallbackMessage="Ha ocurrido un error inesperado.">
    {currentView === 'dashboard' && (...)}
    {currentView === 'opportunities' && (...)}
    {/* resto de vistas */}
  </ErrorBoundary>
</AppLayout>
```

Esto protege **todas las secciones**, no solo Oportunidades.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/opportunities/OpportunityFilters.tsx` | Helper `isFromSelectPortal` + triple handler en 2 PopoverContent |
| `src/components/ErrorBoundary.tsx` | Nuevo - ErrorBoundary reutilizable |
| `src/pages/Index.tsx` | Envolver contenido con ErrorBoundary global |

### Prueba manual post-deploy

En Chrome, Safari y Firefox:
1. Ir a Oportunidades
2. Abrir "Filtros" (popover)
3. Abrir Select de "Tipo de proyecto" y seleccionar una opcion
4. Verificar que el Popover NO se cierra y la vista NO queda en blanco
5. Repetir con "Nivel de riesgo", "Estado"
6. Repetir con popover "Ordenar" y sus dos Selects

