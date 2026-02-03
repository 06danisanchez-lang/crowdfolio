

# Plan: Reducir Espaciado y Añadir Logo Central

## Objetivo
Ajustar la landing page para que tenga menos espacio vertical entre secciones, especialmente en el hero, y añadir el logo grande de Crowdfolio centrado como se ve en la imagen de referencia.

## Cambios a Realizar

### 1. HeroSection.tsx - Reducir padding y añadir logo central

**Cambios:**
- Reducir el padding vertical de `py-20 md:py-32 lg:py-40` a `py-12 md:py-16 lg:py-20`
- Añadir el logo de Crowdfolio grande y centrado antes del badge
- Reducir el `mb-8` del badge a `mb-4`
- Reducir el `mb-6` del título a `mb-4`
- Reducir el `mb-10` del subtítulo a `mb-6`
- Reducir el espacio del mockup de `mt-16 md:mt-20` a `mt-10 md:mt-12`

### 2. StatsSection.tsx - Reducir padding

**Cambios:**
- Reducir el padding de `py-16 md:py-20` a `py-10 md:py-12`

### 3. ProductShowcase.tsx - Reducir padding

**Cambios:**
- Reducir los paddings verticales para mantener consistencia

### 4. HowItWorks.tsx - Reducir padding

**Cambios:**
- Reducir de `py-20 md:py-32` a `py-12 md:py-16`

### 5. CTASection.tsx - Reducir padding

**Cambios:**
- Reducir de `py-20 md:py-32` a `py-12 md:py-16`

### 6. FeaturesGrid.tsx - Verificar y reducir padding si necesario

### 7. TestimonialCarousel.tsx - Verificar y reducir padding si necesario

## Detalle Visual del Nuevo Hero

```text
┌─────────────────────────────────────────┐
│  [Header con logo pequeño]              │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [Logo CROWDFOLIO grande]       │    │  ← NUEVO
│  │     centrado                    │    │
│  └─────────────────────────────────┘    │
│                                         │  ← Menos espacio
│  ✨ Gestión inteligente de inversiones  │
│                                         │  ← Menos espacio
│  Toda tu cartera de Crowdfunding        │
│  bajo control y lista para la Renta     │
│                                         │  ← Menos espacio
│  [Subtítulo]                            │
│                                         │  ← Menos espacio
│  [CTA Botones]                          │
│                                         │
│  Sin tarjeta de crédito · ...           │
│                                         │
│  [Dashboard Mockup]                     │
│                                         │
└─────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio Principal |
|---------|------------------|
| `src/components/landing/HeroSection.tsx` | Añadir logo central, reducir todos los margins/paddings |
| `src/components/landing/StatsSection.tsx` | Reducir py de 16/20 a 10/12 |
| `src/components/landing/ProductShowcase.tsx` | Reducir paddings verticales |
| `src/components/landing/HowItWorks.tsx` | Reducir py de 20/32 a 12/16 |
| `src/components/landing/CTASection.tsx` | Reducir py de 20/32 a 12/16 |
| `src/components/landing/FeaturesGrid.tsx` | Revisar y reducir si necesario |
| `src/components/landing/TestimonialCarousel.tsx` | Revisar y reducir si necesario |

## Resumen de Reducciones de Espaciado

| Sección | Antes | Después |
|---------|-------|---------|
| Hero section | `py-20 md:py-32 lg:py-40` | `py-12 md:py-16 lg:py-20` |
| Badge margin | `mb-8` | `mb-4` |
| Título margin | `mb-6` | `mb-4` |
| Subtítulo margin | `mb-10` | `mb-6` |
| Mockup margin | `mt-16 md:mt-20` | `mt-10 md:mt-12` |
| Stats | `py-16 md:py-20` | `py-10 md:py-12` |
| How it works | `py-20 md:py-32` | `py-12 md:py-16` |
| CTA | `py-20 md:py-32` | `py-12 md:py-16` |

