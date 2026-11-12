import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ActionSheet, Sheet, type Action } from '@/components/sheet';
import { Button, Input, useToast } from '@/components/ui';
import { useReport, useSetBlocked } from '@/lib/api/social';
import { useAuth } from '@/lib/auth';
import type { ReportTarget } from '@/lib/db.types';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { color, font, space } from '@/theme/tokens';

/**
 * The "⋯" on anything someone else published: report it, block its author.
 * Admins also get "hide", which takes it down for everyone at once.
 * Screens can add their own entries through `extra`.
 */
export function ReportMenu({
  type,
  id,
  authorId,
  extra = [],
}: {
  type: ReportTarget;
  id: string;
  authorId: string | null | undefined;
  extra?: Action[];
}) {
  const { userId, isAdmin } = useAuth();
  const toast = useToast();
  const report = useReport();
  const setBlocked = useSetBlocked();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [reason, setReason] = useState('');

  const mine = authorId === userId;
  const actions: Action[] = [...extra];
  if (!mine) {
    actions.push({ label: t('report.report'), onPress: () => setReporting(true) });
    if (authorId) {
      actions.push({ label: t('report.block'), destructive: true, onPress: () => setConfirmingBlock(true) });
    }
  }
  if (isAdmin) {
    actions.push({
      label: t('report.hide'),
      destructive: true,
      onPress: async () => {
        const { error } = await supabase.rpc('admin_set_hidden', { p_type: type, p_id: id, p_hidden: true });
        toast(error ? t('common.failed') : t('report.hidden'));
      },
    });
  }
  if (actions.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.more')}>
        <Text style={styles.dots}>⋯</Text>
      </Pressable>

      <ActionSheet visible={open} onClose={() => setOpen(false)} actions={actions} />

      <Sheet
        visible={reporting}
        onClose={() => setReporting(false)}
        title={t('report.title')}
        message={t('report.message')}>
        <Input
          value={reason}
          onChangeText={setReason}
          placeholder={t('report.placeholder')}
          multiline
          maxLength={500}
        />
        <Button
          label={t('report.send')}
          busy={report.isPending}
          onPress={() =>
            report.mutate(
              { type, id, reason: reason.trim() },
              {
                onSuccess: () => {
                  setReporting(false);
                  setReason('');
                  toast(t('report.sent'));
                },
                onError: () => toast(t('common.failed')),
              }
            )
          }
        />
        <Button label={t('common.cancel')} kind="quiet" onPress={() => setReporting(false)} />
      </Sheet>

      <ActionSheet
        visible={confirmingBlock}
        onClose={() => setConfirmingBlock(false)}
        title={t('report.blockTitle')}
        message={t('report.blockMessage')}
        actions={[
          {
            label: t('report.block'),
            destructive: true,
            onPress: () =>
              authorId &&
              setBlocked.mutate(
                { userId: authorId, blocked: true },
                { onSuccess: () => toast(t('report.blocked')), onError: () => toast(t('common.failed')) }
              ),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dots: { fontFamily: font.bodyBold, fontSize: 22, lineHeight: 24, color: color.textSoft, paddingHorizontal: space.xs },
});
