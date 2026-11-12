import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { Byline } from '@/components/avatar';
import { boardColor, boardName } from '@/components/board-card';
import { Field } from '@/components/field';
import { PhotoGrid } from '@/components/photo-grid';
import { BoardPicker, LightPicker } from '@/components/pickers';
import { ReportMenu } from '@/components/report-menu';
import { ShareCard, ShareModal, ShareMosaic, shareStyles } from '@/components/share-card';
import { ActionSheet } from '@/components/sheet';
import { BackBar, Button, Empty, Input, Label, Loading, Screen, Toggle, useToast } from '@/components/ui';
import { WordChips } from '@/components/word-chips';
import { CHAKRA_BY_ID } from '@/data/chakras';
import {
  useAddImages,
  useBoard,
  useCopyBoard,
  useCopyImage,
  useCopyText,
  useDeleteBoard,
  useMyLikes,
  useRemoveImage,
  useSetCaption,
  useToggleLike,
  useUpdateBoard,
  type BorrowedText,
} from '@/lib/api/boards';
import { useMe } from '@/lib/auth';
import type { Board, BoardImage } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * One board. Its owner edits it in place; everyone else reads it, and can
 * like it or borrow from it — a photo, a line of text, or the whole page.
 */
export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const board = useBoard(id);

  if (board.isPending) {
    return (
      <Screen header={<BackBar />}>
        <Loading />
      </Screen>
    );
  }
  if (!board.data) {
    return (
      <Screen header={<BackBar />}>
        <Empty>{board.isError ? t('common.loadFailed') : t('board.missing')}</Empty>
      </Screen>
    );
  }
  return board.data.owner_id === me ? <OwnBoard board={board.data} /> : <OtherBoard board={board.data} />;
}

/** The top of a board: a chakra's seed and names, or a free board's title. */
function Head({ board }: { board: Board }) {
  const accent = boardColor(board);
  const chakra = board.chakra ? CHAKRA_BY_ID[board.chakra] : null;

  return (
    <>
      <View style={styles.auraSlot} pointerEvents="none">
        <Aura color={accent} size={360} intensity={0.9} />
      </View>
      <View style={styles.head}>
        <View style={[styles.bija, { borderColor: alpha(accent, 0.35), backgroundColor: alpha(accent, 0.12) }]}>
          {chakra?.bija ? (
            <Text style={[styles.bijaText, { color: accent }]}>{chakra.bija}</Text>
          ) : chakra ? (
            <Text style={[styles.bijaSilence, { color: accent }]}>{t('board.silence')}</Text>
          ) : (
            <View style={[styles.freeDot, { backgroundColor: accent }]} />
          )}
        </View>
        <View style={styles.heading}>
          <Text style={styles.number}>{chakra ? t('board.center', { n: chakra.n }) : t('board.free')}</Text>
          <Text style={styles.name}>{boardName(board)}</Text>
          {chakra ? <Text style={[styles.sanskrit, { color: accent }]}>{chakra.sa}</Text> : null}
        </View>
      </View>
      {chakra ? (
        <>
          <Text style={styles.meta}>
            {tr(chakra.element)} · {tr(chakra.place)}
          </Text>
          <Text style={styles.field}>{tr(chakra.field)}</Text>
        </>
      ) : null}
    </>
  );
}

function OwnBoard({ board }: { board: Board }) {
  const router = useRouter();
  const toast = useToast();
  const accent = boardColor(board);
  const update = useUpdateBoard();
  const addImages = useAddImages();
  const removeImage = useRemoveImage();
  const remove = useDeleteBoard();
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = (patch: Parameters<typeof update.mutate>[0]['patch']) =>
    update.mutate({ id: board.id, patch }, { onError: () => toast(t('common.saveFailed')) });

  return (
    <Screen
      header={
        <BackBar
          right={
            <Pressable onPress={() => setSharing(true)} hitSlop={12} accessibilityRole="button">
              <Text style={styles.link}>{t('share.share')}</Text>
            </Pressable>
          }
        />
      }>
      <Head board={board} />

      {board.hidden_at ? <Text style={styles.hidden}>{t('board.hiddenNotice')}</Text> : null}

      <View style={styles.body}>
        {board.chakra === null ? (
          <>
            <Field
              label={t('board.title')}
              value={board.title}
              placeholder={t('board.titlePlaceholder')}
              accent={accent}
              maxLength={60}
              onChange={(title) => title && save({ title })}
            />
            <Label>{t('board.light')}</Label>
            <LightPicker value={board.light} onChange={(light) => save({ light })} />
          </>
        ) : null}

        <Field
          label={t('board.intention')}
          value={board.intention}
          placeholder={board.chakra ? tr(CHAKRA_BY_ID[board.chakra].prompt) : t('board.intentionPlaceholder')}
          accent={accent}
          onChange={(intention) => save({ intention })}
        />
        <Field
          label={t('board.affirmation')}
          value={board.affirmation}
          placeholder={t('board.affirmationPlaceholder')}
          accent={accent}
          italic
          onChange={(affirmation) => save({ affirmation })}
        />
        <WordChips
          words={board.words}
          accent={accent}
          onAdd={(word) => save({ words: [...board.words, word].slice(0, 24) })}
          onRemove={(index) => save({ words: board.words.filter((_, i) => i !== index) })}
        />
        <PhotoGrid
          images={board.images}
          accent={accent}
          adding={addImages.isPending}
          onAdd={(photos) =>
            addImages.mutate({ board, photos }, { onError: () => toast(t('photos.failed')) })
          }
          renderActions={(image, close) => (
            <OwnImageActions
              image={image}
              onRemove={() => {
                close();
                removeImage.mutate(image, { onError: () => toast(t('common.failed')) });
              }}
            />
          )}
        />
      </View>

      <Toggle
        label={t('board.public')}
        hint={board.is_public ? t('board.publicOn') : t('board.publicOff')}
        value={board.is_public}
        accent={accent}
        onChange={(is_public) => save({ is_public })}
      />
      <Text style={styles.hint}>{t('board.autosave')}</Text>

      {board.chakra === null ? (
        <Button label={t('board.delete')} kind="danger" onPress={() => setDeleting(true)} style={styles.spaced} />
      ) : null}

      <ActionSheet
        visible={deleting}
        onClose={() => setDeleting(false)}
        title={t('board.deleteTitle')}
        message={t('board.deleteMessage')}
        actions={[
          {
            label: t('board.delete'),
            destructive: true,
            onPress: () =>
              remove.mutate(board, {
                onSuccess: () => router.back(),
                onError: () => toast(t('common.failed')),
              }),
          },
        ]}
      />
      <BoardShare board={board} visible={sharing} onClose={() => setSharing(false)} />
    </Screen>
  );
}

/** Under an enlarged photo of your own: write its caption, or remove it. */
function OwnImageActions({ image, onRemove }: { image: BoardImage; onRemove: () => void }) {
  const toast = useToast();
  const setCaption = useSetCaption();
  const [draft, setDraft] = useState(image.caption);

  return (
    <>
      <Input
        value={draft}
        onChangeText={setDraft}
        placeholder={t('photos.captionPlaceholder')}
        maxLength={200}
        onBlur={() => {
          const caption = draft.trim();
          if (caption !== image.caption) {
            setCaption.mutate({ image, caption }, { onError: () => toast(t('common.saveFailed')) });
          }
        }}
      />
      <Button label={t('photos.remove')} kind="danger" onPress={onRemove} />
    </>
  );
}

function OtherBoard({ board }: { board: Board }) {
  const router = useRouter();
  const toast = useToast();
  const accent = boardColor(board);
  const likes = useMyLikes();
  const toggleLike = useToggleLike();
  const copyImage = useCopyImage();
  const copyText = useCopyText();
  const copyBoard = useCopyBoard();

  // What is waiting for the person to choose one of their boards.
  const [pending, setPending] = useState<{ image: BoardImage } | { text: BorrowedText } | null>(null);
  const [sharing, setSharing] = useState(false);
  const liked = likes.data?.includes(board.id) ?? false;

  const feedback = (target: Board) => ({
    onSuccess: () => toast(t('borrow.done', { board: boardName(target) })),
    onError: () => toast(t('common.failed')),
  });

  function borrowInto(target: Board) {
    if (!pending) return;
    if ('image' in pending) copyImage.mutate({ image: pending.image, target }, feedback(target));
    else copyText.mutate({ text: pending.text, target }, feedback(target));
    setPending(null);
  }

  return (
    <Screen
      header={
        <BackBar
          right={
            <>
              <Pressable onPress={() => setSharing(true)} hitSlop={12} accessibilityRole="button">
                <Text style={styles.link}>{t('share.share')}</Text>
              </Pressable>
              <ReportMenu type="board" id={board.id} authorId={board.owner_id} />
            </>
          }
        />
      }>
      <Head board={board} />

      <Pressable
        style={styles.owner}
        disabled={!board.owner}
        onPress={() => board.owner && router.push(`/user/${board.owner.username}`)}>
        <Byline person={board.owner} />
      </Pressable>

      <View style={styles.body}>
        {board.intention ? (
          <Borrowable label={t('board.intention')} onBorrow={() => setPending({ text: { intention: board.intention } })}>
            <Text style={styles.readText}>{board.intention}</Text>
          </Borrowable>
        ) : null}
        {board.affirmation ? (
          <Borrowable
            label={t('board.affirmation')}
            onBorrow={() => setPending({ text: { affirmation: board.affirmation } })}>
            <Text style={[styles.readText, styles.readItalic]}>{board.affirmation}</Text>
          </Borrowable>
        ) : null}
        {board.words.length ? (
          <View>
            <WordChips words={board.words} accent={accent} />
            <Pressable
              onPress={() => setPending({ text: { words: board.words } })}
              hitSlop={8}
              style={styles.borrowWords}
              accessibilityRole="button">
              <Text style={styles.borrow}>{t('borrow.words')}</Text>
            </Pressable>
          </View>
        ) : null}
        <PhotoGrid
          images={board.images}
          accent={accent}
          renderActions={(image, close) => (
            <Button
              label={t('borrow.photo')}
              accent={accent}
              onPress={() => {
                close();
                setPending({ image });
              }}
            />
          )}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label={`${liked ? '♥' : '♡'}  ${board.like_count}`}
          kind="secondary"
          onPress={() => toggleLike.mutate({ boardId: board.id, liked })}
          style={liked ? { borderColor: accent } : undefined}
        />
        <Button
          label={t('borrow.board')}
          kind="secondary"
          busy={copyBoard.isPending}
          style={styles.grow}
          onPress={() =>
            copyBoard.mutate(
              { source: board, title: boardName(board) },
              {
                onSuccess: (id) => router.push(`/board/${id}`),
                onError: () => toast(t('common.failed')),
              }
            )
          }
        />
      </View>
      <Text style={styles.hint}>{t('borrow.hint')}</Text>

      <BoardPicker
        visible={pending !== null}
        onClose={() => setPending(null)}
        onPick={borrowInto}
        title={t('borrow.choose')}
      />
      <BoardShare board={board} visible={sharing} onClose={() => setSharing(false)} />
    </Screen>
  );
}

/** A piece of someone's text with a quiet "add to mine" beside its label. */
function Borrowable({
  label,
  onBorrow,
  children,
}: {
  label: string;
  onBorrow: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.borrowable}>
      <View style={styles.borrowableTop}>
        <Label>{label}</Label>
        <Pressable onPress={onBorrow} hitSlop={8} accessibilityRole="button">
          <Text style={styles.borrow}>{t('borrow.text')}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function BoardShare({ board, visible, onClose }: { board: Board; visible: boolean; onClose: () => void }) {
  return (
    <ShareModal visible={visible} onClose={onClose}>
      <ShareCard
        accent={boardColor(board)}
        eyebrow={board.chakra ? CHAKRA_BY_ID[board.chakra].sa : t('share.board')}
        title={boardName(board)}>
        <ShareMosaic paths={board.images.map((image) => image.storage_path)} />
        {board.affirmation || board.intention ? (
          <Text style={shareStyles.quote} numberOfLines={5}>
            {board.affirmation || board.intention}
          </Text>
        ) : null}
        {board.words.length ? (
          <Text style={shareStyles.small} numberOfLines={2}>
            {board.words.join(' · ')}
          </Text>
        ) : null}
      </ShareCard>
    </ShareModal>
  );
}

const styles = StyleSheet.create({
  auraSlot: { position: 'absolute', top: -140, left: -140 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, marginTop: space.md },
  bija: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bijaText: { fontFamily: font.deva, fontSize: 34, lineHeight: 46 },
  bijaSilence: { fontFamily: font.displayItalic, fontSize: 14 },
  freeDot: { width: 16, height: 16, borderRadius: 8 },
  heading: { flex: 1, paddingTop: space.xs },
  number: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  name: { fontFamily: font.display, fontSize: 38, lineHeight: 42, color: color.text, marginTop: 2 },
  sanskrit: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  meta: { fontFamily: font.body, fontSize: 13, color: color.textSoft, marginTop: space.lg },
  field: { fontFamily: font.body, fontSize: 13, color: color.textFaint, marginTop: 2 },
  owner: { marginTop: space.lg, alignSelf: 'flex-start' },
  body: { marginTop: space.xl },
  link: { fontFamily: font.bodyMedium, fontSize: 14, color: color.textSoft },
  hidden: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: color.warn,
    borderWidth: 1,
    borderColor: alpha(color.warn, 0.4),
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.lg,
  },
  hint: {
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 18,
    color: color.textFaint,
    textAlign: 'center',
    marginTop: space.md,
  },
  spaced: { marginTop: space.xl },
  readText: { fontFamily: font.display, fontSize: 20, lineHeight: 29, color: color.text },
  readItalic: { fontFamily: font.displayItalic, fontSize: 22 },
  borrowable: { marginBottom: space.lg },
  borrowableTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  borrow: { fontFamily: font.bodyMedium, fontSize: 12, color: color.textSoft, textDecorationLine: 'underline' },
  borrowWords: { alignSelf: 'flex-start', marginTop: -space.md, marginBottom: space.lg },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  grow: { flex: 1 },
});
