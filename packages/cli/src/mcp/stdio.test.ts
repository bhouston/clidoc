import { expect, it, vi } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { serveMcp } from './index.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: function StdioServerTransport() {
    return InMemoryTransport.createLinkedPair()[0];
  },
}));
it.each(['signal', 'eof'])('connects stdio and cleans up on %s', async (event) => {
  const before = process.listeners('SIGTERM');
  const endBefore = process.stdin.listeners('end');
  const server = await serveMcp(
    { opencliVersion: '1.0.0-alpha.14', info: { title: 'Test', binary: 'test', version: '1' } },
    { executable: process.execPath },
  );
  const shutdown = process.listeners('SIGTERM').find((fn) => !before.includes(fn))!;
  expect(shutdown).toBeTypeOf('function');
  if (event === 'signal') shutdown('SIGTERM');
  else process.stdin.listeners('end').find((fn) => !endBefore.includes(fn))!();
  await vi.waitFor(() => expect(process.listeners('SIGTERM')).toEqual(before));
  expect(process.stdin.listeners('end')).toEqual(endBefore);
  await server.close();
});
