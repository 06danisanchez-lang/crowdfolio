-- Cuotas pasadas «cobradas, falta el detalle».
--
-- Al registrar una inversión que ya ha tenido cobros, el usuario puede decir
-- que todo lo previsto hasta hoy le ha llegado sin tener que meter cada cobro.
-- Esas cuotas dejan de salir como atrasadas, pero no se inventa ningún cobro:
-- el informe fiscal las cuenta como datos que faltan hasta que se registren.
--
-- Se guarda en la inversión y no en investment_schedule porque el calendario
-- se borra y se regenera cada vez que se edita la inversión.
alter table public.investments
  add column assumed_paid_until date;

comment on column public.investments.assumed_paid_until is
  'Las cuotas previstas hasta esta fecha (incluida) se han cobrado según el usuario, pero sus cobros no están registrados.';
