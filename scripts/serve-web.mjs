// Serves the exported web build (dist/) so the app can be tried in a browser.
//   npx expo export -p web && node scripts/serve-web.mjs [port]
// Unknown paths fall back to index.html, which is what a single-page app needs.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist');
const port = Number(process.argv[2] ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname)));
  const file = path.startsWith(root) && existsSync(path) && statSync(path).isFile() ? path : join(root, 'index.html');
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, () => console.log(`SevenLights web build on http://localhost:${port}`));
