import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve('build');
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const candidate = resolve(root, `.${pathname}`);
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const file = (await stat(candidate)).isDirectory() ? resolve(candidate, 'index.html') : candidate;
    const body = await readFile(file);
    const type = file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(4173, '127.0.0.1', resolve));
try {
  const runner = spawn('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.browser.config.mjs'], {
    stdio: 'inherit',
  });
  const code = await new Promise((resolve) => runner.on('exit', resolve));
  if (code !== 0) process.exitCode = code ?? 1;
} finally {
  server.close();
}
