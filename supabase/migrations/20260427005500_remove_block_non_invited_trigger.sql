-- ============================================================
-- AUTH FIX: remove insert-blocking auth.users trigger
-- ============================================================

DROP TRIGGER IF EXISTS block_non_invited_signup ON auth.users;
DROP FUNCTION IF EXISTS public.block_non_invited_signup();
