import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LightPicker } from '@/components/pickers';
import { BackBar, Button, Input, Label, Screen, Title, useToast } from '@/components/ui';
import { BOARD_TEMPLATES, type BoardTemplate } from '@/data/board-templates';
import { lightColor, type ChakraId } from '@/data/chakras';
import { useCreateBoard, useCreateFromTemplate } from '@/lib/api/boards';
import { t, tr } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** A new board: start from a template, or from a blank page with a title and a color. */
export default function NewBoardScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateBoard();
  const fromTemplate = useCreateFromTemplate();
  const [title, setTitle] = useState('');
  const [light, setLight] = useState<ChakraId>('anahata');
  const [starting, setStarting] = useState<string | null>(null);

  function start(template: BoardTemplate) {
    setStarting(template.id);
    fromTemplate.mutate(template, {
      // One board opens straight away; a set is easier to take in from the list behind this screen.
      onSuccess: (ids) => (ids.length === 1 ? router.replace(`/board/${ids[0]}`) : router.back()),
      onError: () => toast(t('common.failed')),
      onSettled: () => setStarting(null),
    });
  }

  return (
    <Screen header={<BackBar />}>
      <Title eyebrow={t('boards.eyebrow')}>{t('boards.new')}</Title>

      <Label>{t('templates.title')}</Label>
      <View style={styles.templates}>
        {BOARD_TEMPLATES.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => start(template)}
            disabled={fromTemplate.isPending}
            accessibilityRole="button"
            accessibilityLabel={tr(template.name)}
            style={({ pressed }) => [
              styles.template,
              { borderColor: alpha(lightColor(template.boards[0].light), 0.4) },
              (pressed || starting === template.id) && styles.pressed,
            ]}>
            <View style={styles.templateTop}>
              <Text style={styles.templateName}>{tr(template.name)}</Text>
              <Text style={styles.templateCount}>
                {template.boards.length === 1
                  ? t('templates.one')
                  : t('templates.many', { n: template.boards.length })}
              </Text>
            </View>
            <Text style={styles.templateDescription}>{tr(template.description)}</Text>
          </Pressable>
        ))}
      </View>

      <Label>{t('templates.blank')}</Label>
      <Input
        label={t('board.title')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('board.titlePlaceholder')}
        maxLength={60}
      />
      <Label>{t('board.light')}</Label>
      <LightPicker value={light} onChange={setLight} />
      <Button
        label={t('board.create')}
        accent={lightColor(light)}
        busy={create.isPending}
        disabled={title.trim() === ''}
        onPress={() =>
          create.mutate(
            { title: title.trim(), light },
            {
              onSuccess: (id) => router.replace(`/board/${id}`),
              onError: () => toast(t('common.failed')),
            }
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  templates: { gap: space.sm, marginBottom: space.xl },
  template: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    gap: space.xs,
  },
  pressed: { opacity: 0.6 },
  templateTop: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  templateName: { flex: 1, fontFamily: font.display, fontSize: 21, lineHeight: 26, color: color.text },
  templateCount: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  templateDescription: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.textSoft },
});
