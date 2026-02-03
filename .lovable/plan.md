
# Plan: Botón "Compartir mi Éxito"

## Objetivo
Crear un botón que capture la tarjeta de resumen de rentabilidad como imagen y la comparta usando el menú nativo de compartir del móvil con el texto: "Gestiono mi cartera de Urbanitae con https://crowdfolio.es 🚀"

## Dependencias a Instalar
- `html-to-image` - Para capturar el DOM como imagen PNG/JPEG

## Componentes a Crear

### 1. ShareSuccessButton.tsx
**Ubicación:** `src/components/dashboard/ShareSuccessButton.tsx`

Botón con las siguientes funcionalidades:
- Icono de compartir (Share2 de lucide-react)
- Texto "Compartir mi éxito"
- Al hacer clic:
  1. Captura la tarjeta de rentabilidad usando `html-to-image`
  2. Convierte a blob
  3. Usa `navigator.share()` con la imagen y el texto predefinido
  4. Fallback para navegadores sin Web Share API (descarga la imagen)

```typescript
// Estructura del componente
interface ShareSuccessButtonProps {
  targetRef: React.RefObject<HTMLDivElement>;
  summary: {
    totalInvested: number;
    totalReturns: number;
    averageReturn: number;
  };
}
```

## Archivos a Modificar

### 1. src/pages/Index.tsx
**Cambios:**
- Añadir un `useRef` para referenciar la tarjeta a capturar
- Crear una tarjeta especial "shareable" que contenga los KPIs de rentabilidad
- Añadir el `ShareSuccessButton` en la cabecera del dashboard junto al botón de añadir inversión

### 2. Crear componente ShareableCard.tsx (opcional)
**Ubicación:** `src/components/dashboard/ShareableCard.tsx`

Una tarjeta diseñada específicamente para ser capturada:
- Fondo con gradiente atractivo
- Logo de Crowdfolio
- Métricas principales (capital invertido, retornos, rentabilidad)
- Diseño optimizado para compartir en redes sociales

## Flujo de Usuario

```text
Usuario en Dashboard
        │
        ▼
Clic en "Compartir mi éxito"
        │
        ▼
┌─────────────────────────────┐
│  html-to-image captura      │
│  la tarjeta de resumen      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  navigator.share() abre     │
│  menú nativo de compartir   │
│  - WhatsApp                 │
│  - Twitter                  │
│  - Instagram Stories        │
│  - etc.                     │
└─────────────────────────────┘
```

## Detalles Técnicos

### Captura con html-to-image
```typescript
import { toPng } from 'html-to-image';

const captureAndShare = async () => {
  const node = targetRef.current;
  if (!node) return;
  
  // Capturar como PNG
  const dataUrl = await toPng(node, { quality: 0.95 });
  
  // Convertir a blob para compartir
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], 'mi-exito-crowdfolio.png', { type: 'image/png' });
  
  // Usar Web Share API
  if (navigator.share && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: 'Mi éxito en Crowdfolio',
      text: 'Gestiono mi cartera de Urbanitae con https://crowdfolio.es 🚀',
      files: [file]
    });
  } else {
    // Fallback: descargar imagen
    downloadImage(dataUrl);
  }
};
```

### Web Share API
- Disponible en móviles (iOS Safari, Android Chrome)
- Requiere contexto seguro (HTTPS)
- Fallback para desktop: descarga directa de la imagen

## Diseño de la Tarjeta para Compartir

```text
┌────────────────────────────────┐
│  ┌──────┐                      │
│  │ LOGO │  CROWDFOLIO          │
│  └──────┘                      │
├────────────────────────────────┤
│                                │
│   💰 Capital Invertido         │
│      €25,000                   │
│                                │
│   📈 Retornos Recibidos        │
│      €3,250 (+13%)             │
│                                │
│   ⭐ Rentabilidad Media        │
│      8.5% anual                │
│                                │
├────────────────────────────────┤
│  🚀 crowdfolio.es              │
└────────────────────────────────┘
```

## Archivos Finales

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `package.json` | Modificar | Añadir `html-to-image` |
| `src/components/dashboard/ShareSuccessButton.tsx` | Crear | Botón de compartir |
| `src/components/dashboard/ShareableCard.tsx` | Crear | Tarjeta optimizada para captura |
| `src/pages/Index.tsx` | Modificar | Integrar botón y refs |

## Consideraciones

### Compatibilidad
- Web Share API: iOS 12.2+, Android Chrome 61+
- Desktop: Fallback a descarga directa
- Mostrar toast de éxito/error según resultado

### UX
- Loading state mientras se genera la imagen
- Toast de confirmación al compartir
- Ocultar botón si no hay inversiones (nada que compartir)

### Privacidad
- El usuario decide qué compartir
- No se comparten datos sensibles automáticamente
