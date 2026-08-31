import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Supabase is optional at runtime. Without the two env vars the app is a
 * perfectly good local notebook; with them, boards sync across devices.
 *
 * Both values are safe to ship in a public repo — the anon key only grants
 * what row level security allows. The service role key never belongs here.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSyncConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSyncConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // AsyncStorage reaches for `window` on the web, which is not there while
        // the static site is rendered in Node. Left unset, supabase-js picks
        // localStorage in a real browser and an in-memory store during the
        // render — so `expo export -p web` keeps working once the env vars land.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // PKCE keeps the exchange safe over a deep link, where the redirect
        // back into the app is the weakest part of the journey.
        flowType: 'pkce',
        // On the phone the code arrives through a `sevenlights://` link that
        // src/lib/auth.ts hands over by hand; on the web it arrives in the
        // address bar, which only the browser build can read.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

export const IMAGE_BUCKET = 'board-images';
