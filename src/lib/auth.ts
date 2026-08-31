import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/** Closes the popup this app opened, on the web build. Harmless elsewhere. */
WebBrowser.maybeCompleteAuthSession();

/** Where Google sends the browser once it is done with us. */
const CALLBACK_PATH = 'auth/callback';

/**
 * Sign in with Google.
 *
 * On the phone the browser opens in a sheet over the app, Google returns to a
 * `sevenlights://auth/callback` link, and we trade the code it carries for a
 * session. In Expo Go that link is an `exp://…` one instead, which is why
 * Supabase's redirect allow list needs both — see the README.
 *
 * Resolves without a session when the person closes the sheet: backing out of
 * a sign-in is an answer, not a failure.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new AppError('sync-not-configured');

  // The web build has nowhere to put a browser sheet: it navigates away and
  // comes back with the session in the URL, which the client reads itself.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  const redirectTo = Linking.createURL(CALLBACK_PATH);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new AppError('sign-in-failed');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  // expo-linking parses the returned URL where the runtime's own URL support
  // is patchy, and it understands the `exp://…/--/…` shape Expo Go uses.
  const { queryParams } = Linking.parse(result.url);
  const code = asText(queryParams?.code);
  if (!code) {
    // Google puts a refusal in the query string rather than failing the request.
    const reason = asText(queryParams?.error_description) ?? asText(queryParams?.error);
    throw reason ? new Error(reason) : new AppError('sign-in-failed');
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

function asText(value: string | string[] | undefined | null): string | null {
  if (typeof value === 'string' && value) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}
