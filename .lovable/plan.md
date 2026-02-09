

## Ajustar hero: subtitulo mas corto + 3 bullets de valor

### Cambios en `src/components/landing/HeroSection.tsx`

**1. Importar icono `Check` de lucide-react** (linea 2)

Añadir `Check` a la importacion existente de lucide-react para usarlo como checkmark en los bullets.

**2. Sustituir subtitulo** (linea 66-68)

Reemplazar el texto actual por:
"Centraliza y controla todas tus inversiones desde un unico panel."

**3. Añadir 3 bullets de valor** entre el subtitulo y los CTAs (entre lineas 68 y 70)

Insertar una lista con 3 items usando el icono `Check` de lucide-react como checkmark, con estos textos:

- Informe fiscal automatico de todas tus inversiones
- Centralizacion de todas tus plataformas de crowdfunding
- Acceso a nuevas oportunidades de inversion

Los bullets se mostraran centrados, con el icono a la izquierda y el texto a la derecha, usando clases de Tailwind consistentes con el diseño existente (`text-muted-foreground`, espaciado con `gap` y `mb`).

### Estructura resultante del bloque de texto

```text
[Logo]
[Badge]
[Titulo - sin cambios]
[Subtitulo corto]
[3 bullets con checkmarks]
[CTAs - sin cambios]
[Trust line - sin cambios]
```

### Que NO se toca

- Titulo principal (se mantiene exacto)
- Estilos generales, layout, CTAs, trust line, dashboard mockup
- Ningun otro archivo

