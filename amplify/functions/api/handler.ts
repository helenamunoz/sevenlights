import { randomUUID } from 'node:crypto';

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  batchGet,
  batchWrite,
  get,
  put,
  query,
  remove,
  row,
  transact,
  tx,
  update,
  type Item,
  type Key,
} from './db';
import * as files from './files';
import {
  CHAKRAS,
  CHALLENGES_PER_DAY,
  COMMENTS_PER_DAY,
  LOCALES,
  MAX_IMAGES,
  REPORT_TARGETS,
  RULES,
  Refused,
  checkDay,
  id as validId,
  link,
  localDate,
  oneOf,
  refuse,
  text,
  timer,
  username as validUsername,
  wilson,
  words as validWords,
} from './rules';
import { seed } from './seed';

/**
 * The only code with access to the table and the bucket.
 *
 * Every request names an operation. Reads decide here what the caller may see:
 * their own things always; other people's only when public, not hidden by an
 * admin, and with no block between the two. Writes decide here what the caller
 * may change, and counters, vote ranks and hidden flags are only ever set by
 * this file — no request can carry a value for them.
 *
 * Nothing a person wrote is ever logged: only operation names and error codes.
 */

type Caller = {
  me: string;
  cognitoUsername: string;
  poolId: string;
  admin: boolean;
  /** Everyone with a block between them and the caller, in either direction. */
  blocked: () => Promise<Set<string>>;
};

type Op = (input: any, caller: Caller) => Promise<unknown>;

const now = () => new Date().toISOString();
const day3 = (n: number) => String(n).padStart(3, '0');

// ── who may see what ─────────────────────────────────────────────────

async function seesBoard(board: Item | null, caller: Caller): Promise<boolean> {
  if (!board) return false;
  if (board.owner_id === caller.me || caller.admin) return true;
  return board.is_public === true && !board.hidden_at && !(await caller.blocked()).has(board.owner_id);
}

async function seesChallenge(challenge: Item | null, caller: Caller): Promise<boolean> {
  if (!challenge) return false;
  if (challenge.creator_id === caller.me || caller.admin) return true;
  if (challenge.hidden_at) return false;
  return !challenge.creator_id || !(await caller.blocked()).has(challenge.creator_id);
}

async function visibleChallenge(challengeId: unknown, caller: Caller): Promise<Item> {
  const challenge = await get(`CH#${validId(challengeId)}`, 'A');
  if (!(await seesChallenge(challenge, caller))) refuse('not_found');
  return challenge!;
}

async function myBoard(boardId: unknown, caller: Caller): Promise<Item> {
  const board = await get(`BOARD#${validId(boardId)}`, 'A');
  if (!board || board.owner_id !== caller.me) refuse('not_found');
  return board;
}

/** The few profile fields shown next to someone's content. */
async function authors(ids: (string | null | undefined)[]): Promise<Map<string, Item>> {
  const wanted = [...new Set(ids.filter((value): value is string => Boolean(value)))];
  const profiles = await batchGet(wanted.map((userId) => ({ pk: `U#${userId}`, sk: 'PROFILE' })));
  return new Map(
    profiles.map((p) => [
      p.id,
      { id: p.id, username: p.username, display_name: p.display_name, avatar_path: p.avatar_path ?? null },
    ])
  );
}

// ── boards ───────────────────────────────────────────────────────────

function newBoard(owner: string, fields: Item, createdAt = now()): Item {
  const boardId = randomUUID();
  return {
    pk: `BOARD#${boardId}`,
    sk: 'A',
    id: boardId,
    owner_id: owner,
    chakra: null,
    title: '',
    light: 'sahasrara',
    intention: '',
    affirmation: '',
    words: [],
    is_public: true,
    hidden_at: null,
    like_count: 0,
    image_count: 0,
    created_at: createdAt,
    updated_at: createdAt,
    ...fields,
  };
}

const boardPointer = (board: Item): Item => ({
  pk: `U#${board.owner_id}`,
  sk: `BOARD#${board.id}`,
  created_at: board.created_at,
});

function sortImages(images: Item[]): Item[] {
  return images
    .map((image) => row(image))
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}

/** A board with its photos, or null when it does not exist. No visibility check. */
async function loadBoard(boardId: string): Promise<Item | null> {
  const items = await query(`BOARD#${boardId}`);
  const board = items.find((item) => item.sk === 'A');
  if (!board) return null;
  return { ...row(board), images: sortImages(items.filter((item) => item.sk.startsWith('IMG#'))) };
}

/**
 * Explore lists public boards with something on them. The pointer is rebuilt
 * from the board after every change; a stale one can never expose anything,
 * because reads check the board itself again.
 */
async function syncExplore(boardId: string): Promise<void> {
  const board = await get(`BOARD#${boardId}`, 'A');
  const listed =
    board &&
    board.is_public &&
    !board.hidden_at &&
    (board.image_count > 0 || board.intention !== '' || board.affirmation !== '');
  if (listed) {
    await put({
      pk: 'EXPLORE',
      sk: boardId,
      owner_id: board.owner_id,
      like_count: board.like_count,
      updated_at: board.updated_at,
    });
  } else {
    await remove('EXPLORE', boardId);
  }
}

async function deleteBoardRows(boardId: string): Promise<string[]> {
  const items = await query(`BOARD#${boardId}`);
  await batchWrite(
    [],
    [...items.map(({ pk, sk }) => ({ pk, sk })), { pk: 'EXPLORE', sk: boardId }]
  );
  return items.filter((item) => item.sk.startsWith('IMG#')).map((item) => item.storage_path);
}

async function addImageRow(board: Item, image: Item): Promise<void> {
  const failed = await transact([
    tx.put(image, true),
    tx.update(board.pk, 'A', {
      add: { image_count: 1 },
      set: { updated_at: now() },
      condition: 'attribute_exists(pk) and #count < :max',
      names: { '#count': 'image_count' },
      values: { ':max': MAX_IMAGES },
    }),
  ]);
  if (failed === 1) refuse('board_full');
  if (failed !== null) refuse('already_exists');
}

function imageRow(board: Item, imageId: string, storagePath: string, caption: string, position: number): Item {
  return {
    pk: board.pk,
    sk: `IMG#${imageId}`,
    id: imageId,
    board_id: board.id,
    owner_id: board.owner_id,
    storage_path: storagePath,
    caption,
    position,
    // Borrowed photos carry no credit; the fields stay for the app's row shape.
    source_image_id: null,
    source_owner_id: null,
    created_at: now(),
  };
}

async function nextPosition(boardId: string): Promise<number> {
  const images = await query(`BOARD#${boardId}`, 'IMG#');
  return images.reduce((max, image) => Math.max(max, image.position ?? 0), 0) + 1;
}

/** Copies one photo's file into the caller's folder and adds it to their board. */
async function copyImage(source: Item, target: Item, position: number): Promise<void> {
  const imageId = randomUUID();
  const path = files.boardImagePath(target.owner_id, target.id, imageId);
  await files.copy(source.storage_path, path);
  await addImageRow(target, imageRow(target, imageId, path, source.caption ?? '', position));
}

// ── challenges ───────────────────────────────────────────────────────

async function withCreators(challenges: Item[]): Promise<Item[]> {
  const people = await authors(challenges.map((c) => c.creator_id));
  return challenges.map((c) => ({ ...row(c), creator: c.creator_id ? (people.get(c.creator_id) ?? null) : null }));
}

const noteKey = (checkin: Item): Key => ({
  pk: `CH#${checkin.challenge_id}`,
  sk: `NOTE#${checkin.done_at}#${checkin.user_id}#${day3(checkin.day_number)}`,
});

const isSharedNote = (checkin: Item) =>
  checkin.note_public === true && checkin.note !== '' && !checkin.hidden_at;

async function syncNote(checkin: Item): Promise<void> {
  const key = noteKey(checkin);
  if (isSharedNote(checkin)) await put({ ...key, user_id: checkin.user_id, day_number: checkin.day_number });
  else await remove(key.pk, key.sk);
}

const checkinKey = (challengeId: string, userId: string, day: number): Key => ({
  pk: `U#${userId}`,
  sk: `CK#${challengeId}#${day3(day)}`,
});

async function clearCheckins(challengeId: string, userId: string): Promise<void> {
  const mine = await query(`U#${userId}`, `CK#${challengeId}#`);
  await batchWrite([], [...mine.map(({ pk, sk }) => ({ pk, sk })), ...mine.map(noteKey)]);
}

/** Applies a vote change and re-derives the rank from the stored counts. */
async function applyVote(challengeId: string, userId: string, value: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await get(`U#${userId}`, `VOTE#${challengeId}`);
    const previous: number = existing?.value ?? 0;
    if (previous === value) break;
    const votePart =
      value === 0
        ? tx.remove(`U#${userId}`, `VOTE#${challengeId}`, true)
        : {
            Put: {
              ...tx.put({ pk: `U#${userId}`, sk: `VOTE#${challengeId}`, challenge_id: challengeId, value }).Put!,
              // Only if the vote is still what was just read.
              ConditionExpression: existing ? '#v = :previous' : 'attribute_not_exists(pk)',
              ExpressionAttributeNames: existing ? { '#v': 'value' } : undefined,
              ExpressionAttributeValues: existing ? { ':previous': previous } : undefined,
            },
          };
    const failed = await transact([
      votePart,
      tx.update(`CH#${challengeId}`, 'A', {
        add: {
          up_count: (value === 1 ? 1 : 0) - (previous === 1 ? 1 : 0),
          down_count: (value === -1 ? 1 : 0) - (previous === -1 ? 1 : 0),
        },
      }),
    ]);
    if (failed === null) break;
    if (failed === 1) return; // the challenge is gone
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const challenge = await get(`CH#${challengeId}`, 'A');
    if (!challenge) return;
    const settled = await update(`CH#${challengeId}`, 'A', {
      set: { rank: wilson(challenge.up_count, challenge.down_count) },
      condition: '#up = :up and #down = :down',
      names: { '#up': 'up_count', '#down': 'down_count' },
      values: { ':up': challenge.up_count, ':down': challenge.down_count },
    });
    if (settled) return;
  }
}

function parseCommentId(value: unknown): { challengeId: string; stamp: string } {
  const [challengeId, stamp, extra] = typeof value === 'string' ? value.split('_') : [];
  if (!challengeId || !stamp || extra !== undefined) refuse('bad_id');
  return { challengeId: validId(challengeId), stamp: validId(stamp) };
}

function parseCheckinId(value: unknown): { challengeId: string; userId: string; day: number } {
  const [challengeId, userId, day, extra] = typeof value === 'string' ? value.split('_') : [];
  if (!challengeId || !userId || !/^\d{1,3}$/.test(day ?? '') || extra !== undefined) refuse('bad_id');
  return { challengeId: validId(challengeId), userId: validId(userId), day: Number(day) };
}

async function removeComment(comment: Item): Promise<void> {
  const failed = await transact([
    tx.remove(comment.pk, comment.sk, true),
    tx.remove(`U#${comment.user_id}`, `CMOWN#${comment.id}`),
    tx.update(`CH#${comment.challenge_id}`, 'A', { add: { comment_count: -1 } }),
  ]);
  // The challenge itself may already be gone; the comment still has to go.
  if (failed === 2) {
    await batchWrite([], [
      { pk: comment.pk, sk: comment.sk },
      { pk: `U#${comment.user_id}`, sk: `CMOWN#${comment.id}` },
    ]);
  }
}

// ── moderation ───────────────────────────────────────────────────────

async function resolveReports(type: string, targetId: string): Promise<void> {
  const open = await query('REPORT', `${type}#${targetId}#`);
  const stamp = now();
  for (const report of open) {
    if (!report.resolved_at) await update('REPORT', report.sk, { set: { resolved_at: stamp } });
  }
}

async function setHidden(type: string, targetId: string, stamp: string | null): Promise<void> {
  const change = { set: { hidden_at: stamp } };
  if (type === 'board') {
    await update(`BOARD#${validId(targetId)}`, 'A', change);
    await syncExplore(targetId);
  } else if (type === 'challenge') {
    await update(`CH#${validId(targetId)}`, 'A', change);
  } else if (type === 'comment') {
    const { challengeId, stamp: sortKey } = parseCommentId(targetId);
    await update(`CH#${challengeId}`, `CM#${sortKey}`, change);
  } else if (type === 'checkin') {
    const { challengeId, userId, day } = parseCheckinId(targetId);
    const key = checkinKey(challengeId, userId, day);
    await update(key.pk, key.sk, change);
    const checkin = await get(key.pk, key.sk);
    if (checkin) await syncNote(checkin);
  } else if (type === 'profile') {
    // Hiding a person hides everything they have published.
    const owned = await query(`U#${validId(targetId)}`);
    for (const item of owned) {
      if (item.sk.startsWith('BOARD#')) await setHidden('board', item.sk.slice(6), stamp);
      else if (item.sk.startsWith('CHOWN#')) await setHidden('challenge', item.sk.slice(6), stamp);
      else if (item.sk.startsWith('CMOWN#')) await setHidden('comment', item.sk.slice(6), stamp);
      else if (item.sk.startsWith('CK#')) {
        await update(item.pk, item.sk, change);
        await syncNote({ ...item, hidden_at: stamp });
      }
    }
  } else {
    refuse('bad_type');
  }
}

// ── reads ────────────────────────────────────────────────────────────

const PAGE = 20;

const reads: Record<string, Op> = {
  /** The caller's own profile, or null before onboarding. */
  me: async (_input, caller) => {
    const profile = await get(`U#${caller.me}`, 'PROFILE');
    return { profile: profile ? row(profile) : null, is_admin: caller.admin };
  },

  profileByUsername: async ({ username }, caller) => {
    if (typeof username !== 'string') return null;
    const taken = await get(`UN#${username.toLowerCase()}`, 'UN');
    if (!taken) return null;
    if (taken.user_id !== caller.me && (await caller.blocked()).has(taken.user_id)) return null;
    const profile = await get(`U#${taken.user_id}`, 'PROFILE');
    return profile ? row(profile) : null;
  },

  boardsOf: async ({ ownerId }, caller) => {
    const owner = validId(ownerId);
    if (owner !== caller.me && !caller.admin && (await caller.blocked()).has(owner)) return [];
    const pointers = await query(`U#${owner}`, 'BOARD#');
    const boards = (await Promise.all(pointers.map((p) => loadBoard(p.sk.slice(6))))).filter(
      (board): board is Item => board !== null
    );
    const people = await authors([owner]);
    const visible: Item[] = [];
    for (const board of boards) {
      if (await seesBoard(board, caller)) visible.push({ ...board, owner: people.get(owner) ?? null });
    }
    return visible.sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  board: async ({ id }, caller) => {
    const board = await loadBoard(validId(id));
    if (!board || !(await seesBoard(board, caller))) return null;
    const people = await authors([board.owner_id]);
    return { ...board, owner: people.get(board.owner_id) ?? null };
  },

  /** Other people's public boards that have something on them. */
  explore: async ({ sort, offset }, caller) => {
    const blocked = await caller.blocked();
    const from = Number.isInteger(offset) && offset > 0 ? offset : 0;
    const listed = (await query('EXPLORE', '', { limit: 2000 })).filter(
      (pointer) => pointer.owner_id !== caller.me && !blocked.has(pointer.owner_id)
    );
    listed.sort(
      (a, b) =>
        (sort === 'popular' ? b.like_count - a.like_count : 0) || b.updated_at.localeCompare(a.updated_at)
    );
    const page = listed.slice(from, from + PAGE);
    const boards = await Promise.all(page.map((pointer) => loadBoard(pointer.sk)));
    const people = await authors(page.map((pointer) => pointer.owner_id));
    const visible: Item[] = [];
    for (const board of boards) {
      // The pointer is only a hint; the board decides.
      if (board && board.is_public && !board.hidden_at && !blocked.has(board.owner_id)) {
        visible.push({ ...board, owner: people.get(board.owner_id) ?? null });
      }
    }
    return { boards: visible, more: listed.length > from + PAGE };
  },

  myLikes: async (_input, caller) =>
    (await query(`U#${caller.me}`, 'LIKE#')).map((like) => like.sk.slice(5)),

  challenges: async ({ sort, language }, caller) => {
    const locales = language === 'all' ? LOCALES : [oneOf(language, LOCALES, 'bad_locale')];
    const pointers = (await Promise.all(locales.map((l) => query(`CHL#${l}`)))).flat();
    const found = await batchGet(pointers.map((p) => ({ pk: `CH#${p.sk}`, sk: 'A' })));
    const visible: Item[] = [];
    for (const challenge of found) if (await seesChallenge(challenge, caller)) visible.push(challenge);
    visible.sort(
      (a, b) =>
        (sort === 'top' ? b.rank - a.rank || b.member_count - a.member_count : 0) ||
        b.created_at.localeCompare(a.created_at)
    );
    return withCreators(visible.slice(0, 60));
  },

  suggestedChallenges: async ({ locale }) => {
    const pointers = await query(`CHLO#${oneOf(locale, LOCALES, 'bad_locale')}`);
    const found = await batchGet(pointers.map((p) => ({ pk: `CH#${p.sk}`, sk: 'A' })));
    return found
      .filter((challenge) => !challenge.hidden_at)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((challenge) => row(challenge));
  },

  challenge: async ({ id }, caller) => {
    const challenge = await get(`CH#${validId(id)}`, 'A');
    if (!(await seesChallenge(challenge, caller))) return null;
    return (await withCreators([challenge!]))[0];
  },

  challengeDays: async ({ id }, caller) => {
    const challenge = await get(`CH#${validId(id)}`, 'A');
    if (!(await seesChallenge(challenge, caller))) return [];
    return (await query(`CH#${id}`, 'DAY#')).map((day) => row(day));
  },

  /** The challenges the caller has joined, each with the challenge itself. */
  myMemberships: async (_input, caller) => {
    const memberships = await query(`U#${caller.me}`, 'MEM#');
    const found = await batchGet(memberships.map((m) => ({ pk: `CH#${m.challenge_id}`, sk: 'A' })));
    const byId = new Map(found.map((challenge) => [challenge.id, challenge]));
    const joined: Item[] = [];
    for (const membership of memberships) {
      const challenge = byId.get(membership.challenge_id) ?? null;
      if (await seesChallenge(challenge, caller)) joined.push({ ...row(membership), challenge: row(challenge!) });
    }
    return joined.sort((a, b) => b.joined_at.localeCompare(a.joined_at));
  },

  myCheckins: async (_input, caller) => (await query(`U#${caller.me}`, 'CK#')).map((c) => row(c)),

  /** Notes people chose to share on a challenge, newest first. */
  sharedNotes: async ({ challengeId }, caller) => {
    const challenge = await get(`CH#${validId(challengeId)}`, 'A');
    if (!(await seesChallenge(challenge, caller))) return [];
    const blocked = await caller.blocked();
    const pointers = await query(`CH#${challengeId}`, 'NOTE#', { limit: 120, newestFirst: true });
    const found = await batchGet(pointers.map((p) => checkinKey(challengeId, p.user_id, p.day_number)));
    const shared = found
      .filter((checkin) => isSharedNote(checkin) && !blocked.has(checkin.user_id))
      .sort((a, b) => b.done_at.localeCompare(a.done_at))
      .slice(0, 40);
    const people = await authors(shared.map((checkin) => checkin.user_id));
    return shared.map((checkin) => ({ ...row(checkin), author: people.get(checkin.user_id) ?? null }));
  },

  comments: async ({ challengeId }, caller) => {
    const challenge = await get(`CH#${validId(challengeId)}`, 'A');
    if (!(await seesChallenge(challenge, caller))) return [];
    const blocked = await caller.blocked();
    const found = (await query(`CH#${challengeId}`, 'CM#', { limit: 200, newestFirst: true })).filter(
      (comment) =>
        comment.user_id === caller.me || caller.admin || (!comment.hidden_at && !blocked.has(comment.user_id))
    );
    const page = found.slice(0, 100);
    const people = await authors(page.map((comment) => comment.user_id));
    return page.map((comment) => ({ ...row(comment), author: people.get(comment.user_id) ?? null }));
  },

  /** The caller's votes, as challenge id → +1 or −1. */
  myVotes: async (_input, caller) =>
    Object.fromEntries((await query(`U#${caller.me}`, 'VOTE#')).map((v) => [v.challenge_id, v.value])),

  /** The people the caller has blocked. They are hidden everywhere else. */
  myBlocked: async (_input, caller) => {
    const blocks = await query(`U#${caller.me}`, 'BLOCK#');
    const people = await authors(blocks.map((block) => block.sk.slice(6)));
    return blocks
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((block) => people.get(block.sk.slice(6)))
      .filter(Boolean)
      .map((p) => ({ id: p!.id, username: p!.username, display_name: p!.display_name }));
  },

  /** Open reports. Only admins get any. */
  openReports: async (_input, caller) => {
    if (!caller.admin) return [];
    return (await query('REPORT'))
      .filter((report) => !report.resolved_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((report) => row(report));
  },

  /**
   * Short-lived links to stored files. Your own files always; avatars and
   * challenge audio for anyone signed in; a board photo only while the caller
   * may see the board it is on.
   */
  mediaUrls: async ({ paths }, caller) => {
    if (!Array.isArray(paths) || paths.length > 200) refuse('bad_paths');
    const boards = new Map<string, Promise<Item | null>>();
    return Promise.all(
      paths.map(async (path: unknown) => {
        if (typeof path !== 'string' || path.length > 300 || path.includes('..')) return null;
        const [owner, kind, boardId, file] = path.split('/');
        let allowed = owner === caller.me || kind === 'avatar' || kind === 'audio';
        if (!allowed && kind === 'boards' && boardId && file) {
          if (!boards.has(boardId)) boards.set(boardId, loadBoard(boardId));
          const board = await boards.get(boardId)!;
          allowed =
            board !== null &&
            board.owner_id === owner &&
            (await seesBoard(board, caller)) &&
            board.images.some((image: Item) => image.storage_path === path);
        }
        return allowed ? files.readUrl(path) : null;
      })
    );
  },
};

// ── writes ───────────────────────────────────────────────────────────

const writes: Record<string, Op> = {
  /** Creates the profile and, with it, the seven chakra boards. */
  createProfile: async (input, caller) => {
    const name = validUsername(input.username);
    const stamp = Date.now();
    const boards = CHAKRAS.map((chakra, index) =>
      // A millisecond apart, so they always list from root to crown.
      newBoard(caller.me, { chakra, light: chakra }, new Date(stamp + index).toISOString())
    );
    const failed = await transact([
      tx.put({ pk: `UN#${name}`, sk: 'UN', user_id: caller.me }, true),
      tx.put(
        {
          pk: `U#${caller.me}`,
          sk: 'PROFILE',
          id: caller.me,
          username: name,
          display_name: text(input.display_name, 40, 1, 'bad_display_name'),
          bio: '',
          avatar_path: null,
          locale: oneOf(input.locale ?? 'es', LOCALES, 'bad_locale'),
          created_at: new Date(stamp).toISOString(),
        },
        true
      ),
      ...boards.flatMap((board) => [tx.put(board), tx.put(boardPointer(board))]),
    ]);
    if (failed === 0) refuse('username-taken');
    if (failed !== null) refuse('profile_exists');
    return null;
  },

  updateProfile: async (input, caller) => {
    const profile = await get(`U#${caller.me}`, 'PROFILE');
    if (!profile) refuse('not_found');
    const set: Item = {};
    if (input.display_name !== undefined) set.display_name = text(input.display_name, 40, 1, 'bad_display_name');
    if (input.bio !== undefined) set.bio = text(input.bio, 200, 0, 'bad_bio');
    if (input.locale !== undefined) set.locale = oneOf(input.locale, LOCALES, 'bad_locale');
    if (input.avatar_path !== undefined) {
      if (typeof input.avatar_path !== 'string' || !input.avatar_path.startsWith(`${caller.me}/avatar/`)) {
        refuse('bad_path');
      }
      set.avatar_path = input.avatar_path;
    }
    const renamed = input.username !== undefined && input.username !== profile.username;
    if (renamed) set.username = validUsername(input.username);
    if (Object.keys(set).length === 0) return null;

    const failed = await transact([
      ...(renamed
        ? [
            tx.put({ pk: `UN#${set.username}`, sk: 'UN', user_id: caller.me }, true),
            tx.remove(`UN#${profile.username}`, 'UN'),
          ]
        : []),
      tx.update(`U#${caller.me}`, 'PROFILE', { set }),
    ]);
    if (renamed && failed === 0) refuse('username-taken');
    if (failed !== null) refuse('not_found');
    if (set.avatar_path && profile.avatar_path) await files.removeMany([profile.avatar_path]);
    return null;
  },

  /** Where to send a new file. The file can only land in the caller's folder. */
  uploadTarget: async (input, caller) => {
    if (input.kind === 'image') {
      const board = await myBoard(input.boardId, caller);
      const imageId = randomUUID();
      const path = files.boardImagePath(caller.me, board.id, imageId);
      return { id: imageId, path, ...(await files.uploadForm(path, 'image/jpeg', 8)) };
    }
    if (input.kind === 'avatar') {
      const path = `${caller.me}/avatar/${randomUUID()}.jpg`;
      return { path, ...(await files.uploadForm(path, 'image/jpeg', 4)) };
    }
    if (input.kind === 'audio') {
      const extension = oneOf(input.extension, ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'mp4'], 'bad_audio');
      if (typeof input.contentType !== 'string' || !/^audio\/[\w.+-]{1,40}$/.test(input.contentType)) {
        refuse('bad_audio');
      }
      const path = `${caller.me}/audio/${randomUUID()}.${extension}`;
      return { path, ...(await files.uploadForm(path, input.contentType, 30)) };
    }
    return refuse('bad_kind');
  },

  createBoard: async (input, caller) => {
    const board = newBoard(caller.me, {
      title: text(input.title ?? '', 60, 0, 'bad_title'),
      light: oneOf(input.light ?? 'sahasrara', CHAKRAS, 'bad_light'),
    });
    await transact([tx.put(board), tx.put(boardPointer(board))]);
    return board.id;
  },

  updateBoard: async ({ id, patch }, caller) => {
    const board = await myBoard(id, caller);
    const set: Item = {};
    if (patch?.title !== undefined) set.title = text(patch.title, 60, 0, 'bad_title');
    if (patch?.light !== undefined) set.light = oneOf(patch.light, CHAKRAS, 'bad_light');
    if (patch?.intention !== undefined) set.intention = text(patch.intention, 600, 0, 'bad_intention');
    if (patch?.affirmation !== undefined) set.affirmation = text(patch.affirmation, 600, 0, 'bad_affirmation');
    if (patch?.words !== undefined) set.words = validWords(patch.words);
    if (patch?.is_public !== undefined) {
      if (typeof patch.is_public !== 'boolean') refuse('bad_is_public');
      set.is_public = patch.is_public;
    }
    if (Object.keys(set).length === 0) return null;
    await update(board.pk, 'A', { set: { ...set, updated_at: now() } });
    await syncExplore(board.id);
    return null;
  },

  /** Free boards only: the seven chakra boards stay for as long as the account does. */
  deleteBoard: async ({ id }, caller) => {
    const board = await myBoard(id, caller);
    if (board.chakra) refuse('chakra_board');
    const paths = await deleteBoardRows(board.id);
    await remove(`U#${caller.me}`, `BOARD#${board.id}`);
    await files.removeMany(paths);
    return null;
  },

  /** Records a photo the app has just uploaded to the address uploadTarget gave it. */
  addImage: async (input, caller) => {
    const board = await myBoard(input.boardId, caller);
    const imageId = validId(input.id);
    const path = files.boardImagePath(caller.me, board.id, imageId);
    if (!(await files.exists(path))) refuse('file_missing');
    const position = Number.isInteger(input.position) ? input.position : await nextPosition(board.id);
    await addImageRow(board, imageRow(board, imageId, path, '', position));
    await syncExplore(board.id);
    return null;
  },

  removeImage: async ({ boardId, imageId }, caller) => {
    const board = await myBoard(boardId, caller);
    const image = await get(board.pk, `IMG#${validId(imageId)}`);
    if (!image) return null;
    const failed = await transact([
      tx.remove(image.pk, image.sk, true),
      tx.update(board.pk, 'A', { add: { image_count: -1 } }),
    ]);
    if (failed === null) {
      await files.removeMany([image.storage_path]);
      await syncExplore(board.id);
    }
    return null;
  },

  setCaption: async ({ boardId, imageId, caption }, caller) => {
    const board = await myBoard(boardId, caller);
    const done = await update(board.pk, `IMG#${validId(imageId)}`, {
      set: { caption: text(caption, 200, 0, 'bad_caption') },
    });
    if (!done) refuse('not_found');
    return null;
  },

  setLike: async ({ boardId, liked }, caller) => {
    const board = await get(`BOARD#${validId(boardId)}`, 'A');
    const key = { pk: `U#${caller.me}`, sk: `LIKE#${boardId}` };
    if (liked) {
      if (!(await seesBoard(board, caller))) refuse('not_found');
      await transact([
        tx.put({ ...key, created_at: now() }, true),
        tx.update(board!.pk, 'A', { add: { like_count: 1 } }),
      ]);
    } else {
      const failed = await transact([
        tx.remove(key.pk, key.sk, true),
        tx.update(`BOARD#${boardId}`, 'A', {
          add: { like_count: -1 },
          condition: 'attribute_exists(pk) and #likes > :zero',
          names: { '#likes': 'like_count' },
          values: { ':zero': 0 },
        }),
      ]);
      // The board is gone or its count is already zero: still drop the like.
      if (failed === 1) await remove(key.pk, key.sk);
    }
    await syncExplore(boardId);
    return null;
  },

  /** Borrow one photo from a board the caller can see into one of their own. */
  copyImage: async ({ sourceBoardId, imageId, targetBoardId }, caller) => {
    const source = await get(`BOARD#${validId(sourceBoardId)}`, 'A');
    if (!(await seesBoard(source, caller))) refuse('not_found');
    const image = await get(source!.pk, `IMG#${validId(imageId)}`);
    if (!image) refuse('not_found');
    const target = await myBoard(targetBoardId, caller);
    await copyImage(image, target, await nextPosition(target.id));
    await syncExplore(target.id);
    return null;
  },

  /** Starts a new free board of the caller's own from someone's whole page. */
  copyBoard: async ({ sourceId, title }, caller) => {
    const source = await loadBoard(validId(sourceId));
    if (!source || !(await seesBoard(source, caller))) refuse('not_found');
    const board = newBoard(caller.me, {
      title: [...String(title ?? '')].slice(0, 60).join(''),
      light: source.light,
      intention: source.intention,
      affirmation: source.affirmation,
      words: source.words,
    });
    await transact([tx.put(board), tx.put(boardPointer(board))]);
    const images: Item[] = source.images;
    for (let i = 0; i < images.length; i += 8) {
      await Promise.all(images.slice(i, i + 8).map((image, index) => copyImage(image, board, i + index + 1)));
    }
    await syncExplore(board.id);
    return board.id;
  },

  // ── challenges ──

  /** Creates the challenge and joins its creator, so their day 1 is today. */
  createChallenge: async (input, caller) => {
    const startDate = localDate(input.start_date, 'bad_start_date');
    const duration = input.duration_days;
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) refuse('bad_duration');
    if (input.audio_path != null) {
      if (typeof input.audio_path !== 'string' || !input.audio_path.startsWith(`${caller.me}/audio/`)) {
        refuse('bad_path');
      }
    }
    const days: Item[] = (Array.isArray(input.days) ? input.days : []).map((day: Item) => {
      if (!Number.isInteger(day.day_number) || day.day_number < 1 || day.day_number > duration) {
        refuse('day_out_of_range');
      }
      return { day_number: day.day_number, body: text(day.body, 1200, 0, 'bad_body') };
    });

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const recent = (await query(`U#${caller.me}`, 'CHOWN#')).filter((own) => own.created_at > since);
    if (recent.length >= CHALLENGES_PER_DAY) refuse('too_many_challenges');

    const challengeId = randomUUID();
    const stamp = now();
    const challenge: Item = {
      pk: `CH#${challengeId}`,
      sk: 'A',
      id: challengeId,
      creator_id: caller.me,
      // Only the seed can mark a challenge as suggested by the app.
      is_official: false,
      title: text(input.title, 80, 3, 'bad_title'),
      description: text(input.description ?? '', 1200, 0, 'bad_description'),
      duration_days: duration,
      locale: oneOf(input.locale ?? 'es', LOCALES, 'bad_locale'),
      missed_rule: oneOf(input.missed_rule ?? 'calendar', RULES, 'bad_rule'),
      light: oneOf(input.light ?? 'anahata', CHAKRAS, 'bad_light'),
      timer_seconds: timer(input.timer_seconds),
      audio_path: input.audio_path ?? null,
      link_url: link(input.link_url),
      up_count: 0,
      down_count: 0,
      rank: 0,
      member_count: 1,
      comment_count: 0,
      hidden_at: null,
      created_at: stamp,
    };
    const membership = {
      challenge_id: challengeId,
      user_id: caller.me,
      start_date: startDate,
      reminder_time: null,
      restarts: 0,
      joined_at: stamp,
    };
    await transact([
      tx.put(challenge),
      tx.put({ pk: `U#${caller.me}`, sk: `CHOWN#${challengeId}`, created_at: stamp }),
      tx.put({ pk: `CHL#${challenge.locale}`, sk: challengeId }),
      tx.put({ pk: `U#${caller.me}`, sk: `MEM#${challengeId}`, ...membership }),
      tx.put({ pk: `CH#${challengeId}`, sk: `MEM#${caller.me}` }),
    ]);
    await batchWrite(
      days
        .filter((day) => day.body.trim() !== '')
        .map((day) => ({
          pk: `CH#${challengeId}`,
          sk: `DAY#${day3(day.day_number)}`,
          challenge_id: challengeId,
          day_number: day.day_number,
          body: day.body,
          timer_seconds: null,
          audio_path: null,
          link_url: null,
        }))
    );
    return challengeId;
  },

  /** Once other people have joined, a challenge is no longer its creator's to remove. */
  deleteChallenge: async ({ id }, caller) => {
    const challenge = await get(`CH#${validId(id)}`, 'A');
    if (!challenge || challenge.creator_id !== caller.me) refuse('not_found');
    const members = await query(challenge.pk, 'MEM#', { limit: 3 });
    if (members.some((member) => member.sk !== `MEM#${caller.me}`)) refuse('has-members');

    const items = await query(challenge.pk);
    const comments = items.filter((item) => item.sk.startsWith('CM#'));
    await clearCheckins(id, caller.me);
    await batchWrite([], [
      ...items.map(({ pk, sk }) => ({ pk, sk })),
      ...comments.map((comment) => ({ pk: `U#${comment.user_id}`, sk: `CMOWN#${comment.id}` })),
      { pk: `U#${caller.me}`, sk: `MEM#${id}` },
      { pk: `U#${caller.me}`, sk: `CHOWN#${id}` },
      { pk: `U#${caller.me}`, sk: `VOTE#${id}` },
      { pk: `CHL#${challenge.locale}`, sk: id },
    ]);
    if (challenge.audio_path) await files.removeMany([challenge.audio_path]);
    return null;
  },

  join: async ({ challengeId, start_date }, caller) => {
    const challenge = await visibleChallenge(challengeId, caller);
    const startDate = localDate(start_date, 'bad_start_date');
    await transact([
      tx.put(
        {
          pk: `U#${caller.me}`,
          sk: `MEM#${challenge.id}`,
          challenge_id: challenge.id,
          user_id: caller.me,
          start_date: startDate,
          reminder_time: null,
          restarts: 0,
          joined_at: now(),
        },
        true
      ),
      tx.put({ pk: challenge.pk, sk: `MEM#${caller.me}` }),
      tx.update(challenge.pk, 'A', { add: { member_count: 1 } }),
    ]);
    return null;
  },

  leave: async ({ challengeId }, caller) => {
    const failed = await transact([
      tx.remove(`U#${caller.me}`, `MEM#${validId(challengeId)}`, true),
      tx.remove(`CH#${challengeId}`, `MEM#${caller.me}`),
      tx.update(`CH#${challengeId}`, 'A', { add: { member_count: -1 } }),
    ]);
    if (failed === 2) await remove(`U#${caller.me}`, `MEM#${challengeId}`);
    await clearCheckins(challengeId, caller.me);
    return null;
  },

  /** Begin again from day 1, clearing the previous attempt. */
  restart: async ({ challengeId, start_date }, caller) => {
    const startDate = localDate(start_date, 'bad_start_date');
    const done = await update(`U#${caller.me}`, `MEM#${validId(challengeId)}`, {
      set: { start_date: startDate },
      add: { restarts: 1 },
    });
    if (!done) refuse('not_a_member');
    await clearCheckins(challengeId, caller.me);
    return null;
  },

  setReminder: async ({ challengeId, time }, caller) => {
    if (time !== null && (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time))) {
      refuse('bad_time');
    }
    const done = await update(`U#${caller.me}`, `MEM#${validId(challengeId)}`, { set: { reminder_time: time } });
    if (!done) refuse('not_a_member');
    return null;
  },

  checkIn: async (input, caller) => {
    const challengeId = validId(input.challengeId);
    const [challenge, membership] = await Promise.all([
      get(`CH#${challengeId}`, 'A'),
      get(`U#${caller.me}`, `MEM#${challengeId}`),
    ]);
    if (!challenge || !membership) refuse('not_a_member');
    const today = localDate(input.local_date, 'bad_local_date');
    const done = await query(`U#${caller.me}`, `CK#${challengeId}#`);
    checkDay(challenge.missed_rule, challenge.duration_days, membership.start_date, done as any, input.day, today);

    const checkin: Item = {
      ...checkinKey(challengeId, caller.me, input.day),
      id: `${challengeId}_${caller.me}_${input.day}`,
      challenge_id: challengeId,
      user_id: caller.me,
      day_number: input.day,
      local_date: today,
      note: text(input.note ?? '', 1000, 0, 'bad_note'),
      note_public: input.notePublic !== false,
      hidden_at: null,
      done_at: now(),
    };
    try {
      await put(checkin, true);
    } catch (error) {
      if ((error as Error).name === 'ConditionalCheckFailedException') refuse('already_done');
      throw error;
    }
    await syncNote(checkin);
    return null;
  },

  updateNote: async (input, caller) => {
    const key = checkinKey(validId(input.challengeId), caller.me, Number(input.day));
    const done = await update(key.pk, key.sk, {
      set: { note: text(input.note ?? '', 1000, 0, 'bad_note'), note_public: input.notePublic !== false },
    });
    if (!done) refuse('not_found');
    const checkin = await get(key.pk, key.sk);
    if (checkin) await syncNote(checkin);
    return null;
  },

  undoCheckIn: async ({ challengeId, day }, caller) => {
    const key = checkinKey(validId(challengeId), caller.me, Number(day));
    const checkin = await get(key.pk, key.sk);
    if (!checkin) return null;
    await batchWrite([], [key, noteKey(checkin)]);
    return null;
  },

  /** `value` is +1, −1, or 0 to take the vote back. */
  vote: async ({ challengeId, value }, caller) => {
    if (![1, -1, 0].includes(value)) refuse('bad_vote');
    const challenge = await visibleChallenge(challengeId, caller);
    await applyVote(challenge.id, caller.me, value);
    return null;
  },

  addComment: async ({ challengeId, body }, caller) => {
    const challenge = await visibleChallenge(challengeId, caller);
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const recent = (await query(`U#${caller.me}`, 'CMOWN#')).filter((own) => own.created_at > since);
    if (recent.length >= COMMENTS_PER_DAY) refuse('too_many_comments');

    // Sorts by time, and the id alone says which challenge it belongs to.
    const stamp = `${Date.now().toString(36).padStart(9, '0')}${randomUUID().slice(0, 8)}`;
    const commentId = `${challenge.id}_${stamp}`;
    const createdAt = now();
    await transact([
      tx.put({
        pk: challenge.pk,
        sk: `CM#${stamp}`,
        id: commentId,
        challenge_id: challenge.id,
        user_id: caller.me,
        body: text(body, 1000, 1, 'bad_body'),
        hidden_at: null,
        created_at: createdAt,
      }),
      tx.put({ pk: `U#${caller.me}`, sk: `CMOWN#${commentId}`, created_at: createdAt }),
      tx.update(challenge.pk, 'A', { add: { comment_count: 1 } }),
    ]);
    return commentId;
  },

  deleteComment: async ({ id }, caller) => {
    const { challengeId, stamp } = parseCommentId(id);
    const comment = await get(`CH#${challengeId}`, `CM#${stamp}`);
    if (!comment || comment.user_id !== caller.me) refuse('not_found');
    await removeComment(comment);
    return null;
  },

  // ── people ──

  /** A block hides two people from each other everywhere, both ways. */
  setBlocked: async ({ userId, blocked }, caller) => {
    const other = validId(userId);
    if (other === caller.me) refuse('bad_id');
    if (blocked) {
      await transact([
        tx.put({ pk: `U#${caller.me}`, sk: `BLOCK#${other}`, created_at: now() }),
        tx.put({ pk: `U#${other}`, sk: `BLOCKEDBY#${caller.me}` }),
      ]);
    } else {
      await transact([
        tx.remove(`U#${caller.me}`, `BLOCK#${other}`),
        tx.remove(`U#${other}`, `BLOCKEDBY#${caller.me}`),
      ]);
    }
    return null;
  },

  report: async ({ type, id, reason }, caller) => {
    const target = oneOf(type, REPORT_TARGETS, 'bad_type');
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) refuse('bad_id');
    try {
      await put(
        {
          pk: 'REPORT',
          sk: `${target}#${id}#${caller.me}`,
          id: `${target}#${id}#${caller.me}`,
          reporter_id: caller.me,
          target_type: target,
          target_id: id,
          reason: text(reason ?? '', 500, 0, 'bad_reason'),
          created_at: now(),
          resolved_at: null,
        },
        true
      );
    } catch (error) {
      // Reporting the same thing twice changes nothing.
      if ((error as Error).name !== 'ConditionalCheckFailedException') throw error;
    }
    return null;
  },

  adminSetHidden: async ({ type, id, hidden }, caller) => {
    if (!caller.admin) refuse('not_admin');
    await setHidden(oneOf(type, REPORT_TARGETS, 'bad_type'), String(id), hidden === false ? null : now());
    await resolveReports(type, String(id));
    return null;
  },

  adminDismissReports: async ({ type, id }, caller) => {
    if (!caller.admin) refuse('not_admin');
    await resolveReports(oneOf(type, REPORT_TARGETS, 'bad_type'), String(id));
    return null;
  },

  /**
   * Removes the account and everything it owns: rows, files and the sign-in.
   * Challenges the person created stay, without a creator, so the people who
   * joined keep their progress.
   */
  deleteAccount: async (_input, caller) => {
    const owned = await query(`U#${caller.me}`);
    const drop: Key[] = owned.map(({ pk, sk }) => ({ pk, sk }));
    const keepFiles = new Set<string>();

    for (const item of owned) {
      const rest = item.sk.slice(item.sk.indexOf('#') + 1);
      if (item.sk === 'PROFILE') {
        drop.push({ pk: `UN#${item.username}`, sk: 'UN' });
      } else if (item.sk.startsWith('BOARD#')) {
        await deleteBoardRows(rest);
      } else if (item.sk.startsWith('LIKE#')) {
        await update(`BOARD#${rest}`, 'A', {
          add: { like_count: -1 },
          condition: 'attribute_exists(pk) and #likes > :zero',
          names: { '#likes': 'like_count' },
          values: { ':zero': 0 },
        });
        await syncExplore(rest);
      } else if (item.sk.startsWith('MEM#')) {
        drop.push({ pk: `CH#${rest}`, sk: `MEM#${caller.me}` });
        await update(`CH#${rest}`, 'A', { add: { member_count: -1 } });
      } else if (item.sk.startsWith('CK#')) {
        drop.push(noteKey(item));
      } else if (item.sk.startsWith('VOTE#')) {
        await applyVote(rest, caller.me, 0);
      } else if (item.sk.startsWith('CHOWN#')) {
        const challenge = await get(`CH#${rest}`, 'A');
        if (challenge?.audio_path) keepFiles.add(challenge.audio_path);
        await update(`CH#${rest}`, 'A', { set: { creator_id: null } });
      } else if (item.sk.startsWith('CMOWN#')) {
        const { challengeId, stamp } = parseCommentId(rest);
        const comment = await get(`CH#${challengeId}`, `CM#${stamp}`);
        if (comment) await removeComment(comment);
      } else if (item.sk.startsWith('BLOCK#')) {
        drop.push({ pk: `U#${rest}`, sk: `BLOCKEDBY#${caller.me}` });
      } else if (item.sk.startsWith('BLOCKEDBY#')) {
        drop.push({ pk: `U#${rest}`, sk: `BLOCK#${caller.me}` });
      }
    }
    const reports = (await query('REPORT')).filter((report) => report.reporter_id === caller.me);
    drop.push(...reports.map(({ pk, sk }) => ({ pk, sk })));
    await batchWrite([], drop);

    await files.removeFolder(`${caller.me}/`, keepFiles);
    await new CognitoIdentityProviderClient({}).send(
      new AdminDeleteUserCommand({ UserPoolId: caller.poolId, Username: caller.cognitoUsername })
    );
    return null;
  },
};

// ── entry ────────────────────────────────────────────────────────────

type AppSyncEvent = {
  arguments?: { op?: string; input?: unknown };
  identity?: { sub?: string; username?: string; issuer?: string; groups?: string[] | null };
  /** Amplify's function resolver passes the field at the top level. */
  fieldName?: string;
  info?: { fieldName?: string };
  system?: string;
};

export const handler = async (event: AppSyncEvent) => {
  // Invoked directly with AWS credentials (scripts/seed.mjs), never by AppSync:
  // AppSync builds its own event and cannot produce this key.
  if (event.system === 'seed' && !event.arguments && !event.identity) return seed();

  const identity = event.identity;
  const op = event.arguments?.op ?? '';
  if (!identity?.sub || !identity.username || !identity.issuer) throw new Error('not_signed_in');

  let blocked: Promise<Set<string>> | undefined;
  const caller: Caller = {
    me: identity.sub,
    cognitoUsername: identity.username,
    poolId: identity.issuer.slice(identity.issuer.lastIndexOf('/') + 1),
    admin: (identity.groups ?? []).includes('admins'),
    blocked: () =>
      (blocked ??= query(`U#${identity.sub}`, 'BLOCK').then(
        (items) => new Set(items.map((item) => item.sk.slice(item.sk.indexOf('#') + 1)))
      )),
  };

  const field = event.fieldName ?? event.info?.fieldName;
  if (field !== 'read' && field !== 'write') throw new Error('unknown_operation');
  const table = field === 'write' ? writes : reads;
  const run = Object.hasOwn(table, op) ? table[op] : undefined;
  if (!run) throw new Error('unknown_operation');

  let input = event.arguments?.input ?? {};
  if (typeof input === 'string') input = JSON.parse(input);
  if (input === null || typeof input !== 'object') throw new Error('bad_input');

  try {
    // AWSJSON goes back as a string.
    return JSON.stringify((await run(input, caller)) ?? null);
  } catch (error) {
    if (error instanceof Refused) throw new Error(error.message);
    // The operation and the kind of failure, never what the person sent.
    console.error('failed', op, (error as Error).name);
    throw new Error('server_error');
  }
};
