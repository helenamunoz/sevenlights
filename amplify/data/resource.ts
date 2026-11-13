import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

import { api } from '../functions/api/resource';

/**
 * The whole API is two fields. `read` and `write` each take the name of an
 * operation and its input, and hand them to the api function, which is the only
 * thing with access to the table and the bucket.
 *
 * There are no generated per-table resolvers on purpose: "public unless
 * private, hidden or blocked" cannot be written as an Amplify model rule, and
 * owner-level write access would let a client set its own like counts.
 */
const schema = a.schema({
  read: a
    .query()
    .arguments({ op: a.string().required(), input: a.json() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.authenticated()]),
  write: a
    .mutation()
    .arguments({ op: a.string().required(), input: a.json() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
});
