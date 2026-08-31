import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { CHAKRA_IDS, type ChakraId } from '@/data/chakras';
import { deletePhotoFile, newId } from '@/lib/photos';
import { isSyncConfigured, supabase } from '@/lib/supabase';
import { deleteRemoteImage, merge, pullBoards, pullImageFiles, pushBoard, pushImages } from '@/lib/sync';
import type { Board, BoardImage, Boards, SyncState } from '@/lib/types';

const STORAGE_KEY = 'sevenlights.boards.v1';
const PUSH_DELAY_MS = 1200;

function emptyBoard(chakra: ChakraId): Board {
  return {
    chakra,
    intention: '',
    affirmation: '',
    words: [],
    images: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function emptyBoards(): Boards {
  return Object.fromEntries(CHAKRA_IDS.map((id) => [id, emptyBoard(id)])) as Boards;
}

type StoreValue = {
  boards: Boards;
  ready: boolean;
  sync: SyncState;
  session: Session | null;
  setField: (chakra: ChakraId, field: 'intention' | 'affirmation', value: string) => void;
  addWord: (chakra: ChakraId, word: string) => void;
  removeWord: (chakra: ChakraId, index: number) => void;
  addImages: (chakra: ChakraId, photos: { id: string; localUri: string }[]) => void;
  removeImage: (chakra: ChakraId, imageId: string) => void;
  setCaption: (chakra: ChakraId, imageId: string, caption: string) => void;
  syncNow: () => Promise<void>;
  signIn: (email: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<Boards>(emptyBoards);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncState>({
    status: 'off',
    reason: isSyncConfigured ? 'signed-out' : 'not-configured',
  });

  const boardsRef = useRef(boards);
  boardsRef.current = boards;
  const pending = useRef(new Set<ChakraId>());
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- local persistence ---------- */

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          const stored = JSON.parse(raw) as Partial<Boards>;
          setBoards({ ...emptyBoards(), ...stored });
        }
      })
      .catch(() => {
        // A corrupt cache should not brick the app; start clean instead.
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(boards)).catch(() => {});
  }, [boards, ready]);

  /* ---------- session ---------- */

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  /* ---------- mutations ---------- */

  const edit = useCallback((chakra: ChakraId, change: (board: Board) => Board) => {
    setBoards((current) => {
      const next = change(current[chakra]);
      return { ...current, [chakra]: { ...next, updatedAt: new Date().toISOString() } };
    });
    pending.current.add(chakra);
    schedulePush();
  }, []);

  const setField = useCallback(
    (chakra: ChakraId, field: 'intention' | 'affirmation', value: string) =>
      edit(chakra, (board) => ({ ...board, [field]: value })),
    [edit]
  );

  const addWord = useCallback(
    (chakra: ChakraId, word: string) =>
      edit(chakra, (board) =>
        board.words.includes(word) ? board : { ...board, words: [...board.words, word] }
      ),
    [edit]
  );

  const removeWord = useCallback(
    (chakra: ChakraId, index: number) =>
      edit(chakra, (board) => ({ ...board, words: board.words.filter((_, i) => i !== index) })),
    [edit]
  );

  const addImages = useCallback(
    (chakra: ChakraId, photos: { id: string; localUri: string }[]) =>
      edit(chakra, (board) => ({
        ...board,
        images: [
          ...board.images,
          ...photos.map<BoardImage>((photo) => ({
            id: photo.id || newId(),
            localUri: photo.localUri,
            remotePath: null,
            caption: '',
            createdAt: new Date().toISOString(),
          })),
        ],
      })),
    [edit]
  );

  const removeImage = useCallback(
    (chakra: ChakraId, imageId: string) => {
      const image = boardsRef.current[chakra].images.find((i) => i.id === imageId);
      if (image) {
        deletePhotoFile(image.localUri);
        const userId = session?.user.id;
        if (userId) deleteRemoteImage(userId, image).catch(() => {});
      }
      edit(chakra, (board) => ({
        ...board,
        images: board.images.filter((i) => i.id !== imageId),
      }));
    },
    [edit, session]
  );

  const setCaption = useCallback(
    (chakra: ChakraId, imageId: string, caption: string) =>
      edit(chakra, (board) => ({
        ...board,
        images: board.images.map((i) => (i.id === imageId ? { ...i, caption } : i)),
      })),
    [edit]
  );

  /* ---------- sync ---------- */

  const syncNow = useCallback(async () => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setSync({ status: 'off', reason: isSyncConfigured ? 'signed-out' : 'not-configured' });
      return;
    }
    setSync({ status: 'syncing' });
    try {
      const remote = await pullBoards(userId);
      const merged = merge(boardsRef.current, remote);

      const settled: Boards = { ...merged };
      for (const id of CHAKRA_IDS) {
        let board = settled[id];
        board = await pushImages(userId, board);
        board = await pullImageFiles(board);
        settled[id] = board;
        if (board.updatedAt !== new Date(0).toISOString()) await pushBoard(userId, board);
      }

      setBoards(settled);
      pending.current.clear();
      setSync({ status: 'idle', lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      setSync({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo sincronizar',
      });
    }
  }, [session]);

  function schedulePush() {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      if (session?.user.id) syncNowRef.current().catch(() => {});
    }, PUSH_DELAY_MS);
  }

  // schedulePush is created fresh each render; keep a stable handle to the
  // latest syncNow so the debounce timer never calls a stale closure.
  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

  useEffect(() => {
    if (ready && session?.user.id) syncNow();
  }, [ready, session, syncNow]);

  /* ---------- auth ---------- */

  const signIn = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Sync no está configurado todavía');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }, []);

  const verify = useCallback(async (email: string, code: string) => {
    if (!supabase) throw new Error('Sync no está configurado todavía');
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSync({ status: 'off', reason: 'signed-out' });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      boards,
      ready,
      sync,
      session,
      setField,
      addWord,
      removeWord,
      addImages,
      removeImage,
      setCaption,
      syncNow,
      signIn,
      verify,
      signOut,
    }),
    [
      boards,
      ready,
      sync,
      session,
      setField,
      addWord,
      removeWord,
      addImages,
      removeImage,
      setCaption,
      syncNow,
      signIn,
      verify,
      signOut,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBoards(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useBoards debe usarse dentro de <BoardsProvider>');
  return value;
}

export function useBoard(chakra: ChakraId): Board {
  return useBoards().boards[chakra];
}

/** True when the board has anything on it — drives empty states and the column. */
export function isBoardStarted(board: Board): boolean {
  return Boolean(
    board.intention || board.affirmation || board.words.length || board.images.length
  );
}
