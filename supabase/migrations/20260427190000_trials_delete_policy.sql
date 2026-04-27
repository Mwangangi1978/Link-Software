-- ============================================================
-- Allow admins to delete trials from the Configuration page.
-- ============================================================
-- The original RBAC migration added insert/update/delete policies for
-- events, content_variants, and campaigns, but only insert/update for
-- trials — leaving DELETE with no policy at all (RLS therefore denied
-- every attempt). FK columns referencing trials use ON DELETE SET NULL,
-- so removing a trial is safe and won't cascade-delete sessions or
-- tracked links.

DROP POLICY IF EXISTS "delete_admin" ON trials;
CREATE POLICY "delete_admin" ON trials
  FOR DELETE TO authenticated USING (public.is_admin_role());
