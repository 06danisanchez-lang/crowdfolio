

## Fix: Eliminar transforms del PopoverContent + cerrar Filtros

### Problema raiz

El `PopoverContent` aplica animaciones CSS con `transform` (zoom-in-95, zoom-out-95, slide-in-from-*). Cuando el `SelectContent` se portaliza dentro de ese contenedor via `container={...}`, Popper calcula las coordenadas relativas al viewport pero las aplica dentro de un contexto con `transform`, lo que desplaza el menu hacia arriba.

### Solucion: dos cambios

**Opcion elegida**: mantener `container` (evita dismiss) pero eliminar las clases con `transform` de los PopoverContent que contienen Selects.

---

### 1. `src/components/opportunities/OpportunityFilters.tsx`

Anadir `className` sin animaciones de transform a los dos PopoverContent que contienen Selects. Sobreescribir las clases por defecto pasando un className limpio:

```typescript
<PopoverContent 
  ref={setSortContainer} 
  align="end" 
  className="z-50 w-56 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none"
>
```

```typescript
<PopoverContent 
  ref={setFiltersContainer} 
  align="end" 
  className="z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none"
>
```

Esto elimina zoom-in/out-95 y slide-in-from-* solo en estos dos popovers. El resto de popovers del proyecto no cambian.

### 2. Hacer el Popover de Filtros controlado + boton cerrar

Anadir estado `open`/`onOpenChange` y un boton X para cerrar:

```typescript
const [filtersOpen, setFiltersOpen] = useState(false);

<Popover modal={false} open={filtersOpen} onOpenChange={setFiltersOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" className="gap-2">...</Button>
  </PopoverTrigger>
  <PopoverContent ...>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Filtros avanzados</div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={() => setFiltersOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      ...resto de filtros...
    </div>
  </PopoverContent>
</Popover>
```

Mismo patron para el Popover de Ordenar (opcional, pero consistente).

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/opportunities/OpportunityFilters.tsx` | Eliminar clases transform de los 2 PopoverContent, hacer popovers controlados con boton X |

No se modifica `popover.tsx` ni `select.tsx` - los cambios son locales.

### Resultado esperado

- Desktop: Select se renderiza dentro del PopoverContent sin transform, posicionamiento correcto
- El Popover se puede cerrar con el boton X, con click fuera, o con el trigger (toggle)
- Resto de popovers del proyecto mantienen sus animaciones

