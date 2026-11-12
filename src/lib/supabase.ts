import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Supabase is the source of truth: accounts, boards, challenges, files.
 *
 * Both values are safe to ship in a public repo — the anon key only grants
 * what row level security allows. The service role key never belongs here.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False until the two env vars are set; the root layout shows setup help. */
export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'http://localhost', anonKey || 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Sign-in is by emailed code, so there is never a session in the URL.
    detectSessionInUrl: false,
  },
});

// Tokens only need refreshing while the app is in front.
if (Platform.OS !== 'web' && isConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const MEDIA_BUCKET = 'media';
