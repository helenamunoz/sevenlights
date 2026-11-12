import { StyleSheet, Text } from 'react-native';

import { BackBar, Screen, Title } from '@/components/ui';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/** Community rules and what happens with people's data, in plain words. */
export default function LegalScreen() {
  return (
    <Screen header={<BackBar />}>
      <Title>{t('legal.title')}</Title>
      <Text style={styles.heading}>{t('legal.rulesTitle')}</Text>
      <Text style={styles.body}>{t('legal.rules')}</Text>
      <Text style={styles.heading}>{t('legal.privacyTitle')}</Text>
      <Text style={styles.body}>{t('legal.privacy')}</Text>
      <Text style={styles.heading}>{t('legal.careTitle')}</Text>
      <Text style={styles.body}>{t('legal.care')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: color.text, marginBottom: space.sm },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 24, color: color.textSoft, marginBottom: space.xl },
});
