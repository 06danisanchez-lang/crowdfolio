-- Completa tax_expenses con las columnas/objetos que la migración original
-- (20260112082707) definía pero que nunca llegaron a producción: notes,
-- updated_at + su trigger, e índice por (user_id, year).
-- No se toca investment_id (se decidió no añadirla — el código ya no la usa),
-- ni el tipo/nulabilidad de columnas existentes, ni la policy actual.

ALTER TABLE public.tax_expenses
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.tax_expenses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS update_tax_expenses_updated_at ON public.tax_expenses;
CREATE TRIGGER update_tax_expenses_updated_at
BEFORE UPDATE ON public.tax_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tax_expenses_year ON public.tax_expenses(user_id, year);
