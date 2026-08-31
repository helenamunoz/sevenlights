import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL to parse in a native app; codes come through the OTP screen.
        detectSessionInUrl: false,
      },
    })
  : null;

export const IMAGE_BUCKET = 'board-images';
