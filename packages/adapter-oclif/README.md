# @clidoc/adapter-oclif

Convert generated oclif manifest.json to an OpenCLI 1.0.0-alpha.14 document.

```ts
import { fromOclif } from '@clidoc/adapter-oclif';
const document = fromOclif(source, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

The adapter reads metadata only and never runs command handlers.
