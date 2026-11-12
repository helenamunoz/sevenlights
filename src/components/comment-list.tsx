import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Byline } from '@/components/avatar';
import { ReportMenu } from '@/components/report-menu';
import { Button, Empty, Input, Label, useToast } from '@/components/ui';
import { useAddComment, useComments, useDeleteComment } from '@/lib/api/challenges';
import { useAuth } from '@/lib/auth';
import type { Author } from '@/lib/db.types';
import { locale, t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es' : 'en', { day: 'numeric', month: 'short' });
}

/** One thing somebody wrote: who, when, the text, and a menu to report it. */
export function Entry({
  author,
  detail,
  body,
  menu,
}: {
  author: Author | null | undefined;
  detail: string;
  body: string;
  menu?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.entry}>
      <View style={styles.entryTop}>
        <Pressable
          disabled={!author}
          onPress={() => author && router.push(`/user/${author.username}`)}
          style={styles.entryAuthor}>
          <Byline person={author} detail={detail} />
        </Pressable>
        {menu}
      </View>
      <Text style={styles.entryBody}>{body}</Text>
    </View>
  );
}

/** The comment thread under a challenge, with a box to add to it. */
export function CommentList({ challengeId, accent }: { challengeId: string; accent: string }) {
  const { userId } = useAuth();
  const toast = useToast();
  const comments = useComments(challengeId);
  const add = useAddComment();
  const remove = useDeleteComment();
  const [draft, setDraft] = useState('');

  function send() {
    const body = draft.trim();
    if (!body) return;
    add.mutate(
      { challengeId, body },
      { onSuccess: () => setDraft(''), onError: () => toast(t('common.failed')) }
    );
  }

  return (
    <View>
      <Label>{t('comments.title')}</Label>
      <Input
        value={draft}
        onChangeText={setDraft}
        placeholder={t('comments.placeholder')}
        multiline
        maxLength={1000}
        style={styles.box}
      />
      {draft.trim() ? (
        <Button label={t('comments.send')} accent={accent} busy={add.isPending} onPress={send} style={styles.send} />
      ) : null}

      {comments.data?.length === 0 ? <Empty>{t('comments.empty')}</Empty> : null}
      {(comments.data ?? []).map((comment) => (
        <Entry
          key={comment.id}
          author={comment.author}
          detail={shortDate(comment.created_at)}
          body={comment.body}
          menu={
            <ReportMenu
              type="comment"
              id={comment.id}
              authorId={comment.user_id}
              extra={
                comment.user_id === userId
                  ? [{ label: t('common.delete'), destructive: true, onPress: () => remove.mutate(comment) }]
                  : []
              }
            />
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 56 },
  send: { marginTop: -space.sm, marginBottom: space.lg, alignSelf: 'flex-end' },
  entry: { paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  entryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  entryAuthor: { flex: 1 },
  entryBody: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.text, marginTop: space.sm },
});
