import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The backend, reached over plain HTTPS: Cognito for sign-in, AppSync for
 * everything else. There is deliberately no AWS SDK or Amplify library in the
 * app — their React Native packages need native code that Expo Go does not
 * carry, and these few requests do not need them.
 *
 * The three values below are public by design (they ship inside every copy of
 * the app). What a signed-in person may do is decided by the backend in
 * amplify/functions/api, never here.
 */
const region = process.env.EXPO_PUBLIC_AWS_REGION;
const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

/** False until the env vars are set; the root layout shows setup help. */
export const isConfigured = Boolean(region && clientId && apiUrl);

// ── session ──────────────────────────────────────────────────────────

export type Session = {
  user: { id: string; email: string };
  isAdmin: boolean;
};

type Stored = {
  accessToken: string;
  refreshToken: string;
  /** When the access token stops working, in epoch milliseconds. */
  expiresAt: number;
  email: string;
};

const KEY = 'sevenlights.session.v1';
let stored: Stored | null = null;
let loaded: Promise<void> | null = null;
const listeners = new Set<(session: Session | null) => void>();

function claims(token: string): Record<string, unknown> {
  const body = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function toSession(value: Stored | null): Session | null {
  if (!value) return null;
  const token = claims(value.accessToken);
  const groups = (token['cognito:groups'] as string[] | undefined) ?? [];
  return { user: { id: String(token.sub), email: value.email }, isAdmin: groups.includes('admins') };
}

async function keep(next: Stored | null) {
  stored = next;
  if (next) await AsyncStorage.setItem(KEY, JSON.stringify(next));
  else await AsyncStorage.removeItem(KEY);
  const session = toSession(next);
  listeners.forEach((listener) => listener(session));
}

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      stored = raw ? (JSON.parse(raw) as Stored) : null;
    })
    .catch(() => {
      stored = null;
    });
  return loaded;
}

export async function getSession(): Promise<Session | null> {
  await load();
  return toSession(stored);
}

export function onSessionChange(listener: (session: Session | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Cognito ──────────────────────────────────────────────────────────

class CognitoError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function cognito<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new CognitoError(String(json.__type ?? 'RequestFailed').split('#').pop()!);
  return json as T;
}

type Tokens = { AccessToken: string; RefreshToken?: string; ExpiresIn: number };
type AuthReply = { ChallengeName?: string; Session?: string; AuthenticationResult?: Tokens };

/** Between sendCode and verifyCode: who asked, and Cognito's handle for the attempt. */
let pending: { email: string; session: string } | null = null;

/**
 * Emails a one-time code. A first-time address gets an account on the spot
 * (confirmed by the backend's pre-sign-up function), so there is one flow for
 * everyone and the code is what proves the address.
 */
export async function sendCode(email: string): Promise<void> {
  const address = email.trim().toLowerCase();
  try {
    await cognito('SignUp', {
      ClientId: clientId,
      Username: address,
      UserAttributes: [{ Name: 'email', Value: address }],
    });
  } catch (error) {
    if (!(error instanceof CognitoError) || error.code !== 'UsernameExistsException') throw error;
  }
  const reply = await cognito<AuthReply>('InitiateAuth', {
    ClientId: clientId,
    AuthFlow: 'USER_AUTH',
    AuthParameters: { USERNAME: address, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
  });
  if (reply.ChallengeName !== 'EMAIL_OTP' || !reply.Session) throw new CognitoError('NoEmailCode');
  pending = { email: address, session: reply.Session };
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!pending || pending.email !== address) throw new CognitoError('NoCodeRequested');
  const reply = await cognito<AuthReply>('RespondToAuthChallenge', {
    ClientId: clientId,
    ChallengeName: 'EMAIL_OTP',
    Session: pending.session,
    ChallengeResponses: { USERNAME: address, EMAIL_OTP_CODE: code.trim() },
  });
  const tokens = reply.AuthenticationResult;
  if (!tokens?.RefreshToken) {
    // A wrong code comes back as a fresh challenge with a new handle.
    if (reply.Session) pending = { email: address, session: reply.Session };
    throw new CognitoError('CodeMismatch');
  }
  pending = null;
  await keep({
    accessToken: tokens.AccessToken,
    refreshToken: tokens.RefreshToken,
    expiresAt: Date.now() + tokens.ExpiresIn * 1000,
    email: address,
  });
}

export async function signOut(): Promise<void> {
  const token = stored?.refreshToken;
  await keep(null);
  // Best effort: the phone has already forgotten the session.
  if (token) cognito('RevokeToken', { ClientId: clientId, Token: token }).catch(() => {});
}

let refreshing: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  const current = stored;
  if (!current) return null;
  try {
    const reply = await cognito<AuthReply>('InitiateAuth', {
      ClientId: clientId,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: current.refreshToken },
    });
    const tokens = reply.AuthenticationResult!;
    await keep({
      ...current,
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken ?? current.refreshToken,
      expiresAt: Date.now() + tokens.ExpiresIn * 1000,
    });
    return tokens.AccessToken;
  } catch (error) {
    // Only a refused token ends the session; being offline does not.
    if (error instanceof CognitoError && ['NotAuthorizedException', 'UserNotFoundException'].includes(error.code)) {
      await keep(null);
      return null;
    }
    throw error;
  }
}

/** A working access token, renewed a minute before it runs out. */
async function accessToken(force = false): Promise<string | null> {
  await load();
  if (!stored) return null;
  if (!force && stored.expiresAt - Date.now() > 60_000) return stored.accessToken;
  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// ── API ──────────────────────────────────────────────────────────────

const DOCUMENTS = {
  read: 'query Read($op: String!, $input: AWSJSON) { result: read(op: $op, input: $input) }',
  write: 'mutation Write($op: String!, $input: AWSJSON) { result: write(op: $op, input: $input) }',
};

async function call<T>(kind: 'read' | 'write', op: string, input: object, retried = false): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error('not_signed_in');
  const response = await fetch(apiUrl!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query: DOCUMENTS[kind], variables: { op, input: JSON.stringify(input) } }),
  });
  if (response.status === 401 && !retried) {
    await accessToken(true);
    return call(kind, op, input, true);
  }
  const json = (await response.json()) as { data?: { result: unknown }; errors?: { message: string }[] };
  // The backend answers a refusal with a short code such as "board_full".
  if (json.errors?.length) throw new Error(json.errors[0].message);
  let result = json.data?.result;
  while (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      break;
    }
  }
  return result as T;
}

/** Ask the backend for something. See `reads` in amplify/functions/api/handler.ts. */
export const read = <T>(op: string, input: object = {}) => call<T>('read', op, input);

/** Change something. See `writes` in amplify/functions/api/handler.ts. */
export const write = <T = null>(op: string, input: object = {}) => call<T>('write', op, input);
