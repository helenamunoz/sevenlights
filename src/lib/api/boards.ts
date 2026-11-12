import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChakraId } from '@/data/chakras';
import { useMe } from '@/lib/auth';
import { AUTHOR_FIELDS, type Board, type BoardImage } from '@/lib/db.types';
import { boardImagePath, copyFile, newId, removeFiles, uploadImage } from '@/lib/media';
import type { PickedPhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

const BOARD = `*, images:board_images(*), owner:profiles(${AUTHOR_FIELDS})`;
const PAGE = 20;

function sortImages(board: Board): Board {
  board.images = [...(board.images ?? [])].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
  );
  return board;
}

// ── reading ──────────────────────────────────────────────────────────

/** The signed-in person's boards: seven chakra pages, then their free boards. */
export function useMyBoards() {
  const me = useMe();
  return useQuery({
    queryKey: ['boards', 'of', me],
    queryFn: () => boardsOf(me),
  });
}

/** Someone else's boards — row level security leaves only the public ones. */
export function useBoardsOf(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['boards', 'of', ownerId],
    enabled: Boolean(ownerId),
    queryFn: () => boardsOf(ownerId!),
  });
}

async function boardsOf(ownerId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select(BOARD)
    .eq('owner_id', ownerId)
    .order('created_at');
  if (error) throw error;
  return (data as Board[]).map(sortImages);
}

export function useBoard(id: string | undefined) {
  return useQuery({
    queryKey: ['board', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('boards').select(BOARD).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data ? sortImages(data as Board) : null;
    },
  });
}

export type ExploreSort = 'popular' | 'recent';

/** Other people's public boards that have something on them. */
export function useExplore(sort: ExploreSort) {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: ['explore', sort, me],
    initialPageParam: 0,
    getNextPageParam: (last: Board[], pages) => (last.length === PAGE ? pages.length * PAGE : undefined),
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('boards')
        .select(BOARD)
        .neq('owner_id', me)
        .eq('is_public', true)
        .eq('has_content', true);
      if (sort === 'popular') query = query.order('like_count', { ascending: false });
      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (error) throw error;
      return (data as Board[]).map(sortImages);
    },
  });
}

/** Ids of the boards the signed-in person has liked. */
export function useMyLikes() {
  const me = useMe();
  return useQuery({
    queryKey: ['likes', me],
    queryFn: async () => {
      const { data, error } = await supabase.from('board_likes').select('board_id').eq('user_id', me);
      if (error) throw error;
      return (data as { board_id: string }[]).map((row) => row.board_id);
    },
  });
}

// ── writing ──────────────────────────────────────────────────────────

export type BoardPatch = Partial<
  Pick<Board, 'title' | 'light' | 'intention' | 'affirmation' | 'words' | 'is_public'>
>;

/** Everything a board mutation can touch, refreshed together. */
function useRefreshBoards() {
  const client = useQueryClient();
  return (boardId?: string) => {
    if (boardId) client.invalidateQueries({ queryKey: ['board', boardId] });
    client.invalidateQueries({ queryKey: ['boards'] });
  };
}

export function useUpdateBoard() {
  const client = useQueryClient();
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: BoardPatch }) => {
      const { error } = await supabase.from('boards').update(patch).eq('id', id);
      if (error) throw error;
    },
    // Show the edit at once; the refetch afterwards settles any difference.
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: ['board', id] });
      const before = client.getQueryData<Board | null>(['board', id]);
      if (before) client.setQueryData(['board', id], { ...before, ...patch });
      return { before };
    },
    onError: (_error, { id }, context) => {
      if (context?.before) client.setQueryData(['board', id], context.before);
    },
    onSettled: (_data, _error, { id }) => refresh(id),
  });
}

export function useCreateBoard() {
  const me = useMe();
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async (input: { title: string; light: ChakraId }) => {
      const { data, error } = await supabase
        .from('boards')
        .insert({ owner_id: me, ...input })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => refresh(),
  });
}

export function useDeleteBoard() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async (board: Board) => {
      const { error } = await supabase.from('boards').delete().eq('id', board.id);
      if (error) throw error;
      await removeFiles(board.images.map((image) => image.storage_path));
    },
    onSuccess: () => refresh(),
  });
}

export function useAddImages() {
  const me = useMe();
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ board, photos }: { board: Board; photos: PickedPhoto[] }) => {
      let position = board.images.reduce((max, image) => Math.max(max, image.position), 0);
      for (const photo of photos) {
        const id = newId();
        const storage_path = boardImagePath(me, board.id, id);
        await uploadImage(photo, storage_path);
        const { error } = await supabase
          .from('board_images')
          .insert({ id, board_id: board.id, owner_id: me, storage_path, position: ++position });
        if (error) throw error;
      }
    },
    onSettled: (_data, _error, { board }) => refresh(board.id),
  });
}

export function useRemoveImage() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async (image: BoardImage) => {
      const { error } = await supabase.from('board_images').delete().eq('id', image.id);
      if (error) throw error;
      await removeFiles([image.storage_path]);
    },
    onSettled: (_data, _error, image) => refresh(image.board_id),
  });
}

export function useSetCaption() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ image, caption }: { image: BoardImage; caption: string }) => {
      const { error } = await supabase.from('board_images').update({ caption }).eq('id', image.id);
      if (error) throw error;
    },
    onSettled: (_data, _error, { image }) => refresh(image.board_id),
  });
}

export function useToggleLike() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, liked }: { boardId: string; liked: boolean }) => {
      const likes = supabase.from('board_likes');
      const { error } = liked
        ? await likes.delete().eq('board_id', boardId).eq('user_id', me)
        : await likes.upsert({ board_id: boardId, user_id: me }, { ignoreDuplicates: true });
      if (error) throw error;
    },
    onMutate: async ({ boardId, liked }) => {
      await client.cancelQueries({ queryKey: ['likes', me] });
      const before = client.getQueryData<string[]>(['likes', me]) ?? [];
      client.setQueryData(
        ['likes', me],
        liked ? before.filter((id) => id !== boardId) : [...before, boardId]
      );
      const board = client.getQueryData<Board | null>(['board', boardId]);
      if (board) {
        client.setQueryData(['board', boardId], {
          ...board,
          like_count: Math.max(0, board.like_count + (liked ? -1 : 1)),
        });
      }
      return { before, board };
    },
    onError: (_error, { boardId }, context) => {
      client.setQueryData(['likes', me], context?.before);
      if (context?.board) client.setQueryData(['board', boardId], context.board);
    },
    onSettled: (_data, _error, { boardId }) => {
      client.invalidateQueries({ queryKey: ['likes', me] });
      client.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

// ── borrowing from other people's boards ─────────────────────────────

/** Copies the file into the borrower's own folder and credits the source. */
async function copyImageInto(image: BoardImage, boardId: string, me: string, position: number) {
  const id = newId();
  const storage_path = boardImagePath(me, boardId, id);
  await copyFile(image.storage_path, storage_path);
  const { error } = await supabase.from('board_images').insert({
    id,
    board_id: boardId,
    owner_id: me,
    storage_path,
    caption: image.caption,
    position,
    source_image_id: image.source_image_id ?? image.id,
    source_owner_id: image.source_owner_id ?? image.owner_id,
  });
  if (error) throw error;
}

export function useCopyImage() {
  const me = useMe();
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ image, target }: { image: BoardImage; target: Board }) => {
      const position = target.images.reduce((max, i) => Math.max(max, i.position), 0) + 1;
      await copyImageInto(image, target.id, me, position);
    },
    onSettled: (_data, _error, { target }) => refresh(target.id),
  });
}

export type BorrowedText = { intention?: string; affirmation?: string; words?: string[] };

/** Adds borrowed text to a board without overwriting what is already there. */
export function useCopyText() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ text, target }: { text: BorrowedText; target: Board }) => {
      const join = (mine: string, theirs: string) => (mine ? `${mine}\n${theirs}` : theirs);
      const patch: BoardPatch = {};
      if (text.intention) patch.intention = join(target.intention, text.intention);
      if (text.affirmation) patch.affirmation = join(target.affirmation, text.affirmation);
      if (text.words) patch.words = [...new Set([...target.words, ...text.words])].slice(0, 24);
      const { error } = await supabase.from('boards').update(patch).eq('id', target.id);
      if (error) throw error;
    },
    onSettled: (_data, _error, { target }) => refresh(target.id),
  });
}

/** Starts a new free board from someone else's whole page; returns its id. */
export function useCopyBoard() {
  const me = useMe();
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ source, title }: { source: Board; title: string }) => {
      const { data, error } = await supabase.rpc('copy_board', { p_source: source.id, p_title: title });
      if (error) throw error;
      const id = data as string;
      let position = 0;
      for (const image of source.images) await copyImageInto(image, id, me, ++position);
      return id;
    },
    onSettled: () => refresh(),
  });
}
