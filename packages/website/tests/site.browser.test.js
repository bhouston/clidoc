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
    expect(home.querySelector('header')?.textContent).toContain('Docusaurus or VitePress');
    expect(home.querySelector('main > section:first-child h2')?.textContent).toBe('Built for your CLI framework');
    expect(home.querySelector('a[href="/docs/cli/reference"]')).not.toBeNull();
    for (const name of ['yargs', 'Commander.js', 'oclif', 'Docusaurus', 'VitePress']) {
      expect(home.body.textContent).toContain(name);
    }
    expect(home.body.textContent).toContain('mycli docgen --output cli.json');
    expect(home.body.textContent).toContain('clidoc validate cli.json');
    expect(home.body.textContent).toContain('Markdown');
    expect(home.querySelector('main > section:first-child pre')?.textContent).toContain('fromCommander(program, info)');
    expect(home.querySelector('main > section:nth-child(2) pre')?.textContent).toContain(
      "require('@clidoc/docusaurus')",
    );
    const logos = [...home.querySelectorAll('img[src^="/img/integrations/"]')];
    expect(logos).toHaveLength(5);
    for (const logo of logos) {
      expect((await fetch(`http://127.0.0.1:4173${logo.getAttribute('src')}`)).ok).toBe(true);
    }
    expect(home.querySelector('a[href="/docs/adapters/"]')).not.toBeNull();
    expect(home.querySelector('a[href="/docs/guides/publishing"]')).not.toBeNull();
    expect(home.body.textContent).toContain('Created with love ❤️ by');
    expect(home.querySelector('a[href="https://ben3d.ca"]')?.textContent).toBe('Ben Houston');
    expect(home.querySelector('a[href="https://landofassets.com"]')?.textContent).toBe('Land of Assets');

    const cli = await documentAt('/docs/cli/reference');
    expect(cli.body.textContent).toContain('clidoc');

    const validateLink = [...cli.querySelectorAll('a')].find((link) => link.textContent === 'clidoc validate');
    expect(validateLink).toBeDefined();
    const validate = await documentAt(validateLink.getAttribute('href'));
    expect(validate.body.textContent).toContain('Usage');
    const usage = [...validate.querySelectorAll('pre')].find((block) => block.textContent.includes('clidoc validate'));
    expect(usage?.textContent).toContain('<input>');
    expect(usage?.textContent).toContain('[--help]');
    expect(usage?.textContent).toContain('[--version]');

    const core = await documentAt('/docs/api');
    expect(core.body.textContent).toContain('parse');
  });
});
