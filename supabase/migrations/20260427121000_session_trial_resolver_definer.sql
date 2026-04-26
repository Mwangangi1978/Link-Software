-- ────────────────────────────────────────────────────────────
-- Make resolve_session_trial_id() run as SECURITY DEFINER so the
-- anon tracker insert can resolve a slug into a UUID via trials.
-- Without this, RLS on the trials table blocks the lookup and
-- trial_id stays NULL for every anon-driven session row.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION resolve_session_trial_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  url_query TEXT;
  url_path  TEXT;
  candidate TEXT;
BEGIN
  IF NEW.trial_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.page_url IS NULL OR NEW.page_url = '' THEN
    RETURN NEW;
  END IF;

  -- 1. Look for ?trial=<slug> in the query string
  url_query := substring(NEW.page_url FROM '\?(.*)$');
  IF url_query IS NOT NULL THEN
    candidate := lower(substring(url_query FROM '(?:^|&)trial=([^&#]+)'));
    IF candidate IS NOT NULL AND candidate <> '' THEN
      SELECT id INTO NEW.trial_id FROM trials WHERE slug = candidate LIMIT 1;
      IF NEW.trial_id IS NOT NULL THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- 2. Fall back to first path segment, e.g. https://host/adhd-trial?... -> adhd-trial
  url_path := lower(regexp_replace(NEW.page_url, '^https?://[^/]+/?([^/?#]*).*$', '\1'));
  IF url_path IS NOT NULL AND url_path <> '' THEN
    SELECT id INTO NEW.trial_id FROM trials WHERE slug = url_path LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION resolve_session_trial_id() FROM PUBLIC;
