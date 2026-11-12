import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/components/comment-list';
import { BackBar, Button, Card, Empty, Loading, Screen, Title, useToast } from '@/components/ui';
import { useOpenReports, useResolveReport } from '@/lib/api/social';
import { useAuth } from '@/lib/auth';
import type { Report, ReportTarget } from '@/lib/db.types';
import { t, type TextKey } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

const KIND: Record<ReportTarget, TextKey> = {
  board: 'admin.board',
  challenge: 'admin.challenge',
  comment: 'admin.comment',
  checkin: 'admin.note',
  profile: 'admin.profile',
};

/**
 * The moderation queue. Hiding takes the reported thing down for everyone but
 * its author; dismissing closes the report and leaves it up. Only admins get
 * any rows here — the database decides that, not this screen.
 */
export default function ReportsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const reports = useOpenReports();
  const resolve = useResolveReport();

  // Several people may report the same thing; show it once.
  const seen = new Set<string>();
  const queue = (reports.data ?? []).filter((report) => {
    const key = `${report.target_type}:${report.target_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  function open(report: Report) {
    if (report.target_type === 'board') router.push(`/board/${report.target_id}`);
    if (report.target_type === 'challenge') router.push(`/challenge/${report.target_id}`);
  }

  return (
    <Screen header={<BackBar />}>
      <Title>{t('admin.title')}</Title>
      {!isAdmin ? <Empty>{t('admin.notAdmin')}</Empty> : null}
      {isAdmin && reports.isPending ? <Loading /> : null}
      {isAdmin && reports.isSuccess && queue.length === 0 ? <Empty>{t('admin.empty')}</Empty> : null}

      {queue.map((report) => (
        <Card key={report.id} style={styles.card}>
          <Text style={styles.kind}>
            {t(KIND[report.target_type])} · {shortDate(report.created_at)}
          </Text>
          <Text style={styles.reason}>{report.reason || t('admin.noReason')}</Text>
          <View style={styles.actions}>
            {report.target_type === 'board' || report.target_type === 'challenge' ? (
              <Button label={t('admin.open')} kind="quiet" onPress={() => open(report)} />
            ) : null}
            <Button
              label={t('admin.dismiss')}
              kind="quiet"
              onPress={() => resolve.mutate({ report, hide: false }, { onError: () => toast(t('common.failed')) })}
            />
            <Button
              label={t('report.hide')}
              kind="danger"
              onPress={() => resolve.mutate({ report, hide: true }, { onError: () => toast(t('common.failed')) })}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md, gap: space.sm },
  kind: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  reason: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.sm },
});
