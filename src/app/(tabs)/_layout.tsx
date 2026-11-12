import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { t } from '@/lib/i18n';
import { color, font } from '@/theme/tokens';

/** The four places: your boards, other people's, challenges, and you. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.ink },
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textFaint,
        tabBarLabelStyle: styles.label,
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.boards'), tabBarIcon: glyph('✦') }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.explore'), tabBarIcon: glyph('◎') }} />
      <Tabs.Screen name="challenges" options={{ title: t('tabs.challenges'), tabBarIcon: glyph('△') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: glyph('○') }} />
    </Tabs>
  );
}

function glyph(symbol: string) {
  return ({ color: tint }: { color: ColorValue }) => <Text style={[styles.glyph, { color: tint }]}>{symbol}</Text>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.ink2, borderTopColor: color.line, borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 0.4 },
  glyph: { fontSize: 18, lineHeight: 22 },
});
