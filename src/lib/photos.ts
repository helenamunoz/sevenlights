import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { AppError } from '@/lib/errors';

/**
 * Photos picked from the camera roll live in a temporary cache directory, so
 * we copy each one into the app's documents dir and keep that URI. Uploading
 * to Supabase storage is a separate, later step (see sync.ts) — the picture is
 * on the board the instant it is chosen, online or not.
 */

const PHOTOS_DIR = 'photos';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export type PickedPhoto = { id: string; localUri: string };

export async function pickPhotos(): Promise<PickedPhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new AppError('photo-permission');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 12,
    quality: 0.85,
    exif: false,
  });
  if (result.canceled) return [];

  return result.assets.map((asset) => keep(asset.uri));
}

export async function takePhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new AppError('photo-permission');

  const result = await ImagePicker.launchCameraAsync({ quality: 0.85, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  return keep(result.assets[0].uri);
}

/** Copy a picked asset into permanent storage and return its stable id + URI. */
function keep(sourceUri: string): PickedPhoto {
  const id = newId();
  const extension = extensionOf(sourceUri);
  const destination = new File(photosDir(), `${id}.${extension}`);
  new File(sourceUri).copy(destination);
  return { id, localUri: destination.uri };
}

export function deletePhotoFile(localUri: string | null): void {
  if (!localUri) return;
  try {
    const file = new File(localUri);
    if (file.exists) file.delete();
  } catch {
    // A photo that is already gone is not a problem worth surfacing.
  }
}

export async function readPhotoBytes(localUri: string): Promise<Uint8Array> {
  return new File(localUri).bytes();
}

function extensionOf(uri: string): string {
  const match = /\.([a-zA-Z0-9]{3,4})(?:\?|$)/.exec(uri);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
