# @clidoc/vitepress

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fvitepress)](https://www.npmjs.com/package/@clidoc/vitepress)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fvitepress)](https://www.npmjs.com/package/@clidoc/vitepress)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Generate VitePress pages and sidebar entries from an OpenCLI document.

```sh
npm install -D @clidoc/vitepress @clidoc/core vitepress
```

Export a document from your CLI, for example `mycli docgen --output cli.json`, then in `docs/.vitepress/config.mts`:

```ts
import { defineConfig } from 'vitepress';
import { parse } from '@clidoc/core';
import { writeVitePress } from '@clidoc/vitepress';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const document = parse(await readFile(new URL('../../cli.json', import.meta.url), 'utf8'));
const cliSidebar = await writeVitePress(document, {
  outputDir: fileURLToPath(new URL('..', import.meta.url)),
  basePath: '/cli',
});
export default defineConfig({
  themeConfig: { sidebar: [{ text: 'CLI', items: cliSidebar }] },
});
```

Run `npx vitepress dev docs`. Add the generated files to `.gitignore`:

```gitignore
docs/cli.md
docs/cli/commands/
docs/.clidoc-generated.json
```

## Notes

- `basePath` sets both routes and file locations below `outputDir`. `mycli deploy` becomes `cli/commands/deploy.md` at `/cli/commands/deploy`.
- Regeneration only removes files listed in `.clidoc-generated.json`, so handwritten pages are safe.
- Output is wrapped in a `v-pre` container and `<`/`>` outside code are escaped, so CLI text is never interpreted by Vue. HTML in descriptions renders as literal text.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
