import { useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLockup, CoverArt } from '@/components/brand';
import { MediaImage } from '@/components/media-image';
import { Button, useToast } from '@/components/ui';
import { t } from '@/lib/i18n';
import { shareView } from '@/lib/share';
import { afterglow, alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * A picture of a board or of challenge progress, shaped for an Instagram
 * Story (9:16). It is shown as a preview first; "share" captures exactly what
 * is on screen and opens the system share sheet.
 */
export function ShareModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  async function share() {
    setBusy(true);
    try {
      await shareView(card);
      onClose();
    } catch {
      toast(t('share.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }]}>
        <View
          style={styles.frame}
          onLayout={({ nativeEvent: { layout } }) => setCardWidth(Math.min(layout.width, layout.height * 9 / 16))}>
          <View ref={card} collapsable={false} style={[styles.card, { width: cardWidth }]}>
            {children}
          </View>
        </View>
        <View style={styles.actions}>
          <Button label={t('share.share')} busy={busy} disabled={cardWidth === 0} onPress={share} />
          <Button label={t('common.close')} kind="quiet" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/** A 9:16 card with paper accents, room for the person's content, and the Ember Ring lockup. */
export function ShareCard({
  accent,
  eyebrow,
  title,
  cover,
  children,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  cover?: number;
  children?: ReactNode;
}) {
  return (
    <View style={styles.inner}>
      <View style={[styles.paper, { backgroundColor: alpha(accent, 0.24) }]} pointerEvents="none" />
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title} numberOfLines={3}>{title}</Text>
      <View style={styles.body}>
        {cover ? <CoverArt source={cover} style={styles.storyCover} /> : null}
        {children}
      </View>
      <BrandLockup compact />
    </View>
  );
}

/** Up to four photos in a 2×2 mosaic, for a board's card. */
export function ShareMosaic({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <View style={styles.mosaic}>
      {paths.slice(0, 4).map((path) => (
        <MediaImage key={path} path={path} style={[styles.mosaicTile, paths.length === 1 && styles.mosaicSingle]} />
      ))}
    </View>
  );
}

/** One dot per day of a challenge, lit when done. */
export function ShareDots({ total, done, accent }: { total: number; done: Set<number>; accent: string }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            done.has(index + 1)
              ? { backgroundColor: accent }
              : { borderWidth: 1, borderColor: alpha(accent, 0.4) },
          ]}
        />
      ))}
    </View>
  );
}

export const shareStyles = StyleSheet.create({
  quote: {
    fontFamily: font.displayItalic,
    fontSize: 20,
    lineHeight: 28,
    color: color.text,
    textAlign: 'center',
  },
  big: { fontFamily: font.display, fontSize: 64, lineHeight: 70, color: color.text, textAlign: 'center' },
  small: { fontFamily: font.body, fontSize: 14, color: color.textSoft, textAlign: 'center' },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: alpha(color.scrim, 0.94),
    alignItems: 'center',
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  frame: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  card: {
    aspectRatio: 9 / 16,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.ink,
  },
  inner: { flex: 1, alignItems: 'center', padding: space.lg, paddingTop: space.xl },
  paper: {
    position: 'absolute',
    width: '130%',
    height: '30%',
    bottom: '-12%',
    right: '-20%',
    transform: [{ rotate: '-12deg' }],
  },
  eyebrow: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: afterglow.mauve,
    textAlign: 'center',
  },
  title: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 35,
    color: color.text,
    textAlign: 'center',
    marginTop: space.sm,
  },
  body: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: space.md },
  storyCover: { width: '100%', flex: 1, minHeight: 0, marginVertical: space.md },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignSelf: 'stretch' },
  mosaicTile: { width: '49%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: color.ink2 },
  mosaicSingle: { width: '100%' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: 230 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  actions: { alignSelf: 'stretch', maxWidth: 360, width: '100%', gap: space.xs },
});
