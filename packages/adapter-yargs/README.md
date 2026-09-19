# @clidoc/adapter-yargs

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
