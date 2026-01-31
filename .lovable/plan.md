

## Plan: Mensaje Amigable para Ejercicios Sin Datos

### Resumen
Añadir un estado vacío amigable en el módulo fiscal cuando un ejercicio no tiene liquidaciones registradas, mostrando un mensaje motivador en lugar de tarjetas con valores en 0€.

### Lógica de Detección

Un ejercicio se considera "sin datos" cuando:
- `grossIncome === 0` (sin rendimientos)
- `withholdingsApplied === 0` (sin retenciones)
- `deductibleExpenses === 0` (sin gastos)

### Diseño Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        📊                                                   │
│                                                             │
│   Aún no tienes liquidaciones registradas en 2026          │
│                                                             │
│   ¡Es un buen momento para planificar tus próximas         │
│   inversiones!                                              │
│                                                             │
│   [ Ver Oportunidades ]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cambios a Realizar

#### 1. Modificar `TaxDashboard.tsx`
- Añadir lógica para detectar si el año está vacío
- Mostrar componente de estado vacío en lugar del contenido normal
- El mensaje incluirá el año dinámicamente

```typescript
const hasNoData = summary.grossIncome === 0 && 
                  summary.withholdingsApplied === 0 && 
                  summary.deductibleExpenses === 0;

if (hasNoData) {
  return (
    // Empty state con mensaje amigable
  );
}
```

#### 2. Crear componente `TaxEmptyState.tsx`
- Componente dedicado para el estado vacío
- Props: `year: number`
- Incluye icono, mensaje personalizado y botón opcional

### Archivos a Modificar/Crear

| Archivo | Acción |
|---------|--------|
| `src/components/tax/TaxEmptyState.tsx` | Crear - componente de estado vacío |
| `src/components/tax/TaxDashboard.tsx` | Modificar - integrar estado vacío |

### Comportamiento

| Escenario | Resultado |
|-----------|-----------|
| Año 2025 con datos | Se muestran las tarjetas y tabs normales |
| Año 2026 sin datos | Se muestra mensaje amigable + selector de año |
| Año 2024 sin datos | Se muestra mensaje amigable (ajustado al pasado) |

### Mensajes según el año

- **Año futuro (ej: 2026)**: "Aún no tienes liquidaciones registradas en 2026. ¡Es un buen momento para planificar tus próximas inversiones!"
- **Año pasado (ej: 2024)**: "No tienes liquidaciones registradas en 2024. Puedes añadir gastos deducibles si procede."

### Detalles Técnicos

El componente `TaxEmptyState` incluirá:
- Icono de gráfico vacío (BarChart3 o similar)
- Título con el año dinámico
- Subtítulo motivador
- Botón opcional "Ver Oportunidades" para años futuros
- Mantiene visible el selector de año para cambiar a otro ejercicio

