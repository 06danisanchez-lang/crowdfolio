
# Paso 1: Overlay Root + Helper

Solo 2 cambios. Nada mas.

## 1. `index.html` (editar linea 22-23)

Estado actual (lineas 21-24):
```html
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

Resultado tras el cambio:
```html
<body>
  <div id="root"></div>
  <div id="overlay-root" translate="no" class="notranslate"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

Se inserta una linea nueva entre `#root` y el script.

## 2. `src/lib/overlayContainer.ts` (archivo nuevo)

Contenido completo:
```ts
export function getOverlayContainer(): HTMLElement {
  const el = document.getElementById("overlay-root");
  return el ?? document.body;
}
```

## Que NO se toca

- Ningun archivo UI (dialog, sheet, select, etc.)
- Ningun archivo de i18n
- Ningun otro archivo del proyecto
- No se crean carpetas fuera de `src/`
