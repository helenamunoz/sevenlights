import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { read, write } from '@/lib/aws';
import type { PickedPhoto } from '@/lib/photos';

/**
 * Files in the private media bucket: board photos, avatars, challenge audio.
 * The app never talks to the bucket with credentials of its own. To show a
 * file it asks the backend for a short-lived link, which is only given while
 * the person may see what the file belongs to; to add one it asks where to
 * send it, and the backend fixes the destination, the type and a size limit.
 */

// ── reading ──────────────────────────────────────────────────────────

const URL_LIFETIME = 60 * 60;
const known = new Map<string, { url: string; expires: number }>();
let queue = new Map<string, ((url: string | null) => void)[]>();
let flushing: ReturnType<typeof setTimeout> | null = null;

/** A signed URL for a stored file. Requests made together share one round trip. */
export function mediaUrl(path: string): Promise<string | null> {
  const hit = known.get(path);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.url);

  return new Promise((resolve) => {
    queue.set(path, [...(queue.get(path) ?? []), resolve]);
    flushing ??= setTimeout(flush, 15);
  });
}

async function flush() {
  const batch = queue;
  queue = new Map();
  flushing = null;
  const paths = [...batch.keys()];
  const urls = await read<(string | null)[]>('mediaUrls', { paths }).catch(() => null);
  // Leave a margin so a URL is never handed out moments before it expires.
  const expires = Date.now() + (URL_LIFETIME - 300) * 1000;
  paths.forEach((path, index) => {
    const url = urls?.[index] ?? null;
    if (url) known.set(path, { url, expires });
    batch.get(path)?.forEach((resolve) => resolve(url));
  });
}

export function useMediaUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    path ? (known.get(path)?.url ?? null) : null
  );
  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    mediaUrl(path).then((next) => {
      if (live) setUrl(next);
    });
    return () => {
      live = false;
    };
  }, [path]);
  return path ? url : null;
}

// ── writing ──────────────────────────────────────────────────────────

const MAX_EDGE = 1600;

/**
 * Re-encodes a picked photo as a JPEG no larger than 1600px. Besides keeping
 * uploads small, this drops the location and camera data phones embed.
 */
async function shrink(photo: PickedPhoto): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_EDGE) {
    context.resize(photo.width >= photo.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  return saved.uri;
}

type Target = { path: string; url: string; fields: Record<string, string> };

/** Sends a local file to the address the backend handed out. */
async function send(uri: string, target: Target, contentType: string): Promise<void> {
  const form = new FormData();
  Object.entries(target.fields).forEach(([name, value]) => form.append(name, value));
  // The file has to be the last part of the form.
  if (Platform.OS === 'web') {
    form.append('file', await (await fetch(uri)).blob());
  } else {
    form.append('file', { uri, name: 'upload', type: contentType } as unknown as Blob);
  }
  const response = await fetch(target.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error('upload_failed');
}

/** Uploads a photo for a board; returns the id to record it under. */
export async function uploadBoardImage(photo: PickedPhoto, boardId: string): Promise<string> {
  const target = await write<Target & { id: string }>('uploadTarget', { kind: 'image', boardId });
  await send(await shrink(photo), target, 'image/jpeg');
  return target.id;
}

/** Uploads a profile picture; returns its stored path. */
export async function uploadAvatar(photo: PickedPhoto): Promise<string> {
  const target = await write<Target>('uploadTarget', { kind: 'avatar' });
  await send(await shrink(photo), target, 'image/jpeg');
  return target.path;
}

/** Uploads a challenge's audio; returns its stored path. */
export async function uploadAudio(uri: string, name: string, mimeType: string): Promise<string> {
  const extension = /\.([a-z0-9]{2,4})$/i.exec(name)?.[1]?.toLowerCase() ?? 'm4a';
  const contentType = /^audio\//.test(mimeType) ? mimeType : 'audio/mp4';
  const target = await write<Target>('uploadTarget', { kind: 'audio', extension, contentType });
  await send(uri, target, contentType);
  return target.path;
}
