-- Retrasos y prórrogas: no perder la fecha de vencimiento prometida.
--
-- Cuando el usuario indicaba que una inversión se había prorrogado o que el cobro
-- llegaba con retraso, la app movía expected_end_date a la nueva fecha y olvidaba
-- la original. Desde ese momento la inversión parecía ir "a tiempo": la ficha no
-- mostraba el retraso y la rentabilidad media de la cartera volvía a la prometida.
--
-- original_end_date: vencimiento prometido al invertir. Se rellena la primera vez
--   que la fecha se mueve hacia delante; NULL = nunca se ha movido.
-- interest_end_date: hasta cuándo genera intereses si se marcó un retraso
--   ("cobrarás lo prometido, pero más tarde"); NULL = hasta expected_end_date
--   (lo normal, y también tras una prórroga oficial).
--
-- No se rellenan filas antiguas: las que ya se movieron no tienen forma de
-- recuperar su fecha original.
alter table public.investments add column if not exists original_end_date date;
alter table public.investments add column if not exists interest_end_date date;
