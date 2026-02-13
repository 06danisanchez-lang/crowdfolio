

# ThemeProvider global + menu de usuario unificado

## Cambios

### 1. Nuevo: `src/contexts/ThemeContext.tsx`

Contexto y Provider con estado unico:

- Inicializacion: lee `localStorage.getItem('theme')` dentro de try/catch. Si no hay valor, comprueba `window.matchMedia?.('(prefers-color-scheme: dark)')?.matches` con guarda de existencia. Fallback: `false` (light).
- `useEffect` que aplica `document.documentElement.classList.toggle('dark', darkMode)` y escribe en localStorage dentro de try/catch.
- Exporta `ThemeProvider` y `useTheme()` (lanza error si se usa fuera del provider).

### 2. `src/App.tsx`

Envolver con `<ThemeProvider>` justo dentro de `<GlobalErrorBoundary>`, antes de `<QueryClientProvider>`.

### 3. `src/components/layout/UserMenu.tsx`

- Importar `useTheme` y los iconos `Moon`, `Sun`.
- Anadir un `DropdownMenuItem` entre "Configuracion" y el separador para cambiar tema:
  - Icono: Sun si darkMode, Moon si no.
  - Texto: "Modo claro" / "Modo oscuro".

### 4. `src/components/layout/AppLayout.tsx`

- Eliminar linea 45: `const [darkMode, setDarkMode] = useState(...)`.
- Eliminar lineas 54-57: funcion `toggleDarkMode`.
- Eliminar lineas 88-93: botones sueltos de tema y logout del header movil.
- Eliminar imports no usados: `Moon`, `Sun`, `LogOut` de lucide-react y `useState` de react (se mantiene `useRef`, `useEffect`).

### 5. `src/components/settings/SettingsView.tsx`

- Eliminar linea 1: `import { useState } from 'react'` (ya no se necesita para darkMode; se mantiene para password/email pero se reimporta sin el default).
- Eliminar linea 15: `const [darkMode, setDarkMode] = useState(...)`.
- Eliminar lineas 26-29: funcion `toggleDarkMode`.
- Importar `useTheme` del contexto.
- El Switch de Preferencias usa `darkMode` y `toggleDarkMode` del contexto.

## Verificacion

- Ningun `useState` de darkMode queda en AppLayout ni SettingsView.
- Ningun `document.documentElement.classList.toggle('dark')` fuera del ThemeContext.
- Header movil: solo hamburguesa + logo + NotificationBell + AlertsPanel.
- UserMenu y SettingsView sincronizados via contexto unico.
- localStorage protegido con try/catch.
- `window.matchMedia` protegido con optional chaining.

