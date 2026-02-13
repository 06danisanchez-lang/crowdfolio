

# Fix: Mostrar texto en botones de Oportunidades en movil

## Problema

En `src/components/opportunities/OpportunityFilters.tsx`, los botones "Ordenar" y "Filtros" usan la clase `hidden sm:inline` en el texto, lo que lo oculta en pantallas menores a 640px.

## Solucion

Eliminar `hidden sm:inline` y dejar solo `inline` (o quitar la clase por completo) en las dos etiquetas `<span>` de los botones Ordenar y Filtros.

## Cambios

**Archivo**: `src/components/opportunities/OpportunityFilters.tsx`

Linea ~87 (boton Ordenar):
```text
// Antes:
<span className="hidden sm:inline">Ordenar</span>

// Despues:
<span>Ordenar</span>
```

Linea ~97 (boton Filtros):
```text
// Antes:
<span className="hidden sm:inline">Filtros</span>

// Despues:
<span>Filtros</span>
```

Dos cambios de una sola linea cada uno, sin efectos secundarios.

