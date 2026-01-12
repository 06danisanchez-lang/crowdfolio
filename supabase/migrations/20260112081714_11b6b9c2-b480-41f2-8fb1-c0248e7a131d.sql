-- Create investments table
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  custom_platform_name TEXT,
  project_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  investment_date DATE NOT NULL,
  expected_end_date DATE,
  expected_return DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'other',
  location TEXT NOT NULL DEFAULT '',
  expected_return DECIMAL(5,2) NOT NULL,
  term INTEGER NOT NULL,
  min_investment DECIMAL(12,2) NOT NULL DEFAULT 0,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  funding_progress DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  url TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  scraped_at TIMESTAMPTZ,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_investments_user_id ON public.investments(user_id);
CREATE INDEX idx_payments_investment_id ON public.payments(investment_id);
CREATE INDEX idx_opportunities_user_id ON public.opportunities(user_id);

-- Enable Row Level Security
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investments
CREATE POLICY "Users can view own investments" 
  ON public.investments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" 
  ON public.investments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" 
  ON public.investments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" 
  ON public.investments FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for payments (through investment ownership)
CREATE POLICY "Users can view payments of own investments" 
  ON public.payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.investments 
      WHERE investments.id = payments.investment_id 
      AND investments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments to own investments" 
  ON public.payments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investments 
      WHERE investments.id = payments.investment_id 
      AND investments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments of own investments" 
  ON public.payments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.investments 
      WHERE investments.id = payments.investment_id 
      AND investments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments of own investments" 
  ON public.payments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.investments 
      WHERE investments.id = payments.investment_id 
      AND investments.user_id = auth.uid()
    )
  );

-- RLS Policies for opportunities
CREATE POLICY "Users can view own opportunities" 
  ON public.opportunities FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opportunities" 
  ON public.opportunities FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunities" 
  ON public.opportunities FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunities" 
  ON public.opportunities FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();