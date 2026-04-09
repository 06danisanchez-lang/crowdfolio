
-- Add new columns to investments
ALTER TABLE public.investments ADD COLUMN income_model text DEFAULT 'bullet';
ALTER TABLE public.investments ADD COLUMN payment_frequency text DEFAULT NULL;
ALTER TABLE public.investments ADD COLUMN principal_return_type text DEFAULT 'at_maturity';

-- Create investment_schedule table
CREATE TABLE public.investment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  expected_date date NOT NULL,
  expected_amount numeric NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'pending',
  matched_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies (same ownership pattern as payments)
CREATE POLICY "Users can view schedule of own investments"
ON public.investment_schedule FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.investments
  WHERE investments.id = investment_schedule.investment_id
    AND investments.user_id = auth.uid()
));

CREATE POLICY "Users can insert schedule to own investments"
ON public.investment_schedule FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.investments
  WHERE investments.id = investment_schedule.investment_id
    AND investments.user_id = auth.uid()
));

CREATE POLICY "Users can update schedule of own investments"
ON public.investment_schedule FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.investments
  WHERE investments.id = investment_schedule.investment_id
    AND investments.user_id = auth.uid()
));

CREATE POLICY "Users can delete schedule of own investments"
ON public.investment_schedule FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.investments
  WHERE investments.id = investment_schedule.investment_id
    AND investments.user_id = auth.uid()
));

-- Admin access
CREATE POLICY "Admins can view all schedules"
ON public.investment_schedule FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_investment_schedule_investment_id ON public.investment_schedule(investment_id);
