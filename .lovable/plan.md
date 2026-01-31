

## Plan: Configurar Módulo Fiscal con Año 2025 por Defecto

### Resumen
Modificar el módulo fiscal para que muestre el ejercicio 2025 por defecto y asegurar que el selector de años siempre incluya 2024, 2025 y 2026, independientemente de si hay datos en esos años.

### Cambios a Realizar

#### 1. Modificar `TaxDashboard.tsx`
- Cambiar el estado inicial de `selectedYear` de `new Date().getFullYear()` a `2025`
- Esto hará que al entrar en el módulo fiscal, siempre se muestre 2025 por defecto

```typescript
// Antes
const currentYear = new Date().getFullYear();
const [selectedYear, setSelectedYear] = useState(currentYear);

// Después
const [selectedYear, setSelectedYear] = useState(2025);
```

#### 2. Modificar `TaxYearSelector.tsx`
- Establecer los años fijos: 2024, 2025, 2026
- Combinar con los años disponibles del hook para no perder datos de otros años si existen

```typescript
// Años base garantizados
const baseYears = [2026, 2025, 2024];

// Combinar con años de pagos existentes
const years = [...new Set([...baseYears, ...availableYears])].sort((a, b) => b - a);
```

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/tax/TaxDashboard.tsx` | Cambiar año inicial a 2025 |
| `src/components/tax/TaxYearSelector.tsx` | Garantizar años 2024, 2025, 2026 |

### Comportamiento Final

```text
┌─────────────────────────────────────────┐
│  Resumen Fiscal                         │
│                                         │
│                   [Ejercicio 2025 ▼]    │
│                                         │
│  Opciones del selector:                 │
│  ├── Ejercicio 2026                     │
│  ├── Ejercicio 2025  ← Seleccionado     │
│  └── Ejercicio 2024                     │
└─────────────────────────────────────────┘
```

### Detalles Técnicos

- El selector combina los años base (2024-2026) con cualquier año adicional que tenga datos
- Si el usuario tiene pagos de 2023, ese año también aparecerá en el selector
- Los años se ordenan de más reciente a más antiguo
- Al cargar la página, siempre se muestra 2025 como ejercicio fiscal activo

