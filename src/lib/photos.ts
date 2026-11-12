import * as ImagePicker from 'expo-image-picker';

/**
 * Choosing pictures. The picker hands back temporary files; lib/media.ts
 * shrinks and uploads them straight away, so nothing is kept on the phone.
 */
export type PickedPhoto = { uri: string; width: number; height: number };

/** Thrown when the person has refused access; the caller explains what to do. */
export const NO_PERMISSION = 'no-permission';

export async function pickPhotos(limit = 12): Promise<PickedPhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(NO_PERMISSION);

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.9,
    exif: false,
  });
  if (result.canceled) return [];
  return result.assets.map(({ uri, width, height }) => ({ uri, width, height }));
}

export async function takePhoto(): Promise<PickedPhoto[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error(NO_PERMISSION);

  const result = await ImagePicker.launchCameraAsync({ quality: 0.9, exif: false });
  if (result.canceled || !result.assets[0]) return [];
  const { uri, width, height } = result.assets[0];
  return [{ uri, width, height }];
}
