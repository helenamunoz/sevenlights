# SevenLights

A vision board with seven pages — one per chakra, from root to crown. Each board
holds an intention, an affirmation, a few words, and your own photos. It works
offline on the phone, and syncs across devices when you connect a backend.

It speaks Spanish and English. On first launch it takes the phone's language;
after that the **ES / EN** switch at the foot of the column, or the picker in
**Ajustes / Settings**, changes it — everything, immediately.

Built with Expo (React Native) for iOS, Android and web.

## Run it on your phone

```bash
npm install
npx expo start
```

Install **Expo Go** from the App Store, open the camera, scan the QR code in the
terminal. The app loads on your phone — no Apple developer account needed.

To keep it on the home screen as a standalone app, build with EAS:

```bash
npx eas build --profile development --platform ios
```

That step needs an Apple account. A free one signs builds that expire after
7 days; a paid Developer account ($99/yr) signs builds that stay installed.

## Sync (optional)

Without the environment variables below the app is a local notebook: fast,
private, no accounts. Add them and your boards follow you between devices.
Signing in is Google only.

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (the free tier is
   plenty). Give it a name, pick the region closest to you, and save the
   database password somewhere — you will not be shown it again.
2. Wait for it to finish provisioning, about two minutes.
3. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`,
   and run it. That creates the two tables, the row level security policies,
   and the private photo bucket.

### 2. Make a Google OAuth client

Sign-in goes through Google, so Google needs to know about this app.

1. Open [console.cloud.google.com](https://console.cloud.google.com) and select
   the project that already holds the Liminal credentials — the consent screen
   there is set up (External, scopes `openid email profile`) and does not need
   redoing.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   type **Web application**. Name it something like `SevenLights (Supabase)`.
   Make a new client rather than reusing Liminal's, so revoking one never takes
   the other down with it.
3. Under **Authorized redirect URIs**, add exactly one entry — Supabase's
   callback, not the app's:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   Supabase prints this URL for you under **Authentication → Providers →
   Google**; copy it from there rather than typing the project ref by hand.
4. Copy the **Client ID** and **Client secret**.

If that consent screen is still in **Testing**, only listed accounts can sign
in — add your own address under **Audience → Test users**, or nothing will work
and Google will not say why.

### 3. Turn Google on in Supabase

1. **Authentication → Providers → Google**: enable it, paste the client ID and
   secret, save.
2. **Authentication → URL Configuration → Redirect URLs**: add all three.

   ```
   sevenlights://**              the installed app
   exp://**                      Expo Go, whose host changes with your network
   http://localhost:8081/**      the app running in a browser
   ```

   This list is the step people skip. A redirect that is not on it comes back
   as a generic failure with nothing in the logs to explain it.

### 4. Point the app at it

```bash
cp .env.example .env.local
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API**, then restart with `npx expo start --clear`. These
values are baked in when the bundle is built, so a plain restart is not enough.

Open **Ajustes / Settings** in the app and tap **Continuar con Google**.

The anon key is safe in a public repo: it can only do what the policies in
`schema.sql` allow, which is "read and write rows that belong to the signed-in
user". The `service_role` key is not, and never belongs in this project.

## How the data works

- Every edit saves locally first, then pushes about a second later.
- Boards merge last-write-wins: the most recently edited version of a board wins
  whole. Photos merge additively, since each one has its own id.
- Photos are copied into the app's storage when you pick them, uploaded to a
  private bucket, and downloaded on your other devices through signed URLs.

## The mark

The logo is the app's own column seen from far away: seven lights on a thread,
root at the bottom, crown at the top. `scripts/make-icons.mjs` draws it and
writes every raster the app ships — the iOS icon, the favicon, the three Android
adaptive layers, and the unlit column the system splash shows. Change the
drawing there and run:

```bash
node scripts/make-icons.mjs
```

The live version, in `src/components/logo.tsx`, is the same mark in views, and
the opening animation brings its lights up one at a time from root to crown.

## Layout

`src/app` holds the routes, `src/lib` the state and sync, `src/components` the
pieces of a board and the shared UI, `src/i18n` every word the app says, and
`src/data/chakras.ts` the seven centers themselves. Working notes and open tasks
are in `CLAUDE.md`.
