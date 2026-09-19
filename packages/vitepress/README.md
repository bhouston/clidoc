# @clidoc/vitepress

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fvitepress)](https://www.npmjs.com/package/@clidoc/vitepress)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fvitepress)](https://www.npmjs.com/package/@clidoc/vitepress)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

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
`.clidoc-generated.json`, leaving hand-written pages intact. On the first run
after upgrading from OpenCLI, it also removes stale pages listed in
`.opencli-generated.json` and deletes that legacy manifest.

`<` and `>` outside fenced code blocks and inline code spans are escaped to
entities, since `v-pre` stops Vue mustache interpolation but not its SFC
parser's tag scanning; as a result, HTML written in a description renders as
literal text rather than as markup on VitePress.

Add `outputDir` to `.gitignore`; it holds hundreds of hashed generated
Markdown files that are regenerated on every build.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
