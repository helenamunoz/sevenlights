import { Tabs } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { afterglow, color, font } from '@/theme/tokens';

/** The four places: your boards, other people's, challenges, and you. */
export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.ink },
        tabBarStyle: [styles.bar, { height: 61 + bottom, paddingBottom: 6 + bottom }],
        tabBarActiveTintColor: afterglow.cream,
        tabBarInactiveTintColor: color.textFaint,
        tabBarLabelStyle: styles.label,
        tabBarLabelPosition: 'below-icon',
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.boards'), tabBarIcon: icon({ ios: 'square.stack', android: 'layers', web: 'layers' }) }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: t('tabs.explore'), tabBarIcon: icon({ ios: 'safari', android: 'explore', web: 'explore' }) }}
      />
      <Tabs.Screen
        name="challenges"
        options={{ title: t('tabs.challenges'), tabBarIcon: icon({ ios: 'checkmark.square', android: 'check_box', web: 'check_box' }) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: icon({ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }) }}
      />
    </Tabs>
  );
}

function icon(name: SymbolViewProps['name']) {
  return ({ color: tint }: { color: ColorValue }) => <SymbolView name={name} tintColor={tint} size={21} />;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.ink2,
    borderTopColor: color.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  label: { fontFamily: font.bodyMedium, fontSize: 11 },
});
