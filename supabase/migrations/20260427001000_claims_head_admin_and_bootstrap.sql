-- ============================================================
-- RBAC UPGRADE: head_admin role, custom claims, and bootstrap
-- ============================================================

-- Expand profile role domain to include head_admin.
DO $$
DECLARE
  role_check_name TEXT;
BEGIN
  SELECT conname
    INTO role_check_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';

  IF role_check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', role_check_name);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('head_admin', 'admin', 'viewer'));

-- Keep role lookup helper and add a boolean helper for admin-level checks.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT role IN ('head_admin', 'admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Recreate policies so head_admin has admin-level rights.
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin_role());
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_role());
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (public.is_admin_role());

DROP POLICY IF EXISTS "insert_admin" ON trials;
DROP POLICY IF EXISTS "insert_admin" ON events;
DROP POLICY IF EXISTS "insert_admin" ON content_variants;
DROP POLICY IF EXISTS "insert_admin" ON campaigns;
DROP POLICY IF EXISTS "insert_admin" ON tracked_links;

CREATE POLICY "insert_admin" ON trials
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_role());
CREATE POLICY "insert_admin" ON events
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_role());
CREATE POLICY "insert_admin" ON content_variants
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_role());
CREATE POLICY "insert_admin" ON campaigns
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_role());
CREATE POLICY "insert_admin" ON tracked_links
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "update_admin" ON trials;
DROP POLICY IF EXISTS "update_admin" ON events;
DROP POLICY IF EXISTS "update_admin" ON content_variants;
DROP POLICY IF EXISTS "update_admin" ON campaigns;
DROP POLICY IF EXISTS "update_admin" ON tracked_links;
DROP POLICY IF EXISTS "update_admin" ON sessions;

CREATE POLICY "update_admin" ON trials
  FOR UPDATE TO authenticated USING (public.is_admin_role());
CREATE POLICY "update_admin" ON events
  FOR UPDATE TO authenticated USING (public.is_admin_role());
CREATE POLICY "update_admin" ON content_variants
  FOR UPDATE TO authenticated USING (public.is_admin_role());
CREATE POLICY "update_admin" ON campaigns
  FOR UPDATE TO authenticated USING (public.is_admin_role());
CREATE POLICY "update_admin" ON tracked_links
  FOR UPDATE TO authenticated USING (public.is_admin_role());
CREATE POLICY "update_admin" ON sessions
  FOR UPDATE TO authenticated USING (public.is_admin_role());

DROP POLICY IF EXISTS "delete_admin" ON events;
DROP POLICY IF EXISTS "delete_admin" ON content_variants;
DROP POLICY IF EXISTS "delete_admin" ON campaigns;

CREATE POLICY "delete_admin" ON events
  FOR DELETE TO authenticated USING (public.is_admin_role());
CREATE POLICY "delete_admin" ON content_variants
  FOR DELETE TO authenticated USING (public.is_admin_role());
CREATE POLICY "delete_admin" ON campaigns
  FOR DELETE TO authenticated USING (public.is_admin_role());

-- ------------------------------------------------------------
-- Supabase Community Custom Claims package (install.sql)
-- Source: supabase-community/supabase-custom-claims
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_claims_admin() RETURNS bool
  LANGUAGE plpgsql
  AS $$
  BEGIN
    IF session_user = 'authenticator' THEN
      IF extract(epoch from now()) > coalesce((current_setting('request.jwt.claims', true)::jsonb)->>'exp', '0')::numeric THEN
        return false;
      END IF;
      IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
        RETURN true;
      END IF;
      IF coalesce((current_setting('request.jwt.claims', true)::jsonb)->'app_metadata'->'claims_admin', 'false')::bool THEN
        return true;
      ELSE
        return false;
      END IF;
    ELSE
      return true;
    END IF;
  END;
$$;

CREATE OR REPLACE FUNCTION get_my_claims() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select
    coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata', '{}'::jsonb)::jsonb
$$;

CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select
    coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> claim, null)
$$;

CREATE OR REPLACE FUNCTION get_claims(uid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    DECLARE retval jsonb;
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN '{"error":"access denied"}'::jsonb;
      ELSE
        select raw_app_meta_data from auth.users into retval where id = uid::uuid;
        return retval;
      END IF;
    END;
$$;

CREATE OR REPLACE FUNCTION get_claim(uid uuid, claim text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    DECLARE retval jsonb;
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN '{"error":"access denied"}'::jsonb;
      ELSE
        select coalesce(raw_app_meta_data->claim, null) from auth.users into retval where id = uid::uuid;
        return retval;
      END IF;
    END;
$$;

CREATE OR REPLACE FUNCTION set_claim(uid uuid, claim text, value jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN 'error: access denied';
      ELSE
        update auth.users set raw_app_meta_data =
          raw_app_meta_data ||
            json_build_object(claim, value)::jsonb where id = uid;
        return 'OK';
      END IF;
    END;
$$;

CREATE OR REPLACE FUNCTION delete_claim(uid uuid, claim text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN 'error: access denied';
      ELSE
        update auth.users set raw_app_meta_data =
          raw_app_meta_data - claim where id = uid;
        return 'OK';
      END IF;
    END;
$$;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Sync profile role/full_name with app_metadata userrole claims
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_role TEXT;
  mapped_name TEXT;
BEGIN
  mapped_role := COALESCE(NEW.raw_app_meta_data->>'userrole', NEW.raw_user_meta_data->>'role', 'viewer');
  IF mapped_role NOT IN ('head_admin', 'admin', 'viewer') THEN
    mapped_role := 'viewer';
  END IF;

  mapped_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_app_meta_data->>'full_name');

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, mapped_name, mapped_role)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_from_auth_claims ON auth.users;
CREATE TRIGGER sync_profile_from_auth_claims
  AFTER INSERT OR UPDATE OF raw_app_meta_data, raw_user_meta_data, email
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_from_auth_claims();

-- ------------------------------------------------------------
-- Bootstrap super admin claims/profile for an existing auth user
-- NOTE: avoid direct writes to auth.users/auth.identities here.
--       user creation is handled via Auth Admin API / dashboard.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'carlotta.hillger@trialme.eu';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'claims_admin', true, 'userrole', 'head_admin'),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('full_name', 'Carlotta Hillger', 'role', 'head_admin'),
      updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_user_id, v_email, 'Carlotta Hillger', 'head_admin')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
  END IF;
END $$;
