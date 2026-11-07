import { supabase } from '@/integrations/supabase/client';
import { buildDemoPortfolio } from './demoPortfolio';

/**
 * Carga la cartera de ejemplo en la cuenta demo (anónima) del visitante.
 * Si la cuenta ya tiene inversiones, no hace nada (volver a /demo no duplica).
 * Si algo falla a medias, borra lo que haya creado para poder reintentar limpio.
 * Solo trabaja con datos de la propia cuenta: RLS impide cualquier otra cosa.
 */
export async function seedDemoPortfolio(userId: string, today: Date = new Date()): Promise<void> {
  const { count, error: countError } = await supabase
    .from('investments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  const portfolio = buildDemoPortfolio(today);

  try {
    const { data: inserted, error: invError } = await supabase
      .from('investments')
      .insert(portfolio.investments.map(inv => ({
        user_id: userId,
        platform: inv.platform,
        project_name: inv.projectName,
        amount: inv.amount,
        expected_return: inv.expectedReturn,
        income_model: inv.incomeModel,
        payment_frequency: inv.paymentFrequency,
        principal_return_type: inv.principalReturnType,
        investment_date: inv.investmentDate,
        expected_end_date: inv.expectedEndDate,
        original_end_date: inv.originalEndDate,
        interest_end_date: inv.interestEndDate,
        was_extended: inv.wasExtended,
        status: inv.status,
        actual_end_date: inv.actualEndDate,
        close_reason: inv.closeReason,
        defaulted_at: inv.defaultedAt,
        loss_insolvency_status: inv.loss?.insolvencyStatus ?? null,
        loss_enforcement_started: inv.loss?.enforcementStarted ?? null,
        loss_enforcement_date: inv.loss?.enforcementDate ?? null,
        loss_enforcement_initiator: inv.loss?.enforcementInitiator ?? null,
        loss_assessed_at: inv.loss?.assessedAt ?? null,
        loss_rules_version: inv.loss ? 1 : null,
        notes: inv.notes,
        currency: 'EUR',
      })))
      .select('id, project_name');
    if (invError) throw invError;

    const idByName = new Map((inserted ?? []).map(r => [r.project_name, r.id]));
    const idOf = (name: string) => {
      const id = idByName.get(name);
      if (!id) throw new Error(`Demo: falta la inversión ${name}`);
      return id;
    };

    const scheduleRows = portfolio.investments.flatMap(inv => inv.schedule.map(s => ({
      investment_id: idOf(inv.projectName),
      expected_date: s.expectedDate,
      expected_amount: s.expectedAmount,
      type: s.type,
      status: s.status,
    })));
    if (scheduleRows.length > 0) {
      const { error } = await supabase.from('investment_schedule').insert(scheduleRows);
      if (error) throw error;
    }

    const paymentRows = portfolio.investments.flatMap(inv => inv.payments.map(p => ({
      investment_id: idOf(inv.projectName),
      date: p.date,
      amount: p.amount,
      type: p.type,
      withholding_applied: p.withholding,
    })));
    if (paymentRows.length > 0) {
      const { error } = await supabase.from('payments').insert(paymentRows);
      if (error) throw error;
    }

    const { error: futureError } = await supabase.from('future_investments').insert(
      portfolio.future.map(f => ({
        user_id: userId,
        platform: f.platform,
        project_name: f.projectName,
        estimated_amount: f.estimatedAmount,
        expected_return: f.expectedReturn,
        estimated_open_date: f.estimatedOpenDate,
        estimated_end_date: f.estimatedEndDate,
        notes: f.notes,
      })),
    );
    if (futureError) throw futureError;
  } catch (err) {
    // Deja la cuenta vacía para que el siguiente intento empiece de cero
    // (los cobros y cuotas se borran en cascada con la inversión).
    await supabase.from('investments').delete().eq('user_id', userId);
    await supabase.from('future_investments').delete().eq('user_id', userId);
    throw err;
  }
}
