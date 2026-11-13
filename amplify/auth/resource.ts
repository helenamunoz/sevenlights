import { defineAuth } from '@aws-amplify/backend';

import { preSignUp } from '../functions/pre-sign-up/resource';

/**
 * Sign-in is an emailed one-time code; nobody has a password. Cognito calls
 * this "choice-based" sign-in (USER_AUTH with EMAIL_OTP) and it needs the
 * Essentials plan, which is the default for new pools and free below 10,000
 * monthly active users.
 *
 * `admins` is the moderation group. Nobody can add themselves to it: group
 * membership is only changed with AWS credentials (see the README).
 */
export const auth = defineAuth({
  loginWith: {
    email: { otpLogin: true },
  },
  groups: ['admins'],
  triggers: { preSignUp },
});
