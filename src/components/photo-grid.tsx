import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { pickPhotos, takePhoto, type PickedPhoto } from '@/lib/photos';
import type { BoardImage } from '@/lib/types';
import { alpha, color, font, radius, space } from '@/theme/tokens';

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
      const message =
        error instanceof Error && error.message === 'sin-permiso'
          ? 'SevenLights necesita permiso para ver tus fotos. Se cambia en Ajustes.'
          : 'No se pudo agregar la imagen.';
      Alert.alert('Imágenes', message);
    } finally {
      setBusy(false);
    }
  }

  function offerSources() {
    Alert.alert('Sumar imagen', undefined, [
      { text: 'Elegir de la galería', onPress: () => run(pickPhotos) },
      { text: 'Sacar una foto', onPress: () => run(takePhoto) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function confirmRemove(image: BoardImage) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Quitar esta imagen', 'Sale del tablero en todos tus dispositivos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => onRemove(image.id) },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Imágenes</Text>

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
              <Text style={styles.pending}>Descargando…</Text>
            )}
          </Pressable>
        ))}

        <Pressable
          onPress={offerSources}
          disabled={busy}
          style={[styles.add, { width: tile, height: tile, borderColor: alpha(accent, 0.4) }]}>
          <Text style={[styles.addPlus, { color: accent }]}>{busy ? '·' : '+'}</Text>
          <Text style={styles.addText}>
            {busy ? 'preparando…' : images.length ? 'sumar imagen' : 'sumar la primera'}
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
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginBottom: space.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.ink2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pending: { fontFamily: font.body, fontSize: 12, color: color.textFaint },
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
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 12, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  zoomImage: { width: '100%', height: '86%', borderRadius: radius.md },
});
