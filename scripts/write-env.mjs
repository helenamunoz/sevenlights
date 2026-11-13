// Copies the three public values the app needs out of amplify_outputs.json
// (written by `npx ampx sandbox`) into .env, keeping anything else in it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const outputs = JSON.parse(readFileSync(new URL('../amplify_outputs.json', import.meta.url)));
const values = {
  EXPO_PUBLIC_AWS_REGION: outputs.auth.aws_region,
  EXPO_PUBLIC_COGNITO_CLIENT_ID: outputs.auth.user_pool_client_id,
  EXPO_PUBLIC_API_URL: outputs.data.url,
};
const path = new URL('../.env', import.meta.url);
const kept = existsSync(path)
  ? readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '' && !Object.keys(values).some((name) => line.startsWith(`${name}=`)))
  : [];
const lines = [...Object.entries(values).map(([name, value]) => `${name}=${value}`), ...kept];
writeFileSync(path, `${lines.join('\n')}\n`);
console.log('Wrote .env');
