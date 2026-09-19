# @clidoc/adapter-oclif

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Convert generated oclif manifest.json to an OpenCLI 1.0.0-alpha.14 document.

```ts
import { fromOclif } from '@clidoc/adapter-oclif';
const document = fromOclif(source, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

The adapter reads metadata only and never runs command handlers.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
