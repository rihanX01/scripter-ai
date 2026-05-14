-- 1. Dedupe any legacy rows so user_id can be unique
DELETE FROM public.usage_counters a
USING public.usage_counters b
WHERE a.id < b.id AND a.user_id = b.user_id;

-- 2. Schema: add window_start, drop monthly period_start, enforce uniqueness
ALTER TABLE public.usage_counters
  ADD COLUMN IF NOT EXISTS window_start timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.usage_counters
  DROP COLUMN IF EXISTS period_start;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_counters_user_id_key'
  ) THEN
    ALTER TABLE public.usage_counters
      ADD CONSTRAINT usage_counters_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Read-only usage snapshot (auto-resets if window expired)
CREATE OR REPLACE FUNCTION public.get_my_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan subscription_plan;
  _row public.usage_counters;
  _shorts_limit int;
  _longs_limit int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT plan INTO _plan FROM public.profiles WHERE user_id = _uid;
  IF _plan IS NULL THEN _plan := 'free'; END IF;

  SELECT shorts_limit, longs_limit INTO _shorts_limit, _longs_limit
    FROM public.plan_limits WHERE plan = _plan;

  INSERT INTO public.usage_counters (user_id, window_start)
    VALUES (_uid, now())
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.usage_counters WHERE user_id = _uid;

  IF now() - _row.window_start >= interval '24 hours' THEN
    UPDATE public.usage_counters
      SET window_start = now(), shorts_used = 0, longs_used = 0, updated_at = now()
      WHERE user_id = _uid
      RETURNING * INTO _row;
  END IF;

  RETURN jsonb_build_object(
    'plan', _plan,
    'shorts_used', _row.shorts_used,
    'longs_used', _row.longs_used,
    'shorts_limit', coalesce(_shorts_limit, 0),
    'longs_limit', coalesce(_longs_limit, 0),
    'reset_at', _row.window_start + interval '24 hours'
  );
END;
$$;

-- 4. Atomic consume + increment with limit check
CREATE OR REPLACE FUNCTION public.consume_quota(_format text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan subscription_plan;
  _row public.usage_counters;
  _shorts_limit int;
  _longs_limit int;
  _reset_at timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _format NOT IN ('short','long') THEN RAISE EXCEPTION 'Invalid format'; END IF;

  SELECT plan INTO _plan FROM public.profiles WHERE user_id = _uid;
  IF _plan IS NULL THEN _plan := 'free'; END IF;

  SELECT shorts_limit, longs_limit INTO _shorts_limit, _longs_limit
    FROM public.plan_limits WHERE plan = _plan;

  INSERT INTO public.usage_counters (user_id, window_start)
    VALUES (_uid, now())
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.usage_counters WHERE user_id = _uid FOR UPDATE;

  IF now() - _row.window_start >= interval '24 hours' THEN
    UPDATE public.usage_counters
      SET window_start = now(), shorts_used = 0, longs_used = 0, updated_at = now()
      WHERE user_id = _uid
      RETURNING * INTO _row;
  END IF;

  _reset_at := _row.window_start + interval '24 hours';

  IF _format = 'short' THEN
    IF _row.shorts_used >= coalesce(_shorts_limit, 0) THEN
      RAISE EXCEPTION 'QUOTA_EXCEEDED:short:%:%:%', _row.shorts_used, coalesce(_shorts_limit,0), _reset_at;
    END IF;
    UPDATE public.usage_counters
      SET shorts_used = shorts_used + 1, updated_at = now()
      WHERE user_id = _uid
      RETURNING * INTO _row;
  ELSE
    IF _row.longs_used >= coalesce(_longs_limit, 0) THEN
      RAISE EXCEPTION 'QUOTA_EXCEEDED:long:%:%:%', _row.longs_used, coalesce(_longs_limit,0), _reset_at;
    END IF;
    UPDATE public.usage_counters
      SET longs_used = longs_used + 1, updated_at = now()
      WHERE user_id = _uid
      RETURNING * INTO _row;
  END IF;

  RETURN jsonb_build_object(
    'plan', _plan,
    'shorts_used', _row.shorts_used,
    'longs_used', _row.longs_used,
    'shorts_limit', coalesce(_shorts_limit, 0),
    'longs_limit', coalesce(_longs_limit, 0),
    'reset_at', _reset_at
  );
END;
$$;

-- 5. Admin-only manual reset
CREATE OR REPLACE FUNCTION public.admin_reset_usage(_target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  INSERT INTO public.usage_counters (user_id, window_start, shorts_used, longs_used)
    VALUES (_target, now(), 0, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET window_start = now(), shorts_used = 0, longs_used = 0, updated_at = now();
END;
$$;