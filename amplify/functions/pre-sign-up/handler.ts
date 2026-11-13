import type { PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * New accounts are confirmed at once, so the only email anyone ever gets is the
 * sign-in code. That code is what proves the address is theirs: an account made
 * for someone else's email cannot be entered without reading their inbox.
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  return event;
};
