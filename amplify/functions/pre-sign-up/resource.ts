import { defineFunction } from '@aws-amplify/backend';

export const preSignUp = defineFunction({
  name: 'pre-sign-up',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  logging: { retention: '1 week' },
});
