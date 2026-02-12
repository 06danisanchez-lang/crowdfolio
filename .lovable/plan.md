

## Fix: target real de Radix + guard para SelectTrigger

### Problema actual

Dos fallos combinados:

1. Los handlers acceden a `e.target` (el DismissableLayer), no al target real del click, que Radix expone en `e.detail.originalEvent.target`.
2. Cuando se hace click en el SelectTrigger para abrir el dropdown, `[data-radix-select-content]` aun no existe en el DOM, asi que `isFromSelectPortal()` devuelve `false` y el Popover se cierra antes de que el Select pueda abrirse.

### Cambio unico

**Archivo:** `src/components/opportunities/OpportunityFilters.tsx` (lineas 20-36)

Reemplazar el helper y el objeto `preventSelectPortalClose` por:

```typescript
const isFromSelectInteraction = (target: EventTarget | null): boolean => {
  if (!(target instanceof Node)) return false;
  // Caso 1: el Select ya esta abierto y el click es dentro del portal
  const selectContent = document.querySelector('[data-radix-select-content]');
  if (selectContent && selectContent.contains(target)) return true;
  // Caso 2: click en el trigger para abrir el Select (el portal aun no existe)
  const el = target instanceof Element ? target : target.parentElement;
  if (el?.closest('[data-radix-select-trigger]')) return true;
  return false;
};

const preventSelectPortalClose = {
  onPointerDownOutside: (e: any) => {
    const target = e.detail?.originalEvent?.target || e.target;
    if (isFromSelectInteraction(target)) e.preventDefault();
  },
  onInteractOutside: (e: any) => {
    const target = e.detail?.originalEvent?.target || e.target;
    if (isFromSelectInteraction(target)) e.preventDefault();
  },
  onFocusOutside: (e: any) => {
    const target = e.detail?.originalEvent?.target || e.target;
    if (isFromSelectInteraction(target)) e.preventDefault();
  },
};
```

### Por que esto cubre todo el ciclo

```text
Click en SelectTrigger          Click en opcion del Select     Click fuera de verdad
         |                                |                              |
  [data-radix-select-content]      [data-radix-select-content]     No match en
  NO existe aun                    SI existe en DOM                 ninguno de los dos
         |                                |                              |
  closest('[data-radix-               .contains(target)            isFromSelectInteraction
  select-trigger]') = true            = true                       = false
         |                                |                              |
  preventDefault()                  preventDefault()               Popover se cierra
  Popover permanece abierto         Popover permanece abierto      (comportamiento correcto)
```

### Lo que no cambia

- `z-[200]` en SelectContent: se mantiene
- `modal={false}` en los 2 Popover: se mantiene
- ErrorBoundary global: se mantiene

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/opportunities/OpportunityFilters.tsx` | Nuevo helper `isFromSelectInteraction` con guard dual + target real de Radix en los 3 handlers |

