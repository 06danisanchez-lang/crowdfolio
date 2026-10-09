/**
 * Porcentaje para mostrar en pantalla, en formato español: 19,0 % (coma decimal y
 * espacio antes del %), igual que los importes, que ya salen como 1.234,56 €.
 * Solo presentación: el valor llega ya en tanto por cien.
 */
export function formatPercent(value: number, fractionDigits = 1): string {
  const normalized = value === 0 ? 0 : value; // evita "-0,0 %"
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(normalized)} %`;
}
