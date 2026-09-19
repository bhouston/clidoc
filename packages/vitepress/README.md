# @clidoc/vitepress

Generate VitePress pages and sidebar entries from an OpenCLI document.

```ts
import { defineConfig } from 'vitepress';
import { parse } from '@clidoc/core';
import { writeVitePress } from '@clidoc/vitepress';
import { readFile } from 'node:fs/promises';

const document = parse(await readFile('cli.ocs.yaml', 'utf8'));
const cliSidebar = await writeVitePress(document, {
  outputDir: 'docs',
  basePath: '/cli',
});
export default defineConfig({
  themeConfig: { sidebar: [{ text: 'CLI', items: cliSidebar }] },
});
```

The output contains ordinary Markdown. VitePress's `v-pre` custom container
keeps CLI-authored Vue expressions literal while still rendering headings,
links, tables, and fenced code. `basePath` determines both routes and file
locations below `outputDir`. Regeneration removes only files recorded in
`.clidoc-generated.json`, leaving hand-written pages intact.
