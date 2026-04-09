ALTER TABLE public.investments
  ALTER COLUMN platform DROP NOT NULL,
  ALTER COLUMN project_name DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN investment_date DROP NOT NULL,
  ALTER COLUMN expected_return DROP NOT NULL;