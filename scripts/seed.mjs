// Writes the app's starter content (the breathing challenge, in both
// languages) into the deployed backend. Safe to run again.
//
//   node scripts/seed.mjs        (needs AWS credentials in the environment)
import { readFileSync } from 'node:fs';

import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const outputs = JSON.parse(readFileSync(new URL('../amplify_outputs.json', import.meta.url)));
const lambda = new LambdaClient({ region: outputs.auth.aws_region });
const reply = await lambda.send(
  new InvokeCommand({
    FunctionName: outputs.custom.apiFunctionName,
    Payload: JSON.stringify({ system: 'seed' }),
  })
);
const result = JSON.parse(Buffer.from(reply.Payload).toString());
if (reply.FunctionError) {
  console.error('Seeding failed:', result.errorMessage ?? result);
  process.exit(1);
}
console.log(`Seeded ${result.challenges} suggested challenges (${result.created} new).`);
