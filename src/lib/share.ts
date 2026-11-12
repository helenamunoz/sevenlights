import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Turns a rendered card into a picture and hands it to the system share sheet.
 * Instagram appears there as "Stories" when it is installed; nothing here
 * depends on Instagram's own SDK.
 */
export async function shareView(view: RefObject<View | null>): Promise<void> {
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}
