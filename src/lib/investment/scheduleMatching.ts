// La lógica vive en supabase/functions/_shared/scheduleMatching.ts: la usan la
// app y el correo diario de avisos (send-digest), y así no pueden separarse.
export { matchScheduleToPayments } from '../../../supabase/functions/_shared/scheduleMatching.ts';
