# 7Lights — working notes

A free app to raise your frequency with two tools: **vision boards** (seven
chakra boards per person plus any number of free ones) and **challenges**
(daily practices anyone can create and join). Built for Helena's iPhone; it
also runs on Android and web.

## Shape of the thing

- **Expo SDK 57**, expo-router (file routes under `src/app`), TypeScript strict.
- **Account required.** Sign-in is an emailed one-time code; there are no passwords.
- **The backend is AWS, defined in `amplify/` (Amplify Gen 2).** Cognito for
  sign-in, AppSync in front of one Lambda function, one DynamoDB table, one
  private S3 bucket. The web build is hosted on S3 behind CloudFront
  (https://d1seiplrwjzc1j.cloudfront.net). All pay-per-use. Do not add anything that costs money
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
- **One visual world.** The [Afterglow brand guide](docs/brand-design.md) covers the
  dark espresso theme and Ember Ring. Chakra colors remain category cues.

## Where things live

```
amplify/backend.ts                 table, bucket, permissions, web hosting
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
- Fonts: Bricolage Grotesque for headings, Instrument Sans for body and UI,
  and Noto Serif Devanagari for seed syllables.
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
npm run web:deploy        # publish the web app to its CloudFront address
```

The backend commands need AWS credentials in the environment and
`AWS_REGION=us-east-1`. `amplify_outputs.json` is not committed; get it back
with `npm run backend` (deploys) or
`npx ampx generate outputs --stack <stack name>`. Behind an HTTPS proxy, set
`NODE_USE_ENV_PROXY=1`. If a test run is killed, `node tests/backend/cleanup.mjs`
removes what it left. Deploying, seeding and making an admin are in the README.

## Previews (Expo)

**Claude publishes every preview, unless Helena says otherwise.** After a
change to the app, publish it to the `preview` branch without being asked:

```bash
npx eas-cli update --branch preview --environment preview --message "<what changed>"
```

- Project: `@tempo.software/SevenLights` on expo.dev; `EXPO_TOKEN` (a robot
  on that account) is in the environment. Set `NODE_USE_ENV_PROXY=1`.
- `--environment preview` reads variables from EAS, not `.env`: the three
  `EXPO_PUBLIC_*` values are stored there. A new public value goes in both
  (`eas env:create --environment preview --visibility plaintext`).
- `runtimeVersion` is `exposdk:57.0.0` so Expo Go opens the update; change it
  with the SDK.
- Give Helena the update's dashboard link (Preview → QR) when done.

## TestFlight (iOS)

**Claude handles TestFlight builds too**, with the App Store Connect key in the
environment; Helena does not need to do anything in Apple's sites for a build.

```bash
scripts/testflight.sh     # EAS build for iOS, then auto-submit to TestFlight
```

- App Store Connect app: **SevenLights**, Apple ID `6807111853`, bundle
  `com.helena.sevenlights` (both in `eas.json`; ignore the `APPLE_BUNDLE_ID`
  and `APPLE_APP_APPLE_ID` variables if they say anything else).
- The working key is the `ASC_*` set (`ASC_KEY_ID`, `ASC_ISSUER_ID`,
  `ASC_PRIVATE_KEY`); `APPLE_API_*` is rejected by Apple. `scripts/asc-key.mjs`
  tests them, writes the `.p8` to a temp file and exports `EXPO_ASC_*`.
- iOS credentials live on EAS: the shared distribution certificate (team
  TSPPH79V85, Individual, expires 2027-08-17, also used by Vayu, Bruma and
  Brotia), an App Store profile for this bundle, and the submit key
  `9QBL4FM745`. Never revoke or replace the certificate: the other apps use it.
- `APPLE_TEAM_ID` becomes `EXPO_APPLE_TEAM_ID`. Build numbers increment on EAS
  (`appVersionSource: remote`). The free EAS plan allows ~15 iOS builds a month.
- Builds use the `production` EAS environment: its `EXPO_PUBLIC_*` values must
  match the `preview` ones.
- Only Helena can create a new app in App Store Connect, accept Apple's
  agreements, or handle payments and two-factor prompts.

## Known gaps — good next tasks

1. **A real phone pass**: the emailed code arriving and being accepted, camera
   and photo picker, uploads from iOS, reminders, audio in silent mode, sharing
   to Instagram Stories. None of these can be checked from a server.
2. **Email for a public launch.** Cognito's built-in sender allows about 50
   emails a day. More needs Amazon SES with production access.
3. **Lists read whole partitions.** Explore and the challenge lists load every
   pointer and sort in the function — fine for thousands, not for millions.
4. **Reordering photos** within a board; **photo captions** UI polish.
