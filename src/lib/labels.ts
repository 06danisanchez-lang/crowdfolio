import { PLATFORMS, STATUS_OPTIONS } from '@/types/investment';

/**
 * Etiqueta legible para un estado de inversión (InvestmentStatus: draft/active/pending/
 * completed/defaulted). Reutiliza STATUS_OPTIONS (src/types/investment.ts) — mismo catálogo
 * que ya usan los Selects de estado.
 *
 * Firma en `string` (no InvestmentStatus) a propósito: los puntos de uso reales manejan datos
 * que llegan como string plano (filas de BD, `Alert.platform`, props de componentes admin) y
 * forzar el tipo ahí solo empujaría el `as InvestmentStatus` a cada call site.
 */
export function getStatusLabel(status: string): string {
  const option = STATUS_OPTIONS.find(s => s.value === status);
  if (option) return option.label;
  // Fallback defensivo — no debería alcanzarse con datos válidos, pero evita mostrar
  // la key cruda si algún día aparece un estado no contemplado en STATUS_OPTIONS.
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Etiqueta legible para una plataforma. Mismo patrón que InvestmentList.tsx / InvestmentDetail.tsx:
 * si es 'other' y hay nombre personalizado, se usa ese; si no, se busca en el catálogo PLATFORMS.
 */
export function getPlatformLabel(platform: string, customName?: string): string {
  if (platform === 'other' && customName) return customName;
  const meta = PLATFORMS.find(p => p.value === platform);
  if (meta) return meta.label;
  // Fallback defensivo — plataforma no contemplada en el catálogo: nombre personalizado si
  // lo hay, si no la key capitalizada (nunca la key cruda tal cual).
  return customName || (platform.charAt(0).toUpperCase() + platform.slice(1));
}
