# SevenLights

A free app to raise your frequency, with two tools:

- **Vision boards.** Seven chakra boards per person, plus as many free boards
  as you like. Public by default, with a private switch on each. Other people
  can like a board and borrow from it: a photo, a text, or the whole page.
- **Challenges.** Anyone can create one, of any length. Day 1 is the day you
  join. Each day you tick it done and can leave a note. Comments and votes;
  the best-voted ones rise.

Spanish and English, following the phone's language. iPhone, Android and web.

## Run the app

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on the iPhone. The repo's `.env` already
points at the deployed backend (three public values; no secrets).

Optional: put the app's Instagram profile in `.env` as
`EXPO_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/...` to show the
"follow us" link on the profile tab.

## The backend

Everything is on AWS, defined in `amplify/` with Amplify Gen 2, and all of it
is pay-per-use — nothing runs while nobody is using the app:

| Piece | Service | What it costs |
| --- | --- | --- |
| Sign-in by emailed code | Cognito (Essentials plan) | Free up to 10,000 monthly active users |
| API | AppSync | $4 per million requests |
| All the rules | Lambda (one function, plus a tiny sign-up helper) | Free up to 1 million requests a month |
| Data | DynamoDB, one on-demand table | About $1.25 per million writes, $0.25 per million reads; 25 GB free |
| Photos, avatars, audio | S3, one private bucket | About $0.023 per GB a month |

For one person and a handful of friends this is **$0 to a few cents a month**.

### Deploy

You need Node 22 and AWS credentials for the account in your environment
(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), with `AWS_REGION=us-east-1`.

```bash
npm run backend                 # npx ampx sandbox --once --identifier main
node scripts/write-env.mjs      # copies the three public values into .env
npm run seed                    # the suggested breathing challenge, es + en
```

`npm run backend` is safe to run again after changing anything in `amplify/`;
it updates what is there and keeps the data. It writes `amplify_outputs.json`
(not committed) for the scripts and tests.

This is an Amplify *sandbox* deployment: the simplest kind, with no build
pipeline and no hosting bill. Be careful with one command:
`npx ampx sandbox delete` removes the whole backend **including everyone's
data**.

### Make yourself an admin

Admins can hide reported boards, challenges, comments and notes from the app
(Profile → Moderation). Sign in to the app once, then, with AWS credentials:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$(node -p "require('./amplify_outputs.json').auth.user_pool_id")" \
  --username you@example.com --group-name admins
```

Or in the AWS console: Cognito → User pools → the SevenLights pool → Groups →
`admins` → Add user. Then sign out of the app and back in. Nobody can do this
from inside the app.

### Email limits

Sign-in codes are sent by Cognito's built-in sender, which allows roughly 50
emails a day. That is plenty for testing with friends. A public launch needs
Amazon SES with production access, configured as the pool's sender.

## Checks

```bash
npm run typecheck        # the app and the backend
npm test                 # day and streak maths
npm run test:backend     # the rules, against the deployed backend
npx expo export -p web && node tests/e2e/web.mjs   # browser walk-through
```

`test:backend` creates three throwaway people and proves, against the real
backend, that private boards and their photos stay private, nobody can make
themselves an admin or forge a counter, blocks hide both ways, each
missed-day rule accepts only the days it should, votes move the rank, hidden
content disappears for others, and deleting an account removes its content
while challenge members keep their progress. It removes what it creates.

## How it is built

Working notes for whoever (or whatever) works on the code next are in
`CLAUDE.md`.
