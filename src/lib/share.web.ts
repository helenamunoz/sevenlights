import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * On the web the card is shared through the browser's share sheet when it can
 * take a file (phones), and downloaded otherwise.
 */
export async function shareView(view: RefObject<View | null>): Promise<void> {
  const dataUri = await captureRef(view, { format: 'png', quality: 1, result: 'data-uri' });
  const blob = await (await fetch(dataUri)).blob();
  const file = new File([blob], '7lights.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(link.href);
}
