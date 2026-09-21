import { mkdtemp, writeFile, rm, realpath, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { type OpenCliDocument } from '@clidoc/core';
import { createMcpServer, type McpServerOptions } from './index.js';

let directory: string;
let script: string;
const close: (() => Promise<void>)[] = [];
const spec = (): OpenCliDocument => ({
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'Node', binary: 'node', version: '1' },
  commands: { node: { args: [{ name: 'script', required: true }, { name: 'mode' }, { name: 'value' }] } },
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'clidoc-mcp-'));
  script = join(directory, 'fixture.cjs');
  await writeFile(
    script,
    `const [mode,value] = process.argv.slice(2);
if(mode==='hang') { if(value) require('node:fs').writeFileSync(value,String(process.pid)); setInterval(()=>{},1000); }
else if(mode==='large') process.stdout.write('x'.repeat(4096));
else if(mode==='fail') { process.stderr.write('failure'); process.exitCode=7; }
else if(mode==='signal') process.kill(process.pid,'SIGTERM');
else { process.stdout.write(JSON.stringify({value,cwd:process.cwd()})); process.stderr.write('diagnostic'); }
`,
  );
});
afterEach(async () => {
  await Promise.all(close.splice(0).map((fn) => fn()));
  await rm(directory, { recursive: true, force: true });
});
async function connect(options: Partial<McpServerOptions> = {}) {
  const server = createMcpServer(spec(), { executable: process.execPath, cwd: directory, ...options });
  const client = new Client({ name: 'test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  close.push(
    () => client.close(),
    () => server.close(),
  );
  const { tools } = await client.listTools();
  return {
    server,
    client,
    name: tools[0]!.name,
    call: (mode = 'ok', value?: string) =>
      client.callTool({
        name: tools[0]!.name,
        arguments: { arguments: { script, mode, ...(value === undefined ? {} : { value }) } },
      }),
  };
}
const resultText = (result: { content?: unknown }) => JSON.stringify(result.content);

it('negotiates MCP, lists schemas, calls a process without shell expansion and returns both streams', async () => {
  const { client, name, call } = await connect();
  const value = '$(echo unsafe); --help "quoted"';
  const result = await call('ok', value);
  expect(result.isError).toBe(false);
  const output = JSON.parse((result.content as { text: string }[])[0]!.text);
  expect(JSON.parse(output.stdout)).toEqual({ value, cwd: await realpath(directory) });
  expect(output.stderr).toBe('diagnostic');
  expect(output.exitCode).toBe(0);
  expect((await client.callTool({ name: 'missing' })).isError).toBe(true);
  expect(resultText(await client.callTool({ name }))).toContain('Invalid tool arguments');
  expect(
    resultText(
      await client.callTool({ name, arguments: { arguments: { script: '/must-not-execute' }, unexpected: true } }),
    ),
  ).toContain('Invalid tool arguments');
});
it('returns exit failures and signal termination as tool errors', async () => {
  const { call } = await connect();
  const failed = await call('fail');
  expect(failed.isError).toBe(true);
  expect(JSON.parse((failed.content as { text: string }[])[0]!.text)).toMatchObject({ exitCode: 7, stderr: 'failure' });
  expect((await call('signal')).isError).toBe(true);
});
it('handles a missing executable', async () => {
  const { call } = await connect({ executable: join(directory, 'missing') });
  expect(resultText(await call())).toContain('Cannot run CLI');
});
it('enforces time and combined output limits', async () => {
  const timed = await connect({ timeoutMs: 100 });
  expect(resultText(await timed.call('hang'))).toContain('timed out');
  const bounded = await connect({ maxOutputBytes: 100 });
  expect(resultText(await bounded.call('large'))).toContain('output exceeded');
  const stderr = await connect({ maxOutputBytes: 5 });
  expect(resultText(await stderr.call('fail'))).toContain('output exceeded');
});
it('cancels in-flight calls and closes active processes on disconnect', async () => {
  const { client, name } = await connect();
  const controller = new AbortController();
  const call = client.callTool({ name, arguments: { arguments: { script, mode: 'hang' } } }, undefined, {
    signal: controller.signal,
  });
  controller.abort();
  await expect(call).rejects.toThrow();
  const running = await connect();
  const pending = running.call('hang');
  const assertion = expect(pending).rejects.toThrow();
  await running.server.close();
  await assertion;
});
it.each([
  { executable: '' },
  { executable: 'a\0b' },
  { timeoutMs: 0 },
  { timeoutMs: 1.5 },
  { maxOutputBytes: -1 },
  { maxOutputBytes: Infinity },
  { timeoutMs: 2147483648 },
])('rejects invalid host options %j', (options) => {
  expect(() => createMcpServer(spec(), { executable: process.execPath, ...options })).toThrow();
});
it('serves the installed CLI over real stdio with an official SDK client', async () => {
  const filename = join(directory, 'spec.json');
  await writeFile(filename, JSON.stringify(spec()));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      new URL('../../dist/bin.js', import.meta.url).pathname,
      'mcp',
      filename,
      '--serve',
      '--executable',
      process.execPath,
    ],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'stdio-test', version: '1' });
  close.push(() => client.close());
  await client.connect(transport);
  const { tools } = await client.listTools();
  expect(tools).toHaveLength(1);
  const result = await client.callTool({ name: tools[0]!.name, arguments: { arguments: { script } } });
  expect(result.isError).toBe(false);
});

it('terminates a running child after an MCP cancellation notification', async () => {
  const { client, name } = await connect();
  const pidFile = join(directory, 'pid');
  const controller = new AbortController();
  const pending = client.callTool(
    { name, arguments: { arguments: { script, mode: 'hang', value: pidFile } } },
    undefined,
    { signal: controller.signal },
  );
  const assertion = expect(pending).rejects.toThrow();
  let pid = 0;
  await vi.waitFor(async () => {
    pid = Number(await readFile(pidFile, 'utf8'));
    expect(pid).toBeGreaterThan(0);
  });
  controller.abort();
  await assertion;
  await vi.waitFor(() => expect(() => process.kill(pid, 0)).toThrow());
});
