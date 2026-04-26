-- TrialMe Attribution Dashboard — local seed
-- Idempotent: safe to re-run. Uses ON CONFLICT DO NOTHING and clears prior session/link rows
-- before inserting fresh ones so the time window stays accurate.

-- ────────────────────────────────────────────────────────────
-- Reference rows (trials / events / variants / campaigns)
-- ────────────────────────────────────────────────────────────
INSERT INTO trials (id, name, slug, tally_form_id, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'ADHD Trial',          'adhd-trial',       'wQz4Pm', true),
  ('11111111-0000-0000-0000-000000000002', 'Depression Study',    'depression-study', 'mDvR9x', true),
  ('11111111-0000-0000-0000-000000000003', 'Endometriosis Trial', 'endometriosis',    'nA2KqY', true),
  ('11111111-0000-0000-0000-000000000004', 'PMDD Pilot',          'pmdd-pilot',       'rB7LhU', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, name, partner, trial_id, cost) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Lund University Depression Outreach', 'Lund University',        '11111111-0000-0000-0000-000000000002', 500),
  ('22222222-0000-0000-0000-000000000002', 'Oxford Women in Health Panel',        'Oxford University',      '11111111-0000-0000-0000-000000000003', 300),
  ('22222222-0000-0000-0000-000000000003', 'Renaissance Summit',                  'Renaissance Health',     '11111111-0000-0000-0000-000000000001', 1200),
  ('22222222-0000-0000-0000-000000000004', 'King''s College ADHD Awareness Day',  'King''s College London', '11111111-0000-0000-0000-000000000001',  250),
  ('22222222-0000-0000-0000-000000000005', 'Endo March London',                   'Endometriosis UK',       '11111111-0000-0000-0000-000000000003',  180)
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

-- ────────────────────────────────────────────────────────────
-- Tracked links (used for paid spend roll-ups)
-- Wipe + reinsert so created_at lands inside the active window
-- ────────────────────────────────────────────────────────────
DELETE FROM tracked_links WHERE id::text LIKE '55555555-%';

INSERT INTO tracked_links (id, link_type, platform_id, is_paid, amount_spent, event_id, trial_id, content_variant_id, campaign_id, destination_url, full_tracked_url, created_at) VALUES
  ('55555555-0000-0000-0000-000000000001', 'platform', 'instagram', false,    NULL, NULL, '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?platform=instagram&paid=false&content=educational_post&campaign=q2_adhd_push',                  now() - interval '70 days'),
  ('55555555-0000-0000-0000-000000000002', 'platform', 'meta',      true,  1900.00, NULL, '11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002', 'https://trialme.eu/endometriosis',    'https://trialme.eu/endometriosis?platform=meta&paid=true&content=educational_post&campaign=endometriosis_awareness',           now() - interval '52 days'),
  ('55555555-0000-0000-0000-000000000003', 'platform', 'tiktok',    true,  1450.00, NULL, '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?platform=tiktok&paid=true&content=influencer_collab&campaign=q2_adhd_push',                       now() - interval '40 days'),
  ('55555555-0000-0000-0000-000000000004', 'platform', 'meta',      true,   980.00, NULL, '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000003', 'https://trialme.eu/depression-study', 'https://trialme.eu/depression-study?platform=meta&paid=true&content=patient_testimonial&campaign=depression_outreach_spring',  now() - interval '28 days'),
  ('55555555-0000-0000-0000-000000000005', 'platform', 'substack',  false,    NULL, NULL, '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 'https://trialme.eu/depression-study', 'https://trialme.eu/depression-study?platform=substack&paid=false&content=founding_story&campaign=depression_outreach_spring', now() - interval '24 days'),
  ('55555555-0000-0000-0000-000000000006', 'platform', 'linkedin',  false,    NULL, NULL, '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000004', 'https://trialme.eu/depression-study', 'https://trialme.eu/depression-study?platform=linkedin&paid=false&content=behind_the_trial&campaign=always_on_organic',         now() - interval '18 days'),
  ('55555555-0000-0000-0000-000000000007', 'platform', 'youtube',   true,   780.00, NULL, '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?platform=youtube&paid=true&content=influencer_collab&campaign=q2_adhd_push',                      now() - interval '12 days'),
  ('55555555-0000-0000-0000-000000000008', 'platform', 'reddit',    false,    NULL, NULL, '11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000004', 'https://trialme.eu/endometriosis',    'https://trialme.eu/endometriosis?platform=reddit&paid=false&content=founding_story&campaign=always_on_organic',                 now() - interval '6 days'),
  ('55555555-0000-0000-0000-000000000009', 'platform', 'x',         false,    NULL, NULL, '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000004', 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?platform=x&paid=false&content=educational_post&campaign=always_on_organic',                       now() - interval '3 days'),
  ('55555555-0000-0000-0000-00000000000a', 'event',    NULL,        false,    NULL, '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', NULL, NULL, 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?event=renaissance_summit&partner=renaissance_health',                                              now() - interval '60 days'),
  ('55555555-0000-0000-0000-00000000000b', 'event',    NULL,        false,    NULL, '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', NULL, NULL, 'https://trialme.eu/depression-study', 'https://trialme.eu/depression-study?event=lund_university_depression_outreach&partner=lund_university',                          now() - interval '45 days'),
  ('55555555-0000-0000-0000-00000000000c', 'event',    NULL,        false,    NULL, '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', NULL, NULL, 'https://trialme.eu/endometriosis',    'https://trialme.eu/endometriosis?event=oxford_women_in_health_panel&partner=oxford_university',                                  now() - interval '30 days'),
  ('55555555-0000-0000-0000-00000000000d', 'event',    NULL,        false,    NULL, '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', NULL, NULL, 'https://trialme.eu/adhd-trial',       'https://trialme.eu/adhd-trial?event=king_s_college_adhd_awareness_day&partner=king_s_college_london',                            now() - interval '15 days'),
  ('55555555-0000-0000-0000-00000000000e', 'event',    NULL,        false,    NULL, '22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', NULL, NULL, 'https://trialme.eu/endometriosis',    'https://trialme.eu/endometriosis?event=endo_march_london&partner=endometriosis_uk',                                              now() - interval '8 days');

-- ────────────────────────────────────────────────────────────
-- Sessions — wipe + procedurally regenerate ~320 rows over last 90 days
-- ────────────────────────────────────────────────────────────
TRUNCATE sessions;

DO $$
DECLARE
  i INT;
  v_link_type TEXT;
  v_platform TEXT;
  v_paid BOOLEAN;
  v_event_name TEXT;
  v_partner TEXT;
  v_trial UUID;
  v_campaign TEXT;
  v_content TEXT;
  v_page TEXT;
  v_visit TIMESTAMPTZ;
  v_submit TIMESTAMPTZ;
  v_status TEXT;
  v_country TEXT;
  v_device TEXT;
  v_browser TEXT;
  v_os TEXT;
  r DOUBLE PRECISION;
  -- weighted random pickers
  platforms TEXT[] := ARRAY['instagram','meta','tiktok','linkedin','substack','x','youtube','reddit'];
  countries TEXT[] := ARRAY['United Kingdom','Sweden','Germany','Ireland','France','United States','Spain','Netherlands'];
  devices  TEXT[]  := ARRAY['mobile','desktop','tablet'];
  browsers TEXT[]  := ARRAY['Chrome','Safari','Firefox','Edge'];
  oses     TEXT[]  := ARRAY['iOS','Android','Windows','macOS'];
  trials_arr UUID[] := ARRAY[
    '11111111-0000-0000-0000-000000000001'::uuid,
    '11111111-0000-0000-0000-000000000002'::uuid,
    '11111111-0000-0000-0000-000000000003'::uuid
  ];
BEGIN
  FOR i IN 1..320 LOOP
    -- Day offset weighted toward recent: random()^1.6 * 90
    v_visit := now()
               - (power(random(), 1.6) * 90 || ' days')::INTERVAL
               - ((random() * 86400)::INT || ' seconds')::INTERVAL;

    r := random();
    IF r < 0.62 THEN v_link_type := 'platform';
    ELSIF r < 0.86 THEN v_link_type := 'event';
    ELSE v_link_type := 'direct';
    END IF;

    -- Per-link-type defaults
    v_platform := NULL; v_paid := false; v_event_name := NULL; v_partner := NULL;
    v_trial := NULL; v_campaign := NULL; v_content := NULL; v_page := 'https://trialme.eu/';

    IF v_link_type = 'platform' THEN
      v_platform := platforms[1 + (random() * (array_length(platforms,1) - 1))::INT];
      v_paid := random() < 0.35;
      v_trial := trials_arr[1 + (random() * (array_length(trials_arr,1) - 1))::INT];
      v_campaign := (ARRAY['q2_adhd_push','endometriosis_awareness','depression_outreach_spring','always_on_organic'])[1 + (random() * 3)::INT];
      v_content := (ARRAY['educational_post','patient_testimonial','influencer_collab','founding_story','behind_the_trial'])[1 + (random() * 4)::INT];
      v_page := CASE v_trial
        WHEN '11111111-0000-0000-0000-000000000001' THEN 'https://trialme.eu/adhd-trial'
        WHEN '11111111-0000-0000-0000-000000000002' THEN 'https://trialme.eu/depression-study'
        WHEN '11111111-0000-0000-0000-000000000003' THEN 'https://trialme.eu/endometriosis'
      END;
    ELSIF v_link_type = 'event' THEN
      r := random();
      IF r < 0.22 THEN
        v_event_name := 'lund_university_depression_outreach'; v_partner := 'lund_university';
        v_trial := '11111111-0000-0000-0000-000000000002';
        v_page := 'https://trialme.eu/depression-study';
      ELSIF r < 0.42 THEN
        v_event_name := 'oxford_women_in_health_panel'; v_partner := 'oxford_university';
        v_trial := '11111111-0000-0000-0000-000000000003';
        v_page := 'https://trialme.eu/endometriosis';
      ELSIF r < 0.66 THEN
        v_event_name := 'renaissance_summit'; v_partner := 'renaissance_health';
        v_trial := '11111111-0000-0000-0000-000000000001';
        v_page := 'https://trialme.eu/adhd-trial';
      ELSIF r < 0.86 THEN
        v_event_name := 'king_s_college_adhd_awareness_day'; v_partner := 'king_s_college_london';
        v_trial := '11111111-0000-0000-0000-000000000001';
        v_page := 'https://trialme.eu/adhd-trial';
      ELSE
        v_event_name := 'endo_march_london'; v_partner := 'endometriosis_uk';
        v_trial := '11111111-0000-0000-0000-000000000003';
        v_page := 'https://trialme.eu/endometriosis';
      END IF;
    ELSE
      -- direct: random trial page (or pure root)
      IF random() < 0.5 THEN
        v_trial := trials_arr[1 + (random() * (array_length(trials_arr,1) - 1))::INT];
        v_page := CASE v_trial
          WHEN '11111111-0000-0000-0000-000000000001' THEN 'https://trialme.eu/adhd-trial'
          WHEN '11111111-0000-0000-0000-000000000002' THEN 'https://trialme.eu/depression-study'
          WHEN '11111111-0000-0000-0000-000000000003' THEN 'https://trialme.eu/endometriosis'
        END;
      END IF;
    END IF;

    -- Conversion rate ~22%, slightly higher for paid platform (~28%) and direct (~30%)
    IF (v_link_type = 'platform' AND v_paid AND random() < 0.28)
       OR (v_link_type = 'platform' AND NOT v_paid AND random() < 0.18)
       OR (v_link_type = 'event' AND random() < 0.25)
       OR (v_link_type = 'direct' AND random() < 0.30) THEN
      v_status := 'form_submitted';
      v_submit := v_visit + ((90 + random() * 540)::INT || ' seconds')::INTERVAL;
    ELSE
      v_status := 'visit_logged';
      v_submit := NULL;
    END IF;

    v_country := countries[1 + (random() * (array_length(countries,1) - 1))::INT];
    v_device  := devices[1 + (random() * (array_length(devices,1) - 1))::INT];
    v_browser := browsers[1 + (random() * (array_length(browsers,1) - 1))::INT];
    v_os      := oses[1 + (random() * (array_length(oses,1) - 1))::INT];

    INSERT INTO sessions (
      id, status, link_type, platform_id, is_paid, event_name, partner, trial_id,
      campaign, content, page_url, visit_timestamp, submit_timestamp,
      country, device_type, browser, os
    ) VALUES (
      gen_random_uuid(), v_status, v_link_type, v_platform, v_paid, v_event_name, v_partner, v_trial,
      v_campaign, v_content, v_page, v_visit, v_submit,
      v_country, v_device, v_browser, v_os
    );
  END LOOP;
END $$;

-- Quick sanity readout
SELECT
  (SELECT count(*) FROM trials)         AS trials,
  (SELECT count(*) FROM events)         AS events,
  (SELECT count(*) FROM tracked_links)  AS tracked_links,
  (SELECT count(*) FROM sessions)       AS sessions,
  (SELECT count(*) FROM sessions WHERE status = 'form_submitted') AS signups;
