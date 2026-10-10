import type { Investment } from '@/types/investment';

/**
 * Reparte las inversiones "terminadas" que devuelve useInvestments (completed + pending)
 * entre la cartera de hoy y el histórico.
 *
 * `pending` = venció pero el usuario aún no ha confirmado que le devolvieron el capital
 * (completed nunca es automático). Ese dinero sigue fuera, así que cuenta como capital en
 * cartera y no como inversión cerrada.
 */
export function splitFinished(finished: Investment[]): { pending: Investment[]; closed: Investment[] } {
  const pending: Investment[] = [];
  const closed: Investment[] = [];
  for (const inv of finished) (inv.status === 'pending' ? pending : closed).push(inv);
  return { pending, closed };
}
