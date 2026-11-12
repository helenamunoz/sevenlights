import { StyleSheet, Text, View } from 'react-native';

import { MediaImage } from '@/components/media-image';
import type { Author } from '@/lib/db.types';
import { t } from '@/lib/i18n';
import { color, font } from '@/theme/tokens';

/** A person's picture, or their initial on a quiet disc. */
export function Avatar({
  person,
  size = 32,
}: {
  person: Pick<Author, 'display_name' | 'avatar_path'> | null | undefined;
  size?: number;
}) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (person?.avatar_path) {
    return <MediaImage path={person.avatar_path} style={shape} label={person.display_name} />;
  }
  return (
    <View style={[styles.disc, shape]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {(person?.display_name ?? '·').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** Avatar with name, as a byline. A missing person is someone who left. */
export function Byline({ person, detail }: { person: Author | null | undefined; detail?: string }) {
  return (
    <View style={styles.byline}>
      <Avatar person={person} size={26} />
      <Text style={styles.name} numberOfLines={1}>
        {person?.display_name ?? t('common.someone')}
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: color.line, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: font.bodyBold, color: color.textSoft },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: font.bodyMedium, fontSize: 13, color: color.textSoft, flexShrink: 1 },
  detail: { fontFamily: font.body, fontSize: 12, color: color.textFaint },
});
