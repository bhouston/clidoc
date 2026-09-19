# @clidoc/adapter-commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Convert configured Commander Command tree to an OpenCLI 1.0.0-alpha.14 document.

```ts
import { fromCommander } from '@clidoc/adapter-commander';
const document = fromCommander(source, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

The adapter reads metadata only and never runs command handlers.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
