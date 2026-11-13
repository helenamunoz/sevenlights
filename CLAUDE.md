# SevenLights — working notes

A free app to raise your frequency with two tools: **vision boards** (seven
chakra boards per person plus any number of free ones) and **challenges**
(daily practices anyone can create and join). Built for Helena's iPhone; it
also runs on Android and web.

## Shape of the thing

- **Expo SDK 57**, expo-router (file routes under `src/app`), TypeScript strict.
- **Account required.** Sign-in is an emailed one-time code; there are no passwords.
- **The backend is AWS, defined in `amplify/` (Amplify Gen 2).** Cognito for
  sign-in, AppSync in front of one Lambda function, one DynamoDB table, one
  private S3 bucket. All pay-per-use. Do not add anything that costs money
  while idle (RDS, NAT gateways, provisioned capacity, OpenSearch, WAF, custom
  domains) and tell Helena before creating anything that could cost more than
  cents a month.
- **The app talks to AWS over plain HTTPS** (`src/lib/aws.ts`). No `aws-amplify`
  or AWS SDK in the app: their React Native packages need native code Expo Go
  does not have. Keep it that way so the app keeps running in Expo Go.
- **Every rule lives in `amplify/functions/api/handler.ts`.** The app can only
  call `read(op, input)` and `write(op, input)`. The function decides what the
  caller may see (public unless private, hidden by an admin, or blocked either
  way) and may change. Counters, vote rank and hidden flags are only ever
  written there; a request cannot carry a value for them.
- **One visual world.** Ink-dark ground, each chakra its own light. There is no
  light theme, on purpose. Do not add one without asking.

## Where things live

```
amplify/backend.ts                 table, bucket, permissions
amplify/auth/resource.ts           Cognito: email code sign-in, `admins` group
amplify/data/resource.ts           the two GraphQL fields, read and write
amplify/functions/api/handler.ts   every operation and who may do it
amplify/functions/api/rules.ts     pure checks: limits, day bounds, vote rank
amplify/functions/api/db.ts        DynamoDB helpers and the key layout
amplify/functions/api/files.ts     S3: signed links, upload forms, copies
amplify/functions/api/seed.ts      the suggested breathing challenge
src/lib/aws.ts                     session, Cognito calls, read() and write()
src/lib/auth.tsx                   AuthProvider: session, profile, isAdmin
src/lib/api/*.ts                   react-query hooks the screens use
src/lib/media.ts                   signed URLs for reading, uploads
src/lib/days.ts                    day and streak maths (tests/days.test.mjs)
src/lib/i18n/{es,en}.ts            both dictionaries
src/data/chakras.ts                the seven centers
src/theme/tokens.ts                color / font / space scales
tests/backend/                     the rules, tested against the deployed sandbox
tests/e2e/web.mjs                  a browser walk through the web build
```

## Conventions

- Spanish (rioplatense voseo: "guardá", "sumá", "podés") and English, following
  the phone's language. What people write is never translated. Code, comments
  and commits in English.
- Styles come from `@/theme/tokens` — no loose hex values in components.
- Fonts: Fraunces for anything that speaks, Karla for labels and UI, Noto Serif
  Devanagari for the seed syllables only.
- Text fields keep a local draft and commit on blur (`components/field.tsx`).
- **Never log what people write.** The function logs operation names and error
  codes only.
- A new operation is: a function in `reads` or `writes` in the handler, a hook
  in `src/lib/api`, and a case in `tests/backend/rules.test.mjs` that proves who
  cannot do it.
- No third-party affirmation texts in seed content.
- Borrowed photos and texts carry no credit.

## Running and checking

```bash
npm install
npx expo start            # scan the QR with Expo Go
npm run typecheck         # app and backend
npm test                  # day maths
npm run test:backend      # rules, against the deployed sandbox
npx expo export -p web && node tests/e2e/web.mjs
```

The backend commands need AWS credentials in the environment and
`AWS_REGION=us-east-1`. `amplify_outputs.json` is not committed; get it back
with `npm run backend` (deploys) or
`npx ampx generate outputs --stack <stack name>`. Behind an HTTPS proxy, set
`NODE_USE_ENV_PROXY=1`. If a test run is killed, `node tests/backend/cleanup.mjs`
removes what it left. Deploying, seeding and making an admin are in the README.

## Known gaps — good next tasks

1. **A real phone pass**: the emailed code arriving and being accepted, camera
   and photo picker, uploads from iOS, reminders, audio in silent mode, sharing
   to Instagram Stories. None of these can be checked from a server.
2. **Email for a public launch.** Cognito's built-in sender allows about 50
   emails a day. More needs Amazon SES with production access.
3. **Lists read whole partitions.** Explore and the challenge lists load every
   pointer and sort in the function — fine for thousands, not for millions.
4. **Reordering photos** within a board; **photo captions** UI polish.
5. **App icon.** Still the Expo default — wants a proper seven-light mark.
6. **Tab bar labels are clipped on web** at phone widths.
