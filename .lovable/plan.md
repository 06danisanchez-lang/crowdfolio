

## Implementar cumplimiento legal minimo (solo frontend)

### Constantes centralizadas

Crear `src/lib/legal/routes.ts`:

```typescript
export const LEGAL_ROUTES = {
  legal: '/aviso-legal',
  privacy: '/politica-privacidad',
  terms: '/terminos',
  cookies: '/cookies',
};
```

Unica fuente de verdad. Cero strings de ruta duplicados.

### 1. Crear 4 paginas legales en `src/pages/`

| Archivo | Constante usada |
|---------|----------------|
| `AvisoLegal.tsx` | `LEGAL_ROUTES.legal` |
| `PoliticaPrivacidad.tsx` | `LEGAL_ROUTES.privacy` |
| `Terminos.tsx` | `LEGAL_ROUTES.terms` |
| `Cookies.tsx` | `LEGAL_ROUTES.cookies` |

Cada pagina: card centrada, titulo, fecha placeholder, secciones editables, boton "Volver" con `useNavigate(-1)`.

### 2. Rutas en App.tsx

Importar `LEGAL_ROUTES` y las 4 paginas. Registrar 4 `<Route>` publicas.

### 3. Footer landing (`src/components/landing/Footer.tsx`)

Importar `LEGAL_ROUTES` y `Link`. Fila con 4 enlaces: Aviso legal, Politica de privacidad, Terminos y condiciones, Cookies. Sin `target="_blank"`. Navegacion interna con `Link`.

### 4. Footer app (`src/components/layout/AppLayout.tsx`)

Importar `LEGAL_ROUTES` y `Link`. Footer discreto al final de `<main>`. Sin `target="_blank"`.

### 5. Checkbox en signup (`src/pages/Auth.tsx`)

- Estado `termsAccepted` (false), reset en `switchView`
- Solo visible en signup
- Texto exacto: "Confirmo que he leido y acepto la Politica de privacidad y los Terminos y condiciones."
- "Politica de privacidad" enlaza a `LEGAL_ROUTES.privacy` con `Link`. Sin `target="_blank"`
- "Terminos y condiciones" enlaza a `LEGAL_ROUTES.terms` con `Link`. Sin `target="_blank"`
- Boton: `disabled={isSubmitting || (view === 'signup' && !termsAccepted)}`

### 6. Sin banner de cookies. Solo tecnicas de sesion, documentado en `LEGAL_ROUTES.cookies`.

### Tests garantizados

- **Test A**: `target="_blank"` aparece 0 veces en enlaces legales
- **Test B**: "acepta" aparece 0 veces en el checkbox
- **Test C**: Texto exacto con "acepto"

### Seccion tecnica

**Archivos nuevos (5):** `src/lib/legal/routes.ts`, `src/pages/AvisoLegal.tsx`, `src/pages/PoliticaPrivacidad.tsx`, `src/pages/Terminos.tsx`, `src/pages/Cookies.tsx`

**Archivos modificados (4):** `src/App.tsx`, `src/components/landing/Footer.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/Auth.tsx`

**No se toca:** Base de datos, autenticacion, estilos globales, menus, sidebar. Sin banner. Sin `target="_blank"`.

