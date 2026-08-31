import type { ChakraId } from '@/data/chakras';

export type BoardImage = {
  id: string;
  /** Local copy inside the app's documents dir. Always present on the device that added it. */
  localUri: string | null;
  /** Path inside the Supabase storage bucket, once uploaded. */
  remotePath: string | null;
  caption: string;
  createdAt: string;
};

export type Board = {
  chakra: ChakraId;
  intention: string;
  affirmation: string;
  words: string[];
  images: BoardImage[];
  /** ISO timestamp of the last local edit. Drives last-write-wins merges. */
  updatedAt: string;
};

export type Boards = Record<ChakraId, Board>;

export type SyncState =
  | { status: 'off'; reason: 'not-configured' | 'signed-out' }
  | { status: 'idle'; lastSyncedAt: string | null }
  | { status: 'syncing' }
  | { status: 'error'; message: string };
