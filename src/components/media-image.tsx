import { Image, type ImageContentFit } from 'expo-image';
import type { StyleProp } from 'react-native';
import type { ImageStyle } from 'expo-image';

import { useMediaUrl } from '@/lib/media';

/**
 * A picture from the media bucket. The signed URL changes every hour, so the
 * storage path is the cache key — the file is downloaded once, not hourly.
 */
export function MediaImage({
  path,
  style,
  contentFit = 'cover',
  label,
}: {
  path: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  label?: string;
}) {
  const uri = useMediaUrl(path);
  return (
    <Image
      source={uri && path ? { uri, cacheKey: path } : null}
      style={style}
      contentFit={contentFit}
      transition={200}
      accessibilityLabel={label}
    />
  );
}
