

## Seccion de Analytics para el Admin Dashboard

### Resumen

Se anadira una seccion visual de "Analytics" entre las tarjetas KPI y la tabla de usuarios en `/admin-dashboard`. Contendra tres graficos profesionales y responsive usando Recharts (ya instalado en el proyecto).

### Datos disponibles

Antes de implementar, es importante saber que:
- La tabla `investments` no tiene un campo `investment_type`. La clasificacion Lending/Equity solo existe en la tabla `assets` (campo `asset_type`). El grafico de Asset Allocation usara los datos de `assets`.
- La tabla `investments` si tiene datos reales (6 registros en plataformas como Urbanitae, Wecity, etc.). Se combinaran ambas tablas para el Market Share.
- La tabla `tax_years` esta actualmente vacia, por lo que la metrica de retencion mostrara 0% con un estado vacio elegante.

### Los 3 graficos

**1. Grafico de Tarta - Asset Allocation (Lending vs Equity)**
- Fuente: tabla `assets`, campo `asset_type`
- Muestra distribucion porcentual del volumen entre LENDING y EQUITY
- Colores: azul para Lending, violeta para Equity
- Estado vacio: mensaje "Sin activos clasificados" con icono

**2. Grafico de Barras - Market Share por Plataforma**
- Fuente: combinacion de `investments` (platform/custom_platform_name) y `assets` (platform_name)
- Barras horizontales ordenadas de mayor a menor volumen
- Colores con gradiente profesional
- Estado vacio: mensaje "Sin inversiones registradas"

**3. Metrica de Retencion - Actividad Fiscal**
- Calculo: (usuarios con al menos 1 registro en `tax_years`) / (total usuarios) x 100
- Indicador circular tipo gauge con porcentaje
- Texto descriptivo: "X de Y usuarios han configurado su perfil fiscal"
- Estado vacio: muestra 0% con mensaje motivador

### Arquitectura tecnica

**Archivos nuevos:**
- `src/components/admin/AdminAnalyticsSection.tsx` - Componente principal que contiene los 3 graficos en un grid responsive (1 columna en movil, 3 en desktop)

**Archivos modificados:**
- `src/hooks/useAdminDashboard.ts` - Extender la query para incluir tambien datos de `tax_years` (solo user_id distintos). Anadir al tipo `AdminDashboardData` los campos calculados: `assetAllocation`, `platformMarketShare` y `taxRetentionRate`.
- `src/pages/AdminDashboard.tsx` - Importar y renderizar `AdminAnalyticsSection` entre las KPI cards y la tabla de usuarios.

**Sin cambios en base de datos** - Toda la informacion necesaria ya existe en las tablas actuales con las politicas RLS de admin configuradas.

### Detalles de implementacion

**Hook `useAdminDashboard.ts`:**
```
// Nuevos datos a agregar en la query
- Fetch adicional: supabase.from('tax_years').select('user_id')
- Calcular assetAllocation: agrupar assets por asset_type, sumar volumen
- Calcular platformMarketShare: combinar investments + assets, agrupar por plataforma
- Calcular taxRetention: contar user_ids unicos en tax_years vs total profiles
```

**Tipo extendido de `AdminDashboardData`:**
```
assetAllocation: { name: string; value: number }[]
platformMarketShare: { name: string; value: number }[]
taxRetention: { usersWithTax: number; totalUsers: number; rate: number }
```

**Componente `AdminAnalyticsSection`:**
- Grid `grid-cols-1 lg:grid-cols-3` con gap-4
- Cada grafico dentro de un Card con CardHeader y CardTitle
- PieChart de Recharts para Asset Allocation (innerRadius para donut)
- BarChart horizontal de Recharts para Market Share
- Indicador circular custom con SVG para retencion
- Todos los graficos con ResponsiveContainer height={250}
- Paleta de colores coherente con el tema del dashboard

**Estados vacios:**
- Centrados verticalmente en el espacio del grafico
- Icono en gris claro + texto descriptivo
- Misma altura que el grafico normal para mantener consistencia visual

