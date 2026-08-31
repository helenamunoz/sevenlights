import { Directory, File, Paths } from 'expo-file-system';

import { CHAKRA_IDS, isChakraId } from '@/data/chakras';
import { readPhotoBytes } from '@/lib/photos';
import { IMAGE_BUCKET, supabase } from '@/lib/supabase';
import type { Board, BoardImage, Boards } from '@/lib/types';

/**
 * Sync is last-write-wins per board, which is the right trade for a private
 * notebook edited by one person on two devices: no merge UI, no conflict
 * prompts, and the newest edit of a board wins whole. Photos are additive —
 * they carry their own ids, so they merge without fighting.
 */

type BoardRow = {
  user_id: string;
  chakra: string;
  intention: string;
  affirmation: string;
  words: string[] | null;
  updated_at: string;
};

type ImageRow = {
  id: string;
  user_id: string;
  chakra: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export async function pullBoards(userId: string): Promise<Partial<Boards>> {
  if (!supabase) return {};

  const [boards, images] = await Promise.all([
    supabase.from('boards').select('*').eq('user_id', userId),
    supabase.from('board_images').select('*').eq('user_id', userId),
  ]);
  if (boards.error) throw boards.error;
  if (images.error) throw images.error;

  const imagesByChakra = new Map<string, BoardImage[]>();
  for (const row of (images.data ?? []) as ImageRow[]) {
    const list = imagesByChakra.get(row.chakra) ?? [];
    list.push({
      id: row.id,
      localUri: null,
      remotePath: row.storage_path,
      caption: row.caption ?? '',
      createdAt: row.created_at,
    });
    imagesByChakra.set(row.chakra, list);
  }

  const result: Partial<Boards> = {};
  for (const row of (boards.data ?? []) as BoardRow[]) {
    if (!isChakraId(row.chakra)) continue;
    result[row.chakra] = {
      chakra: row.chakra,
      intention: row.intention ?? '',
      affirmation: row.affirmation ?? '',
      words: row.words ?? [],
      images: (imagesByChakra.get(row.chakra) ?? []).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
      updatedAt: row.updated_at,
    };
  }
  return result;
}

export async function pushBoard(userId: string, board: Board): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('boards').upsert(
    {
      user_id: userId,
      chakra: board.chakra,
      intention: board.intention,
      affirmation: board.affirmation,
      words: board.words,
      updated_at: board.updatedAt,
    },
    { onConflict: 'user_id,chakra' }
  );
  if (error) throw error;
}

/** Upload any photo that only exists on this device, and record its row. */
export async function pushImages(userId: string, board: Board): Promise<Board> {
  if (!supabase) return board;

  const images = [...board.images];
  let changed = false;

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (image.remotePath || !image.localUri) continue;

    const path = `${userId}/${board.chakra}/${image.id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, await readPhotoBytes(image.localUri), {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from('board_images').upsert({
      id: image.id,
      user_id: userId,
      chakra: board.chakra,
      storage_path: path,
      caption: image.caption,
      created_at: image.createdAt,
    });
    if (rowError) throw rowError;

    images[i] = { ...image, remotePath: path };
    changed = true;
  }

  return changed ? { ...board, images } : board;
}

/** Fetch photos this device has never seen, so the board looks whole offline too. */
export async function pullImageFiles(board: Board): Promise<Board> {
  if (!supabase) return board;

  const missing = board.images.filter((i) => !i.localUri && i.remotePath);
  if (missing.length === 0) return board;

  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });

  const resolved = new Map<string, string>();
  for (const image of missing) {
    const { data, error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(image.remotePath!, 60 * 10);
    if (error || !data?.signedUrl) continue;

    const destination = new File(dir, `${image.id}.jpg`);
    if (destination.exists) {
      resolved.set(image.id, destination.uri);
      continue;
    }
    const file = await File.downloadFileAsync(data.signedUrl, destination, { idempotent: true });
    resolved.set(image.id, file.uri);
  }

  if (resolved.size === 0) return board;
  return {
    ...board,
    images: board.images.map((i) =>
      resolved.has(i.id) ? { ...i, localUri: resolved.get(i.id)! } : i
    ),
  };
}

export async function deleteRemoteImage(userId: string, image: BoardImage): Promise<void> {
  if (!supabase || !image.remotePath) return;
  await supabase.storage.from(IMAGE_BUCKET).remove([image.remotePath]);
  await supabase.from('board_images').delete().eq('id', image.id).eq('user_id', userId);
}

/** Newest edit wins, board by board. Photos are unioned by id. */
export function merge(local: Boards, remote: Partial<Boards>): Boards {
  const merged = { ...local };
  for (const id of CHAKRA_IDS) {
    const here = local[id];
    const there = remote[id];
    if (!there) continue;

    const winner = there.updatedAt > here.updatedAt ? there : here;
    const byId = new Map<string, BoardImage>();
    for (const image of [...here.images, ...there.images]) {
      const existing = byId.get(image.id);
      byId.set(image.id, {
        ...image,
        // Keep whichever side knows about the local file and the remote path.
        localUri: image.localUri ?? existing?.localUri ?? null,
        remotePath: image.remotePath ?? existing?.remotePath ?? null,
      });
    }

    merged[id] = {
      ...winner,
      images: [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  }
  return merged;
}
