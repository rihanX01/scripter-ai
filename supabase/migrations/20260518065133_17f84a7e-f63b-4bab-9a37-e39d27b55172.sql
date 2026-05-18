
ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS ideas_per_request_limit int NOT NULL DEFAULT 3;

UPDATE public.plan_limits SET ideas_per_request_limit = 3,  ideas_limit = 2   WHERE plan = 'free';
UPDATE public.plan_limits SET ideas_per_request_limit = 8                     WHERE plan = 'pro';
UPDATE public.plan_limits SET ideas_per_request_limit = 15                    WHERE plan = 'max';

CREATE OR REPLACE FUNCTION public.get_my_usage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _plan subscription_plan;
  _row public.usage_counters;
  _shorts_limit int;
  _longs_limit int;
  _ideas_limit int;
  _ideas_per_req int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT plan INTO _plan FROM public.profiles WHERE user_id = _uid;
  IF _plan IS NULL THEN _plan := 'free'; END IF;

  SELECT shorts_limit, longs_limit, ideas_limit, ideas_per_request_limit
    INTO _shorts_limit, _longs_limit, _ideas_limit, _ideas_per_req
    FROM public.plan_limits WHERE plan = _plan;

  INSERT INTO public.usage_counters (user_id, window_start)
    VALUES (_uid, now())
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.usage_counters WHERE user_id = _uid;

  IF now() - _row.window_start >= interval '24 hours' THEN
    UPDATE public.usage_counters
      SET window_start = now(), shorts_used = 0, longs_used = 0, ideas_used = 0, updated_at = now()
      WHERE user_id = _uid
      RETURNING * INTO _row;
  END IF;

  RETURN jsonb_build_object(
    'plan', _plan,
    'shorts_used', _row.shorts_used,
    'longs_used', _row.longs_used,
    'ideas_used', _row.ideas_used,
    'shorts_limit', coalesce(_shorts_limit, 0),
    'longs_limit', coalesce(_longs_limit, 0),
    'ideas_limit', coalesce(_ideas_limit, 0),
    'ideas_per_request_limit', coalesce(_ideas_per_req, 3),
    'reset_at', _row.window_start + interval '24 hours'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_quota(_format text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _plan subscription_plan;
  _row public.usage_counters;
  _shorts_limit int;
  _longs_limit int;
  _ideas_limit int;
  _ideas_per_req int;
  _reset_at timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _format NOT IN ('short','long','ideas') THEN RAISE EXCEPTION 'Invalid format'; END IF;

  SELECT plan INTO _plan FROM public.profiles WHERE user_id = _uid;
  IF _plan IS NULL THEN _plan := 'free'; END IF;

  SELECT shorts_limit, longs_limit, ideas_limit, ideas_per_request_limit
    INTO _shorts_limit, _longs_limit, _ideas_limit, _ideas_per_req
    FROM public.plan_limits WHERE plan = _plan;

  INSERT INTO public.usage_counters (user_id, window_start)
    VALUES (_uid, now())
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.usage_counters WHERE user_id = _uid FOR UPDATE;

  IF now() - _row.window_start >= interval '24 hours' THEN
    UPDATE public.usage_counters
      SET window_start = now(), shorts_used = 0, longs_used = 0, ideas_used = 0, updated_at = now()
      WHERE user_id = _uid
      RETURNING * INTO _row;
  END IF;

  _reset_at := _row.window_start + interval '24 hours';

  IF _format = 'short' THEN
    IF _row.shorts_used >= coalesce(_shorts_limit, 0) THEN
      RAISE EXCEPTION 'QUOTA_EXCEEDED:short:%:%:%', _row.shorts_used, coalesce(_shorts_limit,0), _reset_at;
    END IF;
    UPDATE public.usage_counters SET shorts_used = shorts_used + 1, updated_at = now()
      WHERE user_id = _uid RETURNING * INTO _row;
  ELSIF _format = 'long' THEN
    IF _row.longs_used >= coalesce(_longs_limit, 0) THEN
      RAISE EXCEPTION 'QUOTA_EXCEEDED:long:%:%:%', _row.longs_used, coalesce(_longs_limit,0), _reset_at;
    END IF;
    UPDATE public.usage_counters SET longs_used = longs_used + 1, updated_at = now()
      WHERE user_id = _uid RETURNING * INTO _row;
  ELSE
    IF _row.ideas_used >= coalesce(_ideas_limit, 0) THEN
      RAISE EXCEPTION 'QUOTA_EXCEEDED:ideas:%:%:%', _row.ideas_used, coalesce(_ideas_limit,0), _reset_at;
    END IF;
    UPDATE public.usage_counters SET ideas_used = ideas_used + 1, updated_at = now()
      WHERE user_id = _uid RETURNING * INTO _row;
  END IF;

  RETURN jsonb_build_object(
    'plan', _plan,
    'shorts_used', _row.shorts_used,
    'longs_used', _row.longs_used,
    'ideas_used', _row.ideas_used,
    'shorts_limit', coalesce(_shorts_limit, 0),
    'longs_limit', coalesce(_longs_limit, 0),
    'ideas_limit', coalesce(_ideas_limit, 0),
    'ideas_per_request_limit', coalesce(_ideas_per_req, 3),
    'reset_at', _reset_at
  );
END;
$function$;
