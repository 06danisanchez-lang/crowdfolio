

## Cambios: z-index SelectContent + Popover modal={false}

Dos cambios quirurgicos, sin tocar el helper `isFromSelectPortal` (ya esta correcto).

### 1. `src/components/ui/select.tsx` (linea 69)

Cambiar `z-50` a `z-[200]` en el className del `SelectPrimitive.Content`. Esto garantiza que el portal del Select se renderice visualmente por encima del PopoverContent.

### 2. `src/components/opportunities/OpportunityFilters.tsx`

Anadir `modal={false}` a los dos componentes `Popover` (el de "Ordenar" y el de "Filtros avanzados"). Esto evita que Radix bloquee interacciones con elementos fuera del Popover (como el portal del Select).

El helper `isFromSelectPortal` y los tres handlers (`onPointerDownOutside`, `onInteractOutside`, `onFocusOutside`) se mantienen exactamente como estan.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/ui/select.tsx` | `z-50` a `z-[200]` en SelectContent |
| `src/components/opportunities/OpportunityFilters.tsx` | `modal={false}` en los 2 Popover |

### Resultado esperado

- Desktop: al abrir un Select dentro del Popover, las opciones son visibles (z-index superior) y el Popover no se cierra
- Al clicar fuera de verdad (ni en el Select ni en el Popover), el Popover se cierra normalmente
- Movil: sin cambios de comportamiento (ya funcionaba)

