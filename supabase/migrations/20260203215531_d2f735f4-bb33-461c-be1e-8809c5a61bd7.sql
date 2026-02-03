-- Create table to track used promo codes
CREATE TABLE public.used_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  promo_code TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(user_id, promo_code)
);

-- Enable Row Level Security
ALTER TABLE public.used_promo_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own promo code usage
CREATE POLICY "Users can view their own promo codes" 
ON public.used_promo_codes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own promo codes
CREATE POLICY "Users can use promo codes" 
ON public.used_promo_codes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_used_promo_codes_user_code ON public.used_promo_codes(user_id, promo_code);