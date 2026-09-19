import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const server = spawn('pnpm', ['exec', 'docusaurus', 'serve', '--host', '127.0.0.1', '--port', '4173', '--no-open'], { stdio: 'inherit' });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      if (response.ok) { ready = true; break; }
    } catch { /* wait for server */ }
    await delay(500);
  }
  if (!ready) throw new Error('Docusaurus preview did not start');
  const runner = spawn('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.browser.config.js'], { stdio: 'inherit' });
  const code = await new Promise((resolve) => runner.on('exit', resolve));
  if (code !== 0) process.exitCode = code ?? 1;
} finally {
  server.kill();
}
