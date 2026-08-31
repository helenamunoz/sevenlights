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

Without the two environment variables below the app is a local notebook: fast,
private, no accounts. Add them and your boards follow you between devices.

1. Create a project at [supabase.com](https://supabase.com) (free tier is plenty).
2. Open **SQL Editor → New query**, paste `supabase/schema.sql`, run it. That
   creates the tables, the row level security policies, and the private photo
   bucket.
3. Copy the API details into a local env file:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
   **Project Settings → API**.
4. Restart `npx expo start`, open **Ajustes / Settings** in the app, and sign in
   with your email — Supabase sends a six-digit code.

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
