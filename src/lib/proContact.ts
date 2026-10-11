// Mientras los pagos no estén activos (PAYMENTS_ENABLED = false), el Pro se da
// a mano: el usuario escribe a soporte y Dani se lo activa desde el panel de admin.

export const SUPPORT_EMAIL = 'soporte@crowdfolio.es';

/**
 * Enlace mailto: con asunto y cuerpo ya escritos. Incluye el correo de la cuenta
 * para que soporte sepa a quién activar el Pro sin tener que preguntar.
 */
export function buildProRequestMailto(accountEmail?: string | null): string {
  const subject = 'Quiero seguir con Crowdfolio Pro';
  const lines = [
    'Hola,',
    '',
    'Me gustaría seguir usando Crowdfolio Pro.',
    '',
    `Correo de mi cuenta: ${accountEmail || '(escríbelo aquí)'}`,
    '',
    'Gracias.',
  ];
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/** Fecha en formato largo español: «4 de noviembre de 2026». */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
