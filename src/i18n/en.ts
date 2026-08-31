import type { Dictionary } from '@/i18n/es';

/**
 * English. Same voice as the Spanish, plainly: warm, second person, no
 * exclamation marks. Typed against the Spanish dictionary, so this file cannot
 * fall behind it.
 */
export const en: Dictionary = {
  app: {
    name: 'Seven Lights',
    tagline: 'Vision board',
  },
  column: {
    subtitle: 'From root to crown. One center at a time, whenever you feel like it.',
    center: 'Center {n}',
    rowLabel: '{name}, center {n}',
  },
  board: {
    back: '← Column',
    missing: "That center doesn't exist.",
    backToColumn: '← Back to the column',
    silence: 'silence',
    intention: 'Intention',
    affirmation: 'Affirmation',
    affirmationPlaceholder: 'I am…',
    words: 'Words',
    wordPlaceholder: 'one word',
    addWord: '+ word',
    removeWordHint: '{word}. Press and hold to remove.',
    images: 'Images',
    addFirstImage: 'add the first one',
    addImage: 'add image',
    preparing: 'getting ready…',
    downloading: 'Downloading…',
    hint: 'Saves itself. Press and hold an image to remove it.',
  },
  photos: {
    sourceTitle: 'Add image',
    fromLibrary: 'Choose from library',
    fromCamera: 'Take a photo',
    cancel: 'Cancel',
    removeTitle: 'Remove this image',
    removeBody: 'It leaves the board on all your devices.',
    remove: 'Remove',
    alertTitle: 'Images',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageHint: 'Changes the whole app, right away.',
    sync: 'Sync',
    session: 'Session',
    state: 'Status',
    syncNow: 'Sync now',
    signOut: 'Sign out',
    email: 'Your email',
    emailPlaceholder: 'you@example.com',
    codeSent: 'We send you a six-digit code.',
    sendCode: 'Send code',
    code: 'Code',
    enter: 'Sign in',
    otherEmail: 'Use another email',
    lastSynced: 'Last time: {when}',
    neverSynced: 'Not synced yet',
    notConfiguredTitle: 'On this phone only',
    notConfiguredBody:
      'Your boards live on this phone only. To see them on the web too, connect Supabase: copy .env.example to .env.local, fill in the project URL and anon key, and run the SQL in supabase/schema.sql.',
    notConfiguredMore: 'The full steps are in the README.',
  },
  sync: {
    syncing: 'Syncing…',
    synced: 'Synced',
    error: "Couldn't sync",
    signedOut: 'Sign in to sync',
    local: 'On this phone only',
  },
  errors: {
    unknown: 'Something went wrong. Try again.',
    'sync-not-configured': 'Sync is not set up yet.',
    'sync-failed': "Couldn't sync.",
    'photo-permission': 'Seven Lights needs permission to see your photos. You can change it in Settings.',
    'photo-failed': "Couldn't add the image.",
  },
};
