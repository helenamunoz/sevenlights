import { defineFunction } from '@aws-amplify/backend';

/** The one function behind every query and mutation. See handler.ts. */
export const api = defineFunction({
  name: 'api',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  logging: { retention: '1 week' },
});
