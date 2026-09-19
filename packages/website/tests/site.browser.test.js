import { describe, expect, it } from 'vitest';

async function documentAt(path) {
  const response = await fetch(`http://127.0.0.1:4173${path}`);
  expect(response.ok).toBe(true);
  return new DOMParser().parseFromString(await response.text(), 'text/html');
}

describe('published website', () => {
  it('links from the homepage to generated CLI and core references', async () => {
    const home = await documentAt('/');
    expect(home.querySelector('h1')?.textContent).toContain('CLI documentation from the source');
    expect(home.body.textContent).toContain('Built upon the OpenCLI specification');
    expect(home.querySelector('a[href="/docs/cli/reference"]')).not.toBeNull();

    const cli = await documentAt('/docs/cli/reference');
    expect(cli.body.textContent).toContain('clidoc');

    const core = await documentAt('/docs/api');
    expect(core.body.textContent).toContain('parse');
  });
});
