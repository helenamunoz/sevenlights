// The app's own sign-in requests, replayed against Cognito. The address is
// Amazon's mailbox simulator, which accepts mail and discards it, so this
// proves a code is issued without anyone's inbox being involved. Reading the
// code itself can only be checked on a real phone.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AdminDeleteUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

import { cognito, outputs, region, run } from './helpers.mjs';

const clientId = outputs.auth.user_pool_client_id;
const email = `success+${run}@simulator.amazonses.com`;

async function call(action, body) {
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

test('a new address gets an account and an emailed code; a wrong code is refused', async (t) => {
  t.after(() =>
    cognito.send(new AdminDeleteUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email })).catch(() => {})
  );
  const signUp = await call('SignUp', {
    ClientId: clientId,
    Username: email,
    UserAttributes: [{ Name: 'email', Value: email }],
  });
  assert.equal(signUp.status, 200, JSON.stringify(signUp.json));
  assert.equal(signUp.json.UserConfirmed, true, 'confirmed by the pre-sign-up function');

  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email }));
  assert.equal(user.UserAttributes.find((a) => a.Name === 'email_verified')?.Value, 'true');

  const again = await call('SignUp', { ClientId: clientId, Username: email, UserAttributes: [{ Name: 'email', Value: email }] });
  assert.equal(again.json.__type, 'UsernameExistsException', 'which the app treats as "already has an account"');

  const start = await call('InitiateAuth', {
    ClientId: clientId,
    AuthFlow: 'USER_AUTH',
    AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
  });
  assert.equal(start.status, 200, JSON.stringify(start.json));
  assert.equal(start.json.ChallengeName, 'EMAIL_OTP');
  assert.ok(start.json.Session);

  const wrong = await call('RespondToAuthChallenge', {
    ClientId: clientId,
    ChallengeName: 'EMAIL_OTP',
    Session: start.json.Session,
    ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: '00000000' },
  });
  assert.equal(wrong.json.AuthenticationResult, undefined, 'no tokens for a wrong code');
  t.diagnostic(`wrong code answer: ${wrong.status} ${wrong.json.__type ?? wrong.json.ChallengeName}`);
  t.diagnostic(`code delivery: ${JSON.stringify(start.json.ChallengeParameters ?? {})}`);
});
