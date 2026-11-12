import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { PickedPhoto } from '@/lib/photos';
import { MEDIA_BUCKET, supabase } from '@/lib/supabase';

/**
 * Files in the private `media` bucket: board photos, avatars, challenge audio.
 * Paths always begin with the owner's user id (see supabase/schema.sql).
 *
 * Reading goes through short-lived signed URLs, so a photo stops being
 * reachable when its board is made private or hidden.
 */

const bucket = () => supabase.storage.from(MEDIA_BUCKET);

export const newId = (): string => Crypto.randomUUID();

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
  const { data } = await bucket().createSignedUrls(paths, URL_LIFETIME);
  // Leave a margin so a URL is never handed out moments before it expires.
  const expires = Date.now() + (URL_LIFETIME - 300) * 1000;
  paths.forEach((path, index) => {
    const url = data?.[index]?.signedUrl ?? null;
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

async function contents(uri: string): Promise<Blob | Uint8Array> {
  if (Platform.OS === 'web') return (await fetch(uri)).blob();
  return new File(uri).bytes();
}

export async function uploadImage(photo: PickedPhoto, path: string): Promise<void> {
  const body = await contents(await shrink(photo));
  const { error } = await bucket().upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
}

export async function uploadFile(uri: string, path: string, contentType: string): Promise<void> {
  const { error } = await bucket().upload(path, await contents(uri), { contentType, upsert: true });
  if (error) throw error;
}

export async function copyFile(from: string, to: string): Promise<void> {
  const { error } = await bucket().copy(from, to);
  if (error) throw error;
}

export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  paths.forEach((path) => known.delete(path));
  await bucket().remove(paths);
}

/** Every file under a folder, however deep. Used when an account is deleted. */
async function listAll(folder: string): Promise<string[]> {
  const { data } = await bucket().list(folder, { limit: 1000 });
  const found: string[] = [];
  for (const entry of data ?? []) {
    const path = `${folder}/${entry.name}`;
    // Folders come back without an id.
    if (entry.id === null) found.push(...(await listAll(path)));
    else found.push(path);
  }
  return found;
}

export async function removeAllFilesOf(userId: string): Promise<void> {
  const paths = await listAll(userId);
  for (let i = 0; i < paths.length; i += 100) await removeFiles(paths.slice(i, i + 100));
}

export const boardImagePath = (userId: string, boardId: string, imageId: string) =>
  `${userId}/boards/${boardId}/${imageId}.jpg`;
