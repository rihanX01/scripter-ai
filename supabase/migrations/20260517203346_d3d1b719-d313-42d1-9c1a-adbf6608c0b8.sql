INSERT INTO public.plan_limits (plan, shorts_limit, longs_limit, ad_free, priority_queue, ai_model) VALUES
  ('free', 3, 1, false, false, 'google/gemini-2.5-flash'),
  ('pro', 50, 20, true, true, 'google/gemini-2.5-flash'),
  ('max', 500, 200, true, true, 'google/gemini-2.5-pro')
ON CONFLICT (plan) DO UPDATE SET
  shorts_limit = EXCLUDED.shorts_limit,
  longs_limit = EXCLUDED.longs_limit,
  ad_free = EXCLUDED.ad_free,
  priority_queue = EXCLUDED.priority_queue,
  ai_model = EXCLUDED.ai_model,
  updated_at = now();