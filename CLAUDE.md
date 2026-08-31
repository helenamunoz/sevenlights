# SevenLights — working notes

A private vision board with one page per chakra: an intention, an affirmation, a
few words, and photos. Built for Helena's iPhone; it also runs on Android and web.

## Shape of the thing

- **Expo SDK 57**, expo-router (file routes under `src/app`), TypeScript strict.
- **Local-first.** Every edit lands in `AsyncStorage` immediately. Sync is an
  extra, never a precondition — the app must stay fully usable with no network
  and no account.
- **Sync is last-write-wins per board.** One person, two devices: no merge UI,
  no conflict prompts. Photos carry their own ids and merge additively.
- **One visual world.** Ink-dark ground, each chakra its own light. There is no
  light theme, on purpose. Do not add one without asking.

## Where things live

```
src/data/chakras.ts     the seven centers — order, color, Sanskrit, copy
src/theme/tokens.ts     color / font / space scales; every style pulls from here
src/lib/store.tsx       BoardsProvider: state, persistence, auth, sync triggers
src/lib/sync.ts         Supabase pull/push, photo upload/download, merge()
src/lib/photos.ts       picker + camera, copying files into permanent storage
src/lib/supabase.ts     the client, or null when env vars are missing
src/app/index.tsx       the column: seven rows on a thread
src/app/chakra/[id].tsx one board
src/app/account.tsx     sign-in and sync status
supabase/schema.sql     tables, RLS policies, storage bucket
```

## Conventions

- Spanish in the UI, rioplatense voseo ("guardá", "sumá", "podés"). Code,
  comments and commits in English.
- Styles come from `@/theme/tokens` — no loose hex values in components.
- Fonts: Fraunces for anything that speaks (headings, intentions), Karla for
  labels and UI, Noto Serif Devanagari for the seed syllables only.
- Text fields keep a local draft and commit on blur (see `components/field.tsx`);
  don't push every keystroke into the store or the network.
- Never log board contents. These are personal reflections, not debug data.

## Known gaps — good next tasks

1. **Verify a real sync round-trip.** The Supabase layer is written but has only
   been type-checked. Create the project, run `supabase/schema.sql`, sign in on
   two devices, and confirm boards and photos actually cross.
2. **Photo captions.** `setCaption` exists in the store; no UI reaches it yet.
3. **Reordering photos** within a board.
4. **Offline queue.** Right now a failed push waits for the next sync. A small
   retry queue would make it dependable on a subway.
5. **Import from the web board.** Helena has an existing board at claude.ai with
   content in it; a one-time importer would save retyping.
6. **App icon.** Still the Expo default — wants a proper seven-light mark.

## Running it

```bash
npm install
npx expo start          # scan the QR with Expo Go on the iPhone
npx tsc --noEmit        # typecheck
```

Sync setup lives in the README.
