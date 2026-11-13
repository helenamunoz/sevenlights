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
    locale: 'es',
    missed_rule: 'any_pace',
    light: 'manipura',
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
    await page.getByText('Tableros de visión y desafíos').waitFor();
    await shot('01-sign-in-es');
    await page.getByPlaceholder('vos@ejemplo.com').fill(email);
    await page.getByText('Enviar código').click();
    await page.getByText(`Lo mandamos a ${email}`).waitFor({ timeout: 20_000 });
    await shot('02-code-sent');
  });

  await step('a wrong code is refused', async () => {
    await page.getByPlaceholder('12345678').fill('00000000');
    await page.getByText('Entrar', { exact: true }).click();
    await page.getByText('Ese código no es válido o ya venció.').waitFor({ timeout: 20_000 });
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
    await page.getByText('¿Cómo te llamamos?').waitFor({ timeout: 20_000 });
    await page.getByPlaceholder('Como querés que te vean').fill('Helena de prueba');
    await page.getByPlaceholder('tu_usuario').fill(`e2e_${run}`);
    await page.getByRole('switch').click();
    await shot('04-onboarding');
    await page.getByText('Empezar', { exact: true }).click();
    await page.getByText('Siete Luces').waitFor({ timeout: 20_000 });
    await shot('05-home-seven-boards');
    assert.equal((await me.read('boardsOf', { ownerId: me.id })).length, 7);
  });

  await step('editing a board saves it', async () => {
    await page.locator('[aria-label*="Centro 4"]').click();
    // A chakra board's first field is its intention; the placeholder is that chakra's own question.
    await page.getByText('Se guarda solo.').waitFor({ timeout: 20_000 });
    const intention = page.locator('textarea, input').first();
    await intention.fill('Abrir el corazón sin apuro');
    await intention.blur();
    await page.waitForTimeout(2500);
    await shot('06-board-edited');
    const boards = await me.read('boardsOf', { ownerId: me.id });
    assert.equal(boards.find((board) => board.chakra === 'anahata').intention, 'Abrir el corazón sin apuro');
    await page.getByLabel('Volver').first().click();
  });

  await step('explore shows another person’s public board, with its photo', async () => {
    await page.getByText('Explorar', { exact: true }).last().click();
    await page.locator(`[aria-label="${boardTitle}"]`).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await shot('07-explore');
    await page.locator(`[aria-label="${boardTitle}"]`).first().click();
    await page.getByText('sumar al mío').first().waitFor({ timeout: 20_000 });
    await page.waitForFunction(() => [...document.images].some((img) => img.src.includes('amazonaws.com') && img.naturalWidth > 0), null, { timeout: 20_000 });
    await shot('08-someone-elses-board');
  });

  await step('liking and borrowing: a text, then the whole board', async () => {
    await page.getByText(/^♡/).last().click();
    await page.getByText(/^♥/).last().waitFor();
    await page.getByText('sumar al mío').first().click();
    await page.getByText('¿A qué tablero?').waitFor();
    await page.waitForTimeout(700);
    await shot('09-borrow-choose-board');
    await page.getByText('Garganta', { exact: true }).last().click();
    await page.getByText(/Listo, está en/).waitFor({ timeout: 20_000 });
    await page.getByText('Copiar todo el tablero').click();
    await page.waitForTimeout(6000);
    await shot('10-copied-board');
    const boards = await me.read('boardsOf', { ownerId: me.id });
    assert.equal(boards.find((board) => board.chakra === 'vishuddha').intention, 'Vivir cerca del mar');
    const copy = boards.find((board) => board.chakra === null);
    assert.ok(copy, 'the copy is a new free board');
    assert.equal(copy.images.length, 1);
    assert.equal((await luz.read('board', { id: luzBoard })).like_count, 1);
  });

  await step('joining the suggested breathing challenge and ticking day 1', async () => {
    await page.goto(base);
    await page.getByText('Siete Luces').waitFor({ timeout: 20_000 });
    await page.getByText('Desafíos', { exact: true }).last().click();
    await page.getByText('Sugeridos por 7Lights').waitFor({ timeout: 20_000 });
    await page.locator(`[aria-label="${challengeTitle}"]`).first().waitFor({ timeout: 20_000 });
    await shot('11-challenges');
    await page.locator('[aria-label="5 minutos de respiración consciente"]').first().click();
    await page.getByText('Sumarme', { exact: true }).click();
    await page.getByText('Hacer el día 1').waitFor({ timeout: 20_000 });
    await shot('12-challenge-joined');
    await page.getByText('Hacer el día 1').click();
    await page.getByPlaceholder('¿Cómo te fue hoy?').waitFor({ timeout: 20_000 });
    await page.getByPlaceholder('¿Cómo te fue hoy?').fill('Cinco minutos tranquilos.');
    await shot('13-day-one');
    await page.getByText('Hecho', { exact: true }).last().click();
    await page.getByText('✓ Hecho').last().waitFor({ timeout: 20_000 });
    await shot('14-day-ticked');
    const checkins = await me.read('myCheckins');
    assert.equal(checkins.length, 1);
    assert.equal(checkins[0].day_number, 1);
    assert.equal(checkins[0].note, 'Cinco minutos tranquilos.');
  });

  await step('voting, commenting and reporting on a community challenge', async () => {
    await page.goto(`${base}/challenge/${luzChallenge}`);
    await page.getByText(challengeTitle).first().waitFor({ timeout: 20_000 });
    await page.getByLabel('Votar a favor').last().click();
    await page.getByPlaceholder('Dejá un comentario').fill('Qué linda idea, me sumo.');
    await page.getByText('Publicar', { exact: true }).last().click();
    await page.getByText('Qué linda idea, me sumo.').last().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await shot('15-vote-and-comment');
    await page.getByLabel('Ver más').first().click();
    await page.getByText('Denunciar', { exact: true }).first().click();
    await page.getByPlaceholder('Motivo (opcional)').fill('Prueba automática');
    await shot('16-report');
    await page.getByText('Enviar denuncia').click();
    await page.getByText('Gracias. Lo vamos a revisar.').waitFor({ timeout: 20_000 });
    const challenge = await luz.read('challenge', { id: luzChallenge });
    assert.equal(challenge.up_count, 1);
    assert.equal(challenge.comment_count, 1);
    const reports = (await cam.read('openReports')).filter((report) => report.target_id === luzChallenge);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].reporter_id, me.id);
  });

  await step('the same account in English', async () => {
    const english = await browser.newContext({ locale: 'en-US', viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
    const signedOut = await english.newPage();
    await signedOut.goto(base);
    await signedOut.getByText('Vision boards and challenges to raise your frequency.').waitFor({ timeout: 20_000 });
    await signedOut.screenshot({ path: join(shots, '17-sign-in-en.png') });
    await signedOut.evaluate((value) => localStorage.setItem('sevenlights.session.v1', value), stored);
    await signedOut.reload();
    await signedOut.getByText('Seven Lights').waitFor({ timeout: 20_000 });
    await signedOut.screenshot({ path: join(shots, '18-home-en.png') });
    await signedOut.getByText('Challenges', { exact: true }).last().click();
    await signedOut.locator('[aria-label="5 minutes of mindful breathing"]').first().waitFor({ timeout: 20_000 });
    // What people wrote is never translated.
    await signedOut.getByText('All languages').click().catch(() => {});
    await signedOut.waitForTimeout(1500);
    await signedOut.screenshot({ path: join(shots, '19-challenges-en.png') });
    await english.close();
  });

  assert.deepEqual(failures, [], 'no uncaught errors in the page');
  console.log(`\n${steps.length} steps passed. Screenshots in ${shots}`);
} finally {
  await browser.close();
  server.close();
  for (const user of [me, luz, cam]) if (user) await removeUser(user);
  await purgeChallenges([luzChallenge]);
}
