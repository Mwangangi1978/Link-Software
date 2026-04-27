-- ============================================================
-- Member management (add / remove) is restricted to head_admin
-- ============================================================
-- Regular admins can still manage workspace data (trials, events,
-- campaigns, content variants, tracked links), but cannot add or
-- remove team members. Defense in depth: the UI hides these
-- controls and the invite-user edge function checks the caller's
-- role, but RLS is the authoritative gate.

CREATE OR REPLACE FUNCTION public.is_head_admin_role()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT role = 'head_admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Tighten DELETE on profiles: only head_admin may remove a member.
DROP POLICY IF EXISTS "profiles_delete_admin"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_head_admin" ON public.profiles;
CREATE POLICY "profiles_delete_head_admin"
  ON public.profiles FOR DELETE
  USING (public.is_head_admin_role());
