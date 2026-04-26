-- TrialMe Attribution Dashboard Schema
-- Project: icttlieskvejrddphtfi
-- Implements the two-step funnel tracking described in the PRD

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TRIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS trials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  tally_form_id TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EVENTS (university / partner activations, always tied to a trial)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  partner    TEXT NOT NULL,
  trial_id   UUID REFERENCES trials(id) ON DELETE SET NULL,
  cost       DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTENT VARIANTS (managed A/B labels for link generator)
-- ============================================================
CREATE TABLE IF NOT EXISTS content_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAMPAIGNS (cross-link grouping labels)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRACKED LINKS (audit log of every generated link/QR)
-- ============================================================
CREATE TABLE IF NOT EXISTS tracked_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_type           TEXT NOT NULL CHECK (link_type IN ('platform', 'event', 'direct')),
  destination_url     TEXT NOT NULL,
  full_tracked_url    TEXT NOT NULL,

  -- Platform-specific fields
  platform_id         TEXT,                           -- e.g. 'instagram', 'meta'
  is_paid             BOOLEAN DEFAULT false,
  amount_spent        DECIMAL(10,2),

  -- Event-specific fields
  event_id            UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Attribution tags
  trial_id            UUID REFERENCES trials(id) ON DELETE SET NULL,
  content_variant_id  UUID REFERENCES content_variants(id) ON DELETE SET NULL,
  campaign_id         UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- QR code output (base64)
  qr_code_data        TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SESSIONS (core tracking table — one row per visit)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status            TEXT NOT NULL DEFAULT 'visit_logged'
                      CHECK (status IN ('visit_logged', 'form_submitted')),

  -- Attribution (from URL params)
  link_type         TEXT CHECK (link_type IN ('platform', 'event', 'direct')),
  platform_id       TEXT,
  is_paid           BOOLEAN DEFAULT false,
  event_name        TEXT,
  partner           TEXT,
  trial_id          UUID REFERENCES trials(id) ON DELETE SET NULL,
  campaign          TEXT,
  content           TEXT,
  term              TEXT,

  -- Landing page context
  page_url          TEXT NOT NULL,
  referrer_url      TEXT,

  -- Browser / device (parsed by edge function)
  user_agent        TEXT,
  device_type       TEXT,           -- desktop | mobile | tablet
  browser           TEXT,
  os                TEXT,
  country           TEXT,
  city              TEXT,

  -- Privacy-preserving deduplication
  form_email_hash   TEXT,           -- SHA-256 of submitted email, never raw

  -- Timestamps
  visit_timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  submit_timestamp  TIMESTAMPTZ,
  time_on_page_sec  INTEGER,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES for dashboard query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS sessions_status_idx      ON sessions(status);
CREATE INDEX IF NOT EXISTS sessions_platform_idx    ON sessions(platform_id);
CREATE INDEX IF NOT EXISTS sessions_trial_idx       ON sessions(trial_id);
CREATE INDEX IF NOT EXISTS sessions_visit_ts_idx    ON sessions(visit_timestamp DESC);
CREATE INDEX IF NOT EXISTS tracked_links_type_idx   ON tracked_links(link_type);
CREATE INDEX IF NOT EXISTS tracked_links_trial_idx  ON tracked_links(trial_id);
CREATE INDEX IF NOT EXISTS events_trial_idx         ON events(trial_id);

-- ============================================================
-- UPDATED_AT auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trials_updated_at
  BEFORE UPDATE ON trials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables locked to authenticated users only.
-- ============================================================
ALTER TABLE trials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write everything in their org
CREATE POLICY "auth_all_trials"           ON trials           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_events"           ON events           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_content_variants" ON content_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_campaigns"        ON campaigns        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tracked_links"    ON tracked_links    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sessions"         ON sessions         FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tracking script (anon) can INSERT visit sessions
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- SEED DATA (matches the design prototype)
-- ============================================================
INSERT INTO trials (id, name, slug, tally_form_id, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'ADHD Trial',          'adhd-trial',       'wQz4Pm', true),
  ('11111111-0000-0000-0000-000000000002', 'Depression Study',    'depression-study', 'mDvR9x', true),
  ('11111111-0000-0000-0000-000000000003', 'Endometriosis Trial', 'endometriosis',    'nA2KqY', true),
  ('11111111-0000-0000-0000-000000000004', 'PMDD Pilot',          'pmdd-pilot',       'rB7LhU', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, name, partner, trial_id, cost) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Lund University Depression Outreach', 'Lund University',       '11111111-0000-0000-0000-000000000002', 500),
  ('22222222-0000-0000-0000-000000000002', 'Oxford Women in Health Panel',        'Oxford University',     '11111111-0000-0000-0000-000000000003', 300),
  ('22222222-0000-0000-0000-000000000003', 'Renaissance Summit',                  'Renaissance Health',    '11111111-0000-0000-0000-000000000001', 1200),
  ('22222222-0000-0000-0000-000000000004', 'King''s College ADHD Awareness Day',  'King''s College London','11111111-0000-0000-0000-000000000001', 250),
  ('22222222-0000-0000-0000-000000000005', 'Endo March London',                   'Endometriosis UK',      '11111111-0000-0000-0000-000000000003', 180)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_variants (id, name) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Educational post'),
  ('33333333-0000-0000-0000-000000000002', 'Patient testimonial'),
  ('33333333-0000-0000-0000-000000000003', 'Influencer collab'),
  ('33333333-0000-0000-0000-000000000004', 'Founding story'),
  ('33333333-0000-0000-0000-000000000005', 'Behind the trial')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaigns (id, name) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Q2 ADHD push'),
  ('44444444-0000-0000-0000-000000000002', 'Endometriosis awareness'),
  ('44444444-0000-0000-0000-000000000003', 'Depression outreach Spring'),
  ('44444444-0000-0000-0000-000000000004', 'Always-on organic')
ON CONFLICT (id) DO NOTHING;

-- Seed tracked links (mirrors the prototype history)
INSERT INTO tracked_links (id, link_type, platform_id, is_paid, amount_spent, trial_id, content_variant_id, campaign_id, destination_url, full_tracked_url) VALUES
  ('55555555-0000-0000-0000-000000000001', 'platform', 'instagram', false, null,   '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?platform=instagram&paid=false&content=educational_post&campaign=q2_adhd_push'),
  ('55555555-0000-0000-0000-000000000002', 'event',    null,        false, null,   '11111111-0000-0000-0000-000000000002', null,                                   null,                                   'https://trialme.eu/depression-study', 'https://trialme.eu/depression-study?event=lund_university_depression_outreach&partner=lund_university'),
  ('55555555-0000-0000-0000-000000000003', 'platform', 'meta',      true,  1900,  '11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002', 'https://trialme.eu/endometriosis',    'https://trialme.eu/endometriosis?platform=meta&paid=true&content=educational_post&campaign=endometriosis_awareness'),
  ('55555555-0000-0000-0000-000000000004', 'event',    null,        false, null,   '11111111-0000-0000-0000-000000000001', null,                                   null,                                   'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?event=renaissance_summit&partner=renaissance_health'),
  ('55555555-0000-0000-0000-000000000005', 'platform', 'substack',  false, null,   '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 'https://trialme.eu/depression-study', 'https://trialme.eu/depression-study?platform=substack&paid=false&content=founding_story&campaign=depression_outreach_spring')
ON CONFLICT (id) DO NOTHING;

-- Seed sessions (visit + conversion rows to populate dashboard)
INSERT INTO sessions (id, status, link_type, platform_id, is_paid, trial_id, campaign, content, page_url, visit_timestamp, submit_timestamp) VALUES
  (gen_random_uuid(), 'form_submitted', 'platform', 'instagram', false, '11111111-0000-0000-0000-000000000001', 'q2_adhd_push',                 'educational_post',  'https://trialme.eu/adhd-trial',       now() - interval '2 days', now() - interval '2 days' + interval '4 minutes'),
  (gen_random_uuid(), 'form_submitted', 'platform', 'instagram', false, '11111111-0000-0000-0000-000000000001', 'q2_adhd_push',                 'educational_post',  'https://trialme.eu/adhd-trial',       now() - interval '3 days', now() - interval '3 days' + interval '6 minutes'),
  (gen_random_uuid(), 'visit_logged',   'platform', 'instagram', false, '11111111-0000-0000-0000-000000000001', 'q2_adhd_push',                 'educational_post',  'https://trialme.eu/adhd-trial',       now() - interval '1 day',  null),
  (gen_random_uuid(), 'form_submitted', 'platform', 'instagram', true,  '11111111-0000-0000-0000-000000000001', 'q2_adhd_push',                 'patient_testimonial','https://trialme.eu/adhd-trial',       now() - interval '5 days', now() - interval '5 days' + interval '3 minutes'),
  (gen_random_uuid(), 'visit_logged',   'platform', 'instagram', true,  '11111111-0000-0000-0000-000000000001', 'q2_adhd_push',                 'patient_testimonial','https://trialme.eu/adhd-trial',       now() - interval '4 days', null),
  (gen_random_uuid(), 'form_submitted', 'platform', 'meta',      true,  '11111111-0000-0000-0000-000000000003', 'endometriosis_awareness',      'educational_post',  'https://trialme.eu/endometriosis',    now() - interval '1 day',  now() - interval '1 day' + interval '5 minutes'),
  (gen_random_uuid(), 'form_submitted', 'platform', 'meta',      true,  '11111111-0000-0000-0000-000000000003', 'endometriosis_awareness',      'educational_post',  'https://trialme.eu/endometriosis',    now() - interval '2 days', now() - interval '2 days' + interval '7 minutes'),
  (gen_random_uuid(), 'visit_logged',   'platform', 'meta',      true,  '11111111-0000-0000-0000-000000000003', 'endometriosis_awareness',      'educational_post',  'https://trialme.eu/endometriosis',    now() - interval '3 days', null),
  (gen_random_uuid(), 'form_submitted', 'platform', 'substack',  false, '11111111-0000-0000-0000-000000000002', 'depression_outreach_spring',   'founding_story',    'https://trialme.eu/depression-study', now() - interval '6 days', now() - interval '6 days' + interval '8 minutes'),
  (gen_random_uuid(), 'visit_logged',   'platform', 'substack',  false, '11111111-0000-0000-0000-000000000002', 'depression_outreach_spring',   'founding_story',    'https://trialme.eu/depression-study', now() - interval '7 days', null),
  (gen_random_uuid(), 'form_submitted', 'event',    null,        false, '11111111-0000-0000-0000-000000000002', null, null, 'https://trialme.eu/depression-study', now() - interval '4 days', now() - interval '4 days' + interval '2 minutes'),
  (gen_random_uuid(), 'form_submitted', 'event',    null,        false, '11111111-0000-0000-0000-000000000001', null, null, 'https://trialme.eu/adhd-trial',       now() - interval '8 days', now() - interval '8 days' + interval '3 minutes'),
  (gen_random_uuid(), 'visit_logged',   'event',    null,        false, '11111111-0000-0000-0000-000000000003', null, null, 'https://trialme.eu/endometriosis',    now() - interval '2 days', null),
  (gen_random_uuid(), 'form_submitted', 'platform', 'tiktok',    false, '11111111-0000-0000-0000-000000000001', 'always_on_organic',            'influencer_collab', 'https://trialme.eu/adhd-trial',       now() - interval '1 day',  now() - interval '1 day' + interval '9 minutes'),
  (gen_random_uuid(), 'visit_logged',   'platform', 'linkedin',  false, '11111111-0000-0000-0000-000000000002', null, null, 'https://trialme.eu/depression-study', now() - interval '3 days', null),
  (gen_random_uuid(), 'form_submitted', 'direct',   null,        false, null,                                   null, null, 'https://trialme.eu/',                 now() - interval '5 days', now() - interval '5 days' + interval '12 minutes')
ON CONFLICT DO NOTHING;
