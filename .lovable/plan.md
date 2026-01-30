
## Plan: Añadir Galería de Capturas a la Landing Page

### Resumen
Crear una nueva sección "Descubre la Plataforma" con un carrusel interactivo que muestre las 4 capturas del producto, ubicada justo después del Hero y antes de la sección de plataformas compatibles.

### Ubicación en la página

```text
┌─────────────────────────────────────────┐
│           Header                        │
├─────────────────────────────────────────┤
│           Hero Section                  │
│    (Logo, título, CTAs)                │
├─────────────────────────────────────────┤
│   ★ NUEVA SECCIÓN: Galería ★           │  ← Aquí
│   Carrusel con las 4 capturas          │
├─────────────────────────────────────────┤
│     Plataformas compatibles            │
├─────────────────────────────────────────┤
│          Features                       │
├─────────────────────────────────────────┤
│        Cómo funciona                    │
├─────────────────────────────────────────┤
│         Testimonios                     │
├─────────────────────────────────────────┤
│            CTA Final                    │
├─────────────────────────────────────────┤
│           Footer                        │
└─────────────────────────────────────────┘
```

### Diseño de la sección

La sección incluirá:
- Título: "Descubre la plataforma"
- Subtítulo: "Todo lo que necesitas en un solo lugar"
- Carrusel con las 4 imágenes usando Embla Carousel
- Botones de navegación para cambiar entre capturas
- Indicadores de puntos para mostrar posición actual
- Etiquetas descriptivas bajo cada imagen (Dashboard, Inversiones, Oportunidades, Fiscalidad)

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `src/assets/screenshots/` | Crear directorio y copiar las 4 imágenes |
| `src/pages/Landing.tsx` | Añadir nueva sección con carrusel |

### Estructura del carrusel

```text
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   ←  [Screenshot actual con sombra y borde redondeado]  →  │
│                                                              │
│                     ● ○ ○ ○                                 │
│                                                              │
│              "Dashboard principal"                          │
└─────────────────────────────────────────────────────────────┘
```

### Imágenes a incluir (en orden)

1. **Dashboard** (Captura.JPG) - Vista principal con KPIs y gráficos
2. **Inversiones** (Captura2.JPG) - Lista de proyectos en tabla
3. **Oportunidades** (Captura3.JPG) - Cards de oportunidades de inversión
4. **Fiscalidad** (Captura4.JPG) - Resumen fiscal y proyecciones IRPF

### Detalles técnicos

- Usar componente `Carousel` de shadcn/ui (ya instalado: embla-carousel-react)
- Imágenes con `rounded-xl shadow-2xl border` para look premium
- Transiciones suaves entre slides
- Responsive: en móvil las imágenes ocupan el 100% del ancho
- Autoplay opcional con pausa al hover
- Lazy loading de imágenes para performance
