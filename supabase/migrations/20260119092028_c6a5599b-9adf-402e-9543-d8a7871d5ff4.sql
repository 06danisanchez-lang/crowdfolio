-- Create platform type enum
CREATE TYPE public.platform_type AS ENUM ('equity', 'lending', 'real_estate', 'mixed');

-- Create platform status enum
CREATE TYPE public.platform_status AS ENUM ('active', 'inactive', 'pending_verification');

-- Create user_platforms table
CREATE TABLE public.user_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ES',
  platform_type platform_type NOT NULL DEFAULT 'real_estate',
  website_url TEXT,
  registration_date DATE,
  status platform_status NOT NULL DEFAULT 'active',
  username TEXT,
  notes TEXT,
  default_withholding NUMERIC DEFAULT 19,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.user_platforms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own platforms"
ON public.user_platforms
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platforms"
ON public.user_platforms
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platforms"
ON public.user_platforms
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platforms"
ON public.user_platforms
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_platforms_updated_at
BEFORE UPDATE ON public.user_platforms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();