import type { DocumentOverrides } from './merge.js';
import type { OpenCliDocument } from './types.js';

type Assert<T extends true> = T;

// Keep the override shape from packages/core/README.md type-checkable.
type ReadmeOverride = {
  info: { license: { name: 'MIT'; spdxId: 'MIT' } };
  install: [{ name: 'npm'; command: 'npm i -g my-cli' }];
  commands: {
    'my-cli greet': {
      examples: [{ title: 'Basic'; content: 'my-cli greet Ada' }];
      exitCodes: [{ code: 1; status: 'BAD_USER_INPUT_ERROR'; summary: 'Missing name' }];
      flags: [{ name: 'language'; alternativeSources: [{ type: '$ENV'; property: 'LANG' }] }];
    };
  };
};

type _ReadmeOverrideIsAccepted = Assert<ReadmeOverride extends DocumentOverrides ? true : false>;
type _IncompleteFlagIsNotADocument = Assert<
  {
    opencliVersion: '1.0.0-alpha.14';
    info: { title: 'Demo'; binary: 'demo'; version: '1' };
    commands: { demo: { flags: [{ name: 'missing-type' }] } };
  } extends OpenCliDocument
    ? false
    : true
>;
