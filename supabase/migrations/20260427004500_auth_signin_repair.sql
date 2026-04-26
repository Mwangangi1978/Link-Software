-- ============================================================
-- AUTH REPAIR: recover from broken auth bootstrap row
-- ============================================================

-- Ensure head_admin is treated as a workspace member.
CREATE OR REPLACE FUNCTION public.is_workspace_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('head_admin', 'admin') OR p.invited_by IS NOT NULL)
  );
$$;

-- Remove potentially malformed bootstrap-created super-admin auth rows.
-- The user will be recreated cleanly via Auth Admin API after this migration.
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'carlotta.hillger@trialme.eu'
  LIMIT 1;

  IF v_uid IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_uid;
    DELETE FROM public.profiles WHERE id = v_uid;
    DELETE FROM auth.users WHERE id = v_uid;
  END IF;
END $$;
