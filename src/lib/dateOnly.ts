import { format, parseISO } from 'date-fns';

/**
 * Convierte un Date (por ejemplo, medianoche local — lo que produce el
 * Calendar de shadcn/react-day-picker al elegir un día) a 'YYYY-MM-DD' usando
 * sus componentes en hora LOCAL.
 *
 * Nunca usar `date.toISOString().split('T')[0]` para esto: toISOString()
 * convierte a UTC, y medianoche local con cualquier offset UTC positivo
 * (España: CET +1 en invierno, CEST +2 en verano) cae en las 22:00/23:00 del
 * día UTC anterior — el resultado queda un día antes del elegido. El fallo es
 * intermitente: solo aparece cuando la fecha corresponde a horario de verano
 * si el objeto Date se originó en invierno (o viceversa), lo que lo hace fácil
 * de no detectar en pruebas manuales puntuales.
 *
 * Usar SIEMPRE esta función para construir el string a guardar en una columna
 * `date` de Postgres a partir de un objeto Date. No usar para columnas
 * `timestamptz` (defaulted_at, loss_assessed_at, created_at...), que sí deben
 * seguir usando `.toISOString()` completo.
 */
export function toDateOnlyString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Inversa de toDateOnlyString: 'YYYY-MM-DD' → Date a medianoche LOCAL de ese día.
 *
 * Nunca usar `new Date('YYYY-MM-DD')`: la especificación lo interpreta como
 * medianoche UTC, y en cualquier zona con offset negativo cae en el día
 * anterior (al volver a guardarlo con toDateOnlyString se perdería un día).
 */
export function fromDateOnlyString(value: string): Date {
  return parseISO(value);
}
