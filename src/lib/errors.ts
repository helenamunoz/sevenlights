import type { Dictionary } from '@/i18n/es';

/**
 * The app's own failures carry a code rather than a sentence, so the message
 * the user reads comes out of the dictionary in whichever language they chose.
 * Errors from Supabase keep their own wording — it is more specific than
 * anything we would substitute for it.
 */
export type AppErrorCode = keyof Omit<Dictionary['errors'], 'unknown'>;

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode) {
    super(code);
    this.name = 'AppError';
  }
}

/** The sentence to show for a caught error, in the current language. */
export function messageFor(error: unknown, t: Dictionary): string {
  if (error instanceof AppError) return t.errors[error.code];
  if (error instanceof Error && error.message) return error.message;
  return t.errors.unknown;
}
