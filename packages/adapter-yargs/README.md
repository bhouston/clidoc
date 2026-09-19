# @clidoc/adapter-yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Convert Yargs command modules into an OpenCLI 1.0.0-alpha.14 document.

```ts
import { fromYargs } from '@clidoc/adapter-yargs';
import { command as greet } from './commands/greet.js';

const document = fromYargs([greet], {
  title: 'My CLI',
  binary: 'mycli',
  version: '1.0.0',
});
```

This accepts standard Yargs modules and `defineCommand` results from `yargs-file-commands`. Declarative option maps and synchronous builder calls to `.option()`, `.options()`, and `.positional()` are supported. Handlers are never run. Modules are supplied explicitly because a live Yargs instance does not expose all command metadata as a stable public API.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
