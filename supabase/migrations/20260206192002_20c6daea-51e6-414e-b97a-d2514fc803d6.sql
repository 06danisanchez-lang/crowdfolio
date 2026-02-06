-- Backfill: insertar perfiles historicos
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Backfill: insertar suscripciones historicas
INSERT INTO public.subscriptions (user_id, status, plan)
SELECT id, 'free', 'free'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT DO NOTHING;