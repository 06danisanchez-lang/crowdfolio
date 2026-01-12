-- Create tax expense category enum type
CREATE TYPE public.tax_expense_category AS ENUM (
  'platform_fees',
  'advisory',
  'management',
  'travel',
  'other'
);

-- Create table for deductible expenses
CREATE TABLE public.tax_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  category tax_expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tax_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tax_expenses
CREATE POLICY "Users can view own tax expenses"
ON public.tax_expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax expenses"
ON public.tax_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax expenses"
ON public.tax_expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax expenses"
ON public.tax_expenses FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tax_expenses_updated_at
BEFORE UPDATE ON public.tax_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add withholding_applied column to payments table
ALTER TABLE public.payments
ADD COLUMN withholding_applied DECIMAL(12,2) DEFAULT 0;

-- Create index for faster queries by year
CREATE INDEX idx_tax_expenses_year ON public.tax_expenses(user_id, year);
CREATE INDEX idx_tax_expenses_date ON public.tax_expenses(date);