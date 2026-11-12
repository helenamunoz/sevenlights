import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaImage } from '@/components/media-image';
import { ActionSheet } from '@/components/sheet';
import { useToast } from '@/components/ui';
import type { BoardImage } from '@/lib/db.types';
import { t } from '@/lib/i18n';
import { NO_PERMISSION, pickPhotos, takePhoto, type PickedPhoto } from '@/lib/photos';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * The images on a board. Two columns, square tiles, tap to enlarge. With
 * `onAdd` a last tile offers the camera roll or the camera. What can be done
 * with an enlarged image — caption it, remove it, borrow it — is up to the
 * screen, through `renderActions`.
 */
export function PhotoGrid({
  images,
  accent,
  onAdd,
  adding = false,
  renderActions,
}: {
  images: BoardImage[];
  accent: string;
  onAdd?: (photos: PickedPhoto[]) => void;
  adding?: boolean;
  renderActions?: (image: BoardImage, close: () => void) => ReactNode;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [picking, setPicking] = useState(false);

  const tile = (Math.min(width, 720) - space.lg * 2 - space.sm) / 2;
  const zoomed = images.find((image) => image.id === zoomedId) ?? null;
  const busy = picking || adding;

  async function run(source: () => Promise<PickedPhoto[]>) {
    setPicking(true);
    try {
      const photos = await source();
      if (photos.length) {
        onAdd?.(photos);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (error) {
      toast(
        error instanceof Error && error.message === NO_PERMISSION
          ? t('photos.noPermission')
          : t('photos.failed')
      );
    } finally {
      setPicking(false);
    }
  }

  if (!onAdd && images.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('board.images')}</Text>

      <View style={styles.grid}>
        {images.map((image) => (
          <Pressable
            key={image.id}
            onPress={() => setZoomedId(image.id)}
            accessibilityRole="imagebutton"
            accessibilityLabel={image.caption || t('board.image')}
            style={[styles.tile, { width: tile, height: tile }]}>
            <MediaImage path={image.storage_path} style={StyleSheet.absoluteFill} />
          </Pressable>
        ))}

        {onAdd ? (
          <Pressable
            onPress={() => setChoosing(true)}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.add, { width: tile, height: tile, borderColor: alpha(accent, 0.4) }]}>
            <Text style={[styles.addPlus, { color: accent }]}>{busy ? '·' : '+'}</Text>
            <Text style={styles.addText}>
              {busy ? t('photos.uploading') : images.length ? t('photos.add') : t('photos.addFirst')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ActionSheet
        visible={choosing}
        onClose={() => setChoosing(false)}
        title={t('photos.add')}
        actions={[
          { label: t('photos.fromLibrary'), onPress: () => run(() => pickPhotos()) },
          { label: t('photos.fromCamera'), onPress: () => run(takePhoto) },
        ]}
      />

      <Modal
        visible={zoomed !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomedId(null)}>
        <View style={[styles.zoom, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }]}>
          <Pressable style={styles.zoomImageSlot} onPress={() => setZoomedId(null)}>
            {zoomed ? (
              <MediaImage path={zoomed.storage_path} style={styles.zoomImage} contentFit="contain" />
            ) : null}
          </Pressable>
          {zoomed?.caption ? <Text style={styles.caption}>{zoomed.caption}</Text> : null}
          {zoomed && renderActions ? (
            <View style={styles.zoomActions}>{renderActions(zoomed, () => setZoomedId(null))}</View>
          ) : null}
          <Pressable onPress={() => setZoomedId(null)} hitSlop={12} accessibilityRole="button">
            <Text style={styles.close}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginBottom: space.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.ink2 },
  add: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: color.ink2,
  },
  addPlus: { fontFamily: font.display, fontSize: 30, lineHeight: 34 },
  addText: { fontFamily: font.body, fontSize: 12, color: color.textFaint },
  zoom: {
    flex: 1,
    backgroundColor: alpha(color.scrim, 0.96),
    alignItems: 'center',
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  zoomImageSlot: { flex: 1, alignSelf: 'stretch' },
  zoomImage: { flex: 1, borderRadius: radius.md },
  caption: {
    fontFamily: font.displayItalic,
    fontSize: 17,
    lineHeight: 24,
    color: color.text,
    textAlign: 'center',
  },
  zoomActions: { alignSelf: 'stretch', gap: space.sm, maxWidth: 420, width: '100%' },
  close: { fontFamily: font.body, fontSize: 14, color: color.textSoft, paddingVertical: space.sm },
});
