-- Fix invited_by foreign key to use ON DELETE SET NULL.
-- The original definition had no ON DELETE clause (defaults to RESTRICT),
-- which prevents deleting any auth user who has invited other members.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_invited_by_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
