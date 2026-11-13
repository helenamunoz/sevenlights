import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChakraId } from '@/data/chakras';
import { useMe } from '@/lib/auth';
import { read, write } from '@/lib/aws';
import type { Board, BoardImage } from '@/lib/db.types';
import { uploadBoardImage } from '@/lib/media';
import type { PickedPhoto } from '@/lib/photos';

// ── reading ──────────────────────────────────────────────────────────

/** The signed-in person's boards: seven chakra pages, then their free boards. */
export function useMyBoards() {
  const me = useMe();
  return useQuery({
    queryKey: ['boards', 'of', me],
    queryFn: () => boardsOf(me),
  });
}

/** Someone else's boards — the backend leaves only the ones this person may see. */
export function useBoardsOf(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['boards', 'of', ownerId],
    enabled: Boolean(ownerId),
    queryFn: () => boardsOf(ownerId!),
  });
}

const boardsOf = (ownerId: string) => read<Board[]>('boardsOf', { ownerId });

export function useBoard(id: string | undefined) {
  return useQuery({
    queryKey: ['board', id],
    enabled: Boolean(id),
    queryFn: () => read<Board | null>('board', { id }),
  });
}

export type ExploreSort = 'popular' | 'recent';

type ExplorePage = { boards: Board[]; more: boolean };

/** Other people's public boards that have something on them. */
export function useExplore(sort: ExploreSort) {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: ['explore', sort, me],
    initialPageParam: 0,
    getNextPageParam: (last: ExplorePage, pages) => (last.more ? pages.length * 20 : undefined),
    queryFn: ({ pageParam }) => read<ExplorePage>('explore', { sort, offset: pageParam }),
    select: (data) => ({ pages: data.pages.map((page) => page.boards), pageParams: data.pageParams }),
  });
}

/** Ids of the boards the signed-in person has liked. */
export function useMyLikes() {
  const me = useMe();
  return useQuery({
    queryKey: ['likes', me],
    queryFn: () => read<string[]>('myLikes'),
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
    mutationFn: ({ id, patch }: { id: string; patch: BoardPatch }) => write('updateBoard', { id, patch }),
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
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: (input: { title: string; light: ChakraId }) => write<string>('createBoard', input),
    onSuccess: () => refresh(),
  });
}

export function useDeleteBoard() {
  const refresh = useRefreshBoards();
  return useMutation({
    // The backend removes the board's photos from storage as well.
    mutationFn: (board: Board) => write('deleteBoard', { id: board.id }),
    onSuccess: () => refresh(),
  });
}

export function useAddImages() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: async ({ board, photos }: { board: Board; photos: PickedPhoto[] }) => {
      let position = board.images.reduce((max, image) => Math.max(max, image.position), 0);
      for (const photo of photos) {
        const id = await uploadBoardImage(photo, board.id);
        await write('addImage', { boardId: board.id, id, position: ++position });
      }
    },
    onSettled: (_data, _error, { board }) => refresh(board.id),
  });
}

export function useRemoveImage() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: (image: BoardImage) => write('removeImage', { boardId: image.board_id, imageId: image.id }),
    onSettled: (_data, _error, image) => refresh(image.board_id),
  });
}

export function useSetCaption() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: ({ image, caption }: { image: BoardImage; caption: string }) =>
      write('setCaption', { boardId: image.board_id, imageId: image.id, caption }),
    onSettled: (_data, _error, { image }) => refresh(image.board_id),
  });
}

export function useToggleLike() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    // `liked` is how things stand before the tap.
    mutationFn: ({ boardId, liked }: { boardId: string; liked: boolean }) =>
      write('setLike', { boardId, liked: !liked }),
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

/** The backend copies the file into the borrower's own folder. No credit is kept. */
export function useCopyImage() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: ({ image, target }: { image: BoardImage; target: Board }) =>
      write('copyImage', { sourceBoardId: image.board_id, imageId: image.id, targetBoardId: target.id }),
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
      await write('updateBoard', { id: target.id, patch });
    },
    onSettled: (_data, _error, { target }) => refresh(target.id),
  });
}

/** Starts a new free board from someone else's whole page; returns its id. */
export function useCopyBoard() {
  const refresh = useRefreshBoards();
  return useMutation({
    mutationFn: ({ source, title }: { source: Board; title: string }) =>
      write<string>('copyBoard', { sourceId: source.id, title }),
    onSettled: () => refresh(),
  });
}
