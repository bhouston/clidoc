---
title: nrranjithnr OpenCLISpec
sidebar_position: 3
---

# nrranjithnr OpenCLISpec 1.0.0

[nrranjithnr/open-cli-specification](https://github.com/nrranjithnr/open-cli-specification) is a third independent format, also called OpenCLISpec. It uses `opencli: 1.0.0`, slash-separated command paths, and a unified parameter list for arguments, flags, and value-taking options. This assessment is based on the [schema](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/opencli.spec.json), [examples](https://github.com/nrranjithnr/open-cli-specification/tree/0888fca967863777a89b2c82a6a9fce6cdd65da5/public), and [project overview](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/README.md) pinned at `0888fca`.

The design has useful ideas: parameters can be inherited through a command subtree, platform metadata describes supported operating systems and architectures, and responses associate an exit code with media types, schemas, and examples. Those concepts do not map directly into either supported specification.

clidoc intentionally does not support this format yet. The inspected `1.0.0` schema and documentation leave several interoperability questions unresolved, and concrete schema defects affect ordinary documents:

- Integer enum values are rejected because integers match both the `integer` and `number` branches of an exclusive `oneOf`.
- Reusable parameter and response collections are defined, but parameter and response positions do not accept references to them.
- Structural validation accepts dangling schema references, duplicate or missing positional indexes, ambiguous executable roots, and nonnumeric response keys. Reliable interoperability needs additional semantic validation or clarification for these cases.

Its repository provides a specification website, examples, and schema-validation CI. Generator, completion, and MCP features described in its overview were future plans in the inspected revision rather than shipped implementations. These limitations do not diminish the useful parts of its design; they mean clidoc cannot promise predictable validation, rendering, or conversion yet.

Passing such a document to `clidoc validate` produces an explicit unsupported-specification error. Support can be reconsidered after the schema defects and semantic policies are resolved.
