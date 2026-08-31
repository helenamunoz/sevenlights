# SevenLights — working notes

A private vision board with one page per chakra: an intention, an affirmation, a
few words, and photos. Built for Helena's iPhone; it also runs on Android and web.
It speaks Spanish and English, and picks up the phone's language on first launch.

## Shape of the thing

- **Expo SDK 57**, expo-router (file routes under `src/app`), TypeScript strict.
- **Local-first.** Every edit lands in `AsyncStorage` immediately. Sync is an
  extra, never a precondition — the app must stay fully usable with no network
  and no account.
- **Sync is last-write-wins per board.** One person, two devices: no merge UI,
  no conflict prompts. Photos carry their own ids and merge additively.
- **One visual world.** Ink-dark ground, each chakra its own light. There is no
  light theme, on purpose. Do not add one without asking.
- **The mark is the app.** Seven lights on a thread, root at the bottom. It is
  the icon, the splash, and the header — `scripts/make-icons.mjs` draws the
  raster versions, `src/components/logo.tsx` the live one.
- **Two languages, one voice.** Every user-facing string comes from a dictionary
  in `src/i18n`. Nothing in a component is a literal sentence.

## Where things live

```
src/data/chakras.ts        the seven centers — order, color, Sanskrit, copy in both languages
src/theme/tokens.ts        color / type / space / motion scales; every style pulls from here
src/components/ui.tsx      Card, Label, Body, buttons, Segmented, Chip
src/components/logo.tsx    the mark (seven lights on a thread) and the wordmark
src/components/splash.tsx  the opening: the lights come up root to crown
src/i18n/es.ts             the Spanish dictionary — the shape every other one is typed against
src/i18n/en.ts             the English dictionary
src/i18n/index.tsx         LocaleProvider, useT / useLocale, {slot} filling
src/lib/store.tsx          BoardsProvider: state, persistence, auth, sync triggers
src/lib/errors.ts          AppError + messageFor: our failures carry a code, not a sentence
src/lib/sync.ts            Supabase pull/push, photo upload/download, merge()
src/lib/photos.ts          picker + camera, copying files into permanent storage
src/lib/supabase.ts        the client, or null when env vars are missing
src/app/index.tsx          the column: seven rows on a thread
src/app/chakra/[id].tsx    one board
src/app/account.tsx        language, sign-in and sync status
scripts/make-icons.mjs     draws the icon, favicon, Android layers and splash mark
supabase/schema.sql        tables, RLS policies, storage bucket
```

## Conventions

- No literal user-facing strings in components. Add a key to `src/i18n/es.ts`
  first — `en.ts` is typed against it, so a missing translation is a type error
  — then read it through `useT()` or `useLocale()`. `fill()` handles `{slots}`.
- Spanish is rioplatense voseo ("guardá", "sumá", "podés"); the English says the
  same thing in the same voice. Code, comments and commits in English.
- Errors the app raises itself carry an `AppErrorCode`, not a sentence, so the
  message comes out of the dictionary. Supabase's own wording is left alone.
- Styles come from `@/theme/tokens` — no loose hex values, font names or sizes
  in components. Text styles spread a preset from `type`.
- Reach for `@/components/ui` before writing another card or button.
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
6. **A third language.** Adding one is a file in `src/i18n`, a `copy` block per
   chakra, and an entry in `LOCALES` — nothing else should need touching.

## Running it

```bash
npm install
npx expo start                  # scan the QR with Expo Go on the iPhone
npx tsc --noEmit                # typecheck
node scripts/make-icons.mjs     # redraw the icons from the mark
```

Sync setup lives in the README.
