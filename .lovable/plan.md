

## Simplificar navegación: eliminar Alertas como módulo separado

### Diagnóstico actual

La navegación (`AppLayout.tsx`) ya muestra 4 items: Dashboard, Inversiones, Inversiones futuras, Fiscalidad. No hay un nav item "Alertas" en el sidebar.

Sin embargo, `AlertsPanel` (el panel lateral tipo Sheet con campana) sigue presente en **3 lugares**:
1. **Mobile header** (línea 90-94) — icono campana con badge
2. **Sidebar desktop** (líneas 139-146) — botón "Alertas" full-width con badge
3. **`NotificationBell`** junto a AlertsPanel en ambos sitios

Estos paneles muestran alertas derivadas de inversiones reales (vencimientos, pagos esperados) vía `useAlerts`. Son independientes de "Inversiones futuras".

### Cambios propuestos

**Archivo: `src/components/layout/AppLayout.tsx`**

1. **Eliminar `AlertsPanel`** del sidebar desktop (líneas 139-146) y del mobile header (líneas 90-94)
2. **Eliminar imports** de `AlertsPanel` y `Alert` type
3. **Eliminar props** `alerts`, `alertCount`, `hasUrgentAlerts` de `AppLayoutProps`
4. Mantener `NotificationBell` (es un componente separado para notificaciones del sistema, no alertas de inversión)

**Archivo: `src/pages/Index.tsx`**

1. **Eliminar** el `useAlerts` hook call y las props `alerts`, `alertCount`, `hasUrgentAlerts` pasadas a `AppLayout`
2. **Eliminar** el `useEffect` de toast de alertas urgentes (líneas 67-75)
3. Eliminar import de `useAlerts`

**No se tocan:**
- `AlertsPanel.tsx` ni `useAlerts.ts` (se dejan por si se reutilizan en el futuro, pero se desconectan del layout)
- `FutureInvestmentList.tsx` (ya tiene lógica de proximidad integrada)
- Ningún otro archivo

### Resultado

Navegación lateral limpia con 4 items:
- Inicio (Dashboard)
- Inversiones
- Inversiones futuras
- Fiscalidad

Los avisos de proximidad viven dentro de "Inversiones futuras" como badges inline (ya implementado). No hay panel de alertas separado en la UI.

