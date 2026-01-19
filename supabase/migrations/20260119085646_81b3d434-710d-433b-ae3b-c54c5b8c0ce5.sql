-- Create opportunity_alerts table
CREATE TABLE public.opportunity_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  min_return NUMERIC,
  max_return NUMERIC,
  platforms TEXT[] DEFAULT '{}',
  project_types TEXT[] DEFAULT '{}',
  risk_levels TEXT[] DEFAULT '{}',
  max_term INTEGER,
  max_min_investment NUMERIC,
  locations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.opportunity_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own alerts"
ON public.opportunity_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
ON public.opportunity_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
ON public.opportunity_alerts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
ON public.opportunity_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_opportunity_alerts_updated_at
BEFORE UPDATE ON public.opportunity_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();