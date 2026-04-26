-- ────────────────────────────────────────────────────────────
-- Resolve sessions.trial_id from page_url on insert
-- The anon tracking script can't look up UUIDs, so it sends the
-- trial slug either as a `trial=<slug>` query param or in the
-- URL path. This trigger resolves it server-side.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION resolve_session_trial_id()
RETURNS TRIGGER AS $$
DECLARE
  url_query TEXT;
  url_path  TEXT;
  candidate TEXT;
BEGIN
  -- Skip if already set
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_resolve_trial ON sessions;
CREATE TRIGGER sessions_resolve_trial
  BEFORE INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION resolve_session_trial_id();
