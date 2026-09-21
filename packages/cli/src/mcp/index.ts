import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { OpenCliDocument } from '@clidoc/core';
import { compileMcpTools } from './compile.js';
export { compileMcpTools, type CompiledMcpTool } from './compile.js';

/** Executable and process limits are fixed by the host, never by tool inputs. */
export type McpServerOptions = {
  executable: string;
  cwd?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
};
const packageJson = createRequire(import.meta.url)('../../package.json') as { version: string };
const failure = (text: string): CallToolResult => ({ content: [{ type: 'text', text }], isError: true });

function execute(
  argv: string[],
  options: Required<Pick<McpServerOptions, 'timeoutMs' | 'maxOutputBytes'>> & McpServerOptions,
  signal: AbortSignal,
): Promise<CallToolResult> {
  if (signal.aborted) return Promise.resolve(failure('CLI invocation canceled'));
  return new Promise((resolve) => {
    const child = spawn(options.executable, argv, {
      cwd: options.cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    let finished = false;
    const finish = (result: CallToolResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      resolve(result);
    };
    const stop = (message: string) => {
      child.kill('SIGKILL');
      child.stdout.destroy();
      child.stderr.destroy();
      finish(failure(message));
    };
    const cancel = () => stop('CLI invocation canceled');
    const timer = setTimeout(() => stop(`CLI timed out after ${options.timeoutMs} ms`), options.timeoutMs);
    signal.addEventListener('abort', cancel, { once: true });
    const collect = (chunks: Buffer[], chunk: Buffer) => {
      if (finished) return;
      size += chunk.length;
      if (size > options.maxOutputBytes) stop(`CLI output exceeded ${options.maxOutputBytes} bytes`);
      else chunks.push(chunk);
    };
    child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk));
    child.on('error', (error) => finish(failure(`Cannot run CLI: ${error.message}`)));
    child.on('close', (code, exitSignal) => {
      const output = {
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        exitCode: code,
        signal: exitSignal,
      };
      finish({ content: [{ type: 'text', text: JSON.stringify(output) }], isError: code !== 0 });
    });
  });
}

/** Create an MCP server for a trusted local CLI. Connect it to a transport or call serveMcp. */
export function createMcpServer(document: OpenCliDocument, options: McpServerOptions): Server {
  if (!options.executable || options.executable.includes('\0')) throw new Error('An explicit executable is required');
  const limits = {
    ...options,
    timeoutMs: options.timeoutMs ?? 30000,
    maxOutputBytes: options.maxOutputBytes ?? 1048576,
  };
  for (const [name, value] of [
    ['timeoutMs', limits.timeoutMs],
    ['maxOutputBytes', limits.maxOutputBytes],
  ] as const)
    if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
      throw new Error(`${name} must be an integer between 1 and 2147483647`);
  const compiled = compileMcpTools(document);
  const tools = new Map(compiled.map((entry) => [entry.tool.name, entry]));
  const server = new Server({ name: 'clidoc-mcp', version: packageJson.version }, { capabilities: { tools: {} } });
  const active = new Set<AbortController>();
  // The SDK exposes onclose as a callback, not an EventTarget.
  // oxlint-disable-next-line unicorn/prefer-add-event-listener
  server.onclose = () => {
    for (const controller of active) controller.abort();
  };
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: compiled.map((entry) => entry.tool) }));
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const entry = tools.get(request.params.name);
    if (!entry) return failure(`Unknown tool: ${request.params.name}`);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    extra.signal.addEventListener('abort', cancel, { once: true });
    if (extra.signal.aborted) controller.abort();
    active.add(controller);
    try {
      return await execute(entry.argv(request.params.arguments ?? {}), limits, controller.signal);
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error));
    } finally {
      extra.signal.removeEventListener('abort', cancel);
      active.delete(controller);
    }
  });
  return server;
}

/** Connect a server to stdin/stdout; callers can close the returned server. */
export async function serveMcp(document: OpenCliDocument, options: McpServerOptions): Promise<Server> {
  const server = createMcpServer(document, options);
  await server.connect(new StdioServerTransport());
  const onclose = server.onclose!;
  const shutdown = () => {
    void server.close();
  };
  // The SDK exposes onclose as a callback, not an EventTarget.
  // oxlint-disable-next-line unicorn/prefer-add-event-listener
  server.onclose = () => {
    process.stdin.removeListener('end', shutdown);
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
    onclose();
  };
  process.stdin.once('end', shutdown);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}
