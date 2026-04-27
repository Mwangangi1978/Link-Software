import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'head_admin' | 'admin' | 'viewer';
  invited_by: string | null;
  created_at: string;
}

export type AppRole = 'head_admin' | 'admin' | 'viewer';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  isHeadAdmin: boolean;
  role: AppRole;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  const resolveRole = (user: User | null, profile: Profile | null): AppRole => {
    const fromProfile = profile?.role;
    if (fromProfile === 'head_admin' || fromProfile === 'admin' || fromProfile === 'viewer') return fromProfile;

    const claim = user?.app_metadata?.userrole;
    if (claim === 'head_admin' || claim === 'admin' || claim === 'viewer') return claim;

    return 'viewer';
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', userId)
        .single();
      return (data as Profile) ?? null;
    } catch (err) {
      console.error('fetchProfile failed:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await fetchProfile(user.id);
      setState(s => ({ ...s, profile }));
    }
  };

  useEffect(() => {
    let mounted = true;

    // Resolve user + profile and flip loading off. Wrapped in try/catch so a
    // hung profile fetch never strands the UI on the loading screen.
    const hydrate = async (user: User | null) => {
      if (!mounted) return;
      try {
        const profile = user ? await fetchProfile(user.id) : null;
        if (!mounted) return;
        setState({ user, profile, loading: false });
      } catch (err) {
        console.error('auth hydrate failed:', err);
        if (mounted) setState({ user, profile: null, loading: false });
      }
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => hydrate(session?.user ?? null))
      .catch(err => {
        console.error('getSession failed:', err);
        if (mounted) setState({ user: null, profile: null, loading: false });
      });

    // IMPORTANT: do NOT await a supabase call inside onAuthStateChange — the
    // GoTrue client holds an internal lock for the duration of the callback,
    // and any awaited supabase request inside will deadlock against
    // getSession()/getUser(). We defer with setTimeout(0) to release the lock
    // before doing the profile fetch.
    // See: https://github.com/supabase/auth-js/issues/762
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const user = session?.user ?? null;
        setTimeout(() => { hydrate(user); }, 0);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role = resolveRole(state.user, state.profile);
  const isAdmin = role === 'admin' || role === 'head_admin';
  const isHeadAdmin = role === 'head_admin';

  return (
    <AuthContext.Provider value={{
      ...state,
      isAdmin,
      isHeadAdmin,
      role,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
