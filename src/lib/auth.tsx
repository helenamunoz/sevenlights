import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Profile } from '@/lib/db.types';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

type Auth = {
  /** False until the stored session has been read. */
  ready: boolean;
  session: Session | null;
  userId: string | null;
  /** Null while loading, and for someone who has signed in but not onboarded. */
  profile: Profile | null;
  profileLoading: boolean;
  /** The profile could not be fetched and none is cached — not the same as having none. */
  profileFailed: boolean;
  retryProfile: () => void;
  isAdmin: boolean;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const profile = useQuery({
    queryKey: ['profile', userId],
    enabled: userId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const admin = useQuery({
    queryKey: ['is-admin', userId],
    enabled: userId !== null,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data === true;
    },
  });

  const value: Auth = {
    ready,
    session,
    userId,
    profile: profile.data ?? null,
    profileLoading: userId !== null && profile.isPending,
    profileFailed: profile.isError && profile.data === undefined,
    retryProfile: () => void profile.refetch(),
    isAdmin: admin.data === true,
    sendCode: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    },
    verifyCode: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      // The next person on this phone must not see the last one's cache.
      queryClient.clear();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** The signed-in user's id, for screens that only render when there is one. */
export function useMe(): string {
  const { userId } = useAuth();
  if (!userId) throw new Error('This screen needs a signed-in user');
  return userId;
}
