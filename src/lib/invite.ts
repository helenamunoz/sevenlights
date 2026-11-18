import { Platform, Share } from 'react-native';

import type { Challenge } from '@/lib/db.types';
import { t } from '@/lib/i18n';

/**
 * Where the web app lives. Invitations are web links because they open on any
 * phone or computer, with or without the app installed.
 */
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');

const CHALLENGE_PATH = /^\/challenge\/[A-Za-z0-9-]{1,64}$/;
const PENDING = 'sevenlights.invite.v1';

export function challengeLink(challenge: Pick<Challenge, 'id'>): string {
  const origin = WEB_URL || (Platform.OS === 'web' ? window.location.origin : '');
  return `${origin}/challenge/${challenge.id}`;
}

/**
 * Hands the invitation to the system share sheet. Where there is none (most
 * desktop browsers) the text is copied instead. Returns what happened, or
 * null when the person closed the sheet.
 */
export async function inviteTo(challenge: Pick<Challenge, 'id' | 'title'>): Promise<'shared' | 'copied' | null> {
  const message = t('invite.message', { title: challenge.title, url: challengeLink(challenge) });
  if (Platform.OS !== 'web') {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? null : 'shared';
  }
  if (navigator.share) {
    try {
      await navigator.share({ text: message });
      return 'shared';
    } catch (error) {
      if ((error as Error).name === 'AbortError') return null;
    }
  }
  await navigator.clipboard.writeText(message);
  return 'copied';
}

/**
 * Someone who opens an invitation without an account has to sign in first,
 * which takes them away from the link. On the web the challenge they came for
 * is kept for the length of the visit, so they land on it afterwards.
 */
export function rememberInvite(): void {
  if (Platform.OS !== 'web') return;
  try {
    if (CHALLENGE_PATH.test(window.location.pathname)) sessionStorage.setItem(PENDING, window.location.pathname);
  } catch {
    // Storage can be blocked; the invitation then simply opens the home screen.
  }
}

/** The remembered challenge path, once. */
export function takeInvite(): string | null {
  if (Platform.OS !== 'web') return null;
  try {
    const path = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return path && CHALLENGE_PATH.test(path) ? path : null;
  } catch {
    return null;
  }
}
