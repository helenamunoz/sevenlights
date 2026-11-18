// Finds the App Store Connect API key in the environment that can reach the
// 7Lights app, writes it to a private temp file, and prints the EXPO_ASC_*
// variables EAS reads (eval them, or use scripts/testflight.sh).
// The environment may hold two key sets: APPLE_API_* and ASC_*.
import { createPrivateKey, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BUNDLE_ID = 'com.helena.sevenlights';
const sets = [
  ['APPLE_API_KEY_ID', 'APPLE_API_ISSUER_ID', 'APPLE_API_PRIVATE_KEY'],
  ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY'],
  ['EXPO_ASC_KEY_ID', 'EXPO_ASC_ISSUER_ID', 'EXPO_ASC_API_KEY_P8'],
];

const b64url = (b) => Buffer.from(b).toString('base64url');
function token(keyId, issuer, pem) {
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key: createPrivateKey(pem), dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64url(sig)}`;
}

for (const [k, i, p] of sets) {
  const keyId = process.env[k], issuer = process.env[i];
  const pem = process.env[p]?.replace(/\\n/g, '\n');
  if (!keyId || !issuer || !pem) continue;
  try {
    const res = await fetch(`https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${BUNDLE_ID}`, {
      headers: { Authorization: `Bearer ${token(keyId, issuer, pem)}` },
    });
    const json = await res.json();
    const app = json.data?.[0];
    console.error(`${k}: HTTP ${res.status}${app ? `, sees ${app.attributes.name} (${app.id})` : ', app not visible'}`);
    if (!app) continue;
    const file = join(mkdtempSync(join(tmpdir(), 'asc-')), `AuthKey_${keyId}.p8`);
    writeFileSync(file, pem.endsWith('\n') ? pem : `${pem}\n`, { mode: 0o600 });
    console.log(`export EXPO_ASC_KEY_ID=${keyId} EXPO_ASC_ISSUER_ID=${issuer} EXPO_ASC_API_KEY_PATH=${file}`);
    process.exit(0);
  } catch (e) {
    console.error(`${k}: ${e.message}`);
  }
}
console.error('No App Store Connect key in the environment can reach the app.');
process.exit(1);
