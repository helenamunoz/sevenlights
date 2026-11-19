// A walk through the web build against the deployed backend, in a real browser.
//
//   npx expo export -p web && node tests/e2e/web.mjs [screenshot-dir]
//
// The emailed code cannot be read from here, so the sign-in screen is driven
// for real up to "wrong code refused" (with Amazon's mailbox simulator as the
// address), and the session is then placed in the browser's storage in the
// format the app itself writes.
import assert from 'node:assert/strict';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

import { adopt, createUser, purgeChallenges, removeUser, run, utcDate } from '../backend/helpers.mjs';

// Playwright is not a dependency of the app: this uses whichever copy the machine has.
const { chromium } = createRequire(import.meta.url)('playwright');

const shots = resolve(process.argv[2] ?? 'tests/e2e/screenshots');
mkdirSync(shots, { recursive: true });
const dist = resolve('dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };

const server = createServer((request, response) => {
  const path = join(dist, decodeURIComponent(new URL(request.url, 'http://x').pathname));
  const file = existsSync(path) && statSync(path).isFile() ? path : join(dist, 'index.html');
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const steps = [];
const step = async (label, action) => {
  await action();
  steps.push(label);
  console.log(`ok  ${label}`);
};

let luz, cam, me, luzChallenge;
const browser = await chromium.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost' } : undefined,
});

try {
  // Someone else's content to explore, borrow from, vote and comment on.
  [luz, cam] = await Promise.all([createUser('luz'), createUser('cam', { admin: true })]);
  await luz.write('createProfile', { username: `luz_${run}`, display_name: 'Luz' });
  await cam.write('createProfile', { username: `cam_${run}`, display_name: 'Cam' });
  const boardTitle = `Mar y calma ${run}`;
  const luzBoard = await luz.write('createBoard', { title: boardTitle, light: 'vishuddha' });
  await luz.write('updateBoard', {
    id: luzBoard,
    patch: { intention: 'Vivir cerca del mar', affirmation: 'Yo respiro hondo', words: ['calma', 'sal', 'viento'] },
  });
  const target = await luz.write('uploadTarget', { kind: 'image', boardId: luzBoard });
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=',
    'base64'
  );
  const form = new FormData();
  for (const [key, value] of Object.entries(target.fields)) form.append(key, value);
  form.append('file', new Blob([jpeg], { type: 'image/jpeg' }));
  assert.equal((await fetch(target.url, { method: 'POST', body: form })).status, 204);
  await luz.write('addImage', { boardId: luzBoard, id: target.id });
  const challengeTitle = `Gratitud ${run}`;
  luzChallenge = await luz.write('createChallenge', {
    title: challengeTitle,
    description: 'Tres cosas por las que das gracias, cada noche.',
    duration_days: 7,
    locale: 'en',
    missed_rule: 'any_pace',
    category: 'writing',
    start_date: utcDate(),
    days: [{ day_number: 1, body: 'Empezá por lo más chico.' }],
  });

  const context = await browser.newContext({ locale: 'es-AR', viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });
  const email = `success+e2e${run}@simulator.amazonses.com`;

  await step('sign-in screen asks Cognito for a code', async () => {
    await page.goto(base);
    await page.getByText('Raise our frequency, together.').waitFor();
    await shot('01-sign-in');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByText('Send code').click();
    await page.getByText(`We sent it to ${email}`).waitFor({ timeout: 20_000 });
    await shot('02-code-sent');
  });

  await step('a wrong code is refused', async () => {
    await page.getByPlaceholder('12345678').fill('00000000');
    await page.getByText('Sign in', { exact: true }).click();
    await page.getByText('That code isn’t valid or has expired.').waitFor({ timeout: 20_000 });
    await shot('03-wrong-code');
  });

  me = await adopt('e2e', email);
  const stored = JSON.stringify({
    accessToken: me.tokens.AccessToken,
    refreshToken: me.tokens.RefreshToken,
    expiresAt: Date.now() + me.tokens.ExpiresIn * 1000,
    email,
  });

  await step('a signed-in person without a profile lands on onboarding', async () => {
    await page.evaluate((value) => localStorage.setItem('sevenlights.session.v1', value), stored);
    await page.reload();
    await page.getByText('What should we call you?').waitFor({ timeout: 20_000 });
    await page.getByPlaceholder('How you’d like to be seen').fill('Helena de prueba');
    await page.getByPlaceholder('your_username').fill(`e2e_${run}`);
    await page.getByRole('switch').click();
    await shot('04-onboarding');
    await page.getByText('Get started', { exact: true }).click();
    // Home is the challenges: the 7Lights team's, one per kind of practice.
    await page.getByText('From the 7Lights team').waitFor({ timeout: 20_000 });
    await page.getByText('Pick one to begin.').waitFor();
    await page.getByText('Today’s light').waitFor();
    await page.locator('[aria-label="Stillness, 6 steps"]').waitFor({ timeout: 20_000 });
    await page.locator('[aria-label="10 minutes of stillness"]').first().waitFor({ timeout: 20_000 });
    await shot('05-home-challenges');
    assert.equal((await me.read('boardsOf', { ownerId: me.id })).length, 0, 'no boards until you make one');
  });

  await step('the category chips narrow the list', async () => {
    await page.getByText('Movement', { exact: true }).first().click();
    await page.locator('[aria-label="A 20-minute walk, phone away"]').first().waitFor({ timeout: 20_000 });
    await page.locator('[aria-label="10 minutes of stillness"]').first().waitFor({ state: 'detached' });
    await shot('05b-home-one-category');
    await page.getByText('All', { exact: true }).first().click();
    await page.locator('[aria-label="10 minutes of stillness"]').first().waitFor();
  });

  await step('boards start from templates: a single board, then the chakra set', async () => {
    await page.getByText('Boards', { exact: true }).last().click();
    await page.getByText('You have no boards yet.').waitFor({ timeout: 20_000 });
    await page.getByText('New board', { exact: true }).click();
    await page.getByText('Templates').waitFor({ timeout: 20_000 });
    await shot('05c-board-templates');
    await page.locator('[aria-label="Gratitude"]').click();
    await page.getByPlaceholder('What do you already have that you don’t want to take for granted?').waitFor({ timeout: 20_000 });
    await shot('05d-board-from-template');
    await page.getByLabel('Back').first().click();
    await page.getByText('New board', { exact: true }).click();
    await page.locator('[aria-label="The seven chakras"]').click();
    await page.locator('[aria-label*="Center 7"]').waitFor({ timeout: 30_000 });
    await shot('05e-boards');
    const boards = await me.read('boardsOf', { ownerId: me.id });
    assert.equal(boards.length, 8);
    assert.equal(boards.filter((board) => board.chakra).length, 7);
    assert.equal(boards.find((board) => !board.chakra).title, 'What I already have');
  });

  await step('editing a board saves it', async () => {
    await page.locator('[aria-label*="Center 4"]').click();
    // A chakra board's first field is its intention; the placeholder is that chakra's own question.
    await page.getByText('Saves by itself.').waitFor({ timeout: 20_000 });
    const intention = page.locator('textarea, input').first();
    await intention.fill('Abrir el corazón sin apuro');
    await intention.blur();
    await page.waitForTimeout(2500);
    await shot('06-board-edited');
    const boards = await me.read('boardsOf', { ownerId: me.id });
    assert.equal(boards.find((board) => board.chakra === 'anahata').intention, 'Abrir el corazón sin apuro');
    await page.getByLabel('Back').first().click();
  });

  await step('explore shows another person’s public board, with its photo', async () => {
    await page.getByText('Explore', { exact: true }).last().click();
    await page.locator(`[aria-label="${boardTitle}"]`).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await shot('07-explore');
    await page.locator(`[aria-label="${boardTitle}"]`).first().click();
    await page.getByText('add to mine').first().waitFor({ timeout: 20_000 });
    await page.waitForFunction(() => [...document.images].some((img) => img.src.includes('amazonaws.com') && img.naturalWidth > 0), null, { timeout: 20_000 });
    await shot('08-someone-elses-board');
  });

  await step('liking and borrowing: a text, then the whole board', async () => {
    await page.getByText(/^♡/).last().click();
    await page.getByText(/^♥/).last().waitFor();
    await page.getByText('add to mine').first().click();
    await page.getByText('Which board?').waitFor();
    await page.waitForTimeout(700);
    await shot('09-borrow-choose-board');
    await page.getByText('Throat', { exact: true }).last().click();
    await page.getByText(/Done, it’s in/).waitFor({ timeout: 20_000 });
    await page.getByText('Copy the whole board').click();
    await page.waitForTimeout(6000);
    await shot('10-copied-board');
    const boards = await me.read('boardsOf', { ownerId: me.id });
    assert.equal(boards.find((board) => board.chakra === 'vishuddha').intention, 'Vivir cerca del mar');
    const copy = boards.find((board) => board.chakra === null && board.title !== 'What I already have');
    assert.ok(copy, 'the copy is a new board');
    assert.equal(copy.images.length, 1);
    assert.equal((await luz.read('board', { id: luzBoard })).like_count, 1);
  });

  await step('joining the team’s breathing challenge and ticking day 1', async () => {
    await page.goto(base);
    await page.getByText('From the 7Lights team').waitFor({ timeout: 20_000 });
    await page.locator(`[aria-label="${challengeTitle}"]`).first().waitFor({ timeout: 20_000 });
    await shot('11-challenges');
    await page.locator('[aria-label="5 minutes of mindful breathing"]').first().click();
    await page.getByText('Join', { exact: true }).click();
    await page.getByText('Do day 1').waitFor({ timeout: 20_000 });
    await page.getByText('Breath path · step 2 of 3').waitFor();
    const intention = page.getByPlaceholder('Why are you doing this? Only you can see it.');
    await intention.fill('To come back to myself');
    await intention.blur();
    await page.waitForTimeout(2000);
    await shot('12-challenge-joined');
    const joined = (await me.read('myMemberships')).find((m) => m.challenge_id === 'official-breathing-en');
    assert.equal(joined.intention, 'To come back to myself');
    await page.getByText('Do day 1').click();
    await page.getByPlaceholder('How did it go today?').waitFor({ timeout: 20_000 });
    await page.getByPlaceholder('How did it go today?').fill('Cinco minutos tranquilos.');
    await shot('13-day-one');
    await page.getByText('Done', { exact: true }).last().click();
    await page.getByText('✓ Done').last().waitFor({ timeout: 20_000 });
    await page.getByText('You began. The hardest part is behind you.').waitFor();
    await shot('14-day-ticked');
    await page.getByText('Continue', { exact: true }).click();
    await page.getByText('That’s it for today.').first().waitFor({ timeout: 20_000 });
    const checkins = await me.read('myCheckins');
    assert.equal(checkins.length, 1);
    assert.equal(checkins[0].day_number, 1);
    assert.equal(checkins[0].note, 'Cinco minutos tranquilos.');
  });

  await step('an invitation link survives signing in', async () => {
    const guest = await browser.newContext({ locale: 'es-AR', viewport: { width: 414, height: 896 } });
    await guest.grantPermissions(['clipboard-read', 'clipboard-write']);
    const visit = await guest.newPage();
    await visit.goto(`${base}/challenge/${luzChallenge}`);
    await visit.getByText('Send code').waitFor({ timeout: 20_000 });
    // Signing in happens in the same visit; the session lands in storage, as in the app.
    await visit.evaluate((value) => localStorage.setItem('sevenlights.session.v1', value), stored);
    await visit.goto(base);
    await visit.getByText(challengeTitle).first().waitFor({ timeout: 20_000 });
    assert.ok(visit.url().endsWith(`/challenge/${luzChallenge}`));
    await visit.getByText('Invite someone').click();
    await visit.getByText('Invitation copied.').waitFor();
    const copied = await visit.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, new RegExp(`^Join me in “${challengeTitle}” on 7Lights: https://.+/challenge/${luzChallenge}$`));
    await visit.screenshot({ path: join(shots, '14b-invite.png') });
    await guest.close();
  });

  await step('voting, commenting and reporting on a community challenge', async () => {
    await page.goto(`${base}/challenge/${luzChallenge}`);
    await page.getByText(challengeTitle).first().waitFor({ timeout: 20_000 });
    await page.getByLabel('Vote up').last().click();
    await page.getByPlaceholder('Leave a comment').fill('Qué linda idea, me sumo.');
    await page.getByText('Post', { exact: true }).last().click();
    await page.getByText('Qué linda idea, me sumo.').last().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await shot('15-vote-and-comment');
    await page.getByLabel('Show more').first().click();
    await page.getByText('Report', { exact: true }).first().click();
    await page.getByPlaceholder('Reason (optional)').fill('Prueba automática');
    await shot('16-report');
    await page.getByText('Send report').click();
    await page.getByText('Thank you. We’ll review it.').waitFor({ timeout: 20_000 });
    const challenge = await luz.read('challenge', { id: luzChallenge });
    assert.equal(challenge.up_count, 1);
    assert.equal(challenge.comment_count, 1);
    const reports = (await cam.read('openReports')).filter((report) => report.target_id === luzChallenge);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].reporter_id, me.id);
  });

  await step('the app is English-only for now, with no language choices', async () => {
    // The browser above is set to Spanish (es-AR) and every screen so far was in English.
    await page.goto(base);
    await page.getByText('From the community').waitFor({ timeout: 20_000 });
    await page.getByText('In progress').waitFor();
    assert.equal(await page.getByText('All languages').count(), 0);
    await page.getByText('Create a challenge').click();
    await page.getByText('Kind of practice').waitFor({ timeout: 20_000 });
    assert.equal(await page.getByText('Challenge language').count(), 0);
    await shot('17-create-challenge');
  });

  assert.deepEqual(failures, [], 'no uncaught errors in the page');
  console.log(`\n${steps.length} steps passed. Screenshots in ${shots}`);
} finally {
  await browser.close();
  server.close();
  for (const user of [me, luz, cam]) if (user) await removeUser(user);
  await purgeChallenges([luzChallenge]);
}
