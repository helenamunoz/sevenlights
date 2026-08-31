import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useLocale } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { pickPhotos, takePhoto, type PickedPhoto } from '@/lib/photos';
import type { BoardImage } from '@/lib/types';
import { alpha, color, radius, space, type } from '@/theme/tokens';

/**
 * The images on a board. Two columns, square tiles, tap to enlarge, long-press
 * to remove. Adding offers the camera roll or the camera itself.
 */
export function PhotoGrid({
  images,
  accent,
  onAdd,
  onRemove,
}: {
  images: BoardImage[];
  accent: string;
  onAdd: (photos: PickedPhoto[]) => void;
  onRemove: (imageId: string) => void;
}) {
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const [zoomed, setZoomed] = useState<BoardImage | null>(null);
  const [busy, setBusy] = useState(false);

  const tile = (width - space.lg * 2 - space.sm) / 2;

  async function run(action: () => Promise<PickedPhoto[] | PickedPhoto | null>) {
    setBusy(true);
    try {
      const result = await action();
      const photos = Array.isArray(result) ? result : result ? [result] : [];
      if (photos.length) {
        onAdd(photos);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert(t.photos.alertTitle, messageFor(error, t));
    } finally {
      setBusy(false);
    }
  }

  function offerSources() {
    Alert.alert(t.photos.sourceTitle, undefined, [
      { text: t.photos.fromLibrary, onPress: () => run(pickPhotos) },
      { text: t.photos.fromCamera, onPress: () => run(takePhoto) },
      { text: t.photos.cancel, style: 'cancel' },
    ]);
  }

  function confirmRemove(image: BoardImage) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.photos.removeTitle, t.photos.removeBody, [
      { text: t.photos.cancel, style: 'cancel' },
      { text: t.photos.remove, style: 'destructive', onPress: () => onRemove(image.id) },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t.board.images}</Text>

      <View style={styles.grid}>
        {images.map((image) => (
          <Pressable
            key={image.id}
            onPress={() => setZoomed(image)}
            onLongPress={() => confirmRemove(image)}
            style={[styles.tile, { width: tile, height: tile }]}>
            {image.localUri ? (
              <Image
                source={{ uri: image.localUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={220}
              />
            ) : (
              <Text style={styles.pending}>{t.board.downloading}</Text>
            )}
          </Pressable>
        ))}

        <Pressable
          onPress={offerSources}
          disabled={busy}
          style={[styles.add, { width: tile, height: tile, borderColor: alpha(accent, 0.4) }]}>
          <Text style={[styles.addPlus, { color: accent }]}>{busy ? '·' : '+'}</Text>
          <Text style={styles.addText}>
            {busy ? t.board.preparing : images.length ? t.board.addImage : t.board.addFirstImage}
          </Text>
        </Pressable>
      </View>

      <Modal visible={zoomed !== null} transparent animationType="fade" onRequestClose={() => setZoomed(null)}>
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomed(null)}>
          {zoomed?.localUri && (
            <Image source={{ uri: zoomed.localUri }} style={styles.zoomImage} contentFit="contain" />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { ...type.label, color: color.textFaint, marginBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.ink2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pending: { ...type.caption, color: color.textFaint },
  add: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: color.ink2,
  },
  addPlus: { fontFamily: type.lead.fontFamily, fontSize: 30, lineHeight: 34 },
  addText: { ...type.caption, color: color.textFaint },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: alpha(color.ink, 0.95),
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  zoomImage: { width: '100%', height: '86%', borderRadius: radius.md },
});
