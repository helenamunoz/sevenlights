// Removes test people left behind when a test run was killed before its own
// clean-up: every user whose email marks it as a test user, with their rows
// and files.   node tests/backend/cleanup.mjs
import { AdminDeleteUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

import { adopt, cognito, orphanedTestChallenges, outputs, purgeChallenges, removeUser } from './helpers.mjs';

const { Users = [] } = await cognito.send(new ListUsersCommand({ UserPoolId: outputs.auth.user_pool_id, Limit: 60 }));
let removed = 0;
for (const user of Users) {
  const email = user.Attributes?.find((attribute) => attribute.Name === 'email')?.Value ?? '';
  if (!/^test-[0-9a-f]{8}-.+@example\.com$|^success\+.*@simulator\.amazonses\.com$/.test(email)) continue;
  try {
    await removeUser(await adopt('leftover', email));
  } catch {
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email }));
  }
  removed++;
}
console.log(`Removed ${removed} leftover test users; ${Users.length - removed} real users untouched.`);

const orphans = await orphanedTestChallenges();
await purgeChallenges(orphans);
console.log(`Removed ${orphans.length} challenges left by test runs.`);
