

## Mejora del Admin Dashboard: Panel de Detalle de Usuario

### Objetivo
Al hacer clic en una fila de usuario o en el boton "Ver Detalles", se abrira un **Sheet (panel lateral)** que muestra el desglose completo de la cartera del usuario seleccionado, incluyendo sus inversiones, assets, tipo de activo, y el ticket promedio.

Se usa un Sheet (panel lateral desde la derecha) en lugar de un modal porque la cantidad de datos puede ser extensa y un panel lateral permite scroll natural sin tapar la tabla principal.

---

### Cambios necesarios

#### 1. Ampliar el hook `useAdminDashboard.ts`

Actualmente el hook solo trae campos agregados (`user_id, amount` / `user_id, acquisition_cost`). Se necesita traer mas campos para poder mostrar el detalle por inversion:

- **Investments**: agregar `id, platform, custom_platform_name, project_name, status` a la query
- **Assets**: agregar `id, platform_name, project_name, asset_type, status` a la query

Se creara una nueva interfaz `AdminUserInvestment` para representar cada inversion/asset individual, y se agregara un campo `investments` al tipo `AdminUser` con el array de todas sus inversiones y assets combinados.

Estructura de datos nueva:

```text
interface AdminUserInvestment {
  id: string
  source: 'investment' | 'asset'
  projectName: string
  platformName: string
  amount: number
  assetType: 'LENDING' | 'EQUITY' | null  // null para inversiones legacy
  status: string
}

interface AdminUser {
  // ...campos existentes...
  investments: AdminUserInvestment[]
  investmentCount: number
  averageTicket: number  // totalInvested / investmentCount
}
```

#### 2. Nuevo componente: `AdminUserDetailSheet`

Se creara un componente dentro de `src/pages/AdminDashboard.tsx` (o como componente inline) que renderiza un **Sheet** con:

- **Cabecera**: Nombre del usuario, email y badge de plan (Free/Pro)
- **3 metricas resumen**:
  - Total Invertido (formato EUR)
  - Numero de Inversiones
  - Ticket Promedio (Total / N inversiones, formato EUR)
- **Tabla de inversiones**: Columnas: Proyecto, Plataforma, Monto, Tipo (Lending/Equity/Legacy), Estado
- **Estado vacio**: Mensaje si el usuario no tiene inversiones registradas

#### 3. Modificar la tabla de usuarios en `AdminDashboard.tsx`

- Hacer clickeable toda la fila (`TableRow` con `onClick` y `cursor-pointer`)
- Activar el boton "Ver Detalles" (quitar `disabled`)
- Gestionar el estado del Sheet con `useState<AdminUser | null>`
- Al hacer clic en una fila o en "Ver Detalles", se abre el Sheet con los datos del usuario seleccionado

---

### Detalle tecnico

**Archivos a modificar:**
- `src/hooks/useAdminDashboard.ts` - Ampliar queries y tipos
- `src/pages/AdminDashboard.tsx` - Agregar Sheet, estado de seleccion, hacer filas clickeables

**No se necesitan cambios de base de datos** - Las queries existentes ya tienen permisos RLS de admin para leer `investments` y `assets` de todos los usuarios.

**Componentes UI utilizados:**
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` (ya disponible en el proyecto)
- `Table` para la lista de inversiones dentro del panel
- `Badge` para mostrar el tipo de activo (Lending/Equity)
- `Separator` para dividir secciones

**Calculo del Ticket Promedio:**
```text
averageTicket = totalInvested / investmentCount
// Si investmentCount === 0, mostrar "0,00 EUR"
```

**Formato de moneda:** Se reutiliza la funcion `formatCurrency` existente que ya usa `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
