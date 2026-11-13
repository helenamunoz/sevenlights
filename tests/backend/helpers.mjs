// Shared by the backend tests: throwaway Cognito users and the two API calls.
// Needs AWS credentials in the environment and a deployed backend
// (amplify_outputs.json). Test users are created with the admin API, so no
// email is ever sent.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export const outputs = JSON.parse(readFileSync(new URL('../../amplify_outputs.json', import.meta.url)));
export const region = outputs.auth.aws_region;
const poolId = outputs.auth.user_pool_id;
const clientId = outputs.auth.user_pool_client_id;
const apiUrl = outputs.data.url;

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

export const cognito = new CognitoIdentityProviderClient({ region });
export const run = randomBytes(4).toString('hex');

/** Creates a confirmed user and signs them in. `name` is only a label. */
export async function createUser(name, { admin = false } = {}) {
  const email = `test-${run}-${name}@example.com`;
  const password = `T-${randomBytes(12).toString('base64url')}-9a`;
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: email,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    })
  );
  await cognito.send(
    new AdminSetUserPasswordCommand({ UserPoolId: poolId, Username: email, Password: password, Permanent: true })
  );
  if (admin) {
    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: email, GroupName: 'admins' }));
  }
  return signIn(name, email, password);
}

/** Gives an existing user a password (nobody has one otherwise) and signs them in. */
export async function adopt(name, email) {
  const password = `T-${randomBytes(12).toString('base64url')}-9a`;
  await cognito.send(
    new AdminSetUserPasswordCommand({ UserPoolId: poolId, Username: email, Password: password, Permanent: true })
  );
  return signIn(name, email, password);
}

async function signIn(name, email, password) {
  const reply = await cognito.send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: 'USER_AUTH',
      AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'PASSWORD', PASSWORD: password },
    })
  );
  const tokens = reply.AuthenticationResult;
  if (!tokens) throw new Error(`sign-in for ${name} stopped at ${reply.ChallengeName}`);
  const id = JSON.parse(Buffer.from(tokens.AccessToken.split('.')[1], 'base64url')).sub;
  const call = (kind) => async (op, input = {}) => {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tokens.AccessToken },
      body: JSON.stringify({
        query:
          kind === 'read'
            ? 'query Q($op: String!, $input: AWSJSON) { result: read(op: $op, input: $input) }'
            : 'mutation M($op: String!, $input: AWSJSON) { result: write(op: $op, input: $input) }',
        variables: { op, input: JSON.stringify(input) },
      }),
    });
    const json = await response.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    let result = json.data.result;
    while (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        break;
      }
    }
    return result;
  };
  return { name, id, email, password, tokens, read: call('read'), write: call('write') };
}

export async function removeUser(user) {
  // Through the app's own door first, so rows and files go too.
  await user.write('deleteAccount').catch(() => {});
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: user.email })).catch(() => {});
}

/** Sends a tiny file to an address from `uploadTarget`, the way the app does. */
export async function upload(target, { type = 'image/jpeg', bytes = 2048 } = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries(target.fields)) form.append(name, value);
  form.append('file', new Blob([randomBytes(bytes)], { type }));
  return fetch(target.url, { method: 'POST', body: form });
}

export async function refused(promise, code) {
  try {
    await promise;
  } catch (error) {
    if (code && error.message !== code) throw new Error(`expected "${code}", got "${error.message}"`);
    return;
  }
  throw new Error(`expected a refusal${code ? ` (${code})` : ''}, but it went through`);
}

export const utcDate = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

const table = outputs.custom.tableName;
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

/**
 * A challenge is meant to outlive its creator, so deleting the test people
 * leaves the challenges they made. Tests take those out straight from the table.
 */
export async function purgeChallenges(ids) {
  for (const id of ids.filter(Boolean)) {
    const { Items = [] } = await db.send(
      new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `CH#${id}` } })
    );
    const keys = [
      ...Items.map(({ pk, sk }) => ({ pk, sk })),
      { pk: 'CHL#es', sk: id },
      { pk: 'CHL#en', sk: id },
    ];
    for (let i = 0; i < keys.length; i += 25) {
      await db.send(
        new BatchWriteCommand({ RequestItems: { [table]: keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) } })
      );
    }
  }
}

/** Ids of creator-less community challenges whose title ends in a test run id. */
export async function orphanedTestChallenges() {
  const { Items = [] } = await db.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: 'sk = :a and begins_with(pk, :ch) and is_official = :no and creator_id = :none',
      ExpressionAttributeValues: { ':a': 'A', ':ch': 'CH#', ':no': false, ':none': null },
    })
  );
  return Items.filter((item) => / [0-9a-f]{8}$/.test(item.title)).map((item) => item.id);
}
