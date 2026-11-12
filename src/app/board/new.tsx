import { useRouter } from 'expo-router';
import { useState } from 'react';

import { LightPicker } from '@/components/pickers';
import { BackBar, Button, Input, Label, Screen, Title, useToast } from '@/components/ui';
import { lightColor, type ChakraId } from '@/data/chakras';
import { useCreateBoard } from '@/lib/api/boards';
import { t } from '@/lib/i18n';

/** A free board: any theme, with one of the seven lights as its color. */
export default function NewBoardScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateBoard();
  const [title, setTitle] = useState('');
  const [light, setLight] = useState<ChakraId>('anahata');

  return (
    <Screen header={<BackBar />}>
      <Title eyebrow={t('board.free')}>{t('boards.new')}</Title>
      <Input
        label={t('board.title')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('board.titlePlaceholder')}
        maxLength={60}
        autoFocus
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
