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
    const { data } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('id', userId)
      .single();
    return (data as Profile) ?? null;
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      const profile = user ? await fetchProfile(user.id) : null;
      setState({ user, profile, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!mounted) return;
        const user = session?.user ?? null;
        const profile = user ? await fetchProfile(user.id) : null;
        setState({ user, profile, loading: false });
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
