

## Quitar la coma del titulo principal

En `src/components/landing/HeroSection.tsx`, linea 44, el titulo dice:

```
crowdfunding
```
seguido de `,{' '}` en la linea 56.

### Cambio unico

Eliminar la coma `,` de la linea 56, dejando solo el salto de linea. El titulo pasara de:

**Antes:** "Toda tu cartera de crowdfunding, en un solo lugar."

**Despues:** "Toda tu cartera de crowdfunding en un solo lugar."

### Detalle tecnico

En `src/components/landing/HeroSection.tsx`, reemplazar `,{' '}` por `{' '}` en la linea 56 (tras el cierre del `</span>` de "crowdfunding").

Un solo archivo modificado. Sin cambios en rutas, estilos, logica ni BD.

