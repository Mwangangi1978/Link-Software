-- Soft-delete support: archived_at column on all four config tables.
-- When an item has associated data it gets archived (archived_at set) instead of hard-deleted.
-- Items with no associated data can be hard-deleted as before.

ALTER TABLE trials         ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;
ALTER TABLE events         ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;
ALTER TABLE content_variants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;
ALTER TABLE campaigns      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- Index so filtering active vs archived is fast on each table
CREATE INDEX IF NOT EXISTS idx_trials_archived_at         ON trials         (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_archived_at         ON events         (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_variants_archived_at ON content_variants (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_archived_at      ON campaigns      (archived_at) WHERE archived_at IS NOT NULL;
