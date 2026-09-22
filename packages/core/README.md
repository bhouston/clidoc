# @clidoc/core

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcore)](https://www.npmjs.com/package/@clidoc/core)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcore)](https://www.npmjs.com/package/@clidoc/core)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Types, offline validation, JSON/YAML parsing, and Markdown generation for [OpenCLI 1.0.0-alpha.14](https://github.com/bcdxn/opencli) documents.

```sh
npm install @clidoc/core
```

```ts
import { parse, validate, renderMarkdown, generatePages } from '@clidoc/core';

const document = parse(sourceText); // JSON or YAML; throws on invalid input
const result = validate(document); // { valid, errors }
const markdown = renderMarkdown(document);
const pages = generatePages(document, { basePath: '/cli' });
```

`validate` checks the bundled JSON Schema plus upstream's logical rules, so it works offline. `generatePages` returns a landing page and one page per visible command, each with a stable `id`, `title`, `path`, and Markdown `content`. The schema itself is exported from `@clidoc/core/schema`. See the [API reference](https://clidoc.dev/docs/api/reference).

## Adding author-supplied metadata

Framework adapters only know what your argument parser knows. Add examples, exit codes, license, install methods, and config with `mergeDocument`:

```ts
import { mergeDocument } from '@clidoc/core';

const documented = mergeDocument(document, {
  info: { license: { name: 'MIT', spdxId: 'MIT' } },
  install: [{ name: 'npm', command: 'npm i -g my-cli' }],
  commands: {
    'my-cli greet': {
      examples: [{ title: 'Basic', content: 'my-cli greet Ada' }],
      exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
      flags: [{ name: 'language', alternativeSources: [{ type: '$ENV', property: 'LANG' }] }],
    },
  },
});
```

Objects merge recursively. `examples` and `exitCodes` append, `flags` and `args` merge by `name`, and other arrays replace. New commands are added as-is. The result is validated and `mergeDocument` throws if it fails.

## Shell completion

```ts
import { generateCompletion } from '@clidoc/core';

const script = generateCompletion(document, { shell: 'bash' }); // 'bash' | 'zsh' | 'fish'
```

The script needs neither Node nor the CLI at completion time. See the [completion guide](https://clidoc.dev/docs/completion).

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
