

## Fix definitivo: SelectContent dentro del PopoverContent via container state

### Enfoque

Renderizar el portal del Select dentro del PopoverContent usando `SelectPrimitive.Portal container={...}`. Usar `useState` (no `useRef`) para garantizar que el container no sea `null` cuando el Select se renderiza.

### 1. `src/components/ui/select.tsx`

Anadir prop opcional `container` a `SelectContent` y pasarla a `SelectPrimitive.Portal`:

```typescript
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
    container?: HTMLElement | null;
  }
>(({ className, children, position = "popper", container, ...props }, ref) => (
  <SelectPrimitive.Portal container={container ?? undefined}>
    ...
```

Sin `container`, sigue usando `document.body` como siempre. Ningun otro uso del proyecto se rompe.

### 2. `src/components/opportunities/OpportunityFilters.tsx`

- Importar `useState` de React
- Crear dos states:
  ```typescript
  const [sortContainer, setSortContainer] = useState<HTMLDivElement | null>(null);
  const [filtersContainer, setFiltersContainer] = useState<HTMLDivElement | null>(null);
  ```
- Asignar como callback ref en cada `PopoverContent`:
  ```typescript
  <PopoverContent ref={setSortContainer} ...>
  <PopoverContent ref={setFiltersContainer} ...>
  ```
- Pasar `container` a cada `SelectContent` dentro del Popover correspondiente:
  ```typescript
  <SelectContent container={sortContainer}>
  <SelectContent container={filtersContainer}>
  ```
- **Eliminar completamente**: `isFromSelectInteraction`, `preventSelectPortalClose`, y los spreads `{...preventSelectPortalClose}` de ambos PopoverContent
- **Mantener**: `modal={false}` en ambos Popover

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/ui/select.tsx` | Prop `container` en SelectContent, pasada a Portal |
| `src/components/opportunities/OpportunityFilters.tsx` | Dos useState para containers, eliminar toda logica de outside handlers |

### Resultado esperado

- Desktop: Select se renderiza dentro del PopoverContent, no hay dismiss, opciones visibles y clicables
- Click fuera del Popover lo cierra normalmente
- Movil: sin cambios
- Resto de Selects del proyecto: sin cambios

