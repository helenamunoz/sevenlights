// Publishes the web app: builds it, uploads dist/ to the web bucket and tells
// CloudFront to serve the new files.
//
//   npm run web:deploy        (needs AWS credentials and amplify_outputs.json)
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const outputs = JSON.parse(readFileSync(new URL('../amplify_outputs.json', import.meta.url)));
const { webBucketName: bucket, webDistributionId: distribution, webUrl } = outputs.custom;
const region = outputs.auth.aws_region;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};

if (!process.argv.includes('--no-build')) execSync('npx expo export -p web', { stdio: 'inherit' });

const dist = resolve('dist');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = walk(dist);
const s3 = new S3Client({ region });

for (const file of files) {
  const key = relative(dist, file).split('\\').join('/');
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(file),
      ContentType: TYPES[extname(file)] ?? 'application/octet-stream',
      // Expo names bundles and assets after their contents, so they never
      // change; the page that points at them must always be fetched fresh.
      CacheControl: key.startsWith('_expo/') || key.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
  );
}

// Drop what the previous build left behind.
const keep = new Set(files.map((file) => relative(dist, file).split('\\').join('/')));
let token;
do {
  const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
  const stale = (page.Contents ?? []).map((object) => object.Key).filter((key) => !keep.has(key));
  if (stale.length) {
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: stale.map((Key) => ({ Key })) } }));
  }
  token = page.NextContinuationToken;
} while (token);

await new CloudFrontClient({ region }).send(
  new CreateInvalidationCommand({
    DistributionId: distribution,
    InvalidationBatch: { CallerReference: String(Date.now()), Paths: { Quantity: 1, Items: ['/index.html'] } },
  })
);
console.log(`Uploaded ${files.length} files. The app is at ${webUrl}`);
