-- Create ENUM types for asset and transaction classification
CREATE TYPE public.asset_type AS ENUM ('LENDING', 'EQUITY');
CREATE TYPE public.transaction_type AS ENUM ('INTEREST', 'DIVIDEND', 'SALE', 'LOSS');

-- Create assets table (replaces investments for tax purposes)
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ES',
  asset_type public.asset_type NOT NULL,
  acquisition_cost DECIMAL NOT NULL,
  investment_date DATE NOT NULL,
  expected_end_date DATE,
  expected_return DECIMAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table (replaces payments for tax purposes)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type public.transaction_type NOT NULL,
  gross_amount DECIMAL NOT NULL,
  withholding_amount DECIMAL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tax_years table for carrying forward losses
CREATE TABLE public.tax_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  rcm_losses_carried DECIMAL DEFAULT 0,
  gpp_losses_carried DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Create indexes for performance
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_country_code ON public.assets(country_code);
CREATE INDEX idx_assets_asset_type ON public.assets(asset_type);
CREATE INDEX idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_tax_years_user_year ON public.tax_years(user_id, year);

-- Enable RLS on all new tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_years ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets
CREATE POLICY "Users can view own assets"
ON public.assets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
ON public.assets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
ON public.assets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
ON public.assets FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all assets"
ON public.assets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for transactions (through asset ownership)
CREATE POLICY "Users can view transactions of own assets"
ON public.transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.assets
  WHERE assets.id = transactions.asset_id
    AND assets.user_id = auth.uid()
));

CREATE POLICY "Users can insert transactions to own assets"
ON public.transactions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.assets
  WHERE assets.id = transactions.asset_id
    AND assets.user_id = auth.uid()
));

CREATE POLICY "Users can update transactions of own assets"
ON public.transactions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.assets
  WHERE assets.id = transactions.asset_id
    AND assets.user_id = auth.uid()
));

CREATE POLICY "Users can delete transactions of own assets"
ON public.transactions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.assets
  WHERE assets.id = transactions.asset_id
    AND assets.user_id = auth.uid()
));

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tax_years
CREATE POLICY "Users can view own tax years"
ON public.tax_years FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax years"
ON public.tax_years FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax years"
ON public.tax_years FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax years"
ON public.tax_years FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at on assets
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on tax_years
CREATE TRIGGER update_tax_years_updated_at
BEFORE UPDATE ON public.tax_years
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();