-- Borradores con datos a medias (importación desde Excel/CSV).
--
-- Antes, importe, fecha de inversión y rentabilidad eran obligatorios en la
-- base de datos incluso para un borrador, y la importación rellenaba lo que
-- faltaba con 0 € / 0 % / la fecha de hoy. Una fecha inventada en un borrador
-- no se distingue de una real al completarlo, y la fecha de inversión cuenta
-- para el informe fiscal. Ahora un borrador puede dejarlas vacías; cualquier
-- otro estado las sigue exigiendo.
alter table public.investments
  alter column amount drop not null,
  alter column investment_date drop not null,
  alter column expected_return drop not null;

alter table public.investments
  add constraint investments_required_unless_draft_check check (
    status = 'draft'
    or (amount is not null and investment_date is not null and expected_return is not null)
  );
