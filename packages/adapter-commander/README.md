# @clidoc/adapter-commander

Convert configured Commander Command tree to an OpenCLI 1.0.0-alpha.14 document.

```ts
import { fromCommander } from '@clidoc/adapter-commander';
const document = fromCommander(source, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

The adapter reads metadata only and never runs command handlers.
