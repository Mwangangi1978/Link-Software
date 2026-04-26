-- ============================================================
-- AUTH HARDENING: enforce invite-only membership
-- ============================================================

-- A workspace member is either:
-- 1) an admin, or
-- 2) a user invited by an existing user (invited_by is set).
CREATE OR REPLACE FUNCTION public.is_workspace_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.invited_by IS NOT NULL)
  );
$$;

-- Disable legacy bootstrap escalation path from client-side users.
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM anon;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM authenticated;

-- Block direct email signup users that were not created by an invite.
-- inviteUserByEmail sets invited_at; regular signup does not.
CREATE OR REPLACE FUNCTION public.block_non_invited_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.invited_at IS NULL THEN
    RAISE EXCEPTION 'Invite required for this workspace';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_non_invited_signup ON auth.users;
CREATE TRIGGER block_non_invited_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.block_non_invited_signup();

-- Replace broad read policies so only workspace members can read app data.
DROP POLICY IF EXISTS "read_auth" ON trials;
DROP POLICY IF EXISTS "read_auth" ON events;
DROP POLICY IF EXISTS "read_auth" ON content_variants;
DROP POLICY IF EXISTS "read_auth" ON campaigns;
DROP POLICY IF EXISTS "read_auth" ON tracked_links;
DROP POLICY IF EXISTS "read_auth" ON sessions;

CREATE POLICY "read_member" ON trials
  FOR SELECT TO authenticated USING (public.is_workspace_member());
CREATE POLICY "read_member" ON events
  FOR SELECT TO authenticated USING (public.is_workspace_member());
CREATE POLICY "read_member" ON content_variants
  FOR SELECT TO authenticated USING (public.is_workspace_member());
CREATE POLICY "read_member" ON campaigns
  FOR SELECT TO authenticated USING (public.is_workspace_member());
CREATE POLICY "read_member" ON tracked_links
  FOR SELECT TO authenticated USING (public.is_workspace_member());
CREATE POLICY "read_member" ON sessions
  FOR SELECT TO authenticated USING (public.is_workspace_member());
