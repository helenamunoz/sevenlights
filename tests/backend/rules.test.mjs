// The rules the backend must enforce, exercised against a deployed sandbox
// with three throwaway people: Ana and Bea, and Cam who is an admin.
//
//   npm run test:backend      (AWS credentials + amplify_outputs.json)
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

import {
  cognito,
  createUser,
  outputs,
  purgeChallenges,
  refused,
  region,
  removeUser,
  run,
  upload,
  utcDate,
} from './helpers.mjs';

let ana, bea, cam;
const state = {};
const name = (who) => `${who}_${run}`;

before(async () => {
  [ana, bea, cam] = await Promise.all([createUser('ana'), createUser('bea'), createUser('cam', { admin: true })]);
});

after(async () => {
  for (const user of [ana, bea, cam]) if (user) await removeUser(user);
  await purgeChallenges([state.calendar, state.anyPace, state.strict]);
});

const chakraBoard = async (user, chakra) =>
  (await user.read('boardsOf', { ownerId: user.id })).find((board) => board.chakra === chakra);

test('profiles: seven chakra boards, unique and well-formed usernames', async () => {
  assert.equal((await ana.read('me')).profile, null);
  await refused(ana.write('createProfile', { username: 'Bad Name', display_name: 'X' }), 'bad_username');
  await refused(ana.write('createProfile', { username: 'admin', display_name: 'X' }), 'bad_username');
  await ana.write('createProfile', { username: name('ana'), display_name: 'Ana' });
  const boards = await ana.read('boardsOf', { ownerId: ana.id });
  assert.equal(boards.length, 7);
  assert.deepEqual(
    boards.map((board) => board.chakra),
    ['muladhara', 'svadhisthana', 'manipura', 'anahata', 'vishuddha', 'ajna', 'sahasrara']
  );
  await refused(bea.write('createProfile', { username: name('ana'), display_name: 'Bea' }), 'username-taken');
  await bea.write('createProfile', { username: name('bea'), display_name: 'Bea' });
  await cam.write('createProfile', { username: name('cam'), display_name: 'Cam' });
  await refused(bea.write('createProfile', { username: name('bea2'), display_name: 'Bea' }), 'profile_exists');
  await refused(bea.write('updateProfile', { username: name('ana') }), 'username-taken');
  await refused(bea.write('updateProfile', { avatar_path: `${ana.id}/avatar/x.jpg` }), 'bad_path');
});

test('nobody can make themselves an admin', async () => {
  assert.equal((await bea.read('me')).is_admin, false);
  assert.equal((await cam.read('me')).is_admin, true);
  await refused(bea.write('makeAdmin', {}), 'unknown_operation');
  await refused(bea.write('adminSetHidden', { type: 'profile', id: ana.id, hidden: true }), 'not_admin');
  await refused(bea.write('adminDismissReports', { type: 'profile', id: ana.id }), 'not_admin');
  // A read cannot be used to run a write, or the other way round.
  await refused(bea.read('deleteAccount'), 'unknown_operation');
});

test('boards: counters and hidden flags are out of reach; photos only in your own folder', async () => {
  const anahata = await chakraBoard(ana, 'anahata');
  const vishuddha = await chakraBoard(ana, 'vishuddha');
  state.privateBoard = anahata.id;
  state.publicBoard = vishuddha.id;
  await ana.write('updateBoard', { id: anahata.id, patch: { intention: 'calma', is_public: false } });
  await ana.write('updateBoard', {
    id: vishuddha.id,
    patch: { intention: 'voz', like_count: 99, hidden_at: '2020-01-01', image_count: 50, owner_id: bea.id },
  });
  const after = await ana.read('board', { id: vishuddha.id });
  assert.equal(after.intention, 'voz');
  assert.equal(after.like_count, 0, 'forged like_count');
  assert.equal(after.image_count, 0, 'forged image_count');
  assert.equal(after.hidden_at, null, 'forged hidden_at');
  assert.equal(after.owner_id, ana.id);

  for (const boardId of [anahata.id, vishuddha.id]) {
    const target = await ana.write('uploadTarget', { kind: 'image', boardId });
    assert.ok(target.path.startsWith(`${ana.id}/boards/${boardId}/`));
    assert.equal((await upload(target)).status, 204);
    await ana.write('addImage', { boardId, id: target.id });
    state[boardId] = target.path;
  }
  assert.equal((await ana.read('board', { id: vishuddha.id })).image_count, 1);

  // A created board is always a free one, whatever the request says.
  const free = await ana.write('createBoard', { title: 'Libre', light: 'ajna', chakra: 'ajna', like_count: 5 });
  const created = await ana.read('board', { id: free });
  assert.equal(created.chakra, null);
  assert.equal(created.like_count, 0);
  await ana.write('deleteBoard', { id: free });
  await refused(ana.write('deleteBoard', { id: anahata.id }), 'chakra_board');

  // No file, no row; and the address handed out accepts only what it was made for.
  await refused(ana.write('addImage', { boardId: vishuddha.id, id: 'never-uploaded' }), 'file_missing');
  const wrongType = await ana.write('uploadTarget', { kind: 'image', boardId: vishuddha.id });
  assert.equal((await upload({ ...wrongType, fields: { ...wrongType.fields, 'Content-Type': 'text/html' } })).status, 403);
  assert.equal((await upload({ ...wrongType, fields: { ...wrongType.fields, key: `${bea.id}/boards/x/y.jpg` } })).status, 403);
});

test('private stays private', async () => {
  const seen = await bea.read('boardsOf', { ownerId: ana.id });
  assert.equal(seen.length, 6, 'private board invisible');
  assert.equal(await bea.read('board', { id: state.privateBoard }), null);
  assert.equal(seen.flatMap((board) => board.images).length, 1, 'private image invisible');

  const [publicUrl, privateUrl, guessed] = await bea.read('mediaUrls', {
    paths: [state[state.publicBoard], state[state.privateBoard], `${ana.id}/boards/${state.publicBoard}/nope.jpg`],
  });
  assert.equal((await fetch(publicUrl)).status, 200, 'public media readable');
  assert.equal(privateUrl, null, 'private media unreadable');
  assert.equal(guessed, null, 'a path that is not on the board');
  // The owner still reads their own.
  assert.ok((await ana.read('mediaUrls', { paths: [state[state.privateBoard]] }))[0]);
  // The bucket itself answers nobody without a signature.
  assert.equal((await fetch(publicUrl.split('?')[0])).status, 403);

  await refused(bea.write('updateBoard', { id: state.publicBoard, patch: { intention: 'hack' } }), 'not_found');
  await refused(bea.write('uploadTarget', { kind: 'image', boardId: state.publicBoard }), 'not_found');
  await refused(bea.write('addImage', { boardId: state.publicBoard, id: 'x' }), 'not_found');
  await refused(bea.write('removeImage', { boardId: state.publicBoard, imageId: 'x' }), 'not_found');
  assert.equal((await ana.read('board', { id: state.publicBoard })).intention, 'voz');

  const explore = await bea.read('explore', { sort: 'recent', offset: 0 });
  const mine = explore.boards.filter((board) => board.owner_id === ana.id);
  assert.deepEqual(mine.map((board) => board.id), [state.publicBoard], 'explore lists only the public board');
  const own = await ana.read('explore', { sort: 'popular', offset: 0 });
  assert.equal(own.boards.filter((board) => board.owner_id === ana.id).length, 0, 'explore never lists your own');
});

test('likes count once; borrowing copies into your own folder', async () => {
  await bea.write('setLike', { boardId: state.publicBoard, liked: true });
  await bea.write('setLike', { boardId: state.publicBoard, liked: true });
  assert.equal((await ana.read('board', { id: state.publicBoard })).like_count, 1);
  assert.deepEqual(await bea.read('myLikes'), [state.publicBoard]);
  await refused(bea.write('setLike', { boardId: state.privateBoard, liked: true }), 'not_found');
  await bea.write('setLike', { boardId: state.publicBoard, liked: false });
  await bea.write('setLike', { boardId: state.publicBoard, liked: false });
  assert.equal((await ana.read('board', { id: state.publicBoard })).like_count, 0);
  await bea.write('setLike', { boardId: state.publicBoard, liked: true });

  const copyId = await bea.write('copyBoard', { sourceId: state.publicBoard, title: 'De Ana' });
  const copy = await bea.read('board', { id: copyId });
  assert.equal(copy.intention, 'voz');
  assert.equal(copy.chakra, null, 'a copy is a free board');
  assert.equal(copy.owner_id, bea.id);
  assert.equal(copy.like_count, 0);
  assert.equal(copy.images.length, 1);
  assert.ok(copy.images[0].storage_path.startsWith(`${bea.id}/boards/${copyId}/`));
  assert.equal(copy.images[0].source_owner_id, null, 'no credit is kept');
  const [copied] = await bea.read('mediaUrls', { paths: [copy.images[0].storage_path] });
  assert.equal((await fetch(copied)).status, 200);
  state.beaCopy = copyId;

  await refused(bea.write('copyBoard', { sourceId: state.privateBoard, title: 'x' }), 'not_found');
  const privateImage = (await ana.read('board', { id: state.privateBoard })).images[0];
  await refused(
    bea.write('copyImage', { sourceBoardId: state.privateBoard, imageId: privateImage.id, targetBoardId: copyId }),
    'not_found'
  );
  const publicImage = (await ana.read('board', { id: state.publicBoard })).images[0];
  await bea.write('copyImage', { sourceBoardId: state.publicBoard, imageId: publicImage.id, targetBoardId: copyId });
  assert.equal((await bea.read('board', { id: copyId })).image_count, 2);
  // Not onto a board that is not yours.
  await refused(
    bea.write('copyImage', { sourceBoardId: state.publicBoard, imageId: publicImage.id, targetBoardId: state.publicBoard }),
    'not_found'
  );
});

test('a block hides two people from each other, both ways', async () => {
  await ana.write('setBlocked', { userId: bea.id, blocked: true });
  assert.equal((await bea.read('boardsOf', { ownerId: ana.id })).length, 0, 'blocked: boards hidden');
  assert.equal(await bea.read('board', { id: state.publicBoard }), null);
  assert.equal(await bea.read('profileByUsername', { username: name('ana') }), null, 'blocked: profile hidden');
  assert.equal((await bea.read('mediaUrls', { paths: [state[state.publicBoard]] }))[0], null, 'blocked: media hidden');
  const explore = await bea.read('explore', { sort: 'recent', offset: 0 });
  assert.equal(explore.boards.filter((board) => board.owner_id === ana.id).length, 0, 'blocked: explore');
  await refused(bea.write('copyBoard', { sourceId: state.publicBoard, title: 'x' }), 'not_found');

  assert.equal((await ana.read('boardsOf', { ownerId: bea.id })).length, 0, 'blocker: boards hidden');
  assert.equal(await ana.read('profileByUsername', { username: name('bea') }), null);
  assert.deepEqual((await ana.read('myBlocked')).map((p) => p.id), [bea.id]);
  assert.deepEqual(await bea.read('myBlocked'), [], 'being blocked is not shown to the blocked');

  await ana.write('setBlocked', { userId: bea.id, blocked: false });
  assert.equal((await bea.read('boardsOf', { ownerId: ana.id })).length, 6);
  assert.ok(await ana.read('profileByUsername', { username: name('bea') }));
});

test('challenges: what a creator can and cannot set', async () => {
  const base = { description: '', locale: 'es', light: 'anahata', start_date: utcDate() };
  state.calendar = await ana.write('createChallenge', {
    ...base,
    title: `Calendario ${run}`,
    duration_days: 5,
    missed_rule: 'calendar',
    days: [{ day_number: 1, body: 'hola' }],
    is_official: true,
    rank: 1,
    up_count: 40,
    member_count: 900,
  });
  state.anyPace = await ana.write('createChallenge', { ...base, title: `A tu ritmo ${run}`, duration_days: 3, missed_rule: 'any_pace' });
  state.strict = await ana.write('createChallenge', { ...base, title: `Estricto ${run}`, duration_days: 3, missed_rule: 'strict' });

  const created = await ana.read('challenge', { id: state.calendar });
  assert.equal(created.is_official, false, 'self-official');
  assert.equal(created.rank, 0, 'forged rank');
  assert.equal(created.up_count, 0);
  assert.equal(created.member_count, 1, 'the creator is its first member');
  assert.equal((await ana.read('challengeDays', { id: state.calendar })).length, 1);

  await refused(
    ana.write('createChallenge', { ...base, title: 'Fuera', duration_days: 5, days: [{ day_number: 6, body: 'x' }] }),
    'day_out_of_range'
  );
  await refused(
    ana.write('createChallenge', { ...base, title: 'Link', duration_days: 3, link_url: 'javascript:alert(1)' }),
    'bad_link'
  );
  await refused(ana.write('createChallenge', { ...base, title: 'Largo', duration_days: 366 }), 'bad_duration');
  await refused(
    ana.write('createChallenge', { ...base, title: 'Audio', duration_days: 3, audio_path: `${bea.id}/audio/x.mp3` }),
    'bad_path'
  );
  await refused(bea.write('deleteChallenge', { id: state.calendar }), 'not_found');
});

test('joining: day 1 is the day you join, and cannot be backdated', async () => {
  await refused(bea.write('join', { challengeId: state.calendar, start_date: utcDate(-10) }), 'bad_start_date');
  for (const challengeId of [state.calendar, state.anyPace, state.strict]) {
    await bea.write('join', { challengeId, start_date: utcDate(-1) });
  }
  await bea.write('join', { challengeId: state.calendar, start_date: utcDate() });
  const challenge = await bea.read('challenge', { id: state.calendar });
  assert.equal(challenge.member_count, 2, 'joining twice counts once');
  const memberships = await bea.read('myMemberships');
  assert.equal(memberships.length, 3);
  assert.equal(memberships.find((m) => m.challenge_id === state.calendar).start_date, utcDate(-1));
});

test('check-ins: day bounds for each missed-day rule', async () => {
  const tick = (challengeId, day, extra = {}) =>
    bea.write('checkIn', { challengeId, day, local_date: utcDate(), note: '', notePublic: true, ...extra });

  // calendar: joined yesterday, so today is day 2. Days 1 and 2 are open, 3 is not.
  await refused(tick(state.calendar, 3), 'day_in_future');
  await refused(tick(state.calendar, 0), 'day_out_of_range');
  await refused(tick(state.calendar, 2, { local_date: utcDate(5) }), 'bad_local_date');
  await tick(state.calendar, 2, { note: 'me hizo bien' });
  await tick(state.calendar, 1, { note: 'secreto', notePublic: false });
  await refused(tick(state.calendar, 2), 'already_done');

  // any pace: in order, one a day.
  await refused(tick(state.anyPace, 2), 'day_out_of_order');
  await tick(state.anyPace, 1);
  await refused(tick(state.anyPace, 2), 'already_done_today');

  // strict: yesterday (day 1) was missed, so day 2 is refused until a restart.
  await refused(tick(state.strict, 2), 'streak_broken');
  await refused(tick(state.strict, 1), 'day_too_old');
  await refused(bea.write('restart', { challengeId: state.strict, start_date: utcDate(-9) }), 'bad_start_date');
  await bea.write('restart', { challengeId: state.strict, start_date: utcDate() });
  await tick(state.strict, 1);
  const strict = (await bea.read('myMemberships')).find((m) => m.challenge_id === state.strict);
  assert.equal(strict.restarts, 1, 'restart counted');
  assert.equal(strict.start_date, utcDate());

  await refused(
    cam.write('checkIn', { challengeId: state.calendar, day: 1, local_date: utcDate(), note: '' }),
    'not_a_member'
  );
  assert.equal((await bea.read('myCheckins')).length, 4);
});

test('calendar rule: a day older than yesterday is closed', async () => {
  // Cam joins with the earliest date the server accepts and is then on day 2
  // at most, so "too old" needs a real gap: check the rule on Ana's challenge
  // by moving today forward as far as the server allows instead.
  await cam.write('join', { challengeId: state.calendar, start_date: utcDate(-1) });
  const tick = (day, local_date) => cam.write('checkIn', { challengeId: state.calendar, day, local_date, note: '' });
  // With "today" a day ahead, it is day 3: day 1 is too old, days 2 and 3 open, 4 not yet.
  await refused(tick(1, utcDate(1)), 'day_too_old');
  await refused(tick(4, utcDate(1)), 'day_in_future');
  await tick(2, utcDate(1));
  await cam.write('leave', { challengeId: state.calendar });
  assert.equal((await cam.read('myCheckins')).length, 0, 'leaving clears the attempt');
  assert.equal((await ana.read('challenge', { id: state.calendar })).member_count, 2);
});

test('votes, rank and comments', async () => {
  await bea.write('vote', { challengeId: state.calendar, value: 1 });
  await bea.write('vote', { challengeId: state.calendar, value: 1 });
  await bea.write('vote', { challengeId: state.strict, value: -1 });
  await refused(bea.write('vote', { challengeId: state.anyPace, value: 5 }), 'bad_vote');
  state.comment = await bea.write('addComment', { challengeId: state.calendar, body: 'gracias' });
  await refused(bea.write('addComment', { challengeId: state.calendar, body: '' }), 'bad_body');

  const calendar = await ana.read('challenge', { id: state.calendar });
  assert.equal(calendar.up_count, 1, 'voting twice counts once');
  assert.ok(calendar.rank > 0.2, 'vote raises rank');
  assert.equal(calendar.comment_count, 1);
  const strict = await ana.read('challenge', { id: state.strict });
  assert.equal(strict.down_count, 1);
  assert.ok(strict.rank < 0.001, 'downvote counted');
  assert.deepEqual(await bea.read('myVotes'), { [state.calendar]: 1, [state.strict]: -1 });

  // Changing a vote moves it; taking it back removes it.
  await cam.write('vote', { challengeId: state.calendar, value: 1 });
  await cam.write('vote', { challengeId: state.calendar, value: -1 });
  let counts = await ana.read('challenge', { id: state.calendar });
  assert.deepEqual([counts.up_count, counts.down_count], [1, 1]);
  await cam.write('vote', { challengeId: state.calendar, value: 0 });
  counts = await ana.read('challenge', { id: state.calendar });
  assert.deepEqual([counts.up_count, counts.down_count], [1, 0]);

  // Lists favor the better-voted challenge; "new" goes by date.
  const top = (await bea.read('challenges', { sort: 'top', language: 'es' })).filter((c) => c.creator_id === ana.id);
  assert.equal(top[0].id, state.calendar);
  assert.equal(top[0].creator.username, name('ana'));
  const newest = (await bea.read('challenges', { sort: 'new', language: 'all' })).filter((c) => c.creator_id === ana.id);
  assert.equal(newest[0].id, state.strict);
  const english = await bea.read('challenges', { sort: 'top', language: 'en' });
  assert.equal(english.filter((c) => c.creator_id === ana.id).length, 0);

  await refused(ana.write('deleteComment', { id: state.comment }), 'not_found');
});

test('shared notes are public, private notes are not; reports are not public', async () => {
  await bea.write('report', { type: 'challenge', id: state.strict, reason: 'prueba' });
  await bea.write('report', { type: 'challenge', id: state.strict, reason: 'otra vez' });

  const notes = await ana.read('sharedNotes', { challengeId: state.calendar });
  assert.deepEqual(notes.map((note) => note.note), ['me hizo bien'], 'only the shared note');
  assert.equal(notes[0].author.username, name('bea'));
  assert.equal((await bea.read('myCheckins')).filter((c) => c.note === 'secreto').length, 1);

  // Switching a note to private takes it out; switching back returns it.
  await bea.write('updateNote', { challengeId: state.calendar, day: 2, note: 'me hizo bien', notePublic: false });
  assert.equal((await ana.read('sharedNotes', { challengeId: state.calendar })).length, 0);
  await bea.write('updateNote', { challengeId: state.calendar, day: 2, note: 'me hizo bien', notePublic: true });
  assert.equal((await ana.read('sharedNotes', { challengeId: state.calendar })).length, 1);

  assert.deepEqual(await ana.read('openReports'), [], 'reports are not public');
  assert.deepEqual(await bea.read('openReports'), []);
  await refused(ana.write('adminSetHidden', { type: 'comment', id: state.comment, hidden: true }), 'not_admin');
  await refused(ana.write('deleteChallenge', { id: state.calendar }), 'has-members');
  assert.ok(await ana.read('challenge', { id: state.calendar }), 'cannot delete a joined challenge');
});

test('an admin can hide things; hidden content is gone for others', async () => {
  const mine = (reports) => reports.filter((report) => report.target_id === state.strict);
  assert.equal(mine(await cam.read('openReports')).length, 1, 'admin sees the report, once');
  await cam.write('adminSetHidden', { type: 'challenge', id: state.strict, hidden: true });
  await cam.write('adminSetHidden', { type: 'comment', id: state.comment, hidden: true });
  assert.equal(mine(await cam.read('openReports')).length, 0, 'report resolved');

  assert.equal(await bea.read('challenge', { id: state.strict }), null, 'hidden challenge gone for others');
  const listed = await bea.read('challenges', { sort: 'new', language: 'all' });
  assert.equal(listed.filter((c) => c.id === state.strict).length, 0);
  assert.equal((await bea.read('myMemberships')).filter((m) => m.challenge_id === state.strict).length, 0);
  await refused(bea.write('vote', { challengeId: state.strict, value: 1 }), 'not_found');
  assert.ok((await ana.read('challenge', { id: state.strict })).hidden_at, 'creator still sees own hidden challenge');

  const forAuthor = await bea.read('comments', { challengeId: state.calendar });
  assert.equal(forAuthor.length, 1, 'author still sees own hidden comment');
  assert.ok(forAuthor[0].hidden_at);
  assert.equal((await ana.read('comments', { challengeId: state.calendar })).length, 0, 'hidden comment gone for others');

  // A hidden board and its photos.
  await cam.write('adminSetHidden', { type: 'board', id: state.publicBoard, hidden: true });
  assert.equal(await bea.read('board', { id: state.publicBoard }), null);
  assert.equal((await bea.read('mediaUrls', { paths: [state[state.publicBoard]] }))[0], null);
  assert.equal((await bea.read('boardsOf', { ownerId: ana.id })).length, 5);
  await ana.write('updateBoard', { id: state.publicBoard, patch: { is_public: true, hidden_at: null } });
  assert.equal(await bea.read('board', { id: state.publicBoard }), null, 'the owner cannot unhide');
  await cam.write('adminSetHidden', { type: 'board', id: state.publicBoard, hidden: false });
  assert.ok(await bea.read('board', { id: state.publicBoard }));

  // A hidden note.
  const note = (await ana.read('sharedNotes', { challengeId: state.calendar }))[0];
  await cam.write('adminSetHidden', { type: 'checkin', id: note.id, hidden: true });
  assert.equal((await ana.read('sharedNotes', { challengeId: state.calendar })).length, 0);
  await cam.write('adminSetHidden', { type: 'checkin', id: note.id, hidden: false });
  assert.equal((await ana.read('sharedNotes', { challengeId: state.calendar })).length, 1);
});

test('deleting an account removes its content and sign-in, and keeps others’ progress', async () => {
  const before = (await bea.read('myCheckins')).length;
  assert.ok(before >= 3);
  await ana.write('deleteAccount');

  assert.equal(await bea.read('profileByUsername', { username: name('ana') }), null, 'profile deleted');
  assert.equal((await bea.read('boardsOf', { ownerId: ana.id })).length, 0, 'boards deleted');
  assert.equal(await bea.read('board', { id: state.publicBoard }), null);
  assert.deepEqual(await bea.read('myLikes'), [state.publicBoard]);

  const challenge = await bea.read('challenge', { id: state.calendar });
  assert.ok(challenge, 'challenge outlives its creator');
  assert.equal(challenge.creator_id, null);
  assert.equal(challenge.creator, null);
  assert.equal(challenge.member_count, 1);
  assert.equal((await bea.read('myCheckins')).length, before, 'members keep their progress');
  assert.equal((await bea.read('sharedNotes', { challengeId: state.calendar })).length, 1);

  const s3 = new S3Client({ region });
  const left = await s3.send(new ListObjectsV2Command({ Bucket: outputs.custom.bucketName, Prefix: `${ana.id}/` }));
  assert.equal(left.KeyCount, 0, 'files deleted');
  // Bea's copy of Ana's photo is Bea's own and stays.
  const copy = await bea.read('board', { id: state.beaCopy });
  assert.equal(copy.images.length, 2);
  assert.equal((await fetch((await bea.read('mediaUrls', { paths: [copy.images[0].storage_path] }))[0])).status, 200);

  await assert.rejects(
    cognito.send(new AdminGetUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: ana.email })),
    { name: 'UserNotFoundException' },
    'the sign-in is gone'
  );
  // The freed username can be taken again.
  await bea.write('updateProfile', { username: name('ana') });
  await bea.write('updateProfile', { username: name('bea') });
});

test('seed: one suggested breathing challenge per language, safe to repeat', async () => {
  const lambda = new LambdaClient({ region });
  for (let i = 0; i < 2; i++) {
    const reply = await lambda.send(
      new InvokeCommand({ FunctionName: outputs.custom.apiFunctionName, Payload: JSON.stringify({ system: 'seed' }) })
    );
    assert.equal(reply.FunctionError, undefined);
  }
  for (const locale of ['es', 'en']) {
    const suggested = await bea.read('suggestedChallenges', { locale });
    assert.equal(suggested.length, 1);
    assert.equal(suggested[0].is_official, true);
    assert.equal(suggested[0].duration_days, 21);
    assert.equal(suggested[0].timer_seconds, 300);
    assert.equal((await bea.read('challengeDays', { id: suggested[0].id })).length, 4);
  }
  // Suggested challenges are not mixed into the community list.
  const community = await bea.read('challenges', { sort: 'top', language: 'all' });
  assert.equal(community.filter((c) => c.is_official).length, 0);
});
