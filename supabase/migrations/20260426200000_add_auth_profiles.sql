-- ============================================================
-- AUTH: profiles table, role-based policies, invite trigger
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  invited_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security-definer helper avoids recursive RLS when policies reference profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Policies: users see only their own row; admins see all
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (public.current_user_role() = 'admin');
-- Insert allowed for own row only (trigger fires as SECURITY DEFINER so it bypasses this)
CREATE POLICY "profiles_insert_self"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── Trigger: auto-create profile on user creation ───────────
-- Fires when Supabase Auth creates a user (invite or signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── First-admin bootstrap ───────────────────────────────────
-- Callable via supabase.rpc('claim_first_admin') from the app.
-- Only works when zero admins exist — safe to expose to authenticated users.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
  END IF;
END;
$$;

-- ── Update data-table policies to be role-aware ─────────────
-- Drop the previous broad "authenticated = full access" policies.
DROP POLICY IF EXISTS "auth_all_trials"           ON trials;
DROP POLICY IF EXISTS "auth_all_events"           ON events;
DROP POLICY IF EXISTS "auth_all_content_variants" ON content_variants;
DROP POLICY IF EXISTS "auth_all_campaigns"        ON campaigns;
DROP POLICY IF EXISTS "auth_all_tracked_links"    ON tracked_links;
DROP POLICY IF EXISTS "auth_all_sessions"         ON sessions;

-- All authenticated users can read every data table
CREATE POLICY "read_auth" ON trials           FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_auth" ON events           FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_auth" ON content_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_auth" ON campaigns        FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_auth" ON tracked_links    FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_auth" ON sessions         FOR SELECT TO authenticated USING (true);

-- Admins can insert
CREATE POLICY "insert_admin" ON trials           FOR INSERT TO authenticated WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "insert_admin" ON events           FOR INSERT TO authenticated WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "insert_admin" ON content_variants FOR INSERT TO authenticated WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "insert_admin" ON campaigns        FOR INSERT TO authenticated WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "insert_admin" ON tracked_links    FOR INSERT TO authenticated WITH CHECK (public.current_user_role() = 'admin');

-- Admins can update
CREATE POLICY "update_admin" ON trials           FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "update_admin" ON events           FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "update_admin" ON content_variants FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "update_admin" ON campaigns        FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "update_admin" ON tracked_links    FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "update_admin" ON sessions         FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');

-- Admins can delete
CREATE POLICY "delete_admin" ON events           FOR DELETE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "delete_admin" ON content_variants FOR DELETE TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "delete_admin" ON campaigns        FOR DELETE TO authenticated USING (public.current_user_role() = 'admin');

-- Tracking script (anon) can still INSERT visit sessions
-- (anon_insert_sessions policy already exists — keep it)

-- Tally webhook can update session status to 'form_submitted' without auth
CREATE POLICY "anon_update_session_status" ON sessions
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status = 'form_submitted');
