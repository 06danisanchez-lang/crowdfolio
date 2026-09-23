-- Fase 2 — columnas para la calificación fiscal de pérdidas por impago (art. 14.2.k LIRPF).
-- Todas nullable y aditivas: no rompen ninguna fila existente. No se toca RLS —
-- las políticas de public.investments son por fila (auth.uid() = user_id), no por
-- columna, así que cubren estas columnas nuevas automáticamente.

ALTER TABLE public.investments
  ADD COLUMN loss_insolvency_status text
    CHECK (loss_insolvency_status IN ('none', 'open', 'concluded_unpaid', 'unknown')),
  ADD COLUMN loss_insolvency_concluded_date date,
  ADD COLUMN loss_quita_amount numeric
    CHECK (loss_quita_amount > 0),
  ADD COLUMN loss_quita_date date,
  ADD COLUMN loss_enforcement_started boolean,
  ADD COLUMN loss_enforcement_date date,
  ADD COLUMN loss_enforcement_initiator text
    CHECK (loss_enforcement_initiator IN ('user', 'platform')),
  ADD COLUMN loss_assessed_at timestamptz,
  ADD COLUMN loss_rules_version integer;

-- Coherencia: 'concluded_unpaid' exige la fecha de conclusión del concurso.
ALTER TABLE public.investments
  ADD CONSTRAINT investments_loss_insolvency_concluded_date_check
  CHECK (
    loss_insolvency_status IS DISTINCT FROM 'concluded_unpaid'
    OR loss_insolvency_concluded_date IS NOT NULL
  );

-- Coherencia: quita_amount y quita_date van siempre juntos (los dos o ninguno) —
-- la quita es independiente del estado del concurso (también puede darse en un
-- acuerdo de refinanciación extrajudicial).
ALTER TABLE public.investments
  ADD CONSTRAINT investments_loss_quita_pair_check
  CHECK (
    (loss_quita_amount IS NULL) = (loss_quita_date IS NULL)
  );

-- Coherencia: si se marca que la ejecución ha empezado, hacen falta su fecha y
-- quién la inició.
ALTER TABLE public.investments
  ADD CONSTRAINT investments_loss_enforcement_check
  CHECK (
    loss_enforcement_started IS NOT TRUE
    OR (loss_enforcement_date IS NOT NULL AND loss_enforcement_initiator IS NOT NULL)
  );

COMMENT ON COLUMN public.investments.loss_insolvency_status IS 'Estado del concurso de acreedores del deudor: none (no hay concurso), open (abierto, sin concluir), concluded_unpaid (concluido sin cobro), unknown (no se sabe). Art. 14.2.k.b LIRPF.';
COMMENT ON COLUMN public.investments.loss_insolvency_concluded_date IS 'Fecha de conclusión del concurso, solo si loss_insolvency_status = concluded_unpaid.';
COMMENT ON COLUMN public.investments.loss_quita_amount IS 'Importe de la quita (convenio concursal, acuerdo de refinanciación/reestructuración o acuerdo extrajudicial de pagos). La pérdida solo computa por este importe. Art. 14.2.k.a LIRPF.';
COMMENT ON COLUMN public.investments.loss_quita_date IS 'Fecha en que la quita adquiere eficacia.';
COMMENT ON COLUMN public.investments.loss_enforcement_started IS 'Si se ha iniciado un procedimiento judicial de ejecución del crédito distinto del concursal (p. ej. ejecución hipotecaria). Art. 14.2.k.c LIRPF.';
COMMENT ON COLUMN public.investments.loss_enforcement_date IS 'Fecha de inicio del procedimiento de ejecución. La pérdida se imputa al cumplirse 1 año desde esta fecha sin cobro.';
COMMENT ON COLUMN public.investments.loss_enforcement_initiator IS 'Quién inició el procedimiento de ejecución: user (el propio inversor) o platform (la plataforma de crowdfunding).';
COMMENT ON COLUMN public.investments.loss_assessed_at IS 'Cuándo el usuario rellenó el cuestionario de calificación fiscal del impago. NULL = todavía no evaluado (not_assessed).';
COMMENT ON COLUMN public.investments.loss_rules_version IS 'Versión de las reglas de calificación fiscal aplicadas al rellenar el cuestionario, por si cambian en el futuro.';
